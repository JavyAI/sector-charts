import { useMemo } from 'react';
import { BarChart } from '@tremor/react';
import { SectorMetric } from '../types';

interface PeHistoricalComparisonTremorProps {
  sectors: SectorMetric[];
}

// Simulated historical offsets (% above/below historical avg P/E)
// Same data as SVG version — replace with Polygon pipeline data when available
const historicalOffsets: Record<string, { fiveYr: number; tenYr: number }> = {
  'Energy': { fiveYr: 0.24, tenYr: -0.19 },
  'Industrials': { fiveYr: 0.23, tenYr: 0.32 },
  'Communication Services': { fiveYr: 0.13, tenYr: 0.21 },
  'Materials': { fiveYr: 0.08, tenYr: 0.10 },
  'Consumer Staples': { fiveYr: 0.06, tenYr: 0.10 },
  'Utilities': { fiveYr: 0.05, tenYr: 0.06 },
  'Financials': { fiveYr: 0.01, tenYr: 0.06 },
  'Consumer Discretionary': { fiveYr: 0.01, tenYr: 0.07 },
  'Health Care': { fiveYr: 0.00, tenYr: 0.05 },
  'Real Estate': { fiveYr: -0.01, tenYr: -0.02 },
  'Information Technology': { fiveYr: -0.06, tenYr: -0.17 },
};

// Short labels to fit horizontal axis
const shortLabel = (s: string): string => {
  const map: Record<string, string> = {
    'Information Technology': 'Info Tech',
    'Communication Services': 'Comm Svcs',
    'Consumer Discretionary': 'Cons Disc',
    'Consumer Staples': 'Cons Stap',
    'Health Care': 'Health Care',
    'Real Estate': 'Real Estate',
    'Financials': 'Financials',
    'Industrials': 'Industrials',
    'Materials': 'Materials',
    'Utilities': 'Utilities',
    'Energy': 'Energy',
    'S&P 500': 'S&P 500',
  };
  return map[s] ?? s;
};

export default function PeHistoricalComparisonTremor({ sectors }: PeHistoricalComparisonTremorProps) {
  const chartData = useMemo(() => {
    // Build rows — same as SVG version
    const allFive = sectors.map(s => historicalOffsets[s.sector]?.fiveYr ?? 0);
    const allTen = sectors.map(s => historicalOffsets[s.sector]?.tenYr ?? 0);
    const sortedFive = [...allFive].sort((a, b) => a - b);
    const sortedTen = [...allTen].sort((a, b) => a - b);
    const medFive = sortedFive[Math.floor(sortedFive.length / 2)];
    const medTen = sortedTen[Math.floor(sortedTen.length / 2)];

    const rows = [
      ...sectors.map(s => ({
        label: s.sector,
        fiveYr: historicalOffsets[s.sector]?.fiveYr ?? 0,
        tenYr: historicalOffsets[s.sector]?.tenYr ?? 0,
      })),
      { label: 'S&P 500', fiveYr: medFive, tenYr: medTen },
    ];

    // Sort by fiveYr descending — same as SVG version
    rows.sort((a, b) => b.fiveYr - a.fiveYr);

    return rows.map(r => ({
      sector: shortLabel(r.label),
      'vs 5yr Avg (%)': Math.round(r.fiveYr * 100),
      'vs 10yr Avg (%)': Math.round(r.tenYr * 100),
    }));
  }, [sectors]);

  return (
    <div className="w-full">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        * Historical averages are simulated — replace with Polygon pipeline data
      </p>
      <BarChart
        data={chartData}
        index="sector"
        categories={['vs 5yr Avg (%)', 'vs 10yr Avg (%)']}
        colors={['teal', 'violet']}
        layout="vertical"
        yAxisWidth={90}
        showGridLines={true}
        showLegend={true}
        valueFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
        className="h-[420px]"
      />
    </div>
  );
}
