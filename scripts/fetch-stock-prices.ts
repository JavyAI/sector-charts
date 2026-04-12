import { initializeDatabase, getDatabase } from '../backend/src/db/connection.js';
import {
  fetchBulkEod,
  storeStockPrices,
  computeWeeklyReturns,
} from '../backend/src/services/thetadata.js';

/**
 * Returns the most recent Friday on or before the given date.
 */
function lastFriday(from: Date = new Date()): Date {
  const d = new Date(from);
  // getDay(): 0=Sun, 1=Mon, ... 5=Fri, 6=Sat
  const day = d.getDay();
  const daysBack = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  // 1. Initialize DB
  initializeDatabase();
  const db = getDatabase();

  // 2. Get all constituents
  const constituents = db
    .prepare('SELECT symbol FROM constituents ORDER BY symbol ASC')
    .all() as Array<{ symbol: string }>;

  if (constituents.length === 0) {
    console.error('No constituents found. Run fetch-constituents first.');
    process.exit(1);
  }

  const symbols = constituents.map((c) => c.symbol);
  console.log(`Found ${symbols.length} constituents`);

  // 3. Determine date range: two full weeks (last 2 Fridays → today)
  const thisFriday = lastFriday();
  const prevFriday = lastFriday(new Date(thisFriday.getTime() - 7 * 24 * 60 * 60 * 1000));
  // Start from prevFriday - 3 trading days buffer so prev week close is captured
  const startDate = toIso(new Date(prevFriday.getTime() - 3 * 24 * 60 * 60 * 1000));
  const endDate = toIso(thisFriday);

  console.log(`Fetching EOD prices from ${startDate} to ${endDate}`);

  // 4. Fetch EOD prices for all symbols (batched, rate-limited)
  const priceMap = await fetchBulkEod(symbols, startDate, endDate);

  // 5. Store prices
  const allPrices = Array.from(priceMap.values()).flat();
  storeStockPrices(allPrices);
  console.log(`Stored ${allPrices.length} price records for ${priceMap.size} symbols`);

  // 6. Compute weekly returns for this week's Friday
  const weekEndDate = toIso(thisFriday);
  computeWeeklyReturns(weekEndDate);
  console.log(`Computed weekly returns for week ending ${weekEndDate}`);

  // 7. Report stats
  const returnCount = db
    .prepare('SELECT COUNT(*) AS cnt FROM stock_weekly_returns WHERE week_end_date = ?')
    .get(weekEndDate) as { cnt: number };

  console.log(`\nSummary:`);
  console.log(`  Symbols fetched:       ${priceMap.size} / ${symbols.length}`);
  console.log(`  Price records stored:  ${allPrices.length}`);
  console.log(`  Weekly returns stored: ${returnCount.cnt}`);
  console.log(`  Week end date:         ${weekEndDate}`);

  // Sample output
  const sample = db
    .prepare(
      `SELECT wr.symbol, wr.return_pct, wr.close_price, c.gics_sector
       FROM stock_weekly_returns wr
       LEFT JOIN constituents c ON wr.symbol = c.symbol
       WHERE wr.week_end_date = ?
       ORDER BY ABS(wr.return_pct) DESC
       LIMIT 10`,
    )
    .all(weekEndDate) as Array<{
      symbol: string;
      return_pct: number;
      close_price: number;
      gics_sector: string;
    }>;

  if (sample.length > 0) {
    console.log(`\nTop movers (by absolute return):`);
    for (const row of sample) {
      const sign = row.return_pct >= 0 ? '+' : '';
      console.log(
        `  ${row.symbol.padEnd(6)} ${sign}${row.return_pct.toFixed(2)}%  $${row.close_price?.toFixed(2)}  [${row.gics_sector}]`,
      );
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('fetch-stock-prices failed:', err);
  process.exit(1);
});
