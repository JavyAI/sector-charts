import { Router, Request, Response } from 'express';
import { getConstituentsBySector } from '../services/constituents.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

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

// GET /api/sub-sectors/:sector
router.get('/:sector', asyncHandler(async (req: Request, res: Response) => {
  const { sector } = req.params;
  const decodedSector = decodeURIComponent(sector);

  if (!VALID_GICS_SECTORS.has(decodedSector)) {
    return res.status(400).json({
      error: `Invalid GICS sector. Valid sectors: ${[...VALID_GICS_SECTORS].join(', ')}`,
    });
  }

  const constituents = getConstituentsBySector(decodedSector);

  // Group by sub-industry
  const subIndustryMap = new Map<string, string[]>();
  for (const c of constituents) {
    const subIndustry = c.gics_sub_industry || 'Unknown';
    if (!subIndustryMap.has(subIndustry)) {
      subIndustryMap.set(subIndustry, []);
    }
    subIndustryMap.get(subIndustry)!.push(c.symbol);
  }

  const subIndustries = [...subIndustryMap.entries()]
    .map(([name, syms]) => ({ name, count: syms.length, constituents: syms.sort() }))
    .sort((a, b) => b.count - a.count);

  return res.json({ sector: decodedSector, subIndustries });
}));

export default router;
