import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SectorMetric } from '../types';
import { CHART_COLORS } from './chartColors';

interface CapVsEqualWeightProps {
  sectors: SectorMetric[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  sector: string;
  capPE: number;
  equalPE: number;
  divergence: number;
}

const MARGIN = { top: 24, right: 140, bottom: 48, left: 160 };
const ROW_HEIGHT = 38;
const DOT_R = 7;
const DIVERGENCE_THRESHOLD = 0.20; // 20% divergence triggers yellow highlight

function fmt(v: number) {
  return `${v.toFixed(1)}x`;
}

function divergencePct(cap: number, equal: number): number {
  if (cap === 0) return 0;
  return Math.abs(cap - equal) / cap;
}

export default function CapVsEqualWeight({ sectors }: CapVsEqualWeightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, sector: '', capPE: 0, equalPE: 0, divergence: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
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

  // Sort by cap-weighted P/E descending
  const rows = useMemo(
    () => [...sectors].sort((a, b) => b.weightedPeRatio - a.weightedPeRatio),
    [sectors]
  );

  const height = MARGIN.top + rows.length * ROW_HEIGHT + MARGIN.bottom;
  const innerW = width - MARGIN.left - MARGIN.right;

  // X scale
  const allPEs = rows.flatMap(r => [r.weightedPeRatio, r.equalWeightPeRatio]).filter(v => v > 0 && isFinite(v));
  const xMin = Math.max(0, Math.min(...allPEs) - 3);
  const xMax = Math.max(...allPEs) + 5;

  const xScale = useCallback(
    (v: number) => ((v - xMin) / (xMax - xMin)) * innerW,
    [innerW, xMin, xMax]
  );

  // X-axis ticks
  const step = Math.ceil((xMax - xMin) / 6 / 5) * 5 || 5;
  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / step) * step; v <= xMax; v += step) {
    xTicks.push(v);
  }

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGElement>, sector: SectorMetric) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      sector: sector.sector,
      capPE: sector.weightedPeRatio,
      equalPE: sector.equalWeightPeRatio,
      divergence: divergencePct(sector.weightedPeRatio, sector.equalWeightPeRatio),
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ minHeight: height }}>
      <svg
        width={width}
        height={height}
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease', overflow: 'visible' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* X-axis gridlines and ticks */}
          {xTicks.map(v => {
            const x = xScale(v);
            return (
              <g key={v}>
                <line
                  x1={x} x2={x}
                  y1={0} y2={rows.length * ROW_HEIGHT}
                  stroke={CHART_COLORS.mutedText}
                  strokeOpacity={0.15}
                  strokeDasharray="3 3"
                />
                <text
                  x={x} y={rows.length * ROW_HEIGHT + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill={CHART_COLORS.mutedText}
                >
                  {v}x
                </text>
              </g>
            );
          })}

          {/* Rows */}
          {rows.map((sector, i) => {
            const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const capX = xScale(sector.weightedPeRatio);
            const equalX = xScale(sector.equalWeightPeRatio);
            const isHighlighted = divergencePct(sector.weightedPeRatio, sector.equalWeightPeRatio) > DIVERGENCE_THRESHOLD;
            const leftDot = Math.min(capX, equalX);
            const rightDot = Math.max(capX, equalX);

            return (
              <g
                key={sector.sector}
                onMouseEnter={e => handleMouseEnter(e, sector)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* Yellow highlight for high-divergence rows */}
                {isHighlighted && (
                  <rect
                    x={-MARGIN.left}
                    y={y - ROW_HEIGHT / 2}
                    width={innerW + MARGIN.left + MARGIN.right}
                    height={ROW_HEIGHT}
                    fill={CHART_COLORS.highlight}
                    rx={2}
                  />
                )}

                {/* Row separator */}
                <line
                  x1={-MARGIN.left} x2={innerW + 10}
                  y1={y + ROW_HEIGHT / 2} y2={y + ROW_HEIGHT / 2}
                  stroke={CHART_COLORS.mutedText}
                  strokeOpacity={0.08}
                />

                {/* Sector name (left) */}
                <text
                  x={-8} y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={isHighlighted ? '#fbbf24' : CHART_COLORS.lightText}
                  fontWeight={isHighlighted ? 600 : 400}
                >
                  {sector.sector}
                </text>

                {/* Gray connector bar */}
                <rect
                  x={leftDot}
                  y={y - 2}
                  width={rightDot - leftDot}
                  height={4}
                  fill={CHART_COLORS.gray}
                  fillOpacity={0.4}
                  rx={2}
                />

                {/* Cap-weighted dot (teal) */}
                <circle
                  cx={capX} cy={y}
                  r={DOT_R}
                  fill={CHART_COLORS.teal}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />

                {/* Equal-weight dot (purple) */}
                <circle
                  cx={equalX} cy={y}
                  r={DOT_R}
                  fill={CHART_COLORS.purple}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />

                {/* Cap PE label */}
                <text
                  x={capX}
                  y={y - DOT_R - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={CHART_COLORS.teal}
                >
                  {fmt(sector.weightedPeRatio)}
                </text>

                {/* Equal PE label (only if divergence > threshold to avoid clutter) */}
                {isHighlighted && (
                  <text
                    x={equalX}
                    y={y + DOT_R + 10}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill={CHART_COLORS.purple}
                  >
                    {fmt(sector.equalWeightPeRatio)}
                  </text>
                )}

                {/* Right edge: sector name repeated */}
                <text
                  x={innerW + MARGIN.right - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill={CHART_COLORS.mutedText}
                  fillOpacity={0.6}
                >
                  {sector.sector}
                </text>

                {/* Divergence indicator for highlighted rows */}
                {isHighlighted && (
                  <text
                    x={innerW + 8}
                    y={y}
                    dominantBaseline="middle"
                    fontSize={9}
                    fill="#fbbf24"
                    fontWeight={600}
                  >
                    {(divergencePct(sector.weightedPeRatio, sector.equalWeightPeRatio) * 100).toFixed(0)}% gap
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis label */}
          <text
            x={innerW / 2}
            y={rows.length * ROW_HEIGHT + 32}
            textAnchor="middle"
            fontSize={10}
            fill={CHART_COLORS.mutedText}
          >
            P/E Ratio
          </text>

          {/* Source attribution */}
          <text
            x={innerW + MARGIN.right - 8}
            y={rows.length * ROW_HEIGHT + 32}
            textAnchor="end"
            fontSize={9}
            fill={CHART_COLORS.mutedText}
            fillOpacity={0.5}
          >
            Source: Sector Charts Dashboard
          </text>
        </g>

        {/* Legend */}
        <g transform={`translate(${MARGIN.left}, ${height - 14})`}>
          <circle cx={0} cy={0} r={5} fill={CHART_COLORS.teal} />
          <text x={10} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>Cap-Weighted P/E</text>
          <circle cx={160} cy={0} r={5} fill={CHART_COLORS.purple} />
          <text x={170} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>Equal-Weight P/E</text>
          <rect x={320} y={-5} width={20} height={4} fill={CHART_COLORS.gray} fillOpacity={0.4} rx={2} />
          <text x={344} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>Divergence</text>
          <rect x={420} y={-8} width={14} height={14} fill={CHART_COLORS.highlight} rx={2} />
          <text x={438} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>&gt;20% gap</text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            transform: tooltip.x > width - 240 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="font-bold text-gray-900 dark:text-gray-100 mb-1">{tooltip.sector}</div>
          <div className="flex flex-col gap-0.5">
            <span style={{ color: CHART_COLORS.teal }}>Cap-Weighted: <strong>{fmt(tooltip.capPE)}</strong></span>
            <span style={{ color: CHART_COLORS.purple }}>Equal-Weight: <strong>{fmt(tooltip.equalPE)}</strong></span>
            <span className="text-gray-400">Divergence: <strong>{(tooltip.divergence * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
