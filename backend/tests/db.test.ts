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

  it('should enforce unique constraint on stock_fundamentals (symbol, date)', () => {
    const insert = db.prepare('INSERT INTO stock_fundamentals (symbol, date, peRatio, marketCap, eps, shares) VALUES (?, ?, ?, ?, ?, ?)');
    // First, insert a constituent so FK doesn't fail
    db.prepare('INSERT INTO constituents (symbol, companyName, sector) VALUES (?, ?, ?)').run('MSFT', 'Microsoft Corp.', 'Technology');

    insert.run('MSFT', '2024-01-01', 25.5, 3000000000000, 6.05, 16500000000);

    expect(() => {
      insert.run('MSFT', '2024-01-01', 25.5, 3000000000000, 6.05, 16500000000);
    }).toThrow();
  });

  it('should enforce unique constraint on sector_metrics (date, sector)', () => {
    const insert = db.prepare('INSERT INTO sector_metrics (date, sector, weightedPeRatio, equalWeightPeRatio, weightedMarketCap, constituents) VALUES (?, ?, ?, ?, ?, ?)');

    insert.run('2024-01-01', 'Technology', 25.5, 26.0, 3000000000000, 50);

    expect(() => {
      insert.run('2024-01-01', 'Technology', 25.5, 26.0, 3000000000000, 50);
    }).toThrow();
  });

  it('should create indices for query performance', () => {
    const indices = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index'")
      .all() as Array<{ name: string }>;
    const indexNames = indices.map((i) => i.name);

    expect(indexNames).toContain('idx_stock_fundamentals_date');
    expect(indexNames).toContain('idx_sector_metrics_date');
    expect(indexNames).toContain('idx_sector_metrics_sector');
  });
});
