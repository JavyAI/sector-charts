import { getDatabase } from '../db/connection.js';
import { config } from '../config.js';

export class CacheService {
  /**
   * Store value in cache with TTL
   */
  set(key: string, value: any, ttlHours: number = config.cacheTtlHours): void {
    const db = getDatabase();
    const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
    const valueStr = JSON.stringify(value);

    db.prepare('INSERT OR REPLACE INTO cache (key, value, expiresAt) VALUES (?, ?, ?)')
      .run(key, valueStr, expiresAt);
  }

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const db = getDatabase();
    const row = db.prepare('SELECT value, expires_at FROM cache WHERE key = ?').get(key) as any;
    if (!row) return null;
    if (row.expires_at && row.expires_at < Date.now()) {
      db.prepare('DELETE FROM cache WHERE key = ?').run(key);
      return null;
    }
    try {
      return JSON.parse(row.value) as T;
    } catch (error) {
      console.error(`Failed to parse cached value for key "${key}":`, error);
      db.prepare('DELETE FROM cache WHERE key = ?').run(key); // Delete corrupted entry
      return null;
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('DELETE FROM cache WHERE expiresAt < ?').run(now);
  }
}

export const cacheService = new CacheService();
