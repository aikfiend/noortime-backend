import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerName = (typeof PRAYER_NAMES)[number];

interface AlAdhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

interface AlAdhanDay {
  timings: AlAdhanTimings;
  date: { readable: string; timestamp: string; gregorian: unknown; hijri: unknown };
  meta: { timezone: string; method: unknown };
}

export interface DayTimings {
  date: string;
  timings: Record<PrayerName, string>;
}

@Injectable()
export class PrayersService {
  private readonly baseUrl = 'https://api.aladhan.com/v1';

  private async fetchTimings(
    latitude: number,
    longitude: number,
    method: number,
    school: number,
    date: string,
  ): Promise<AlAdhanDay> {
    const [day, month, year] = date.split('-').reverse(); // yyyy-mm-dd → dd-mm-yyyy
    const url = `${this.baseUrl}/timings/${day}-${month}-${year}`;

    const { data } = await axios.get<{ data: AlAdhanDay }>(url, {
      params: { latitude, longitude, method, school },
      timeout: 8_000,
    });

    return data.data;
  }

  private filterPrayers(timings: AlAdhanTimings): Record<PrayerName, string> {
    return PRAYER_NAMES.reduce(
      (acc, name) => {
        acc[name] = timings[name].split(' ')[0]; // strip timezone suffix if present
        return acc;
      },
      {} as Record<PrayerName, string>,
    );
  }

  async getToday(
    latitude: number,
    longitude: number,
    method: number,
    school: number,
  ): Promise<DayTimings> {
    const today = new Date().toISOString().split('T')[0];
    const day = await this.fetchTimings(latitude, longitude, method, school, today);
    return { date: today, timings: this.filterPrayers(day.timings) };
  }

  async getWeek(
    latitude: number,
    longitude: number,
    method: number,
    school: number,
  ): Promise<DayTimings[]> {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const results = await Promise.all(
      dates.map(async (date) => {
        const day = await this.fetchTimings(latitude, longitude, method, school, date);
        return { date, timings: this.filterPrayers(day.timings) };
      }),
    );

    return results;
  }

  async getMonth(
    latitude: number,
    longitude: number,
    method: number,
    school: number,
    year: number,
    month: number,
  ): Promise<DayTimings[]> {
    if (month < 1 || month > 12) throw new BadRequestException('Invalid month');

    const url = `${this.baseUrl}/calendar/${year}/${month}`;
    const { data } = await axios.get<{ data: AlAdhanDay[] }>(url, {
      params: { latitude, longitude, method, school },
      timeout: 10_000,
    });

    return data.data.map((day) => ({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day.date.gregorian && (day.date.gregorian as { day: string }).day).padStart(2, '0')}`,
      timings: this.filterPrayers(day.timings),
    }));
  }
}
