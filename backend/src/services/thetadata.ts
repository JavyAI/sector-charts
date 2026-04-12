import axios from 'axios';
import { getDatabase } from '../db/connection.js';
import { logger } from '../logger.js';

const THETADATA_URL = process.env.THETADATA_URL || 'http://127.0.0.1:25503';
const REQUEST_TIMEOUT_MS = 10_000;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StockPrice {
  symbol: string;
  date: string;       // YYYY-MM-DD
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface StockWeeklyReturn {
  symbol: string;
  weekEndDate: string;    // YYYY-MM-DD
  weekStartDate: string;  // YYYY-MM-DD
  returnPct: number;
  closePrice: number | null;
  prevClosePrice: number | null;
  marketCapEstimate: number | null;
  sector?: string;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

/** Convert YYYY-MM-DD → YYYYMMDD for ThetaTerminal params */
export function toThetaDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/** Convert YYYYMMDD → YYYY-MM-DD for DB storage */
export function fromThetaDate(thetaDate: string): string {
  if (thetaDate.length !== 8) return thetaDate;
  return `${thetaDate.slice(0, 4)}-${thetaDate.slice(4, 6)}-${thetaDate.slice(6, 8)}`;
}

// ── ThetaTerminal API ──────────────────────────────────────────────────────────

interface ThetaEodBar {
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  count?: number;
  last_trade?: number;
  created?: string;
}

/**
 * Fetch EOD price history for a single symbol from ThetaTerminal.
 * startDate / endDate in YYYY-MM-DD format.
 */
export async function fetchStockEod(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<StockPrice[]> {
  const url = `${THETADATA_URL}/v3/stock/history/eod`;
  const response = await axios.get<{ response: ThetaEodBar[] }>(url, {
    params: {
      symbol,
      start_date: toThetaDate(startDate),
      end_date: toThetaDate(endDate),
      format: 'json',
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const bars = response.data?.response ?? [];

  // ThetaTerminal returns bars with date encoded in last_trade (ms epoch) or created field.
  // We derive dates by iterating in order — use the created field when available,
  // otherwise reconstruct from the date range.
  return bars.map((bar, idx) => {
    let date: string;
    if (bar.created) {
      // created is a string like "2026-04-07T00:00:00" — take date part
      date = bar.created.slice(0, 10);
    } else if (bar.last_trade && bar.last_trade > 0) {
      // last_trade is Unix ms timestamp
      date = new Date(bar.last_trade).toISOString().slice(0, 10);
    } else {
      // Fallback: compute from start date + idx (trading days approximation)
      // This is imprecise but better than nothing
      date = `idx-${idx}`;
    }
    return {
      symbol,
      date,
      open: bar.open ?? null,
      high: bar.high ?? null,
      low: bar.low ?? null,
      close: bar.close ?? null,
      volume: bar.volume ?? null,
    };
  });
}

/** Delay helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch EOD data for multiple symbols with rate limiting.
 * Returns a map of symbol → prices (only successful fetches).
 */
export async function fetchBulkEod(
  symbols: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, StockPrice[]>> {
  const result = new Map<string, StockPrice[]>();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const prices = await fetchStockEod(symbol, startDate, endDate);
          if (prices.length > 0) {
            result.set(symbol, prices);
            successCount++;
          }
        } catch (err) {
          errorCount++;
          logger.warn({ symbol, err }, `Failed to fetch EOD for ${symbol} — skipping`);
        }
      }),
    );

    const processed = Math.min(i + BATCH_SIZE, symbols.length);
    logger.info(
      { processed, total: symbols.length, successCount, errorCount },
      'Bulk EOD fetch progress',
    );

    // Delay between batches (not after the last one)
    if (i + BATCH_SIZE < symbols.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  logger.info(
    { successCount, errorCount, total: symbols.length },
    'Bulk EOD fetch complete',
  );
  return result;
}

// ── DB operations ──────────────────────────────────────────────────────────────

/** Upsert stock prices into the stock_prices table. */
export function storeStockPrices(prices: StockPrice[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO stock_prices
      (symbol, date, open, high, low, close, volume, last_updated)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: StockPrice[]) => {
    for (const row of rows) {
      insert.run(row.symbol, row.date, row.open, row.high, row.low, row.close, row.volume, now);
    }
  });

  insertMany(prices);
  logger.info({ count: prices.length }, 'Stored stock prices');
}

/**
 * Compute weekly returns for the given week-end date (Friday).
 * Looks up the Friday close and the prior Friday close from stock_prices.
 */
export function computeWeeklyReturns(weekEndDate: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find the most recent close on or before weekEndDate for each symbol,
  // then find the prior week's close (7 days prior window).
  const rows = db
    .prepare(
      `
      SELECT
        curr.symbol,
        curr.date           AS curr_date,
        curr.close          AS curr_close,
        prev.date           AS prev_date,
        prev.close          AS prev_close
      FROM stock_prices curr
      JOIN stock_prices prev
        ON curr.symbol = prev.symbol
       AND prev.date = (
         SELECT MAX(p2.date)
         FROM stock_prices p2
         WHERE p2.symbol = curr.symbol
           AND p2.date < curr.date
           AND p2.date >= date(curr.date, '-10 days')
           AND p2.close IS NOT NULL
       )
      WHERE curr.date = (
        SELECT MAX(s2.date)
        FROM stock_prices s2
        WHERE s2.symbol = curr.symbol
          AND s2.date <= ?
          AND s2.close IS NOT NULL
      )
        AND curr.close IS NOT NULL
        AND prev.close IS NOT NULL
        AND prev.close > 0
    `,
    )
    .all(weekEndDate) as Array<{
      symbol: string;
      curr_date: string;
      curr_close: number;
      prev_date: string;
      prev_close: number;
    }>;

  if (rows.length === 0) {
    logger.warn({ weekEndDate }, 'No price data found to compute weekly returns');
    return;
  }

  // Build a price-based market cap estimate per sector
  // Get sector totals from sector_metrics, distribute by relative price within each sector
  const sectorCaps = new Map<string, number>();
  const sectorPriceSums = new Map<string, number>();
  const symbolSectors = new Map<string, string>();

  const constituents = db.prepare(
    `SELECT symbol, gics_sector FROM constituents`
  ).all() as Array<{ symbol: string; gics_sector: string }>;

  for (const c of constituents) {
    symbolSectors.set(c.symbol, c.gics_sector);
  }

  const sectorMetrics = db.prepare(
    `SELECT sector, weightedMarketCap FROM sector_metrics WHERE date = (SELECT MAX(date) FROM sector_metrics)`
  ).all() as Array<{ sector: string; weightedMarketCap: number }>;

  for (const sm of sectorMetrics) {
    sectorCaps.set(sm.sector, sm.weightedMarketCap);
  }

  // Sum close prices per sector for proportional distribution
  for (const row of rows) {
    const sector = symbolSectors.get(row.symbol) ?? '';
    sectorPriceSums.set(sector, (sectorPriceSums.get(sector) ?? 0) + row.curr_close);
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO stock_weekly_returns
      (symbol, week_end_date, week_start_date, return_pct, close_price, prev_close_price, market_cap_estimate, last_updated)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction(
    (
      computedRows: Array<{
        symbol: string;
        curr_date: string;
        curr_close: number;
        prev_date: string;
        prev_close: number;
      }>,
    ) => {
      for (const row of computedRows) {
        const returnPct = ((row.curr_close - row.prev_close) / row.prev_close) * 100;
        const sector = symbolSectors.get(row.symbol) ?? '';
        const totalSectorCap = sectorCaps.get(sector) ?? 0;
        const totalSectorPriceSum = sectorPriceSums.get(sector) ?? 1;
        const marketCapEstimate = totalSectorCap > 0
          ? (row.curr_close / totalSectorPriceSum) * totalSectorCap
          : null;
        insert.run(
          row.symbol,
          row.curr_date,
          row.prev_date,
          returnPct,
          row.curr_close,
          row.prev_close,
          marketCapEstimate,
          now,
        );
      }
    },
  );

  insertMany(rows);
  logger.info({ count: rows.length, weekEndDate }, 'Computed weekly returns');
}

/** Retrieve stored weekly returns for a given week-end date, joined with sector info. */
export function getWeeklyReturns(weekEndDate: string): StockWeeklyReturn[] {
  const db = getDatabase();

  const rows = db
    .prepare(
      `
      SELECT
        wr.symbol,
        wr.week_end_date,
        wr.week_start_date,
        wr.return_pct,
        wr.close_price,
        wr.prev_close_price,
        wr.market_cap_estimate,
        c.gics_sector AS sector
      FROM stock_weekly_returns wr
      LEFT JOIN constituents c ON wr.symbol = c.symbol
      WHERE wr.week_end_date = ?
      ORDER BY wr.symbol ASC
    `,
    )
    .all(weekEndDate) as Array<{
      symbol: string;
      week_end_date: string;
      week_start_date: string;
      return_pct: number;
      close_price: number | null;
      prev_close_price: number | null;
      market_cap_estimate: number | null;
      sector: string | null;
    }>;

  return rows.map((r) => ({
    symbol: r.symbol,
    weekEndDate: r.week_end_date,
    weekStartDate: r.week_start_date,
    returnPct: r.return_pct,
    closePrice: r.close_price,
    prevClosePrice: r.prev_close_price,
    marketCapEstimate: r.market_cap_estimate,
    sector: r.sector ?? undefined,
  }));
}

/** Return the most recent week_end_date that has data in stock_weekly_returns. */
export function getLatestWeeklyReturnDate(): string | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT MAX(week_end_date) AS latest FROM stock_weekly_returns')
    .get() as { latest: string | null };
  return row?.latest ?? null;
}
