import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SectorMetric } from '../types';
import './SectorChart.css';

interface SectorChartProps {
  data: SectorMetric[];
  visibleSectors: Set<string>;
  displayMode: 'cap-weighted' | 'equal-weight';
}

// GICS official sector names (11 sectors)
const COLORS = {
  'Information Technology': '#1f77b4',
  'Financials': '#ff7f0e',
  'Health Care': '#e377c2',
  'Consumer Discretionary': '#9467bd',
  'Communication Services': '#17becf',
  'Industrials': '#d62728',
  'Consumer Staples': '#8c564b',
  'Energy': '#2ca02c',
  'Utilities': '#aec7e8',
  'Real Estate': '#bcbd22',
  'Materials': '#7f7f7f',
};

export default function SectorChart({ data, visibleSectors, displayMode }: SectorChartProps) {
  const chartData = useMemo(() => {
    return data.map((sector) => ({
      sector: sector.sector,
      peRatio: displayMode === 'cap-weighted'
        ? sector.weightedPeRatio
        : sector.equalWeightPeRatio,
    }));
  }, [data, displayMode]);

  const visibleData = useMemo(() => {
    return chartData.filter((d) => visibleSectors.has(d.sector));
  }, [chartData, visibleSectors]);

  return (
    <div className="sector-chart-container">
      <div className="chart-mode-label">
        {displayMode === 'cap-weighted' ? 'Cap-Weighted P/E Ratios' : 'Equal-Weight P/E Ratios'}
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          layout="vertical"
          data={visibleData}
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="sector" type="category" width={140} />
          <Tooltip formatter={(value: number) => value?.toFixed(1)} />
          <Bar dataKey="peRatio">
            {visibleData.map((entry) => (
              <Cell
                key={entry.sector}
                fill={COLORS[entry.sector as keyof typeof COLORS] || '#999'}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        <h3 className="legend-title">Sector Legend</h3>
        <div className="legend-items">
          {data.map((sector) => (
            <div key={sector.sector} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: COLORS[sector.sector as keyof typeof COLORS] || '#999' }}
              />
              <span>{sector.sector}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
