import { Router, Request, Response, NextFunction } from 'express';
import {
  fetchShillerData,
  storeShillerData,
  getShillerDataRange,
  getMarketHistoricalPE,
} from '../services/shiller.js';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// GET /api/shiller/market-pe?years=10
router.get(
  '/market-pe',
  asyncHandler(async (req: Request, res: Response) => {
    const yearsParam = req.query.years as string | undefined;

    let years: number;
    if (!yearsParam || yearsParam.toUpperCase() === 'ALL') {
      years = 0; // 0 means all history
    } else {
      years = parseInt(yearsParam, 10);
      if (isNaN(years) || years < 1) {
        return res.status(400).json({ error: 'Invalid years parameter. Use a positive integer or ALL.' });
      }
    }

    const stats = getMarketHistoricalPE(years);
    return res.json({ years: years === 0 ? 'ALL' : years, stats });
  }),
);

// GET /api/shiller/history?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      return res.status(400).json({ error: 'Invalid start date. Use YYYY-MM-DD format.' });
    }
    if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return res.status(400).json({ error: 'Invalid end date. Use YYYY-MM-DD format.' });
    }
    if (start > end) {
      return res.status(400).json({ error: 'start date must be before end date.' });
    }

    const data = getShillerDataRange(start, end);
    return res.json({ start, end, count: data.length, data });
  }),
);

// POST /api/shiller/refresh
router.post(
  '/refresh',
  asyncHandler(async (_req: Request, res: Response) => {
    const points = await fetchShillerData();
    storeShillerData(points);
    return res.json({ success: true, count: points.length });
  }),
);

export default router;
