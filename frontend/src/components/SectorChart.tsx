import { useMemo } from 'react';
import { BarChart, Card, Title } from '@tremor/react';
import { SectorMetric } from '../types';

interface SectorChartProps {
  data: SectorMetric[];
  visibleSectors: Set<string>;
  displayMode: 'cap-weighted' | 'equal-weight';
  onSectorClick?: (sector: string) => void;
}

// GICS official sector names (11 sectors)
const COLORS: Record<string, string> = {
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

const DEFAULT_COLOR = 'gray';

export default function SectorChart({ data, visibleSectors, displayMode, onSectorClick }: SectorChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((s) => visibleSectors.has(s.sector))
      .map((sector) => ({
        sector: sector.sector,
        'P/E Ratio': displayMode === 'cap-weighted'
          ? sector.weightedPeRatio
          : sector.equalWeightPeRatio,
      }));
  }, [data, displayMode, visibleSectors]);

  const colorList = useMemo(() => {
    return data
      .filter((s) => visibleSectors.has(s.sector))
      .map((s) => (COLORS[s.sector] ?? DEFAULT_COLOR) as string);
  }, [data, visibleSectors]);

  const label = displayMode === 'cap-weighted' ? 'Cap-Weighted P/E Ratios' : 'Equal-Weight P/E Ratios';

  return (
    <Card>
      <Title>{label}</Title>
      <BarChart
        className="mt-4"
        data={chartData}
        index="sector"
        categories={['P/E Ratio']}
        colors={colorList}
        layout="vertical"
        yAxisWidth={180}
        valueFormatter={(v: number) => v.toFixed(1)}
        showLegend={false}
        showGridLines={true}
        showAnimation={true}
        onValueChange={onSectorClick ? (v) => { if (v && v.sector) onSectorClick(v.sector as string); } : undefined}
      />
    </Card>
  );
}
