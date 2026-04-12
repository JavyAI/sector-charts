import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SectorMetric } from '../types';
import { CHART_COLORS } from './chartColors';

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

const MARGIN = { top: 50, right: 120, bottom: 40, left: 160 };
const ROW_HEIGHT = 36;

function fmt(v: number) {
  return `${v.toFixed(1)}x`;
}

export default function SectorVsExSector({ sectors }: SectorVsExSectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, sector: '', sectorPE: 0, exSectorPE: 0, sp500PE: 0 });

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

  // Compute S&P 500 aggregate P/E
  const totalMarketCap = useMemo(() => sectors.reduce((s, x) => s + x.weightedMarketCap, 0), [sectors]);
  const totalEarnings = useMemo(() => sectors.reduce((s, x) => s + x.weightedMarketCap / x.weightedPeRatio, 0), [sectors]);
  const sp500PE = totalMarketCap / totalEarnings;

  // Compute ex-sector P/E for each sector
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
  const innerW = width - MARGIN.left - MARGIN.right;
  const halfW = innerW / 2;

  // Scale: max P/E across both sides
  const maxPE = Math.max(...rows.flatMap(r => [r.sectorPE, r.exSectorPE]), sp500PE) * 1.15;

  // Left scale: sector PE maps 0..maxPE to 0..halfW (bars go right from center)
  // Right scale: ex-sector PE maps 0..maxPE to 0..halfW (bars go left from center)
  const peToW = (pe: number) => (pe / maxPE) * halfW;

  const centerX = MARGIN.left + halfW;

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

  // X axis ticks
  const xTicks = [0, 10, 20, 30, 40, 50].filter(v => v <= maxPE);

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ minHeight: height }}>
      {/* Header badges */}
      <div
        className="absolute flex justify-between items-center text-xs font-semibold"
        style={{ left: MARGIN.left, width: innerW, top: 8 }}
      >
        <span
          className="px-2 py-0.5 rounded text-white"
          style={{ background: CHART_COLORS.teal }}
        >
          S&amp;P 500 Sector
        </span>
        <span
          className="px-2 py-0.5 rounded text-white"
          style={{ background: CHART_COLORS.purple }}
        >
          S&amp;P 500 Ex-Sector
        </span>
      </div>

      <svg
        width={width}
        height={height}
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease', overflow: 'visible' }}
      >
        <g>
          {/* X-axis ticks on both sides */}
          {xTicks.map(v => {
            const lx = centerX - peToW(v);
            const rx = centerX + peToW(v);
            return (
              <g key={v}>
                {v > 0 && (
                  <>
                    <line x1={lx} x2={lx} y1={MARGIN.top - 8} y2={MARGIN.top + rows.length * ROW_HEIGHT} stroke={CHART_COLORS.mutedText} strokeOpacity={0.15} strokeDasharray="3 3" />
                    <text x={lx} y={MARGIN.top - 10} textAnchor="middle" fontSize={9} fill={CHART_COLORS.mutedText}>{v}x</text>
                    <line x1={rx} x2={rx} y1={MARGIN.top - 8} y2={MARGIN.top + rows.length * ROW_HEIGHT} stroke={CHART_COLORS.mutedText} strokeOpacity={0.15} strokeDasharray="3 3" />
                    <text x={rx} y={MARGIN.top - 10} textAnchor="middle" fontSize={9} fill={CHART_COLORS.mutedText}>{v}x</text>
                  </>
                )}
              </g>
            );
          })}

          {/* S&P 500 center reference line */}
          {(() => {
            const sp500x = centerX + peToW(sp500PE);
            return (
              <line
                x1={sp500x} x2={sp500x}
                y1={MARGIN.top - 8}
                y2={MARGIN.top + rows.length * ROW_HEIGHT + 8}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                strokeOpacity={0.7}
              />
            );
          })()}

          {/* Center vertical divider */}
          <line
            x1={centerX} x2={centerX}
            y1={MARGIN.top - 8}
            y2={MARGIN.top + rows.length * ROW_HEIGHT + 8}
            stroke={CHART_COLORS.mutedText}
            strokeOpacity={0.4}
            strokeWidth={1}
          />

          {/* S&P 500 overall PE label */}
          <text
            x={centerX + peToW(sp500PE) + 4}
            y={MARGIN.top - 10}
            fontSize={9}
            fill="#f59e0b"
            fontWeight={600}
          >
            S&amp;P {fmt(sp500PE)}
          </text>

          {/* Rows */}
          {rows.map((row, i) => {
            const y = MARGIN.top + i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const sectorBarW = peToW(row.sectorPE);
            const exBarW = peToW(row.exSectorPE);
            const barH = 14;

            return (
              <g
                key={row.sector}
                onMouseEnter={e => handleMouseEnter(e, row)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* Row background on hover (transparent normally) */}
                <rect
                  x={MARGIN.left} y={y - ROW_HEIGHT / 2}
                  width={innerW} height={ROW_HEIGHT}
                  fill="transparent"
                />

                {/* Sector name (left) */}
                <text
                  x={centerX - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={CHART_COLORS.lightText}
                >
                  {row.sector}
                </text>

                {/* Left bar: sector PE (teal, extends right from center) */}
                <rect
                  x={centerX}
                  y={y - barH / 2}
                  width={sectorBarW}
                  height={barH}
                  fill={CHART_COLORS.teal}
                  fillOpacity={0.85}
                  rx={2}
                />
                {/* Sector PE value at right end of bar */}
                <text
                  x={centerX + sectorBarW + 4}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={CHART_COLORS.teal}
                >
                  {fmt(row.sectorPE)}
                </text>

                {/* Right bar: ex-sector PE (purple, extends left from center) */}
                <rect
                  x={centerX - exBarW}
                  y={y - barH / 2}
                  width={exBarW}
                  height={barH}
                  fill={CHART_COLORS.purple}
                  fillOpacity={0.85}
                  rx={2}
                />
                {/* Ex-sector PE value at left end of bar */}
                <text
                  x={centerX - exBarW - 4}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={CHART_COLORS.purple}
                >
                  {fmt(row.exSectorPE)}
                </text>

                {/* Sector name repeated on right edge */}
                <text
                  x={MARGIN.left + innerW + MARGIN.right - 4}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill={CHART_COLORS.mutedText}
                  fillOpacity={0.6}
                >
                  {row.sector}
                </text>

                {/* Row separator */}
                <line
                  x1={MARGIN.left} x2={MARGIN.left + innerW}
                  y1={y + ROW_HEIGHT / 2} y2={y + ROW_HEIGHT / 2}
                  stroke={CHART_COLORS.mutedText}
                  strokeOpacity={0.08}
                />
              </g>
            );
          })}

          {/* Source attribution */}
          <text
            x={width - 8}
            y={height - 8}
            textAnchor="end"
            fontSize={9}
            fill={CHART_COLORS.mutedText}
            fillOpacity={0.5}
          >
            Source: Sector Charts Dashboard
          </text>
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
            <span style={{ color: CHART_COLORS.teal }}>Sector P/E: <strong>{fmt(tooltip.sectorPE)}</strong></span>
            <span style={{ color: CHART_COLORS.purple }}>Ex-Sector P/E: <strong>{fmt(tooltip.exSectorPE)}</strong></span>
            <span className="text-yellow-400">S&amp;P 500 P/E: <strong>{fmt(tooltip.sp500PE)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
