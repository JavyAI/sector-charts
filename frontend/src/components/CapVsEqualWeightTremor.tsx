import { useMemo } from 'react';
import { BarChart } from '@tremor/react';
import { SectorMetric } from '../types';

interface CapVsEqualWeightTremorProps {
  sectors: SectorMetric[];
}

export default function CapVsEqualWeightTremor({ sectors }: CapVsEqualWeightTremorProps) {
  const chartData = useMemo(() => {
    // Same transformation as SVG version — sorted by cap-weighted descending
    return [...sectors]
      .filter(s => s.weightedPeRatio > 0 && s.equalWeightPeRatio > 0 && isFinite(s.weightedPeRatio) && isFinite(s.equalWeightPeRatio))
      .sort((a, b) => b.weightedPeRatio - a.weightedPeRatio)
      .map(s => ({
        sector: s.sector,
        'Cap-Weighted P/E': parseFloat(s.weightedPeRatio.toFixed(1)),
        'Equal-Weight P/E': parseFloat(s.equalWeightPeRatio.toFixed(1)),
      }));
  }, [sectors]);

  return (
    <div className="w-full">
      <BarChart
        data={chartData}
        index="sector"
        categories={['Cap-Weighted P/E', 'Equal-Weight P/E']}
        colors={['teal', 'violet']}
        layout="vertical"
        yAxisWidth={140}
        showGridLines={true}
        showLegend={true}
        stack={false}
        valueFormatter={(v) => `${v.toFixed(1)}x`}
        className="h-[420px]"
      />
    </div>
  );
}
