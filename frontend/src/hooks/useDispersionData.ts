import { useState, useEffect } from 'react';
import { fetchConstituents, fetchSectorData, fetchWeeklyReturns } from '../services/api';
import { todayLocal } from '../utils/date';

export interface StockBubble {
  symbol: string;
  security: string;
  sector: string;
  peRatio: number;
  marketCap: number;
  isAboveAverage: boolean;
}

interface DispersionData {
  stocks: StockBubble[];
  sectorAverages: Record<string, number>;
  isRealData: boolean;
}

function generateMockStockData(
  constituents: { symbol: string; security: string; gics_sector: string }[],
  sectorAverages: Record<string, number>,
  sectorTotalCap: Record<string, number>
): StockBubble[] {
  // Seed-like deterministic variance per symbol so data is stable across renders
  const hashStr = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  return constituents.map((c) => {
    const avg = sectorAverages[c.gics_sector] ?? 20;
    const totalCap = sectorTotalCap[c.gics_sector] ?? 1_000_000;
    const h = hashStr(c.symbol);
    // Pseudo-random [0,1) from hash
    const r1 = ((h * 1664525 + 1013904223) >>> 0) / 4294967296;
    const r2 = ((h * 22695477 + 1) >>> 0) / 4294967296;
    const r3 = (((h ^ (h >>> 17)) * 37) >>> 0) / 4294967296;

    // P/E: sector avg * [0.4 .. 2.0]
    const peRatio = Math.max(1, avg * (0.4 + r1 * 1.6));

    // Market cap: rough share of sector total, with log-normal-like spread
    // Use r2 to assign a log-uniform share; top stocks get bigger caps
    const capShare = Math.pow(r2, 2.5); // skew toward smaller values (most stocks are small)
    const marketCap = Math.max(
      1_000_000_000,
      totalCap * capShare * 3 + 500_000_000 * r3
    );

    return {
      symbol: c.symbol,
      security: c.security,
      sector: c.gics_sector,
      peRatio: Math.round(peRatio * 10) / 10,
      marketCap,
      isAboveAverage: peRatio >= avg,
    };
  });
}

export function useDispersionData(): DispersionData & { loading: boolean; error: string | null } {
  const [data, setData] = useState<DispersionData>({ stocks: [], sectorAverages: {}, isRealData: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = todayLocal();

        // Try to fetch real weekly returns first
        let realReturns: Awaited<ReturnType<typeof fetchWeeklyReturns>> = [];
        try {
          realReturns = await fetchWeeklyReturns(today);
        } catch {
          // ThetaTerminal not available or no data yet — will fall back to mock
        }

        if (realReturns.length > 0) {
          // Build sector averages from real return data (average abs return per sector)
          const sectorReturnSums: Record<string, number[]> = {};
          for (const r of realReturns) {
            const sector = r.sector ?? 'Unknown';
            if (!sectorReturnSums[sector]) sectorReturnSums[sector] = [];
            sectorReturnSums[sector].push(r.returnPct);
          }

          const sectorAverages: Record<string, number> = {};
          for (const [sector, returns] of Object.entries(sectorReturnSums)) {
            sectorAverages[sector] = returns.reduce((a, b) => a + b, 0) / returns.length;
          }

          // Build constituent name lookup from a separate fetch (best-effort)
          let securityMap: Record<string, string> = {};
          try {
            const constituentRes = await fetchConstituents();
            for (const c of constituentRes.constituents) {
              securityMap[c.symbol] = c.security;
            }
          } catch {
            // Ignore — symbol will be used as fallback for security name
          }

          const sectorAvgReturn: Record<string, number> = sectorAverages;

          const stocks: StockBubble[] = realReturns.map((r) => {
            const sector = r.sector ?? 'Unknown';
            const sectorAvg = sectorAvgReturn[sector] ?? 0;
            // Use returnPct as the primary metric in place of peRatio for the bubble
            // marketCap from estimate or fallback to 1B
            return {
              symbol: r.symbol,
              security: securityMap[r.symbol] ?? r.symbol,
              sector,
              peRatio: r.returnPct,         // repurposed: weekly return %
              marketCap: r.marketCapEstimate ?? 1_000_000_000,
              isAboveAverage: r.returnPct >= sectorAvg,
            };
          });

          if (isMounted) {
            setData({ stocks, sectorAverages, isRealData: true });
          }
          return;
        }

        // Fall back to mock generation using sector data
        const [constituentRes, sectorRes] = await Promise.all([
          fetchConstituents(),
          fetchSectorData(today),
        ]);

        // Build sector averages map
        const sectorAverages: Record<string, number> = {};
        const sectorTotalCap: Record<string, number> = {};
        for (const s of sectorRes.sectors) {
          sectorAverages[s.sector] = s.weightedPeRatio;
          sectorTotalCap[s.sector] = s.weightedMarketCap;
        }

        // Generate mock per-stock data
        const stocks = generateMockStockData(
          constituentRes.constituents,
          sectorAverages,
          sectorTotalCap
        );

        if (isMounted) {
          setData({ stocks, sectorAverages, isRealData: false });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch dispersion data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { ...data, loading, error };
}
