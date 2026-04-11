import { Router, Request, Response, NextFunction } from 'express';
import { sectorService } from '../services/sector.js';
import { cacheService } from '../services/cache.js';

const router = Router();

const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/sectors?date=YYYY-MM-DD
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  const cacheKey = `sectors:${date}`;

  const cached = cacheService.get<{ date: string; sectors: any[] }>(cacheKey);
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

// GET /api/sectors/:sectorName?date=YYYY-MM-DD
router.get('/:sectorName', asyncHandler(async (req: Request, res: Response) => {
  const sectorName = req.params.sectorName;
  if (!sectorName || !/^[a-zA-Z\s]+$/.test(sectorName)) {
    return res.status(400).json({ error: 'Invalid sector name.' });
  }
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const sectors = sectorService.getSectorsForDate(date);
  const current = sectors.find((s) => s.sector === sectorName);
  if (!current) {
    return res.status(404).json({ error: `Sector '${sectorName}' not found for date ${date}` });
  }

  const allHistory = sectorService.getSectorHistory(sectorName);
  // Exclude the current date so historical averages are not self-referential
  const history = allHistory.filter((h) => h.date < current.date);

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const fiveYearStr = fiveYearsAgo.toISOString().split('T')[0];

  const history5yr = history.filter((h) => h.date >= fiveYearStr);

  const avg5yr =
    history5yr.length > 0
      ? history5yr.reduce((sum, h) => sum + h.weightedPeRatio, 0) / history5yr.length
      : 0;

  const avg10yr =
    history.length > 0
      ? history.reduce((sum, h) => sum + h.weightedPeRatio, 0) / history.length
      : 0;

  const peRatioPctChange5Yr = sectorService.calculatePeChangePercentage(
    current.weightedPeRatio,
    avg5yr,
  );
  const peRatioPctChange10Yr = sectorService.calculatePeChangePercentage(
    current.weightedPeRatio,
    avg10yr,
  );

  return res.json({
    ...current,
    weightedPeRatio: Math.round(current.weightedPeRatio * 10) / 10,
    equalWeightPeRatio: Math.round(current.equalWeightPeRatio * 10) / 10,
    peRatioPctChange5Yr,
    peRatioPctChange10Yr,
  });
}));

// GET /api/sectors/:sectorName/history?days=365
router.get('/:sectorName/history', asyncHandler(async (req: Request, res: Response) => {
  const { sectorName } = req.params;
  const days = parseInt((req.query.days as string) || '365', 10);
  if (isNaN(days) || days < 1 || days > 3650) {
    return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 3650.' });
  }

  const history = sectorService.getSectorHistory(sectorName, days);
  if (history.length === 0) {
    return res.status(404).json({ error: `No history found for sector '${sectorName}'` });
  }

  return res.json({
    sector: sectorName,
    dataPoints: history.length,
    history,
  });
}));

export default router;
