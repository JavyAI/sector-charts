import { useMemo } from 'react';
import { DonutChart, Card, Title, Legend } from '@tremor/react';
import { SectorMetric } from '../types';

interface SectorAllocationProps {
  sectors: SectorMetric[];
}

const TREMOR_COLORS: Record<string, string> = {
  'Information Technology': 'blue',
  'Financials': 'orange',
  'Health Care': 'pink',
  'Consumer Discretionary': 'violet',
  'Communication Services': 'cyan',
  'Industrials': 'red',
  'Consumer Staples': 'amber',
  'Energy': 'green',
  'Utilities': 'sky',
  'Real Estate': 'lime',
  'Materials': 'gray',
};

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${(cap / 1e6).toFixed(1)}M`;
}

export default function SectorAllocation({ sectors }: SectorAllocationProps) {
  const chartData = useMemo(() => {
    return sectors.map((s) => ({
      name: s.sector,
      value: s.weightedMarketCap,
    }));
  }, [sectors]);

  const colors = useMemo(() => {
    return sectors.map((s) => TREMOR_COLORS[s.sector] ?? 'gray');
  }, [sectors]);

  const categoryNames = useMemo(() => sectors.map((s) => s.sector), [sectors]);

  return (
    <Card>
      <Title>Sector Allocation (Market Cap Weight)</Title>
      <DonutChart
        className="mt-4 h-52"
        data={chartData}
        category="value"
        index="name"
        colors={colors}
        valueFormatter={formatMarketCap}
        showAnimation={true}
      />
      <Legend
        className="mt-3"
        categories={categoryNames}
        colors={colors}
      />
    </Card>
  );
}
