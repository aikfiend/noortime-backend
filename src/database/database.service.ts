import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createPool,
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';

export interface ExecuteResult {
  insertId: number;
  affectedRows: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  onModuleInit(): void {
    this.pool = createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 20,
      waitForConnections: true,
      queueLimit: 0,
      // Return DATE/DATETIME columns as strings so downstream code stays consistent
      dateStrings: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /** SELECT — returns all matching rows */
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(sql, params ?? []);
    return rows as unknown as T[];
  }

  /** SELECT — returns the first row or null */
  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /** INSERT / UPDATE / DELETE */
  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params ?? []);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  }

  async transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
