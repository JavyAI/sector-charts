import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  fetchBulkEod,
  storeStockPrices,
  computeWeeklyReturns,
  getWeeklyReturns,
  getLatestWeeklyReturnDate,
} from '../services/thetadata.js';
import { getAllConstituents } from '../services/constituents.js';
import { logger } from '../logger.js';

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

// POST /api/stock-prices/refresh — fetch latest EOD prices from ThetaTerminal and compute returns
router.post('/refresh', asyncHandler(async (_req: Request, res: Response) => {
  const constituents = getAllConstituents();
  if (constituents.length === 0) {
    return res.status(400).json({ error: 'No constituents in database. Call /api/constituents/refresh first.' });
  }

  const symbols = constituents.map((c) => c.symbol);

  // Fetch last 2 weeks of trading data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  logger.info({ symbolCount: symbols.length, start, end }, 'Starting stock price refresh');

  const priceMap = await fetchBulkEod(symbols, start, end);

  // Store all prices
  let totalPrices = 0;
  for (const prices of priceMap.values()) {
    storeStockPrices(prices);
    totalPrices += prices.length;
  }

  // Compute weekly returns for the most recent date
  computeWeeklyReturns(end);

  const latestDate = getLatestWeeklyReturnDate();
  const returnCount = latestDate ? getWeeklyReturns(latestDate).length : 0;

  logger.info({ totalPrices, returnCount, latestDate }, 'Stock price refresh complete');

  return res.json({
    success: true,
    symbolsFetched: priceMap.size,
    totalPrices,
    weeklyReturnsComputed: returnCount,
    latestWeekEndDate: latestDate,
  });
}));

export default router;
