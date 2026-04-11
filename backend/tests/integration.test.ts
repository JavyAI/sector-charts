import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeDatabase,
  closeDatabase,
  getDatabase,
} from '../src/db/connection.js';
import { sectorService } from '../src/services/sector.js';
import { StockFundamental } from '../src/types.js';

describe('Integration Tests', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should store and retrieve sector metrics', () => {
    const testStocks: StockFundamental[] = [
      {
        symbol: 'TEST1',
        companyName: 'Test Company 1',
        marketCap: 1000000000,
        peRatio: 25,
        eps: 4,
        shares: 250000000,
      },
      {
        symbol: 'TEST2',
        companyName: 'Test Company 2',
        marketCap: 500000000,
        peRatio: 20,
        eps: 2.5,
        shares: 200000000,
      },
    ];

    const metrics = sectorService.aggregateToSector(
      '2024-04-11',
      'Technology',
      testStocks
    );
    sectorService.storeSectorMetrics([metrics]);

    const retrieved = sectorService.getSectorsForDate('2024-04-11');

    // Stronger assertions
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0]).toMatchObject({
      sector: 'Technology',
      constituents: 2,
      weightedPeRatio: expect.any(Number),
      equalWeightPeRatio: expect.any(Number),
    });
  });
});
