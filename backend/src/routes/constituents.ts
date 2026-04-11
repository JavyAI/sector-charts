import { Router, Request, Response, NextFunction } from 'express';
import {
  fetchConstituentsFromGitHub,
  storeConstituents,
  getAllConstituents,
  getConstituentsBySector,
} from '../services/constituents.js';

const router = Router();

const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const VALID_GICS_SECTORS = new Set([
  'Information Technology',
  'Financials',
  'Health Care',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
]);

// GET /api/constituents
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const constituents = getAllConstituents();
  return res.json({ count: constituents.length, constituents });
}));

// GET /api/constituents/sector/:sector
router.get('/sector/:sector', asyncHandler(async (req: Request, res: Response) => {
  const { sector } = req.params;
  if (!VALID_GICS_SECTORS.has(sector)) {
    return res.status(400).json({
      error: `Invalid GICS sector. Valid sectors: ${[...VALID_GICS_SECTORS].join(', ')}`,
    });
  }
  const constituents = getConstituentsBySector(sector);
  return res.json({ sector, count: constituents.length, constituents });
}));

// POST /api/constituents/refresh
router.post('/refresh', asyncHandler(async (_req: Request, res: Response) => {
  const constituents = await fetchConstituentsFromGitHub();
  storeConstituents(constituents);
  return res.json({ message: 'Constituents refreshed', count: constituents.length });
}));

export default router;
