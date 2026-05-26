import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const TRACKABLE_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type TrackablePrayer = (typeof TRACKABLE_PRAYERS)[number];

export interface PrayerMark {
  prayer_date: string;
  prayer_name: TrackablePrayer;
  completed_at: string;
}

export interface DayCompletion {
  date: string;
  prayers: Record<TrackablePrayer, boolean>;
  fullyCompleted: boolean;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
}

@Injectable()
export class StreaksService {
  constructor(private readonly db: DatabaseService) {}

  async markPrayer(
    userId: number,
    prayerDate: string,
    prayerName: TrackablePrayer,
  ): Promise<PrayerMark> {
    // MySQL has no RETURNING — upsert then fetch
    await this.db.execute(
      `INSERT INTO prayer_marks (user_id, prayer_date, prayer_name)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE completed_at = NOW()`,
      [userId, prayerDate, prayerName],
    );
    return (await this.db.queryOne<PrayerMark>(
      `SELECT prayer_date, prayer_name, completed_at
       FROM prayer_marks
       WHERE user_id = ? AND prayer_date = ? AND prayer_name = ?`,
      [userId, prayerDate, prayerName],
    ))!;
  }

  async unmarkPrayer(
    userId: number,
    prayerDate: string,
    prayerName: TrackablePrayer,
  ): Promise<void> {
    await this.db.execute(
      'DELETE FROM prayer_marks WHERE user_id = ? AND prayer_date = ? AND prayer_name = ?',
      [userId, prayerDate, prayerName],
    );
  }

  async getDayCompletion(userId: number, date: string): Promise<DayCompletion> {
    const rows = await this.db.query<PrayerMark>(
      'SELECT prayer_name FROM prayer_marks WHERE user_id = ? AND prayer_date = ?',
      [userId, date],
    );
    const markedSet = new Set(rows.map((r) => r.prayer_name));
    const prayers = TRACKABLE_PRAYERS.reduce(
      (acc, name) => {
        acc[name] = markedSet.has(name);
        return acc;
      },
      {} as Record<TrackablePrayer, boolean>,
    );
    return {
      date,
      prayers,
      fullyCompleted: TRACKABLE_PRAYERS.every((p) => markedSet.has(p)),
    };
  }

  async getHeatmap(userId: number, days = 365): Promise<DayCompletion[]> {
    // DATE_FORMAT returns prayer_date as 'YYYY-MM-DD' string
    // DATE_SUB + INTERVAL replaces the PostgreSQL ::interval cast
    const rows = await this.db.query<PrayerMark>(
      `SELECT DATE_FORMAT(prayer_date, '%Y-%m-%d') AS prayer_date, prayer_name
       FROM prayer_marks
       WHERE user_id = ?
         AND prayer_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY prayer_date`,
      [userId, days],
    );

    const byDate = new Map<string, Set<TrackablePrayer>>();
    for (const row of rows) {
      if (!byDate.has(row.prayer_date)) byDate.set(row.prayer_date, new Set());
      byDate.get(row.prayer_date)!.add(row.prayer_name);
    }

    return Array.from(byDate.entries()).map(([date, marked]) => {
      const prayers = TRACKABLE_PRAYERS.reduce(
        (acc, name) => {
          acc[name] = marked.has(name);
          return acc;
        },
        {} as Record<TrackablePrayer, boolean>,
      );
      return { date, prayers, fullyCompleted: TRACKABLE_PRAYERS.every((p) => marked.has(p)) };
    });
  }

  async getStats(userId: number): Promise<StreakStats> {
    const rows = await this.db.query<{ prayer_date: string; cnt: string }>(
      `SELECT DATE_FORMAT(prayer_date, '%Y-%m-%d') AS prayer_date, COUNT(*) AS cnt
       FROM prayer_marks
       WHERE user_id = ?
       GROUP BY prayer_date
       HAVING COUNT(*) >= 5
       ORDER BY prayer_date`,
      [userId],
    );

    if (rows.length === 0) return { currentStreak: 0, bestStreak: 0 };

    let bestStreak = 0;
    let currentRun = 1;
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].prayer_date);
      const curr = new Date(rows[i].prayer_date);
      const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
      if (diffDays === 1) {
        currentRun++;
      } else {
        bestStreak = Math.max(bestStreak, currentRun);
        currentRun = 1;
      }
    }
    bestStreak = Math.max(bestStreak, currentRun);

    const todayStr = new Date().toISOString().split('T')[0];
    const dateSet = new Set(rows.map((r) => r.prayer_date));
    let currentStreak = 0;
    const cursor = new Date(todayStr);
    while (dateSet.has(cursor.toISOString().split('T')[0])) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { currentStreak, bestStreak };
  }
}
