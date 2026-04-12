import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getWeeklyReturns,
  getLatestWeeklyReturnDate,
} from '../services/thetadata.js';

const router = Router();

// GET /api/stock-prices/weekly-returns?date=YYYY-MM-DD
router.get('/weekly-returns', asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const weekEndDate = date ?? getLatestWeeklyReturnDate();
  if (!weekEndDate) {
    return res.json({ returns: [], weekEndDate: null });
  }

  const returns = getWeeklyReturns(weekEndDate);
  return res.json({ returns, weekEndDate });
}));

// GET /api/stock-prices/latest — most recent week's returns
router.get('/latest', asyncHandler(async (_req: Request, res: Response) => {
  const weekEndDate = getLatestWeeklyReturnDate();
  if (!weekEndDate) {
    return res.json({ returns: [], weekEndDate: null });
  }

  const returns = getWeeklyReturns(weekEndDate);
  return res.json({ returns, weekEndDate });
}));

export default router;
