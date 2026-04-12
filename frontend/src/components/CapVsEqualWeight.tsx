import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SectorMetric } from '../types';
import { CHART_COLORS } from './chartColors';
import ChartTooltip from './ChartTooltip';

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
  constituents: number;
}

const MARGIN = { top: 24, right: 24, bottom: 56, left: 24 };
const ROW_HEIGHT = 42;
const DOT_R = 6;
const LABEL_W = 150;
const DIVERGENCE_THRESHOLD = 0.20;

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
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, sector: '', capPE: 0, equalPE: 0, divergence: 0, constituents: 0,
  });

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

  const rows = useMemo(
    () => [...sectors].sort((a, b) => b.weightedPeRatio - a.weightedPeRatio),
    [sectors]
  );

  const height = MARGIN.top + rows.length * ROW_HEIGHT + MARGIN.bottom;

  // Bar area between left and right label columns
  const barAreaX = MARGIN.left + LABEL_W;
  const barAreaW = Math.max(120, width - MARGIN.left - MARGIN.right - LABEL_W * 2);

  const allPEs = rows.flatMap(r => [r.weightedPeRatio, r.equalWeightPeRatio]).filter(v => v > 0 && isFinite(v));
  const xMin = Math.max(0, Math.min(...allPEs) - 2);
  const xMax = Math.max(...allPEs) + 4;

  const xScale = useCallback(
    (v: number) => ((v - xMin) / (xMax - xMin)) * barAreaW,
    [barAreaW, xMin, xMax]
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
      constituents: sector.constituents,
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
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(${barAreaX},${MARGIN.top})`}>

          {/* X-axis gridlines */}
          {xTicks.map(v => {
            const x = xScale(v);
            return (
              <g key={v}>
                <line
                  x1={x} x2={x}
                  y1={0} y2={rows.length * ROW_HEIGHT}
                  stroke={CHART_COLORS.mutedText}
                  strokeOpacity={0.12}
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={rows.length * ROW_HEIGHT + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill={CHART_COLORS.mutedText}
                >
                  {v}x
                </text>
              </g>
            );
          })}

          {/* X-axis label */}
          <text
            x={barAreaW / 2}
            y={rows.length * ROW_HEIGHT + 30}
            textAnchor="middle"
            fontSize={10}
            fill={CHART_COLORS.mutedText}
          >
            P/E Ratio
          </text>

          {/* Rows */}
          {rows.map((sector, i) => {
            const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const capX = xScale(sector.weightedPeRatio);
            const equalX = xScale(sector.equalWeightPeRatio);
            const isHighlighted = divergencePct(sector.weightedPeRatio, sector.equalWeightPeRatio) > DIVERGENCE_THRESHOLD;
            const leftX = Math.min(capX, equalX);
            const rightX = Math.max(capX, equalX);
            const gapPct = divergencePct(sector.weightedPeRatio, sector.equalWeightPeRatio) * 100;

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
                    x={-LABEL_W}
                    y={y - ROW_HEIGHT / 2}
                    width={barAreaW + LABEL_W * 2}
                    height={ROW_HEIGHT}
                    fill="rgba(234, 179, 8, 0.12)"
                    rx={3}
                  />
                )}

                {/* Row separator */}
                <line
                  x1={-LABEL_W}
                  x2={barAreaW + LABEL_W}
                  y1={y + ROW_HEIGHT / 2}
                  y2={y + ROW_HEIGHT / 2}
                  stroke={CHART_COLORS.mutedText}
                  strokeOpacity={0.08}
                />

                {/* Left sector label */}
                <text
                  x={-8}
                  y={y}
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
                  x={leftX}
                  y={y - 2}
                  width={Math.max(0, rightX - leftX)}
                  height={4}
                  fill={CHART_COLORS.gray}
                  fillOpacity={0.4}
                  rx={2}
                />

                {/* Cap-weighted dot (teal) */}
                <circle
                  cx={mounted ? capX : xScale((sector.weightedPeRatio + sector.equalWeightPeRatio) / 2)}
                  cy={y}
                  r={DOT_R}
                  fill={CHART_COLORS.teal}
                  stroke="white"
                  strokeWidth={1}
                  style={{ transition: mounted ? `cx 0.5s ease ${i * 40}ms` : undefined }}
                />

                {/* Cap PE label above dot */}
                <text
                  x={capX}
                  y={y - DOT_R - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={CHART_COLORS.teal}
                >
                  {fmt(sector.weightedPeRatio)}
                </text>

                {/* Equal-weight dot (purple) */}
                <circle
                  cx={mounted ? equalX : xScale((sector.weightedPeRatio + sector.equalWeightPeRatio) / 2)}
                  cy={y}
                  r={DOT_R}
                  fill={CHART_COLORS.purple}
                  stroke="white"
                  strokeWidth={1}
                  style={{ transition: mounted ? `cx 0.5s ease ${i * 40 + 20}ms` : undefined }}
                />

                {/* Equal PE label below dot (only when highlighted, to reduce clutter) */}
                {isHighlighted && (
                  <text
                    x={equalX}
                    y={y + DOT_R + 12}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill={CHART_COLORS.purple}
                  >
                    {fmt(sector.equalWeightPeRatio)}
                  </text>
                )}

                {/* Gap annotation for highlighted rows */}
                {isHighlighted && (
                  <text
                    x={barAreaW + 8}
                    y={y}
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill="#f59e0b"
                  >
                    {gapPct.toFixed(0)}% gap
                  </text>
                )}

                {/* Right sector label */}
                <text
                  x={barAreaW + LABEL_W - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={CHART_COLORS.mutedText}
                >
                  {sector.sector}
                </text>
              </g>
            );
          })}

          {/* Source attribution */}
          <text
            x={barAreaW + LABEL_W - 8}
            y={rows.length * ROW_HEIGHT + 44}
            textAnchor="end"
            fontSize={9}
            fontStyle="italic"
            fill={CHART_COLORS.mutedText}
            fillOpacity={0.5}
          >
            Source: Sector Charts Dashboard
          </text>
        </g>

        {/* Legend — bottom center */}
        {(() => {
          const legendY = height - 12;
          const legendTotalW = 340;
          const legendX = (width - legendTotalW) / 2;
          return (
            <g transform={`translate(${legendX}, ${legendY})`}>
              <circle cx={0} cy={0} r={5} fill={CHART_COLORS.teal} stroke="white" strokeWidth={1} />
              <text x={12} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>Cap-Weighted P/E</text>
              <circle cx={170} cy={0} r={5} fill={CHART_COLORS.purple} stroke="white" strokeWidth={1} />
              <text x={182} y={0} dominantBaseline="middle" fontSize={11} fill={CHART_COLORS.mutedText}>Equal-Weight P/E</text>
            </g>
          );
        })()}
      </svg>

      {/* Tooltip */}
      <ChartTooltip x={tooltip.x} y={tooltip.y} visible={tooltip.visible} containerWidth={width}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: CHART_COLORS.lightText }}>
          {tooltip.sector}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: CHART_COLORS.teal }}>
            Cap-Weighted: <strong>{fmt(tooltip.capPE)}</strong>
          </span>
          <span style={{ color: CHART_COLORS.purple }}>
            Equal-Weight: <strong>{fmt(tooltip.equalPE)}</strong>
          </span>
          <span style={{ color: '#f59e0b' }}>
            Divergence: <strong>{(tooltip.divergence * 100).toFixed(1)}%</strong>
          </span>
          <span style={{ color: CHART_COLORS.mutedText }}>
            Constituents: <strong style={{ color: CHART_COLORS.lightText }}>{tooltip.constituents}</strong>
          </span>
        </div>
      </ChartTooltip>
    </div>
  );
}
