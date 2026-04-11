import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createSchema } from '../../src/db/schema.js';
import { SectorService } from '../../src/services/sector.js';
import { StockFundamental } from '../../src/types.js';

// --- in-memory DB wiring so storeSectorMetrics / getSectorsForDate work ---
let testDb: Database.Database;

vi.mock('../../src/db/connection.js', () => ({
  getDatabase: () => testDb,
}));

describe('SectorService', () => {
  let service: SectorService;

  beforeAll(() => {
    testDb = new Database(':memory:');
    createSchema(testDb);
  });

  afterAll(() => {
    testDb.close();
  });

  beforeEach(() => {
    service = new SectorService();
    // Clear sector_metrics between tests that write to DB
    testDb.exec('DELETE FROM sector_metrics');
  });

  // ------------------------------------------------------------------ //
  describe('calculateWeightedPeRatio', () => {
    it('calculates cap-weighted P/E with valid stocks', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: 30, eps: 6, shares: 15_000_000_000 },
        { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 2_500_000_000_000, peRatio: 35, eps: 10, shares: 7_500_000_000 },
      ];
      // (30 * 3T + 35 * 2.5T) / (3T + 2.5T) = (90T + 87.5T) / 5.5T ≈ 32.27
      const result = service.calculateWeightedPeRatio(stocks);
      expect(result).toBeCloseTo(32.27, 1);
    });

    it('returns 0 when stock has null peRatio', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: null, eps: null, shares: 15_000_000_000 },
      ];
      expect(service.calculateWeightedPeRatio(stocks)).toBe(0);
    });

    it('skips stocks with marketCap <= 0', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 0, peRatio: 30, eps: 6, shares: 1_000_000_000 },
        { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 2_000_000_000_000, peRatio: 25, eps: 8, shares: 7_000_000_000 },
      ];
      // Only MSFT qualifies: 25 * 2T / 2T = 25
      expect(service.calculateWeightedPeRatio(stocks)).toBeCloseTo(25, 1);
    });
  });

  // ------------------------------------------------------------------ //
  describe('calculateEqualWeightPeRatio', () => {
    it('calculates simple average P/E with valid stocks', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: 20, eps: 6, shares: 15_000_000_000 },
        { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 2_500_000_000_000, peRatio: 30, eps: 10, shares: 7_500_000_000 },
      ];
      // (20 + 30) / 2 = 25
      expect(service.calculateEqualWeightPeRatio(stocks)).toBe(25);
    });

    it('returns 0 when all stocks have null peRatio', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: null, eps: null, shares: 15_000_000_000 },
        { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 2_500_000_000_000, peRatio: null, eps: null, shares: 7_500_000_000 },
      ];
      expect(service.calculateEqualWeightPeRatio(stocks)).toBe(0);
    });
  });

  // ------------------------------------------------------------------ //
  describe('aggregateToSector', () => {
    it('creates a valid SectorMetric from a single stock', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: 28.5, eps: 6, shares: 15_000_000_000 },
      ];
      const metric = service.aggregateToSector('2024-01-15', 'Technology', stocks);

      expect(metric.date).toBe('2024-01-15');
      expect(metric.sector).toBe('Technology');
      expect(metric.constituents).toBe(1);
      expect(typeof metric.weightedPeRatio).toBe('number');
      // rounded to 1 decimal: 28.5
      expect(metric.weightedPeRatio).toBe(28.5);
      expect(metric.equalWeightPeRatio).toBe(28.5);
      expect(metric.weightedMarketCap).toBe(3_000_000_000_000);
      expect(metric.lastUpdated).toBeTruthy();
    });

    it('aggregates multiple stocks with mixed null P/Es and rounds to 1 decimal', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: 30, eps: 6, shares: 15_000_000_000 },
        { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 2_500_000_000_000, peRatio: 35, eps: 10, shares: 7_500_000_000 },
        { symbol: 'GOOG', companyName: 'Google', marketCap: 1_000_000_000_000, peRatio: null, eps: null, shares: 5_000_000_000 },
      ];
      const metric = service.aggregateToSector('2024-01-15', 'Technology', stocks);

      // weighted P/E uses only AAPL and MSFT (GOOG has null P/E)
      // (30 * 3T + 35 * 2.5T) / (3T + 2.5T) = (90T + 87.5T) / 5.5T ≈ 32.27 → rounds to 32.3
      expect(metric.weightedPeRatio).toBe(32.3);
      // equal weight: (30 + 35) / 2 = 32.5
      expect(metric.equalWeightPeRatio).toBe(32.5);
      // total market cap includes all 3 stocks
      expect(metric.weightedMarketCap).toBe(6_500_000_000_000);
      expect(metric.constituents).toBe(3);
    });
  });

  // ------------------------------------------------------------------ //
  describe('calculatePeChangePercentage', () => {
    it('calculates percentage change correctly', () => {
      // (30 - 25) / 25 * 100 = 20%
      expect(service.calculatePeChangePercentage(30, 25)).toBe(20);
    });

    it('returns 0 when historical is 0', () => {
      expect(service.calculatePeChangePercentage(30, 0)).toBe(0);
    });

    it('rounds result to 1 decimal place', () => {
      // (31 - 25) / 25 * 100 = 24.0 exactly
      expect(service.calculatePeChangePercentage(31, 25)).toBe(24);
      // (30 - 22) / 22 * 100 = 36.363... → 36.4
      expect(service.calculatePeChangePercentage(30, 22)).toBe(36.4);
    });
  });

  // ------------------------------------------------------------------ //
  describe('calculateTotalMarketCap', () => {
    it('returns 0 for an empty array', () => {
      expect(service.calculateTotalMarketCap([])).toBe(0);
    });

    it('returns the single stock market cap', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: 30, eps: 6, shares: 15_000_000_000 },
      ];
      expect(service.calculateTotalMarketCap(stocks)).toBe(3_000_000_000_000);
    });

    it('sums multiple stocks correctly', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_000_000_000_000, peRatio: 30, eps: 6, shares: 15_000_000_000 },
        { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 2_500_000_000_000, peRatio: 35, eps: 10, shares: 7_500_000_000 },
        { symbol: 'GOOG', companyName: 'Google', marketCap: 1_000_000_000_000, peRatio: 28, eps: 5, shares: 5_000_000_000 },
      ];
      expect(service.calculateTotalMarketCap(stocks)).toBe(6_500_000_000_000);
    });

    it('includes negative and zero market caps in sum', () => {
      const stocks: StockFundamental[] = [
        { symbol: 'AAPL', companyName: 'Apple', marketCap: 1_000_000_000, peRatio: 30, eps: 6, shares: 1_000_000_000 },
        { symbol: 'BAD1', companyName: 'Bad Corp', marketCap: -500_000_000, peRatio: null, eps: null, shares: 0 },
        { symbol: 'BAD2', companyName: 'Zero Corp', marketCap: 0, peRatio: null, eps: null, shares: 0 },
      ];
      expect(service.calculateTotalMarketCap(stocks)).toBe(500_000_000);
    });
  });

  // ------------------------------------------------------------------ //
  describe('storeSectorMetrics and getSectorsForDate', () => {
    it('stores metrics and retrieves them by date', () => {
      const metrics = [
        {
          date: '2024-01-15',
          sector: 'Technology',
          weightedPeRatio: 32.3,
          equalWeightPeRatio: 30.1,
          weightedMarketCap: 5_500_000_000_000,
          constituents: 2,
          lastUpdated: new Date().toISOString(),
        },
        {
          date: '2024-01-15',
          sector: 'Healthcare',
          weightedPeRatio: 18.5,
          equalWeightPeRatio: 19.0,
          weightedMarketCap: 1_200_000_000_000,
          constituents: 3,
          lastUpdated: new Date().toISOString(),
        },
      ];

      service.storeSectorMetrics(metrics);
      const result = service.getSectorsForDate('2024-01-15');

      expect(result).toHaveLength(2);
      expect(result[0].sector).toBe('Healthcare');
      expect(result[1].sector).toBe('Technology');
      expect(result[0].weightedPeRatio).toBe(18.5);
    });

    it('upserts: second insert for same date+sector replaces the first', () => {
      const makeMetric = (weightedPeRatio: number) => ({
        date: '2024-01-15',
        sector: 'Technology',
        weightedPeRatio,
        equalWeightPeRatio: 25.0,
        weightedMarketCap: 5_000_000_000_000,
        constituents: 2,
        lastUpdated: new Date().toISOString(),
      });

      service.storeSectorMetrics([makeMetric(25)]);
      service.storeSectorMetrics([makeMetric(30)]);

      const row = testDb
        .prepare("SELECT COUNT(*) as count, weightedPeRatio FROM sector_metrics WHERE date = '2024-01-15' AND sector = 'Technology'")
        .get() as { count: number; weightedPeRatio: number };

      expect(row.count).toBe(1);
      expect(row.weightedPeRatio).toBe(30);
    });
  });

  // ------------------------------------------------------------------ //
  describe('storeSectorMetrics transaction atomicity', () => {
    it('rolls back all inserts when one metric is invalid', () => {
      const validMetric = {
        date: '2024-02-01',
        sector: 'Healthcare',
        weightedPeRatio: 20.0,
        equalWeightPeRatio: 19.5,
        weightedMarketCap: 1_000_000_000_000,
        constituents: 3,
        lastUpdated: new Date().toISOString(),
      };
      const invalidMetric = {
        date: null as unknown as string, // violates NOT NULL constraint
        sector: 'Energy',
        weightedPeRatio: 15.0,
        equalWeightPeRatio: 14.0,
        weightedMarketCap: 500_000_000_000,
        constituents: 1,
        lastUpdated: new Date().toISOString(),
      };
      const thirdMetric = {
        date: '2024-02-01',
        sector: 'Financials',
        weightedPeRatio: 12.0,
        equalWeightPeRatio: 11.5,
        weightedMarketCap: 800_000_000_000,
        constituents: 2,
        lastUpdated: new Date().toISOString(),
      };

      expect(() => service.storeSectorMetrics([validMetric, invalidMetric, thirdMetric])).toThrow();

      const { count } = testDb
        .prepare("SELECT COUNT(*) as count FROM sector_metrics WHERE date = '2024-02-01'")
        .get() as { count: number };

      expect(count).toBe(0);
    });
  });
});
