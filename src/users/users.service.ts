import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  user_id: number;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface UserPreferences {
  user_id: number;
  calculation_method: number;
  madhab: number;
  time_format: '12h' | '24h';
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: number): Promise<User | null> {
    return this.db.queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.db.queryOne<User>('SELECT * FROM users WHERE google_id = ?', [googleId]);
  }

  async create(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }): Promise<User> {
    // MySQL has no RETURNING — insert then fetch by insertId
    const { insertId } = await this.db.execute(
      `INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)`,
      [data.googleId, data.email, data.name, data.avatarUrl],
    );

    const user = await this.db.queryOne<User>('SELECT * FROM users WHERE id = ?', [insertId]);

    // Seed default preferences (INSERT IGNORE skips if row already exists)
    await this.db.execute(
      `INSERT IGNORE INTO user_preferences (user_id) VALUES (?)`,
      [user!.id],
    );

    return user!;
  }

  async getLocation(userId: number): Promise<UserLocation | null> {
    return this.db.queryOne<UserLocation>(
      'SELECT * FROM user_locations WHERE user_id = ?',
      [userId],
    );
  }

  async upsertLocation(
    userId: number,
    data: { city?: string | null; country?: string | null; latitude: number; longitude: number; timezone: string },
  ): Promise<UserLocation> {
    await this.db.execute(
      `INSERT INTO user_locations (user_id, city, country, latitude, longitude, timezone)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         city      = VALUES(city),
         country   = VALUES(country),
         latitude  = VALUES(latitude),
         longitude = VALUES(longitude),
         timezone  = VALUES(timezone)`,
      [userId, data.city, data.country, data.latitude, data.longitude, data.timezone],
    );
    return (await this.db.queryOne<UserLocation>(
      'SELECT * FROM user_locations WHERE user_id = ?',
      [userId],
    ))!;
  }

  async getPreferences(userId: number): Promise<UserPreferences | null> {
    return this.db.queryOne<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId],
    );
  }

  async upsertPreferences(
    userId: number,
    data: Partial<Omit<UserPreferences, 'user_id'>>,
  ): Promise<UserPreferences> {
    const existing = await this.getPreferences(userId);
    const merged = {
      calculation_method: data.calculation_method ?? existing?.calculation_method ?? 2,
      madhab: data.madhab ?? existing?.madhab ?? 0,
      time_format: data.time_format ?? existing?.time_format ?? '24h',
    };

    await this.db.execute(
      `INSERT INTO user_preferences (user_id, calculation_method, madhab, time_format)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         calculation_method = VALUES(calculation_method),
         madhab             = VALUES(madhab),
         time_format        = VALUES(time_format)`,
      [userId, merged.calculation_method, merged.madhab, merged.time_format],
    );

    return (await this.db.queryOne<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId],
    ))!;
  }

  async getProfile(userId: number): Promise<{
    user: User;
    location: UserLocation | null;
    preferences: UserPreferences | null;
  }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const [location, preferences] = await Promise.all([
      this.getLocation(userId),
      this.getPreferences(userId),
    ]);
    return { user, location, preferences };
  }
}
