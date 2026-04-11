import { getDatabase } from '../db/connection.js';
import { StockFundamental, SectorMetric } from '../types.js';

export class SectorService {
  /**
   * Calculates cap-weighted average P/E ratio.
   * Formula: sum(P/E * market cap) / total market cap
   * Skips stocks where peRatio is null or marketCap <= 0.
   * Returns 0 if no valid stocks.
   */
  calculateWeightedPeRatio(stocks: StockFundamental[]): number {
    let weightedSum = 0;
    let totalMarketCap = 0;

    for (const stock of stocks) {
      if (stock.peRatio === null || stock.marketCap <= 0) continue;
      weightedSum += stock.peRatio * stock.marketCap;
      totalMarketCap += stock.marketCap;
    }

    if (totalMarketCap === 0) return 0;
    return weightedSum / totalMarketCap;
  }

  /**
   * Calculates simple average P/E (equal-weight).
   * Filters to stocks where peRatio !== null.
   * Returns 0 if no valid stocks.
   */
  calculateEqualWeightPeRatio(stocks: StockFundamental[]): number {
    const valid = stocks.filter((s) => s.peRatio !== null);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, s) => acc + (s.peRatio as number), 0);
    return sum / valid.length;
  }

  /**
   * Returns the sum of all marketCap values.
   */
  calculateTotalMarketCap(stocks: StockFundamental[]): number {
    return stocks.reduce((acc, s) => acc + s.marketCap, 0);
  }

  /**
   * Aggregates stock fundamentals into a SectorMetric for the given date and sector.
   */
  aggregateToSector(date: string, sector: string, stocks: StockFundamental[]): SectorMetric {
    const weightedPeRatio = Math.round(this.calculateWeightedPeRatio(stocks) * 10) / 10;
    const equalWeightPeRatio = Math.round(this.calculateEqualWeightPeRatio(stocks) * 10) / 10;
    const weightedMarketCap = this.calculateTotalMarketCap(stocks);

    return {
      date,
      sector,
      weightedPeRatio,
      equalWeightPeRatio,
      weightedMarketCap,
      constituents: stocks.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Stores sector metrics into the sector_metrics table using a transaction.
   * Uses INSERT OR REPLACE for upsert semantics.
   */
  storeSectorMetrics(metrics: SectorMetric[]): void {
    const db = getDatabase();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO sector_metrics
        (date, sector, weightedPeRatio, equalWeightPeRatio, weightedMarketCap, constituents, lastUpdated)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rows: SectorMetric[]) => {
      for (const row of rows) {
        insert.run(
          row.date,
          row.sector,
          row.weightedPeRatio,
          row.equalWeightPeRatio,
          row.weightedMarketCap,
          row.constituents,
          row.lastUpdated,
        );
      }
    });

    insertMany(metrics);
  }

  /**
   * Queries sector_metrics for all sectors on a given date, ordered by sector name.
   */
  getSectorsForDate(date: string): SectorMetric[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM sector_metrics WHERE date = ? ORDER BY sector')
      .all(date) as SectorMetric[];
  }

  /**
   * Returns historical metrics for a sector over the last `days` days, ordered by date ascending.
   * Defaults to 2520 days (~10 years).
   */
  getSectorHistory(sector: string, days: number = 2520): SectorMetric[] {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    return db
      .prepare(
        `SELECT * FROM sector_metrics
         WHERE sector = ? AND date >= ?
         ORDER BY date ASC`,
      )
      .all(sector, cutoffStr) as SectorMetric[];
  }

  /**
   * Calculates percentage change between current and historical P/E values.
   * Returns 0 if historical is 0.
   * Result is rounded to 1 decimal place.
   */
  calculatePeChangePercentage(current: number, historical: number): number {
    if (historical === 0) return 0;
    return Math.round(((current - historical) / historical) * 100 * 10) / 10;
  }
}

export const sectorService = new SectorService();
