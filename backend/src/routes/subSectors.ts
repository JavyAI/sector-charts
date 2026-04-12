import { Router, Request, Response } from 'express';
import { getConstituentsBySector } from '../services/constituents.js';
import { getSparklineData, getLatestWeeklyReturnsBulk } from '../services/subSectorData.js';
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
  const symbols = constituents.map((c) => c.symbol);

  // Batch queries — one for sparklines, one for weekly returns
  const [sparklines, weeklyReturns] = await Promise.all([
    Promise.resolve(getSparklineData(symbols, 20)),
    Promise.resolve(getLatestWeeklyReturnsBulk(symbols)),
  ]);

  // Build constituent objects
  const constituentData = constituents.map((c) => {
    const wr = weeklyReturns.get(c.symbol);
    return {
      symbol: c.symbol,
      security: c.security,
      subIndustry: c.gics_sub_industry || 'Unknown',
      weeklyReturn: wr?.returnPct ?? 0,
      closePrice: wr?.closePrice ?? null,
      sparkline: sparklines.get(c.symbol) ?? [],
    };
  });

  // Group by sub-industry
  const subIndustryMap = new Map<string, string[]>();
  for (const c of constituents) {
    const subIndustry = c.gics_sub_industry || 'Unknown';
    if (!subIndustryMap.has(subIndustry)) {
      subIndustryMap.set(subIndustry, []);
    }
    subIndustryMap.get(subIndustry)!.push(c.symbol);
  }

  // Build sub-industry summary with average weekly return
  const subIndustries = [...subIndustryMap.entries()]
    .map(([name, syms]) => {
      const returns = syms
        .map((s) => weeklyReturns.get(s)?.returnPct)
        .filter((r): r is number => r !== undefined);
      const avgWeeklyReturn =
        returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      return {
        name,
        count: syms.length,
        avgWeeklyReturn: Math.round(avgWeeklyReturn * 100) / 100,
        constituents: syms.sort(),
      };
    })
    .sort((a, b) => b.avgWeeklyReturn - a.avgWeeklyReturn);

  return res.json({
    sector: decodedSector,
    subIndustries,
    constituents: constituentData,
  });
}));

export default router;
