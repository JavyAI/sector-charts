import { Router, Request, Response } from 'express';
import { sectorService } from '../services/sector.js';
import { cacheService } from '../services/cache.js';

const router = Router();

// GET /api/sectors?date=YYYY-MM-DD
router.get('/', (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
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
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sectors/:sectorName?date=YYYY-MM-DD
router.get('/:sectorName', (req: Request, res: Response) => {
  try {
    const { sectorName } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const sectors = sectorService.getSectorsForDate(date);
    const current = sectors.find((s) => s.sector === sectorName);
    if (!current) {
      return res.status(404).json({ error: `Sector '${sectorName}' not found for date ${date}` });
    }

    const history = sectorService.getSectorHistory(sectorName);

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
      peRatioPctChange5Yr,
      peRatioPctChange10Yr,
      ytdReturn: 0,
    });
  } catch (error) {
    console.error('Error fetching sector detail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sectors/:sectorName/history?days=365
router.get('/:sectorName/history', (req: Request, res: Response) => {
  try {
    const { sectorName } = req.params;
    const days = parseInt((req.query.days as string) || '365', 10);

    const history = sectorService.getSectorHistory(sectorName, days);
    if (history.length === 0) {
      return res.status(404).json({ error: `No history found for sector '${sectorName}'` });
    }

    return res.json({
      sector: sectorName,
      dataPoints: history.length,
      history,
    });
  } catch (error) {
    console.error('Error fetching sector history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
