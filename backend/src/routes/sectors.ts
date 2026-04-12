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

export default router;
