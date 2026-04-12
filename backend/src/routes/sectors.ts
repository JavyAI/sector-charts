import { Router, Request, Response } from 'express';
import { sectorService } from '../services/sector.js';
import { cacheService } from '../services/cache.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SectorMetric } from '../types.js';

const router = Router();

// GET /api/sectors/latest — returns the most recent date's sector data.
// Used as the Railway healthcheck target so the service stays healthy
// as long as any data exists (instead of 404 on a hardcoded date).
router.get('/latest', asyncHandler(async (req: Request, res: Response) => {
  const latestDate = sectorService.getLatestDate();
  if (!latestDate) {
    return res.status(503).json({ error: 'No sector data available yet' });
  }

  const cacheKey = `sectors:latest`;
  const cached = cacheService.get<{ date: string; sectors: SectorMetric[] }>(cacheKey);
  if (cached && cached.date === latestDate) {
    return res.json(cached);
  }

  const sectors = sectorService.getSectorsForDate(latestDate);
  if (sectors.length === 0) {
    return res.status(503).json({ error: 'No sector data available yet' });
  }

  const result = { date: latestDate, sectors };
  cacheService.set(cacheKey, result, 1); // 1-hour cache for healthcheck
  return res.json(result);
}));

// GET /api/sectors?date=YYYY-MM-DD
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const cacheKey = `sectors:${date}`;

  const cached = cacheService.get<{ date: string; sectors: SectorMetric[] }>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const sectors = sectorService.getSectorsForDate(date);
  if (sectors.length === 0) {
    return res.status(404).json({ error: `No sector data found for date ${date}` });
  }

  const result = { date, sectors };
  cacheService.set(cacheKey, result, 24);
  return res.json(result);
}));

// POST /api/sectors/seed — generate mock sector data for the last 7 days (bootstrap production)
router.post('/seed', asyncHandler(async (_req: Request, res: Response) => {
  const MOCK_DATA: Record<string, Array<{ symbol: string; companyName: string; marketCap: number; peRatio: number; eps: number; shares: number }>> = {
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

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  let total = 0;
  for (const date of dates) {
    const drift = 1 + (Math.random() - 0.5) * 0.04;
    const allMetrics = Object.entries(MOCK_DATA).map(([sector, stocks]) =>
      sectorService.aggregateToSector(date, sector, stocks.map(s => ({
        ...s,
        peRatio: Math.max(1, s.peRatio * drift),
        marketCap: s.marketCap * drift,
      }))),
    );
    sectorService.storeSectorMetrics(allMetrics);
    total += allMetrics.length;
  }

  return res.json({ success: true, rowsSeeded: total, dates });
}));

export default router;
