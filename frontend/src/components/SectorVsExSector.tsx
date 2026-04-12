import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SectorMetric } from '../types';
import { CHART_COLORS } from './chartColors';
import ChartTooltip from './ChartTooltip';

interface SectorVsExSectorProps {
  sectors: SectorMetric[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  sector: string;
  sectorPE: number;
  exSectorPE: number;
  sp500PE: number;
}

const MARGIN = { top: 56, right: 24, bottom: 40, left: 24 };
const ROW_HEIGHT = 38;
const BAR_H = 14;
const LABEL_W = 150; // fixed width for sector label columns on both sides
const VALUE_W = 52;  // fixed width for P/E value labels

function fmt(v: number) {
  return `${v.toFixed(1)}x`;
}

export default function SectorVsExSector({ sectors }: SectorVsExSectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, sector: '', sectorPE: 0, exSectorPE: 0, sp500PE: 0,
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

  const totalMarketCap = useMemo(() => sectors.reduce((s, x) => s + x.weightedMarketCap, 0), [sectors]);
  const totalEarnings = useMemo(() => sectors.reduce((s, x) => s + x.weightedMarketCap / x.weightedPeRatio, 0), [sectors]);
  const sp500PE = totalMarketCap / totalEarnings;

  interface Row {
    sector: string;
    sectorPE: number;
    exSectorPE: number;
  }

  const rows: Row[] = useMemo(() => {
    return sectors.map(s => {
      const exCap = totalMarketCap - s.weightedMarketCap;
      const exEarnings = totalEarnings - (s.weightedMarketCap / s.weightedPeRatio);
      const exSectorPE = exCap / exEarnings;
      return { sector: s.sector, sectorPE: s.weightedPeRatio, exSectorPE };
    }).sort((a, b) => b.sectorPE - a.sectorPE);
  }, [sectors, totalMarketCap, totalEarnings]);

  const height = MARGIN.top + (rows.length + 1) * ROW_HEIGHT + MARGIN.bottom;

  // Bar area: between left label column and right label column
  // Layout: [MARGIN.left | LABEL_W | VALUE_W | barArea | VALUE_W | LABEL_W | MARGIN.right]
  const barAreaX = MARGIN.left + LABEL_W + VALUE_W;
  const barAreaW = Math.max(100, width - MARGIN.left - MARGIN.right - (LABEL_W + VALUE_W) * 2);
  const halfW = barAreaW / 2;
  const centerX = barAreaX + halfW;

  const maxPE = Math.max(...rows.flatMap(r => [r.sectorPE, r.exSectorPE]), sp500PE) * 1.1;
  const peToW = (pe: number) => (pe / maxPE) * halfW;

  // X-axis ticks
  const xTicks = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].filter(v => peToW(v) <= halfW * 1.02);

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGElement>, row: Row) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, sector: row.sector, sectorPE: row.sectorPE, exSectorPE: row.exSectorPE, sp500PE });
  }, [sp500PE]);

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

      {/* Header badges */}
      <div
        className="absolute flex justify-between items-center"
        style={{ left: MARGIN.left, width: width - MARGIN.left - MARGIN.right, top: 10 }}
      >
        <span
          className="px-3 py-1 rounded text-xs font-semibold text-white"
          style={{ background: CHART_COLORS.teal }}
        >
          S&amp;P 500 Sector
        </span>
        <div
          className="px-3 py-1 rounded text-xs font-semibold text-white text-center"
          style={{ background: 'rgba(156,163,175,0.15)', border: '1px solid rgba(156,163,175,0.25)', color: CHART_COLORS.lightText }}
        >
          S&amp;P 500: <strong style={{ color: '#f59e0b' }}>{fmt(sp500PE)}</strong>
        </div>
        <span
          className="px-3 py-1 rounded text-xs font-semibold text-white"
          style={{ background: CHART_COLORS.purple }}
        >
          S&amp;P 500 Ex-Sector
        </span>
      </div>

      <svg
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        <g>
          {/* Gridlines on both sides */}
          {xTicks.map(v => {
            const lx = centerX - peToW(v);
            const rx = centerX + peToW(v);
            const rowsH = rows.length * ROW_HEIGHT;
            return (
              <g key={v}>
                {lx > barAreaX && (
                  <>
                    <line x1={lx} x2={lx} y1={MARGIN.top - 4} y2={MARGIN.top + rowsH} stroke={CHART_COLORS.mutedText} strokeOpacity={0.12} strokeDasharray="4 4" />
                    <text x={lx} y={MARGIN.top - 8} textAnchor="middle" fontSize={10} fill={CHART_COLORS.mutedText} fillOpacity={0.7}>{v}x</text>
                  </>
                )}
                {rx < barAreaX + barAreaW && (
                  <>
                    <line x1={rx} x2={rx} y1={MARGIN.top - 4} y2={MARGIN.top + rowsH} stroke={CHART_COLORS.mutedText} strokeOpacity={0.12} strokeDasharray="4 4" />
                    <text x={rx} y={MARGIN.top - 8} textAnchor="middle" fontSize={10} fill={CHART_COLORS.mutedText} fillOpacity={0.7}>{v}x</text>
                  </>
                )}
              </g>
            );
          })}

          {/* Center vertical divider */}
          <line
            x1={centerX} x2={centerX}
            y1={MARGIN.top - 4}
            y2={MARGIN.top + rows.length * ROW_HEIGHT + 4}
            stroke={CHART_COLORS.mutedText}
            strokeOpacity={0.35}
            strokeWidth={1}
          />

          {/* Rows */}
          {rows.map((row, i) => {
            const y = MARGIN.top + i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const sectorBarW = mounted ? peToW(row.sectorPE) : 0;
            const exBarW = mounted ? peToW(row.exSectorPE) : 0;

            return (
              <g
                key={row.sector}
                onMouseEnter={e => handleMouseEnter(e, row)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* Row hover target */}
                <rect
                  x={MARGIN.left}
                  y={y - ROW_HEIGHT / 2}
                  width={width - MARGIN.left - MARGIN.right}
                  height={ROW_HEIGHT}
                  fill="transparent"
                />

                {/* Left sector label */}
                <text
                  x={MARGIN.left + LABEL_W - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={CHART_COLORS.lightText}
                >
                  {row.sector}
                </text>

                {/* Teal bar: sector PE — extends RIGHT from center */}
                <rect
                  x={centerX}
                  y={y - BAR_H / 2}
                  width={sectorBarW}
                  height={BAR_H}
                  fill={CHART_COLORS.teal}
                  fillOpacity={0.85}
                  rx={2}
                  style={{ transition: mounted ? `width 0.5s ease ${i * 35}ms` : undefined }}
                />

                {/* Sector P/E value — right of teal bar */}
                <text
                  x={MARGIN.left + LABEL_W + 4}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={CHART_COLORS.teal}
                >
                  {fmt(row.sectorPE)}
                </text>

                {/* Purple bar: ex-sector PE — extends LEFT from center */}
                <rect
                  x={centerX - exBarW}
                  y={y - BAR_H / 2}
                  width={exBarW}
                  height={BAR_H}
                  fill={CHART_COLORS.purple}
                  fillOpacity={0.85}
                  rx={2}
                  style={{ transition: mounted ? `width 0.5s ease ${i * 35 + 20}ms` : undefined }}
                />

                {/* Ex-sector P/E value — left of purple bar start */}
                <text
                  x={width - MARGIN.right - LABEL_W - 4}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={CHART_COLORS.purple}
                >
                  {fmt(row.exSectorPE)}
                </text>

                {/* Right sector label */}
                <text
                  x={width - MARGIN.right - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={CHART_COLORS.mutedText}
                >
                  {row.sector}
                </text>

                {/* Row separator */}
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y + ROW_HEIGHT / 2}
                  y2={y + ROW_HEIGHT / 2}
                  stroke={CHART_COLORS.mutedText}
                  strokeOpacity={0.08}
                />
              </g>
            );
          })}

          {/* Source attribution */}
          <text
            x={width - 8}
            y={height - 6}
            textAnchor="end"
            fontSize={9}
            fontStyle="italic"
            fill={CHART_COLORS.mutedText}
            fillOpacity={0.5}
          >
            Source: Sector Charts Dashboard
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      <ChartTooltip x={tooltip.x} y={tooltip.y} visible={tooltip.visible} containerWidth={width}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: CHART_COLORS.lightText }}>
          {tooltip.sector}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: CHART_COLORS.teal }}>
            Sector P/E: <strong>{fmt(tooltip.sectorPE)}</strong>
          </span>
          <span style={{ color: CHART_COLORS.purple }}>
            Ex-Sector P/E: <strong>{fmt(tooltip.exSectorPE)}</strong>
          </span>
          <span style={{ color: '#f59e0b' }}>
            Difference: <strong>{(tooltip.sectorPE - tooltip.exSectorPE).toFixed(1)}x</strong>
          </span>
          <span style={{ color: CHART_COLORS.mutedText }}>
            S&amp;P 500: <strong style={{ color: CHART_COLORS.lightText }}>{fmt(tooltip.sp500PE)}</strong>
          </span>
        </div>
      </ChartTooltip>
    </div>
  );
}
