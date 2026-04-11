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
  });
});
