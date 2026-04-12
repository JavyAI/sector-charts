import { getDatabase } from '../db/connection.js';
import { StockFundamental, SectorMetric } from '../types.js';

export class SectorService {
  /**
   * Calculates earnings-weighted average P/E ratio.
   * Formula: Total Market Cap / Total Earnings, where Earnings = Market Cap / PE.
   * Skips stocks where peRatio is null or marketCap <= 0.
   * Returns 0 if no valid stocks.
   */
  calculateWeightedPeRatio(stocks: StockFundamental[]): number {
    let totalMarketCap = 0;
    let totalEarnings = 0;

    for (const stock of stocks) {
      if (stock.peRatio === null || stock.marketCap <= 0) continue;
      totalMarketCap += stock.marketCap;
      totalEarnings += stock.marketCap / stock.peRatio;
    }

    if (totalEarnings === 0) return 0;
    return totalMarketCap / totalEarnings;
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
    const weightedPeRatio = this.calculateWeightedPeRatio(stocks);
    const equalWeightPeRatio = this.calculateEqualWeightPeRatio(stocks);
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
   * Returns the most recent date that has sector_metrics data, or null
   * if the table is empty. Used by the /api/sectors/latest endpoint and
   * the Railway healthcheck so it always returns 200 as long as any data
   * exists (instead of 404 on a hardcoded date).
   */
  getLatestDate(): string | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT MAX(date) AS latest FROM sector_metrics')
      .get() as { latest: string | null } | undefined;
    return row?.latest ?? null;
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
   * Defaults to 3650 days = 10 years.
   */
  getSectorHistory(sector: string, days: number = 3650): SectorMetric[] {
    const db = getDatabase();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

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
