import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createSchema } from '../../src/db/schema.js';
import {
  fetchShillerData,
  storeShillerData,
  getShillerDataRange,
  getMarketHistoricalPE,
} from '../../src/services/shiller.js';

let testDb: Database.Database;

vi.mock('../../src/db/connection.js', () => ({
  getDatabase: () => testDb,
}));

vi.mock('../../src/services/privateDataSource.js', () => ({
  fetchPrivateCsvFromGitHub: vi.fn(),
}));
import { fetchPrivateCsvFromGitHub } from '../../src/services/privateDataSource.js';

vi.mock('../../src/config.js', () => ({
  config: {
    shiller: { filePath: 'shiller.csv' },
    privateDataRepo: 'JavyAI/sector-data',
    githubToken: 'ghp_test',
  },
}));

function buildShillerCsv(rows: Array<{ date: string; cape: number }>): string {
  const header = 'Date,SP500,Dividend,Earnings,Consumer Price Index,Long Interest Rate,Real Price,Real Dividend,Real Earnings,PE10';
  // Pad to at least 100 data rows to pass validation
  const allRows = [...rows];
  for (let i = allRows.length; i < 100; i++) {
    const year = 1900 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, '0');
    allRows.push({ date: `${year}-${month}`, cape: 15 });
  }
  const lines = allRows.map(r => `${r.date},100,2,5,200,4,90,1.8,4.5,${r.cape}`);
  return [header, ...lines].join('\n');
}

describe('shiller service', () => {
  beforeAll(() => {
    testDb = new Database(':memory:');
    createSchema(testDb);
  });

  afterAll(() => testDb.close());

  beforeEach(() => {
    testDb.exec('DELETE FROM shiller_historical');
    vi.mocked(fetchPrivateCsvFromGitHub).mockReset();
  });

  describe('fetchShillerData (parseCSV)', () => {
    it('parses a valid CSV and returns data points', async () => {
      const csv = buildShillerCsv([
        { date: '2020-01', cape: 30 },
        { date: '2020-02', cape: 32 },
      ]);
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(csv);

      const points = await fetchShillerData();
      expect(points.length).toBeGreaterThanOrEqual(100);
      // The first two rows are the ones we specified
      expect(points[0].date).toBe('2020-01-01');
      expect(points[0].cape).toBe(30);
      expect(points[1].cape).toBe(32);
    });

    it('normalizes dot-separated dates (1871.01 format)', async () => {
      const csv = buildShillerCsv([{ date: '1871.01', cape: 5 }]);
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(csv);

      const points = await fetchShillerData();
      expect(points[0].date).toBe('1871-01-01');
    });

    it('throws validation error for empty CSV', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce('Date,SP500\n');
      await expect(fetchShillerData()).rejects.toThrow(/Shiller CSV validation failed/);
    });
  });

  describe('storeShillerData and getShillerDataRange', () => {
    it('stores and retrieves data within a date range', async () => {
      const csv = buildShillerCsv([
        { date: '2020-01', cape: 30 },
        { date: '2020-06', cape: 28 },
        { date: '2021-01', cape: 35 },
      ]);
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(csv);
      const points = await fetchShillerData();
      storeShillerData(points);

      const range = getShillerDataRange('2020-01-01', '2020-12-31');
      expect(range.length).toBe(2);
      expect(range[0].cape).toBe(30);
      expect(range[1].cape).toBe(28);
    });
  });

  describe('getMarketHistoricalPE', () => {
    it('computes stats correctly', async () => {
      // Build exactly 100 rows with known cape values so stats are predictable.
      // Fill 95 padding rows with cape=30, then add 5 known rows.
      const knownRows = [
        { date: '2015-01', cape: 20 },
        { date: '2016-01', cape: 25 },
        { date: '2017-01', cape: 30 },
        { date: '2018-01', cape: 35 },
        { date: '2019-01', cape: 40 },
      ];
      // 95 filler rows with cape=30
      const fillerRows: Array<{ date: string; cape: number }> = [];
      for (let i = 0; i < 95; i++) {
        const year = 1900 + Math.floor(i / 12);
        const month = String((i % 12) + 1).padStart(2, '0');
        fillerRows.push({ date: `${year}-${month}`, cape: 30 });
      }
      const header = 'Date,SP500,Dividend,Earnings,Consumer Price Index,Long Interest Rate,Real Price,Real Dividend,Real Earnings,PE10';
      const allRows = [...knownRows, ...fillerRows];
      const lines = allRows.map(r => `${r.date},100,2,5,200,4,90,1.8,4.5,${r.cape}`);
      const csv = [header, ...lines].join('\n');

      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(csv);
      const points = await fetchShillerData();
      storeShillerData(points);

      const stats = getMarketHistoricalPE(0); // all history
      expect(stats.min).toBe(20);
      expect(stats.max).toBe(40);
      // With 95 rows at 30 and 5 rows at 20,25,30,35,40, mean is still 30
      expect(stats.mean).toBeCloseTo(30, 1);
    });

    it('returns zeroed stats when no data', () => {
      const stats = getMarketHistoricalPE(0);
      expect(stats).toEqual({ median: 0, mean: 0, min: 0, max: 0, p25: 0, p75: 0 });
    });
  });
});
