import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
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

const COLORS = {
  'Technology': '#1f77b4',
  'Financials': '#ff7f0e',
  'Energy': '#2ca02c',
  'Industrials': '#d62728',
  'Consumer Discretionary': '#9467bd',
  'Consumer Staples': '#8c564b',
  'Health Care': '#e377c2',
  'Materials': '#7f7f7f',
  'Real Estate': '#bcbd22',
  'Communication Services': '#17becf',
  'Utilities': '#aec7e8',
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
          <Tooltip formatter={(value) => value?.toFixed(1)} />
          <Bar dataKey="peRatio" fill="#8884d8" />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        <p className="legend-title">Sector Legend</p>
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
