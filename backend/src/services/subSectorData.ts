import { getDatabase } from '../db/connection.js';
import { logger } from '../logger.js';

/**
 * Fetch sparkline data (last N close prices, oldest→newest) for multiple symbols in one query.
 * Returns a Map<symbol, number[]>.
 */
export function getSparklineData(symbols: string[], days: number = 20): Map<string, number[]> {
  if (symbols.length === 0) return new Map();

  const db = getDatabase();
  const placeholders = symbols.map(() => '?').join(', ');

  const rows = db
    .prepare(
      `SELECT symbol, date, close FROM stock_prices
       WHERE symbol IN (${placeholders}) AND close IS NOT NULL
       ORDER BY symbol, date DESC`,
    )
    .all(...symbols) as Array<{ symbol: string; date: string; close: number }>;

  // Group by symbol and take first N rows (DESC order = most recent first), then reverse
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    if (!grouped.has(row.symbol)) {
      grouped.set(row.symbol, []);
    }
    const arr = grouped.get(row.symbol)!;
    if (arr.length < days) {
      arr.push(row.close);
    }
  }

  // Reverse each array so it goes oldest→newest
  const result = new Map<string, number[]>();
  for (const [symbol, prices] of grouped) {
    result.set(symbol, prices.reverse());
  }

  logger.debug({ symbolCount: symbols.length, resultCount: result.size }, 'getSparklineData complete');
  return result;
}

/**
 * Fetch the most recent weekly returns for multiple symbols in one query.
 * Returns a Map<symbol, { returnPct: number; closePrice: number | null }>.
 */
export function getLatestWeeklyReturnsBulk(
  symbols: string[],
): Map<string, { returnPct: number; closePrice: number | null }> {
  if (symbols.length === 0) return new Map();

  const db = getDatabase();
  const placeholders = symbols.map(() => '?').join(', ');

  const rows = db
    .prepare(
      `SELECT wr.symbol, wr.return_pct, wr.close_price
       FROM stock_weekly_returns wr
       WHERE wr.symbol IN (${placeholders})
         AND wr.week_end_date = (
           SELECT MAX(week_end_date) FROM stock_weekly_returns
         )`,
    )
    .all(...symbols) as Array<{
    symbol: string;
    return_pct: number;
    close_price: number | null;
  }>;

  const result = new Map<string, { returnPct: number; closePrice: number | null }>();
  for (const row of rows) {
    result.set(row.symbol, { returnPct: row.return_pct, closePrice: row.close_price });
  }

  logger.debug({ symbolCount: symbols.length, resultCount: result.size }, 'getLatestWeeklyReturnsBulk complete');
  return result;
}
