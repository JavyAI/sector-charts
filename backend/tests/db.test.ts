import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { createSchema } from '../src/db/schema.js';

describe('Database Schema', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    createSchema(db);
  });

  afterAll(() => {
    db.close();
  });

  it('should create all required tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('constituents');
    expect(tableNames).toContain('stock_fundamentals');
    expect(tableNames).toContain('sector_metrics');
    expect(tableNames).toContain('cache');
  });

  it('should enforce unique constraint on constituents symbol', () => {
    const insert = db.prepare('INSERT INTO constituents (symbol, companyName, sector) VALUES (?, ?, ?)');
    insert.run('AAPL', 'Apple Inc.', 'Technology');

    expect(() => {
      insert.run('AAPL', 'Apple Inc.', 'Technology');
    }).toThrow();
  });
});
