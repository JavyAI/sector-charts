import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createSchema } from '../../src/db/schema.js';
import {
  toThetaDate,
  fromThetaDate,
  storeStockPrices,
  computeWeeklyReturns,
  getWeeklyReturns,
  getLatestWeeklyReturnDate,
  fetchStockEod,
} from '../../src/services/thetadata.js';

let testDb: Database.Database;

vi.mock('../../src/db/connection.js', () => ({
  getDatabase: () => testDb,
}));

vi.mock('axios');
import axios from 'axios';

describe('thetadata service', () => {
  beforeAll(() => {
    testDb = new Database(':memory:');
    createSchema(testDb);
    // Insert a test constituent so JOINs work
    testDb
      .prepare('INSERT OR IGNORE INTO constituents (symbol, security, gics_sector) VALUES (?, ?, ?)')
      .run('AAPL', 'Apple Inc.', 'Information Technology');
    testDb
      .prepare('INSERT OR IGNORE INTO constituents (symbol, security, gics_sector) VALUES (?, ?, ?)')
      .run('MSFT', 'Microsoft Corp.', 'Information Technology');
  });

  afterAll(() => testDb.close());

  beforeEach(() => {
    testDb.exec('DELETE FROM stock_prices');
    testDb.exec('DELETE FROM stock_weekly_returns');
  });

  // ── Date format helpers ──────────────────────────────────────────────────────

  describe('toThetaDate', () => {
    it('converts YYYY-MM-DD to YYYYMMDD', () => {
      expect(toThetaDate('2026-04-11')).toBe('20260411');
      expect(toThetaDate('2026-01-01')).toBe('20260101');
    });
  });

  describe('fromThetaDate', () => {
    it('converts YYYYMMDD to YYYY-MM-DD', () => {
      expect(fromThetaDate('20260411')).toBe('2026-04-11');
      expect(fromThetaDate('20260101')).toBe('2026-01-01');
    });

    it('passes through already-formatted or short strings', () => {
      expect(fromThetaDate('2026')).toBe('2026');
    });
  });

  // ── fetchStockEod ────────────────────────────────────────────────────────────

  describe('fetchStockEod', () => {
    it('maps ThetaTerminal response to StockPrice[]', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          response: [
            {
              close: 258.86,
              open: 256.9,
              high: 262.16,
              low: 256.46,
              volume: 29264371,
              created: '2026-04-07T00:00:00',
            },
          ],
        },
      });

      const prices = await fetchStockEod('AAPL', '2026-04-07', '2026-04-11');
      expect(prices).toHaveLength(1);
      expect(prices[0].symbol).toBe('AAPL');
      expect(prices[0].date).toBe('2026-04-07');
      expect(prices[0].close).toBe(258.86);
      expect(prices[0].open).toBe(256.9);
    });

    it('returns empty array when response is empty', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: { response: [] } });
      const prices = await fetchStockEod('AAPL', '2026-04-07', '2026-04-11');
      expect(prices).toHaveLength(0);
    });

    it('falls back to last_trade timestamp for date when created is absent', async () => {
      const ts = new Date('2026-04-08T20:00:00Z').getTime();
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          response: [{ close: 100, open: 99, high: 101, low: 98, volume: 1000, last_trade: ts }],
        },
      });

      const prices = await fetchStockEod('AAPL', '2026-04-08', '2026-04-08');
      expect(prices[0].date).toBe('2026-04-08');
    });
  });

  // ── storeStockPrices ─────────────────────────────────────────────────────────

  describe('storeStockPrices', () => {
    it('inserts price records into the DB', () => {
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-04', open: 250, high: 255, low: 248, close: 252, volume: 10000000 },
        { symbol: 'AAPL', date: '2026-04-07', open: 252, high: 260, low: 251, close: 258, volume: 12000000 },
      ]);

      const rows = testDb
        .prepare('SELECT * FROM stock_prices WHERE symbol = ? ORDER BY date')
        .all('AAPL') as Array<{ symbol: string; date: string; close: number }>;

      expect(rows).toHaveLength(2);
      expect(rows[0].date).toBe('2026-04-04');
      expect(rows[0].close).toBe(252);
      expect(rows[1].date).toBe('2026-04-07');
      expect(rows[1].close).toBe(258);
    });

    it('upserts on conflict (same symbol+date)', () => {
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-04', open: 250, high: 255, low: 248, close: 252, volume: 10000000 },
      ]);
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-04', open: 251, high: 256, low: 249, close: 260, volume: 11000000 },
      ]);

      const rows = testDb
        .prepare('SELECT close FROM stock_prices WHERE symbol = ? AND date = ?')
        .all('AAPL', '2026-04-04') as Array<{ close: number }>;

      expect(rows).toHaveLength(1);
      expect(rows[0].close).toBe(260); // updated value
    });
  });

  // ── computeWeeklyReturns ─────────────────────────────────────────────────────

  describe('computeWeeklyReturns', () => {
    it('computes return_pct from curr and prev close prices', () => {
      // prevFriday: 2026-04-04 close=200, thisFriday: 2026-04-11 close=210
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-04', open: 198, high: 202, low: 197, close: 200, volume: 10000000 },
        { symbol: 'AAPL', date: '2026-04-11', open: 208, high: 212, low: 207, close: 210, volume: 11000000 },
      ]);

      computeWeeklyReturns('2026-04-11');

      const rows = testDb
        .prepare('SELECT return_pct, close_price, prev_close_price FROM stock_weekly_returns WHERE symbol = ? AND week_end_date = ?')
        .all('AAPL', '2026-04-11') as Array<{ return_pct: number; close_price: number; prev_close_price: number }>;

      expect(rows).toHaveLength(1);
      expect(rows[0].close_price).toBe(210);
      expect(rows[0].prev_close_price).toBe(200);
      expect(rows[0].return_pct).toBeCloseTo(5.0, 4); // (210-200)/200 * 100 = 5%
    });

    it('handles negative returns correctly', () => {
      storeStockPrices([
        { symbol: 'MSFT', date: '2026-04-04', open: 300, high: 305, low: 298, close: 300, volume: 5000000 },
        { symbol: 'MSFT', date: '2026-04-11', open: 285, high: 290, low: 283, close: 285, volume: 6000000 },
      ]);

      computeWeeklyReturns('2026-04-11');

      const row = testDb
        .prepare('SELECT return_pct FROM stock_weekly_returns WHERE symbol = ? AND week_end_date = ?')
        .get('MSFT', '2026-04-11') as { return_pct: number };

      expect(row.return_pct).toBeCloseTo(-5.0, 4); // (285-300)/300 * 100 = -5%
    });

    it('does not create a return when only one price exists', () => {
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-11', open: 258, high: 262, low: 256, close: 259, volume: 10000000 },
      ]);

      computeWeeklyReturns('2026-04-11');

      const rows = testDb
        .prepare('SELECT * FROM stock_weekly_returns WHERE symbol = ?')
        .all('AAPL');

      expect(rows).toHaveLength(0);
    });
  });

  // ── getWeeklyReturns ─────────────────────────────────────────────────────────

  describe('getWeeklyReturns', () => {
    it('retrieves stored returns with sector info joined', () => {
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-04', open: 200, high: 205, low: 198, close: 200, volume: 10000000 },
        { symbol: 'AAPL', date: '2026-04-11', open: 210, high: 215, low: 208, close: 210, volume: 11000000 },
      ]);

      computeWeeklyReturns('2026-04-11');

      const returns = getWeeklyReturns('2026-04-11');
      expect(returns).toHaveLength(1);
      expect(returns[0].symbol).toBe('AAPL');
      expect(returns[0].sector).toBe('Information Technology');
      expect(returns[0].returnPct).toBeCloseTo(5.0, 4);
    });

    it('returns empty array when no data for that date', () => {
      const returns = getWeeklyReturns('2099-12-31');
      expect(returns).toHaveLength(0);
    });
  });

  // ── getLatestWeeklyReturnDate ────────────────────────────────────────────────

  describe('getLatestWeeklyReturnDate', () => {
    it('returns null when no data exists', () => {
      expect(getLatestWeeklyReturnDate()).toBeNull();
    });

    it('returns the most recent week_end_date', () => {
      // Insert two price pairs to generate two return dates
      storeStockPrices([
        { symbol: 'AAPL', date: '2026-04-04', open: 200, high: 205, low: 198, close: 200, volume: 1 },
        { symbol: 'AAPL', date: '2026-04-11', open: 210, high: 215, low: 208, close: 210, volume: 1 },
      ]);
      computeWeeklyReturns('2026-04-11');

      expect(getLatestWeeklyReturnDate()).toBe('2026-04-11');
    });
  });
});
