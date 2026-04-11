import axios from 'axios';
import { getDatabase } from '../db/connection.js';

export interface ShillerDataPoint {
  date: string;
  sp500Price: number;
  dividend: number;
  earnings: number;
  cpi: number;
  longRate: number;
  realPrice: number;
  realDividend: number;
  realEarnings: number;
  peRatio: number;
  cape: number;
}

export interface MarketPEStats {
  median: number;
  mean: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

const SHILLER_JSON_URL = 'https://posix4e.github.io/shiller_wrapper_data/data.json';
const SHILLER_CSV_URL =
  'https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv';

function parseNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function normalizeDate(raw: string): string {
  // Accepts "1871-01-01" or "1871-01" formats — normalize to YYYY-MM-01
  const parts = raw.trim().split('-');
  const year = parts[0] || '1970';
  const month = parts[1] || '01';
  return `${year}-${month}-01`;
}

function parseCSV(csv: string): ShillerDataPoint[] {
  const lines = csv.trim().split('\n');
  // First line is header: Date,SP500,Dividend,Earnings,Consumer Price Index,Long Interest Rate,Real Price,Real Dividend,Real Earnings,PE10
  const points: ShillerDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 10) continue;
    const dateRaw = cols[0].trim();
    if (!dateRaw) continue;

    points.push({
      date: normalizeDate(dateRaw),
      sp500Price: parseNumber(cols[1]),
      dividend: parseNumber(cols[2]),
      earnings: parseNumber(cols[3]),
      cpi: parseNumber(cols[4]),
      longRate: parseNumber(cols[5]),
      realPrice: parseNumber(cols[6]),
      realDividend: parseNumber(cols[7]),
      realEarnings: parseNumber(cols[8]),
      peRatio: 0, // not in CSV directly — computed or left 0
      cape: parseNumber(cols[9]),
    });
  }

  return points;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(data: any[]): ShillerDataPoint[] {
  return data.map((row) => ({
    date: normalizeDate(String(row.date || row.Date || '')),
    sp500Price: parseNumber(row.sp500 || row.SP500 || row.price),
    dividend: parseNumber(row.dividend || row.Dividend),
    earnings: parseNumber(row.earnings || row.Earnings),
    cpi: parseNumber(row.cpi || row['Consumer Price Index']),
    longRate: parseNumber(row.longRate || row['Long Interest Rate']),
    realPrice: parseNumber(row.realPrice || row['Real Price']),
    realDividend: parseNumber(row.realDividend || row['Real Dividend']),
    realEarnings: parseNumber(row.realEarnings || row['Real Earnings']),
    peRatio: parseNumber(row.peRatio || row.pe || row.PE),
    cape: parseNumber(row.cape || row.CAPE || row.PE10),
  }));
}

export async function fetchShillerData(): Promise<ShillerDataPoint[]> {
  // Try JSON first
  try {
    const response = await axios.get(SHILLER_JSON_URL, { timeout: 15000 });
    if (response.status === 200 && Array.isArray(response.data)) {
      const points = parseJSON(response.data);
      if (points.length > 0) {
        return points;
      }
    }
  } catch {
    // fall through to CSV
  }

  // CSV fallback
  const response = await axios.get(SHILLER_CSV_URL, {
    timeout: 30000,
    responseType: 'text',
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch Shiller CSV: HTTP ${response.status}`);
  }

  const points = parseCSV(response.data as string);
  if (points.length === 0) {
    throw new Error('Shiller CSV parsed to 0 data points');
  }

  return points;
}

export function storeShillerData(points: ShillerDataPoint[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO shiller_historical
      (date, sp500_price, dividend, earnings, cpi, long_rate, real_price, real_dividend, real_earnings, pe_ratio, cape, last_updated)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: ShillerDataPoint[]) => {
    for (const row of rows) {
      insert.run(
        row.date,
        row.sp500Price,
        row.dividend,
        row.earnings,
        row.cpi,
        row.longRate,
        row.realPrice,
        row.realDividend,
        row.realEarnings,
        row.peRatio,
        row.cape,
        now,
      );
    }
  });

  insertMany(points);
}

export function getShillerDataRange(startDate: string, endDate: string): ShillerDataPoint[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM shiller_historical
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`,
    )
    .all(startDate, endDate) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    date: r.date as string,
    sp500Price: r.sp500_price as number,
    dividend: r.dividend as number,
    earnings: r.earnings as number,
    cpi: r.cpi as number,
    longRate: r.long_rate as number,
    realPrice: r.real_price as number,
    realDividend: r.real_dividend as number,
    realEarnings: r.real_earnings as number,
    peRatio: r.pe_ratio as number,
    cape: r.cape as number,
  }));
}

export function getMarketHistoricalPE(years: number): MarketPEStats {
  const db = getDatabase();

  let rows: Array<{ cape: number; pe_ratio: number }>;

  if (years <= 0) {
    // ALL history
    rows = db
      .prepare(
        `SELECT cape, pe_ratio FROM shiller_historical
         WHERE cape > 0
         ORDER BY date ASC`,
      )
      .all() as Array<{ cape: number; pe_ratio: number }>;
  } else {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    rows = db
      .prepare(
        `SELECT cape, pe_ratio FROM shiller_historical
         WHERE date >= ? AND cape > 0
         ORDER BY date ASC`,
      )
      .all(cutoffStr) as Array<{ cape: number; pe_ratio: number }>;
  }

  if (rows.length === 0) {
    return { median: 0, mean: 0, min: 0, max: 0, p25: 0, p75: 0 };
  }

  const values = rows.map((r) => r.cape).sort((a, b) => a - b);
  const n = values.length;

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const min = values[0];
  const max = values[n - 1];

  const percentile = (p: number): number => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return values[lo];
    return values[lo] + (values[hi] - values[lo]) * (idx - lo);
  };

  return {
    median: percentile(50),
    mean,
    min,
    max,
    p25: percentile(25),
    p75: percentile(75),
  };
}
