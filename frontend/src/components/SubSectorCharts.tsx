import { useRef, useState, useEffect, useMemo } from 'react';
import { SubIndustry, SubSectorConstituent } from '../services/api';
import { CHART_COLORS } from './chartColors';

interface SubSectorChartsProps {
  subIndustries: SubIndustry[];
  constituents: SubSectorConstituent[];
}

// ── Chart A: Sub-Industry Performance Bar ─────────────────────────────────────

function PerformanceBar({ subIndustries }: { subIndustries: SubIndustry[] }) {
  const sorted = useMemo(
    () => [...subIndustries].sort((a, b) => b.avgWeeklyReturn - a.avgWeeklyReturn),
    [subIndustries],
  );
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.avgWeeklyReturn)), 0.1);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-2">
        Avg Weekly Return by Sub-Industry
      </p>
      <div className="space-y-1.5">
        {sorted.map((sub) => {
          const pct = (Math.abs(sub.avgWeeklyReturn) / maxAbs) * 100;
          const positive = sub.avgWeeklyReturn >= 0;
          return (
            <div key={sub.name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-300 truncate flex-1 mr-2" title={sub.name}>
                  {sub.name}
                </span>
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: positive ? '#22c55e' : '#ef4444' }}
                >
                  {positive ? '+' : ''}{sub.avgWeeklyReturn.toFixed(2)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: positive ? '#22c55e' : '#ef4444',
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chart B: Butterfly — sub-industry vs rest-of-sector ──────────────────────

function ButterflyChart({ subIndustries }: { subIndustries: SubIndustry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 400);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Compute sub-industry avg vs rest-of-sector avg
  const totalReturns = useMemo(() => {
    const totalWeighted = subIndustries.reduce(
      (acc, s) => acc + s.avgWeeklyReturn * s.count,
      0,
    );
    const totalCount = subIndustries.reduce((acc, s) => acc + s.count, 0);
    return totalCount > 0 ? totalWeighted / totalCount : 0;
  }, [subIndustries]);

  const rows = useMemo(() => {
    const totalWeighted = subIndustries.reduce(
      (acc, s) => acc + s.avgWeeklyReturn * s.count,
      0,
    );
    const totalCount = subIndustries.reduce((acc, s) => acc + s.count, 0);

    return subIndustries
      .map((sub) => {
        const exWeighted = totalWeighted - sub.avgWeeklyReturn * sub.count;
        const exCount = totalCount - sub.count;
        const exReturn = exCount > 0 ? exWeighted / exCount : 0;
        return { name: sub.name, subReturn: sub.avgWeeklyReturn, exReturn };
      })
      .sort((a, b) => b.subReturn - a.subReturn);
  }, [subIndustries]);

  const MARGIN = { top: 20, right: 8, bottom: 8, left: 8 };
  const ROW_HEIGHT = 28;
  const BAR_H = 10;
  const LABEL_W = 130;
  const VALUE_W = 44;
  const barAreaW = Math.max(60, width - MARGIN.left - MARGIN.right - (LABEL_W + VALUE_W) * 2);
  const halfW = barAreaW / 2;
  const centerX = MARGIN.left + LABEL_W + VALUE_W + halfW;
  const height = MARGIN.top + rows.length * ROW_HEIGHT + MARGIN.bottom;

  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.subReturn), Math.abs(r.exReturn)]), 0.1);
  const valToW = (v: number) => (Math.abs(v) / maxAbs) * halfW;

  const fmtReturn = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-1">
        Sub-Industry vs Rest of Sector
        {' '}
        <span className="text-gray-500 font-normal">(sector avg: {fmtReturn(totalReturns)})</span>
      </p>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: CHART_COLORS.teal }}>Sub-Industry</span>
        <span style={{ color: CHART_COLORS.purple }}>Rest of Sector</span>
      </div>
      <div ref={containerRef} className="w-full" style={{ minHeight: height }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          {/* Center line */}
          <line
            x1={centerX} x2={centerX}
            y1={MARGIN.top - 4} y2={MARGIN.top + rows.length * ROW_HEIGHT + 4}
            stroke={CHART_COLORS.mutedText}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          {rows.map((row, i) => {
            const y = MARGIN.top + i * ROW_HEIGHT + ROW_HEIGHT / 2;
            const subW = mounted ? valToW(row.subReturn) : 0;
            const exW = mounted ? valToW(row.exReturn) : 0;
            const subPositive = row.subReturn >= 0;
            const exPositive = row.exReturn >= 0;

            return (
              <g key={row.name}>
                {/* Left label */}
                <text
                  x={MARGIN.left + LABEL_W - 4}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={9}
                  fill={CHART_COLORS.lightText}
                >
                  {row.name.length > 18 ? row.name.slice(0, 17) + '…' : row.name}
                </text>
                {/* Sub-industry bar — extends right from center */}
                <rect
                  x={centerX}
                  y={y - BAR_H / 2}
                  width={subW}
                  height={BAR_H}
                  fill={subPositive ? CHART_COLORS.teal : '#ef4444'}
                  fillOpacity={0.85}
                  rx={2}
                  style={{ transition: mounted ? `width 0.4s ease ${i * 30}ms` : undefined }}
                />
                {/* Sub value */}
                <text
                  x={MARGIN.left + LABEL_W + 2}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={subPositive ? CHART_COLORS.teal : '#ef4444'}
                >
                  {fmtReturn(row.subReturn)}
                </text>
                {/* Ex-sector bar — extends left from center */}
                <rect
                  x={centerX - exW}
                  y={y - BAR_H / 2}
                  width={exW}
                  height={BAR_H}
                  fill={exPositive ? CHART_COLORS.purple : '#ef4444'}
                  fillOpacity={0.75}
                  rx={2}
                  style={{ transition: mounted ? `width 0.4s ease ${i * 30 + 15}ms` : undefined }}
                />
                {/* Ex value */}
                <text
                  x={width - MARGIN.right - LABEL_W - 2}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={exPositive ? CHART_COLORS.purple : '#ef4444'}
                >
                  {fmtReturn(row.exReturn)}
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
        </svg>
      </div>
    </div>
  );
}

// ── Chart C: Constituent Dot Plot ─────────────────────────────────────────────

function DotPlot({
  subIndustries,
  constituents,
}: {
  subIndustries: SubIndustry[];
  constituents: SubSectorConstituent[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 400);
    return () => ro.disconnect();
  }, []);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    symbol: string;
    return: number;
    subIndustry: string;
  }>({ visible: false, x: 0, y: 0, symbol: '', return: 0, subIndustry: '' });

  const subNames = useMemo(
    () => [...subIndustries].sort((a, b) => b.avgWeeklyReturn - a.avgWeeklyReturn).map((s) => s.name),
    [subIndustries],
  );

  const MARGIN = { top: 24, right: 8, bottom: 40, left: 36 };
  const height = 180;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const returns = constituents.map((c) => c.weeklyReturn).filter((r) => r !== undefined);
  const retMin = returns.length ? Math.min(...returns) : -5;
  const retMax = returns.length ? Math.max(...returns) : 5;
  const pad = (retMax - retMin) * 0.1 || 0.5;
  const yMin = retMin - pad;
  const yMax = retMax + pad;

  const yScale = (v: number) => innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const colW = subNames.length > 0 ? innerW / subNames.length : innerW;

  const subIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    subNames.forEach((n, i) => map.set(n, i));
    return map;
  }, [subNames]);

  // Y-axis gridlines at 0, and ±2, ±5
  const gridLines = [-5, -2, 0, 2, 5].filter((v) => v >= yMin && v <= yMax);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-1">
        Constituent Dispersion (Weekly Return %)
      </p>
      <div ref={containerRef} className="relative w-full" style={{ minHeight: height }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* Grid lines */}
            {gridLines.map((v) => (
              <g key={v}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={yScale(v)}
                  y2={yScale(v)}
                  stroke={v === 0 ? CHART_COLORS.mutedText : CHART_COLORS.mutedText}
                  strokeOpacity={v === 0 ? 0.4 : 0.15}
                  strokeDasharray={v === 0 ? undefined : '3 3'}
                  strokeWidth={v === 0 ? 1 : 0.75}
                />
                <text
                  x={-4}
                  y={yScale(v)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill={CHART_COLORS.mutedText}
                  fillOpacity={0.7}
                >
                  {v > 0 ? `+${v}` : v}%
                </text>
              </g>
            ))}

            {/* Sub-industry column dividers + labels */}
            {subNames.map((name, i) => {
              const cx = i * colW + colW / 2;
              return (
                <g key={name}>
                  {i > 0 && (
                    <line
                      x1={i * colW}
                      x2={i * colW}
                      y1={0}
                      y2={innerH}
                      stroke={CHART_COLORS.mutedText}
                      strokeOpacity={0.08}
                    />
                  )}
                  <text
                    x={cx}
                    y={innerH + 12}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill={CHART_COLORS.mutedText}
                    fillOpacity={0.8}
                  >
                    {name.length > 14 ? name.slice(0, 13) + '…' : name}
                  </text>
                </g>
              );
            })}

            {/* Dots */}
            {constituents.map((c) => {
              const colIdx = subIndexMap.get(c.subIndustry);
              if (colIdx === undefined) return null;
              const cx = colIdx * colW + colW / 2;
              const cy = yScale(c.weeklyReturn);
              const positive = c.weeklyReturn >= 0;
              return (
                <circle
                  key={c.symbol}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill={positive ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'}
                  stroke={positive ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)'}
                  strokeWidth={0.75}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({
                      visible: true,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      symbol: c.symbol,
                      return: c.weeklyReturn,
                      subIndustry: c.subIndustry,
                    });
                  }}
                  onMouseLeave={() => setTooltip((p) => ({ ...p, visible: false }))}
                />
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute z-50 pointer-events-none bg-gray-800 border border-gray-700 rounded shadow-lg px-2 py-1 text-xs"
            style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
          >
            <span className="font-bold text-gray-100">{tooltip.symbol}</span>
            {' '}
            <span
              style={{ color: tooltip.return >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {tooltip.return >= 0 ? '+' : ''}{tooltip.return.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function SubSectorCharts({ subIndustries, constituents }: SubSectorChartsProps) {
  return (
    <div className="space-y-6">
      {/* Chart A */}
      <PerformanceBar subIndustries={subIndustries} />

      {/* Charts B + C side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <ButterflyChart subIndustries={subIndustries} />
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <DotPlot subIndustries={subIndustries} constituents={constituents} />
        </div>
      </div>
    </div>
  );
}
