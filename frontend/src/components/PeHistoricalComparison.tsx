import { useRef, useState, useEffect, useCallback } from 'react';
import { SectorMetric } from '../types';
import { CHART_COLORS } from './chartColors';
import ChartTooltip from './ChartTooltip';

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
  currentPE: number;
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

const MARGIN = { top: 36, right: 24, bottom: 96, left: 56 };
const HEIGHT = 420;
const BAR_PADDING = 8;  // gap between the two bars in a group

// Short sector labels for X axis
const SHORT_LABELS: Record<string, string> = {
  'Information Technology': 'Info Tech',
  'Communication Services': 'Comm. Services',
  'Consumer Discretionary': 'Con. Disc.',
  'Consumer Staples': 'Con. Staples',
  'Health Care': 'Health Care',
  'Real Estate': 'Real Estate',
  'Financials': 'Financials',
  'Industrials': 'Industrials',
  'Materials': 'Materials',
  'Utilities': 'Utilities',
  'Energy': 'Energy',
  'S&P 500': 'S&P 500',
};

function fmt(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(0)}%`;
}

function fmtPE(v: number): string {
  return `${v.toFixed(1)}x`;
}

export default function PeHistoricalComparison({ sectors }: PeHistoricalComparisonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, label: '', fiveYr: 0, tenYr: 0, currentPE: 0,
  });

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

  // Compute S&P 500 aggregate P/E
  const totalMarketCap = sectors.reduce((s, x) => s + x.weightedMarketCap, 0);
  const totalEarnings = sectors.reduce((s, x) => s + x.weightedMarketCap / x.weightedPeRatio, 0);
  const sp500PE = totalMarketCap / totalEarnings;

  // S&P 500 aggregate simulated offset: median of sector offsets
  const allFive = [...sectors.map(s => historicalOffsets[s.sector]?.fiveYr ?? 0)].sort((a, b) => a - b);
  const allTen = [...sectors.map(s => historicalOffsets[s.sector]?.tenYr ?? 0)].sort((a, b) => a - b);
  const medFive = allFive[Math.floor(allFive.length / 2)];
  const medTen = allTen[Math.floor(allTen.length / 2)];

  interface ChartRow {
    label: string;
    fiveYr: number;
    tenYr: number;
    currentPE: number;
  }

  const rows: ChartRow[] = [
    ...sectors.map(s => ({
      label: s.sector,
      fiveYr: historicalOffsets[s.sector]?.fiveYr ?? 0,
      tenYr: historicalOffsets[s.sector]?.tenYr ?? 0,
      currentPE: s.weightedPeRatio,
    })),
    { label: 'S&P 500', fiveYr: medFive, tenYr: medTen, currentPE: sp500PE },
  ];

  // Sort by fiveYr desc
  rows.sort((a, b) => b.fiveYr - a.fiveYr);

  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Y scale
  const allVals = rows.flatMap(r => [r.fiveYr, r.tenYr]);
  const absMax = Math.max(...allVals.map(Math.abs), 0.10);
  const yDomain = absMax * 1.35;

  const yScale = useCallback(
    (v: number) => (innerH / 2) - (v / yDomain) * (innerH / 2),
    [innerH, yDomain]
  );

  // X layout
  const groupCount = rows.length;
  const groupWidth = innerW / groupCount;
  const barWidth = Math.max(6, (groupWidth - BAR_PADDING * 3) / 2);

  // Y-axis gridlines at fixed %
  const yTicks = [-0.30, -0.20, -0.10, 0, 0.10, 0.20, 0.30].filter(
    v => Math.abs(v) <= yDomain * 1.05
  );

  const zeroY = yScale(0);

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>, row: ChartRow) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: row.label,
      fiveYr: row.fiveYr,
      tenYr: row.tenYr,
      currentPE: row.currentPE,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ minHeight: HEIGHT }}>
      <svg
        width={width}
        height={HEIGHT}
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

          {/* Gridlines */}
          {yTicks.map(v => {
            const y = yScale(v);
            const isZero = v === 0;
            return (
              <g key={v}>
                <line
                  x1={0} x2={innerW}
                  y1={y} y2={y}
                  stroke={isZero ? '#9ca3af' : '#374151'}
                  strokeWidth={isZero ? 1.5 : 1}
                  strokeDasharray={isZero ? undefined : '4 4'}
                  strokeOpacity={isZero ? 0.4 : 0.15}
                />
                <text
                  x={-10} y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={CHART_COLORS.mutedText}
                >
                  {v >= 0 ? '+' : ''}{(v * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {rows.map((row, i) => {
            const gx = i * groupWidth + groupWidth / 2;
            const b1x = gx - barWidth - BAR_PADDING / 2;
            const b2x = gx + BAR_PADDING / 2;

            const fiveH = Math.abs(yScale(row.fiveYr) - zeroY);
            const tenH = Math.abs(yScale(row.tenYr) - zeroY);
            const fiveBarY = row.fiveYr >= 0 ? zeroY - fiveH : zeroY;
            const tenBarY = row.tenYr >= 0 ? zeroY - tenH : zeroY;

            // Animated height via CSS — bars grow from zero baseline
            const fiveStyle = mounted
              ? { transition: `height 0.6s ease ${i * 40}ms, y 0.6s ease ${i * 40}ms` }
              : {};
            const tenStyle = mounted
              ? { transition: `height 0.6s ease ${i * 40 + 20}ms, y 0.6s ease ${i * 40 + 20}ms` }
              : {};

            const isSP500 = row.label === 'S&P 500';

            // Value label positions
            const fiveLabelY = row.fiveYr >= 0 ? fiveBarY - 5 : fiveBarY + Math.max(fiveH, 2) + 13;
            const tenLabelY = row.tenYr >= 0 ? tenBarY - 5 : tenBarY + Math.max(tenH, 2) + 13;

            const labelRotate = `rotate(-45, ${gx}, ${innerH + 18})`;

            return (
              <g key={row.label}>
                {/* 5yr bar */}
                <rect
                  x={b1x}
                  y={mounted ? fiveBarY : zeroY}
                  width={barWidth}
                  height={mounted ? Math.max(fiveH, 2) : 0}
                  fill={CHART_COLORS.teal}
                  fillOpacity={isSP500 ? 1 : 0.85}
                  rx={2}
                  style={fiveStyle}
                  onMouseEnter={e => handleMouseEnter(e, row)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  cursor="pointer"
                />

                {/* 5yr value label */}
                <text
                  x={b1x + barWidth / 2}
                  y={fiveLabelY}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={CHART_COLORS.teal}
                >
                  {fmt(row.fiveYr)}
                </text>

                {/* 10yr bar */}
                <rect
                  x={b2x}
                  y={mounted ? tenBarY : zeroY}
                  width={barWidth}
                  height={mounted ? Math.max(tenH, 2) : 0}
                  fill={CHART_COLORS.purple}
                  fillOpacity={isSP500 ? 1 : 0.85}
                  rx={2}
                  style={tenStyle}
                  onMouseEnter={e => handleMouseEnter(e, row)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  cursor="pointer"
                />

                {/* 10yr value label */}
                <text
                  x={b2x + barWidth / 2}
                  y={tenLabelY}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={CHART_COLORS.purple}
                >
                  {fmt(row.tenYr)}
                </text>

                {/* X-axis sector label */}
                <text
                  x={gx}
                  y={innerH + 18}
                  textAnchor="end"
                  fontSize={11}
                  fill={CHART_COLORS.mutedText}
                  transform={labelRotate}
                >
                  {SHORT_LABELS[row.label] ?? row.label}
                </text>
              </g>
            );
          })}

          {/* S&P 500 separator */}
          {(() => {
            const idx = rows.findIndex(r => r.label === 'S&P 500');
            if (idx < 0) return null;
            const x = idx * groupWidth - groupWidth * 0.15;
            return (
              <line
                x1={x} x2={x}
                y1={0} y2={innerH}
                stroke={CHART_COLORS.mutedText}
                strokeOpacity={0.25}
                strokeDasharray="4 3"
              />
            );
          })()}
        </g>

        {/* Legend — bottom center */}
        {(() => {
          const legendY = HEIGHT - 18;
          const totalLegendW = 440;
          const legendX = (width - totalLegendW) / 2;
          return (
            <g transform={`translate(${legendX}, ${legendY})`}>
              <circle cx={0} cy={0} r={5} fill={CHART_COLORS.teal} />
              <text x={12} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>
                % above 5-year average P/E
              </text>
              <circle cx={220} cy={0} r={5} fill={CHART_COLORS.purple} />
              <text x={232} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>
                % above 10-year average P/E
              </text>
            </g>
          );
        })()}

        {/* Source attribution */}
        <text
          x={width - 8}
          y={HEIGHT - 4}
          textAnchor="end"
          fontSize={9}
          fontStyle="italic"
          fill={CHART_COLORS.mutedText}
          fillOpacity={0.5}
        >
          Source: Sector Charts Dashboard (simulated)
        </text>
      </svg>

      {/* Tooltip */}
      <ChartTooltip
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
        containerWidth={width}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, color: CHART_COLORS.lightText }}>
          {tooltip.label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: CHART_COLORS.teal }}>
            5yr avg: <strong>{fmt(tooltip.fiveYr)}</strong>
          </span>
          <span style={{ color: CHART_COLORS.purple }}>
            10yr avg: <strong>{fmt(tooltip.tenYr)}</strong>
          </span>
          <span style={{ color: CHART_COLORS.mutedText }}>
            Current P/E: <strong style={{ color: CHART_COLORS.lightText }}>{fmtPE(tooltip.currentPE)}</strong>
          </span>
        </div>
      </ChartTooltip>
    </div>
  );
}
