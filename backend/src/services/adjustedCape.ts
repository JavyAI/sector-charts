import { getDatabase } from '../db/connection.js';

export interface InterestRateContext {
  current: number;
  historical10yAvg: number;
  historicalLongtermAvg: number;
}

export interface AdjustmentBreakdown {
  interestRate: number; // how much the IR adjustment shifts CAPE
  total: number;        // total adjustment applied
}

export interface AdjustedCapeResult {
  traditionalCape: number;
  adjustedCape: number;
  excessCapeYield: number; // (1/CAPE) - real_long_rate — Shiller's ECY
  rateType: 'real'; // ECY uses real rates (nominal minus inflation)
  interestRateContext: InterestRateContext;
  adjustments: AdjustmentBreakdown;
}

interface ShillerRow {
  date: string;
  cape: number;
  long_rate: number;
  cpi: number;
}

/**
 * Compute the 10-year real interest rate at a given index in the data array.
 * Real rate = nominal rate - 10-year realized CPI inflation.
 * If we don't have 120 months of prior CPI data, we fall back to just the nominal rate.
 */
function realRate(rows: ShillerRow[], idx: number): number {
  const nominalRate = rows[idx].long_rate / 100;
  const lookback = 120; // 10 years of months
  if (idx < lookback) {
    // Not enough history — use nominal rate as proxy
    return nominalRate;
  }
  const cpiNow = rows[idx].cpi;
  const cpiThen = rows[idx - lookback].cpi;
  if (!cpiThen || cpiThen <= 0) return nominalRate;
  const annualizedInflation = Math.pow(cpiNow / cpiThen, 1 / 10) - 1;
  return nominalRate - annualizedInflation;
}

/**
 * Compute Adjusted CAPE and Excess CAPE Yield (ECY) from the SQLite DB.
 *
 * Math:
 *   Traditional CAPE = Shiller's 10-year real earnings P/E (stored in `cape` column)
 *
 *   Interest-Rate Adjusted CAPE:
 *     When rates are high relative to history, equities face stiffer competition from bonds
 *     and should be discounted more (adjusted CAPE higher = more expensive than it looks).
 *     When rates are low, stocks deserve higher multiples (adjusted CAPE lower = less expensive).
 *
 *     adjustment_factor = (current_rate - historical_avg_rate) / historical_avg_rate
 *     adjustedCape = traditionalCape / (1 + adjustment_factor)
 *       → if current rate > avg: adjustment_factor > 0 → adjusted CAPE < traditional CAPE (stocks look less cheap)
 *       Wait — that's inverted. Let me re-state the economic logic:
 *
 *     The common formulation from Shiller/Barclays:
 *       If rates are LOWER than average, the "fair" P/E is higher than historical,
 *       so CAPE overstates richness. We reduce CAPE to reflect the lower-rate environment.
 *       If rates are HIGHER than average, CAPE understates richness.
 *
 *     adjustment_factor = (historicalAvg - currentRate) / historicalAvg
 *       > 0 when rates are below avg → CAPE is overstated → adjusted CAPE = CAPE * (1 - factor)  → lower
 *       < 0 when rates are above avg → CAPE is understated → adjusted CAPE = CAPE * (1 - factor) → higher
 *
 *     We cap the factor at ±0.30 to avoid extreme distortion in outlier rate environments.
 *
 *   ECY = (1/CAPE) - real_10y_rate
 *     This is Shiller's own preferred alternative (published 2020).
 *     Positive = stocks offer more yield than bonds (attractive).
 *     Negative = bonds more attractive than stocks.
 */
export function computeAdjustedCape(years: number = 10): AdjustedCapeResult {
  const db = getDatabase();

  // Fetch all rows with valid CAPE and long_rate ordered by date
  const allRows = db
    .prepare(
      `SELECT date, cape, long_rate, cpi FROM shiller_historical
       WHERE cape > 0 AND long_rate > 0
       ORDER BY date ASC`,
    )
    .all() as ShillerRow[];

  if (allRows.length === 0) {
    return {
      traditionalCape: 0,
      adjustedCape: 0,
      excessCapeYield: 0,
      rateType: 'real' as const,
      interestRateContext: { current: 0, historical10yAvg: 0, historicalLongtermAvg: 0 },
      adjustments: { interestRate: 0, total: 0 },
    };
  }

  // Latest valid data point
  const latestIdx = allRows.length - 1;
  const latest = allRows[latestIdx];
  const traditionalCape = latest.cape;
  const currentNominalRate = latest.long_rate / 100;

  // Compute current real rate at latest observation
  const currentRealRate = realRate(allRows, latestIdx);

  // Historical 10-year average of the long rate (trailing 120 months from latest)
  const tenYearLookback = Math.min(120, latestIdx + 1);
  const tenYearSlice = allRows.slice(latestIdx - tenYearLookback + 1, latestIdx + 1);
  const historical10yAvg =
    tenYearSlice.reduce((s, r) => s + r.long_rate, 0) / tenYearSlice.length / 100;

  // Long-term historical average — ALWAYS uses full history (not limited by `years` param)
  const historicalLongtermAvg =
    allRows.reduce((s, r) => s + r.long_rate, 0) / allRows.length / 100;

  // Interest-rate adjustment
  // adjustment_factor = (historicalAvg - currentRate) / historicalAvg
  // Positive factor: current rates below avg → CAPE overstates richness → lower adjusted CAPE
  // Negative factor: current rates above avg → CAPE understates richness → higher adjusted CAPE
  const rawFactor =
    historicalLongtermAvg > 0
      ? (historicalLongtermAvg - currentNominalRate) / historicalLongtermAvg
      : 0;

  // Cap adjustment at ±30% to prevent outlier distortion
  const adjustmentFactor = Math.max(-0.3, Math.min(0.3, rawFactor));
  const adjustedCape = traditionalCape * (1 - adjustmentFactor);

  // Excess CAPE Yield = (1/CAPE) - real_10y_rate (Shiller 2020)
  // Expressed as a percentage
  const capeEarningsYield = traditionalCape > 0 ? 1 / traditionalCape : 0;
  const excessCapeYield = (capeEarningsYield - currentRealRate) * 100;

  return {
    traditionalCape: Math.round(traditionalCape * 10) / 10,
    adjustedCape: Math.round(adjustedCape * 10) / 10,
    excessCapeYield: Math.round(excessCapeYield * 100) / 100,
    rateType: 'real' as const,
    interestRateContext: {
      current: Math.round(currentNominalRate * 10000) / 100, // as percentage, 2dp
      historical10yAvg: Math.round(historical10yAvg * 10000) / 100,
      historicalLongtermAvg: Math.round(historicalLongtermAvg * 10000) / 100,
    },
    adjustments: {
      interestRate: Math.round(adjustmentFactor * 1000) / 10, // as percentage
      total: Math.round(adjustmentFactor * 1000) / 10,
    },
  };
}
