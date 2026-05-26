import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface IslamicHoliday {
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  hijriDate: string; // e.g. "1 Muharram 1447 AH"
  type: 'eid' | 'ramadan' | 'observance';
}

const HIJRI_HOLIDAYS: {
  day: number;
  month: number;
  name: string;
  description: string;
  type: IslamicHoliday['type'];
}[] = [
  {
    day: 1, month: 1,
    name: 'Islamic New Year',
    description: 'The first day of Muharram marks the beginning of the Islamic lunar calendar year.',
    type: 'observance',
  },
  {
    day: 10, month: 1,
    name: 'Ashura',
    description: 'Observed on the 10th of Muharram. A day of fasting commemorating the day Musa and the Israelites were saved from Pharaoh.',
    type: 'observance',
  },
  {
    day: 12, month: 3,
    name: 'Mawlid al-Nabi',
    description: "Celebration of the birth of the Prophet Muhammad ﷺ on the 12th of Rabi' al-Awwal.",
    type: 'observance',
  },
  {
    day: 27, month: 7,
    name: "Laylat al-Isra' wal-Mi'raj",
    description: "Commemorates the Night Journey and Ascension of the Prophet Muhammad ﷺ to the heavens.",
    type: 'observance',
  },
  {
    day: 1, month: 9,
    name: 'First Day of Ramadan',
    description: 'The beginning of the holy month of fasting, prayer, and reflection.',
    type: 'ramadan',
  },
  {
    day: 27, month: 9,
    name: "Laylat al-Qadr",
    description: "The Night of Power — the night the Qur'an was first revealed. Typically observed on the 27th of Ramadan.",
    type: 'ramadan',
  },
  {
    day: 1, month: 10,
    name: 'Eid al-Fitr',
    description: 'The Festival of Breaking the Fast, celebrating the end of Ramadan.',
    type: 'eid',
  },
  {
    day: 9, month: 12,
    name: 'Day of Arafah',
    description: 'The most important day of Hajj. Fasting on this day is said to expiate sins of the past and coming year.',
    type: 'observance',
  },
  {
    day: 10, month: 12,
    name: 'Eid al-Adha',
    description: 'The Festival of Sacrifice, commemorating the willingness of Ibrahim to sacrifice his son in obedience to Allah.',
    type: 'eid',
  },
];

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijjah',
];

const ALADHAN = 'https://api.aladhan.com/v1';

@Injectable()
export class HolidaysService {
  private readonly cache = new Map<number, { ts: number; data: IslamicHoliday[] }>();
  private readonly TTL = 24 * 60 * 60 * 1000;

  async getHolidays(gregorianYear: number): Promise<IslamicHoliday[]> {
    const cached = this.cache.get(gregorianYear);
    if (cached && Date.now() - cached.ts < this.TTL) {
      return cached.data;
    }

    // Find which Hijri years overlap this Gregorian year (usually 2, occasionally 3)
    const [h1, h2] = await Promise.all([
      this.gToHYear(1, 1, gregorianYear),
      this.gToHYear(31, 12, gregorianYear),
    ]);

    // Convert all holidays for all overlapping Hijri years in parallel
    const conversions: Promise<IslamicHoliday | null>[] = [];
    for (let hy = h1; hy <= h2; hy++) {
      for (const h of HIJRI_HOLIDAYS) {
        conversions.push(this.convertHoliday(h, hy, gregorianYear));
      }
    }

    const results = (await Promise.all(conversions))
      .filter((h): h is IslamicHoliday => h !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    this.cache.set(gregorianYear, { ts: Date.now(), data: results });
    return results;
  }

  private async gToHYear(day: number, month: number, year: number): Promise<number> {
    const date = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    const { data } = await axios.get(`${ALADHAN}/gToH/${date}`, { timeout: 8_000 });
    return parseInt(data.data.hijri.year as string);
  }

  private async convertHoliday(
    h: (typeof HIJRI_HOLIDAYS)[number],
    hijriYear: number,
    targetGregorianYear: number,
  ): Promise<IslamicHoliday | null> {
    try {
      const date = `${String(h.day).padStart(2, '0')}-${String(h.month).padStart(2, '0')}-${hijriYear}`;
      const { data } = await axios.get(`${ALADHAN}/hToG/${date}`, { timeout: 8_000 });
      const greg: string = data.data.gregorian.date; // DD-MM-YYYY
      const [dd, mm, yyyy] = greg.split('-');
      if (parseInt(yyyy) !== targetGregorianYear) return null;
      return {
        name: h.name,
        description: h.description,
        date: `${yyyy}-${mm}-${dd}`,
        hijriDate: `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${hijriYear} AH`,
        type: h.type,
      };
    } catch {
      return null;
    }
  }
}
