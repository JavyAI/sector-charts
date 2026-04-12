import { initializeDatabase } from '../backend/src/db/connection.js';
import { sectorService } from '../backend/src/services/sector.js';
import { StockFundamental } from '../backend/src/types.js';

/**
 * Development seed data using official GICS sector names.
 * Produces all 11 sectors with realistic market caps and P/E ratios
 * so the premium dashboard (KPI row, donut, sortable table) has rich data to render.
 *
 * Values approximate real market composition as of early 2026 — they are placeholders
 * until a real Polygon data pipeline is wired up.
 */
const MOCK_DATA: Record<string, StockFundamental[]> = {
  'Information Technology': [
    { symbol: 'AAPL', companyName: 'Apple', marketCap: 3_500_000_000_000, peRatio: 31, eps: 6.4, shares: 15_000_000_000 },
    { symbol: 'MSFT', companyName: 'Microsoft', marketCap: 3_200_000_000_000, peRatio: 36, eps: 12, shares: 7_400_000_000 },
    { symbol: 'NVDA', companyName: 'NVIDIA', marketCap: 3_000_000_000_000, peRatio: 55, eps: 2.2, shares: 24_600_000_000 },
    { symbol: 'AVGO', companyName: 'Broadcom', marketCap: 800_000_000_000, peRatio: 38, eps: 4.5, shares: 4_650_000_000 },
  ],
  'Financials': [
    { symbol: 'JPM', companyName: 'JPMorgan Chase', marketCap: 700_000_000_000, peRatio: 13, eps: 19, shares: 2_820_000_000 },
    { symbol: 'BAC', companyName: 'Bank of America', marketCap: 350_000_000_000, peRatio: 14, eps: 3.2, shares: 7_700_000_000 },
    { symbol: 'WFC', companyName: 'Wells Fargo', marketCap: 240_000_000_000, peRatio: 12, eps: 5.1, shares: 3_400_000_000 },
    { symbol: 'BRK.B', companyName: 'Berkshire Hathaway', marketCap: 900_000_000_000, peRatio: 10, eps: 42, shares: 2_180_000_000 },
  ],
  'Health Care': [
    { symbol: 'UNH', companyName: 'UnitedHealth', marketCap: 520_000_000_000, peRatio: 22, eps: 25, shares: 920_000_000 },
    { symbol: 'LLY', companyName: 'Eli Lilly', marketCap: 750_000_000_000, peRatio: 58, eps: 14, shares: 950_000_000 },
    { symbol: 'JNJ', companyName: 'Johnson & Johnson', marketCap: 410_000_000_000, peRatio: 17, eps: 9, shares: 2_400_000_000 },
  ],
  'Consumer Discretionary': [
    { symbol: 'AMZN', companyName: 'Amazon', marketCap: 1_900_000_000_000, peRatio: 45, eps: 4.1, shares: 10_500_000_000 },
    { symbol: 'TSLA', companyName: 'Tesla', marketCap: 800_000_000_000, peRatio: 75, eps: 3.4, shares: 3_180_000_000 },
    { symbol: 'HD', companyName: 'Home Depot', marketCap: 400_000_000_000, peRatio: 26, eps: 15, shares: 990_000_000 },
  ],
  'Communication Services': [
    { symbol: 'GOOGL', companyName: 'Alphabet', marketCap: 2_100_000_000_000, peRatio: 27, eps: 6.5, shares: 12_400_000_000 },
    { symbol: 'META', companyName: 'Meta Platforms', marketCap: 1_400_000_000_000, peRatio: 29, eps: 19, shares: 2_530_000_000 },
    { symbol: 'NFLX', companyName: 'Netflix', marketCap: 280_000_000_000, peRatio: 42, eps: 16, shares: 425_000_000 },
  ],
  'Industrials': [
    { symbol: 'CAT', companyName: 'Caterpillar', marketCap: 180_000_000_000, peRatio: 16, eps: 22, shares: 490_000_000 },
    { symbol: 'GE', companyName: 'GE Aerospace', marketCap: 200_000_000_000, peRatio: 34, eps: 5.4, shares: 1_090_000_000 },
    { symbol: 'UNP', companyName: 'Union Pacific', marketCap: 150_000_000_000, peRatio: 21, eps: 11, shares: 610_000_000 },
  ],
  'Consumer Staples': [
    { symbol: 'WMT', companyName: 'Walmart', marketCap: 650_000_000_000, peRatio: 30, eps: 2.7, shares: 8_050_000_000 },
    { symbol: 'PG', companyName: 'Procter & Gamble', marketCap: 400_000_000_000, peRatio: 25, eps: 6.6, shares: 2_360_000_000 },
    { symbol: 'COST', companyName: 'Costco', marketCap: 380_000_000_000, peRatio: 52, eps: 16, shares: 443_000_000 },
  ],
  'Energy': [
    { symbol: 'XOM', companyName: 'ExxonMobil', marketCap: 470_000_000_000, peRatio: 13, eps: 9, shares: 4_400_000_000 },
    { symbol: 'CVX', companyName: 'Chevron', marketCap: 290_000_000_000, peRatio: 14, eps: 11, shares: 1_830_000_000 },
  ],
  'Utilities': [
    { symbol: 'NEE', companyName: 'NextEra Energy', marketCap: 160_000_000_000, peRatio: 21, eps: 3.7, shares: 2_050_000_000 },
    { symbol: 'SO', companyName: 'Southern Company', marketCap: 92_000_000_000, peRatio: 19, eps: 4.4, shares: 1_100_000_000 },
  ],
  'Real Estate': [
    { symbol: 'PLD', companyName: 'Prologis', marketCap: 110_000_000_000, peRatio: 35, eps: 3.4, shares: 930_000_000 },
    { symbol: 'AMT', companyName: 'American Tower', marketCap: 95_000_000_000, peRatio: 40, eps: 5.1, shares: 466_000_000 },
  ],
  'Materials': [
    { symbol: 'LIN', companyName: 'Linde', marketCap: 220_000_000_000, peRatio: 30, eps: 15, shares: 470_000_000 },
    { symbol: 'SHW', companyName: 'Sherwin-Williams', marketCap: 90_000_000_000, peRatio: 33, eps: 10.7, shares: 253_000_000 },
  ],
};

/**
 * Seed the last N days so the time-lapse control has history to scrub through.
 */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

async function seedData() {
  try {
    initializeDatabase();

    // Seed today + 6 days back
    const dates = [0, 1, 2, 3, 4, 5, 6].map(daysAgo);

    let total = 0;
    for (const date of dates) {
      // Small daily drift so time-lapse produces visible change
      const drift = 1 + (Math.random() - 0.5) * 0.04; // ±2%

      const adjustedData: Record<string, StockFundamental[]> = {};
      for (const [sector, stocks] of Object.entries(MOCK_DATA)) {
        adjustedData[sector] = stocks.map((s) => ({
          ...s,
          peRatio: Math.max(1, s.peRatio * drift),
          marketCap: s.marketCap * drift,
        }));
      }

      const allMetrics = Object.entries(adjustedData).map(([sector, stocks]) =>
        sectorService.aggregateToSector(date, sector, stocks),
      );
      await sectorService.storeSectorMetrics(allMetrics);
      total += allMetrics.length;
    }

    console.log(`✅ Seeded ${total} sector rows across ${dates.length} days (${dates[dates.length - 1]} → ${dates[0]})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
