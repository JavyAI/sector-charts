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

// POST /api/sectors/seed — generate sector data using ALL constituents from DB
router.post('/seed', asyncHandler(async (_req: Request, res: Response) => {
  const { getAllConstituents } = await import('../services/constituents.js');
  const { getDatabase } = await import('../db/connection.js');
  const db = getDatabase();

  const constituents = getAllConstituents();
  if (constituents.length === 0) {
    return res.status(400).json({ error: 'No constituents in DB. Call /api/constituents/refresh first.' });
  }

  // Clear old sector metrics and cache before re-seeding
  db.exec('DELETE FROM sector_metrics');
  db.exec('DELETE FROM cache');

  // Sector-level P/E ranges (realistic medians for generating per-stock values)
  const sectorPeRanges: Record<string, [number, number]> = {
    'Information Technology': [25, 55],
    'Consumer Discretionary': [20, 75],
    'Communication Services': [18, 42],
    'Health Care': [15, 58],
    'Financials': [8, 18],
    'Industrials': [14, 34],
    'Consumer Staples': [20, 52],
    'Energy': [8, 18],
    'Utilities': [15, 25],
    'Real Estate': [25, 45],
    'Materials': [18, 35],
  };

  // Total S&P 500 market cap ~$50T, distributed by sector weight
  const sectorWeights: Record<string, number> = {
    'Information Technology': 0.32,
    'Financials': 0.13,
    'Health Care': 0.12,
    'Consumer Discretionary': 0.10,
    'Communication Services': 0.09,
    'Industrials': 0.08,
    'Consumer Staples': 0.06,
    'Energy': 0.04,
    'Utilities': 0.02,
    'Real Estate': 0.02,
    'Materials': 0.02,
  };
  const totalMarketCap = 50_000_000_000_000;

  // Group constituents by sector
  const bySector = new Map<string, typeof constituents>();
  for (const c of constituents) {
    const list = bySector.get(c.gics_sector) ?? [];
    list.push(c);
    bySector.set(c.gics_sector, list);
  }

  // Also use real stock prices from DB if available for market cap estimation
  const latestPrices = new Map<string, number>();
  const priceRows = db.prepare(
    `SELECT symbol, close FROM stock_prices WHERE date = (SELECT MAX(date) FROM stock_prices) AND close IS NOT NULL`
  ).all() as Array<{ symbol: string; close: number }>;
  for (const p of priceRows) {
    latestPrices.set(p.symbol, p.close);
  }

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Simple hash for deterministic but varied per-stock values
  function hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  let total = 0;
  for (const date of dates) {
    const drift = 1 + (Math.random() - 0.5) * 0.04;

    for (const [sector, stocks] of bySector.entries()) {
      const [peLow, peHigh] = sectorPeRanges[sector] ?? [15, 30];
      const weight = sectorWeights[sector] ?? 0.02;
      const sectorCap = totalMarketCap * weight;

      // Distribute cap using real prices if available, otherwise by hash
      const totalPriceSum = stocks.reduce((s, c) => s + (latestPrices.get(c.symbol) ?? (hash(c.symbol) % 500 + 10)), 0);

      const stockFundamentals = stocks.map(c => {
        const price = latestPrices.get(c.symbol) ?? (hash(c.symbol) % 500 + 10);
        const capShare = price / totalPriceSum;
        const marketCap = sectorCap * capShare * drift;
        const peBase = peLow + (hash(c.symbol + sector) % 100) / 100 * (peHigh - peLow);
        const peRatio = Math.max(1, peBase * drift);
        const eps = price / peRatio;
        const shares = marketCap / price;
        return {
          symbol: c.symbol,
          companyName: c.security,
          marketCap,
          peRatio,
          eps,
          shares,
        };
      });

      const metric = sectorService.aggregateToSector(date, sector, stockFundamentals);
      sectorService.storeSectorMetrics([metric]);
      total++;
    }
  }

  return res.json({ success: true, rowsSeeded: total, totalConstituents: constituents.length, dates });
}));

export default router;
