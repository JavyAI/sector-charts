import { useRef, useState, useEffect, useCallback } from 'react';
import { SectorMetric } from '../types';
import { CHART_COLORS } from './chartColors';

interface PeHistoricalComparisonProps {
  sectors: SectorMetric[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  fiveYr: number;
  tenYr: number;
}

// Simulated historical offsets (% above/below historical avg P/E)
// These will be replaced with real Polygon pipeline data when available
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

const MARGIN = { top: 30, right: 24, bottom: 80, left: 52 };
const HEIGHT = 400;
const BAR_GAP = 2;

function fmt(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(0)}%`;
}

export default function PeHistoricalComparison({ sectors }: PeHistoricalComparisonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, label: '', fiveYr: 0, tenYr: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 900);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Build chart data: sectors + S&P 500 aggregate
  const totalMarketCap = sectors.reduce((s, x) => s + x.weightedMarketCap, 0);
  const totalEarnings = sectors.reduce((s, x) => s + x.weightedMarketCap / x.weightedPeRatio, 0);
  const sp500PE = totalMarketCap / totalEarnings;

  // S&P 500 aggregate simulated offset: median of sector offsets
  const allFive = sectors.map(s => historicalOffsets[s.sector]?.fiveYr ?? 0);
  const allTen = sectors.map(s => historicalOffsets[s.sector]?.tenYr ?? 0);
  const medFive = allFive.sort((a, b) => a - b)[Math.floor(allFive.length / 2)];
  const medTen = allTen.sort((a, b) => a - b)[Math.floor(allTen.length / 2)];

  interface ChartRow {
    label: string;
    fiveYr: number;
    tenYr: number;
  }

  const rows: ChartRow[] = [
    ...sectors.map(s => ({
      label: s.sector,
      fiveYr: historicalOffsets[s.sector]?.fiveYr ?? 0,
      tenYr: historicalOffsets[s.sector]?.tenYr ?? 0,
    })),
    { label: 'S&P 500', fiveYr: medFive, tenYr: medTen },
  ];

  // Sort by fiveYr desc
  rows.sort((a, b) => b.fiveYr - a.fiveYr);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Y scale: find max abs value
  const allVals = rows.flatMap(r => [r.fiveYr, r.tenYr]);
  const absMax = Math.max(...allVals.map(Math.abs), 0.05);
  const yDomain = absMax * 1.3;

  const yScale = useCallback(
    (v: number) => (innerH / 2) - (v / yDomain) * (innerH / 2),
    [innerH, yDomain]
  );

  // X layout: group bars
  const groupCount = rows.length;
  const groupWidth = innerW / groupCount;
  const barWidth = Math.max(4, (groupWidth - BAR_GAP * 3) / 2);

  // Y-axis ticks
  const yTicks = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].filter(v => Math.abs(v) <= yDomain * 1.05);

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>, row: ChartRow) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, label: row.label, fiveYr: row.fiveYr, tenYr: row.tenYr });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const zeroY = yScale(0);

  // Short sector labels for X axis
  const shortLabel = (s: string) => {
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

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ minHeight: HEIGHT }}>
      <svg
        width={width}
        height={HEIGHT}
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease', overflow: 'visible' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Y-axis ticks and gridlines */}
          {yTicks.map(v => {
            const y = yScale(v);
            return (
              <g key={v}>
                <line
                  x1={0} x2={innerW}
                  y1={y} y2={y}
                  stroke={v === 0 ? '#6b7280' : '#374151'}
                  strokeWidth={v === 0 ? 1.5 : 1}
                  strokeDasharray={v === 0 ? undefined : '3 3'}
                  strokeOpacity={v === 0 ? 0.7 : 0.4}
                />
                <text
                  x={-8} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={10} fill={CHART_COLORS.mutedText}
                >
                  {v >= 0 ? '+' : ''}{(v * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {rows.map((row, i) => {
            const gx = i * groupWidth + groupWidth / 2;
            const b1x = gx - barWidth - BAR_GAP / 2;
            const b2x = gx + BAR_GAP / 2;

            const fiveH = Math.abs(yScale(row.fiveYr) - zeroY);
            const tenH = Math.abs(yScale(row.tenYr) - zeroY);
            const fiveY = row.fiveYr >= 0 ? zeroY - fiveH : zeroY;
            const tenY = row.tenYr >= 0 ? zeroY - tenH : zeroY;

            const isSP500 = row.label === 'S&P 500';

            return (
              <g key={row.label}>
                {/* 5yr bar */}
                <rect
                  x={b1x} y={fiveY}
                  width={barWidth} height={Math.max(fiveH, 2)}
                  fill={CHART_COLORS.teal}
                  fillOpacity={isSP500 ? 1 : 0.85}
                  rx={2}
                  onMouseEnter={e => handleMouseEnter(e, row)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: 'pointer' }}
                />
                {/* 5yr label */}
                <text
                  x={b1x + barWidth / 2}
                  y={row.fiveYr >= 0 ? fiveY - 4 : fiveY + fiveH + 11}
                  textAnchor="middle"
                  fontSize={9} fontWeight={600}
                  fill={CHART_COLORS.teal}
                >
                  {fmt(row.fiveYr)}
                </text>

                {/* 10yr bar */}
                <rect
                  x={b2x} y={tenY}
                  width={barWidth} height={Math.max(tenH, 2)}
                  fill={CHART_COLORS.purple}
                  fillOpacity={isSP500 ? 1 : 0.85}
                  rx={2}
                  onMouseEnter={e => handleMouseEnter(e, row)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: 'pointer' }}
                />
                {/* 10yr label */}
                <text
                  x={b2x + barWidth / 2}
                  y={row.tenYr >= 0 ? tenY - 4 : tenY + tenH + 11}
                  textAnchor="middle"
                  fontSize={9} fontWeight={600}
                  fill={CHART_COLORS.purple}
                >
                  {fmt(row.tenYr)}
                </text>

                {/* X-axis label */}
                <text
                  x={gx} y={innerH + 14}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill={CHART_COLORS.mutedText}
                  transform={`rotate(-30, ${gx}, ${innerH + 14})`}
                >
                  {shortLabel(row.label)}
                </text>
              </g>
            );
          })}

          {/* S&P 500 separator line */}
          {(() => {
            const sp500Idx = rows.findIndex(r => r.label === 'S&P 500');
            if (sp500Idx < 0) return null;
            const x = sp500Idx * groupWidth - groupWidth * 0.1;
            return (
              <line
                x1={x} x2={x}
                y1={0} y2={innerH}
                stroke={CHART_COLORS.mutedText}
                strokeOpacity={0.3}
                strokeDasharray="4 3"
              />
            );
          })()}
        </g>

        {/* Legend */}
        <g transform={`translate(${MARGIN.left}, ${HEIGHT - 20})`}>
          <circle cx={0} cy={0} r={5} fill={CHART_COLORS.teal} />
          <text x={10} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>
            % above 5-year average P/E ratio
          </text>
          <circle cx={220} cy={0} r={5} fill={CHART_COLORS.purple} />
          <text x={230} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>
            % above 10-year average P/E ratio
          </text>
          <text x={innerW + MARGIN.right - 10} y={0} textAnchor="end" fontSize={9} fill={CHART_COLORS.mutedText} fillOpacity={0.6}>
            Source: Sector Charts Dashboard (simulated)
          </text>
        </g>
      </svg>

      {/* Simulated data notice */}
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right pr-2">
        * Historical averages are simulated — replace with Polygon pipeline data
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            transform: tooltip.x > width - 220 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="font-bold text-gray-900 dark:text-gray-100 mb-1">{tooltip.label}</div>
          <div className="flex gap-3">
            <span style={{ color: CHART_COLORS.teal }}>5yr avg: <strong>{fmt(tooltip.fiveYr)}</strong></span>
            <span style={{ color: CHART_COLORS.purple }}>10yr avg: <strong>{fmt(tooltip.tenYr)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
