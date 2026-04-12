import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { StockBubble } from '../hooks/useDispersionData';

interface DispersionChartProps {
  stocks: StockBubble[];
  sectorAverages: Record<string, number>;
  metric: 'pe' | 'return';
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  stock: StockBubble | null;
}

const SECTOR_ABBREVIATIONS: Record<string, string> = {
  'Information Technology': 'Info Tech',
  'Health Care': 'Health Care',
  Financials: 'Financials',
  'Consumer Discretionary': 'Con Disc',
  'Communication Services': 'Comm Svcs',
  Industrials: 'Industrials',
  'Consumer Staples': 'Con Staples',
  Energy: 'Energy',
  Utilities: 'Utilities',
  'Real Estate': 'Real Estate',
  Materials: 'Materials',
};

const BUBBLE_COLORS = {
  aboveAverage: {
    fill: 'rgba(34, 197, 94, 0.6)',
    stroke: 'rgba(34, 197, 94, 0.9)',
  },
  belowAverage: {
    fill: 'rgba(239, 68, 68, 0.6)',
    stroke: 'rgba(239, 68, 68, 0.9)',
  },
};

const Y_GRIDLINES = [10, 20, 30, 40, 50, 60];
const MARGIN = { top: 40, right: 20, bottom: 60, left: 50 };
const MIN_BUBBLE_R = 3;
const MAX_BUBBLE_R = 22;

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

export default function DispersionChart({ stocks, sectorAverages, metric }: DispersionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, stock: null });
  const [mounted, setMounted] = useState(false);

  // Responsive width
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

  // Fade-in on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const sectors = useMemo(
    () => Object.keys(sectorAverages).sort(),
    [sectorAverages]
  );

  const innerW = width - MARGIN.left - MARGIN.right;
  const height = 520;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  // Y scale: P/E range from data, padded
  const peValues = stocks.map((s) => s.peRatio);
  const peMin = Math.max(0, (peValues.length ? Math.min(...peValues) : 0) - 2);
  const peMax = (peValues.length ? Math.max(...peValues) : 80) + 5;

  const yScale = useCallback(
    (val: number) => innerH - ((val - peMin) / (peMax - peMin)) * innerH,
    [innerH, peMin, peMax]
  );

  // Bubble radius scale (sqrt of market cap)
  const caps = stocks.map((s) => s.marketCap);
  const capMin = caps.length ? Math.min(...caps) : 1e9;
  const capMax = caps.length ? Math.max(...caps) : 2e12;
  const rScale = useCallback(
    (cap: number) => {
      const t = (cap - capMin) / (capMax - capMin + 1);
      return MIN_BUBBLE_R + Math.sqrt(t) * (MAX_BUBBLE_R - MIN_BUBBLE_R);
    },
    [capMin, capMax]
  );

  // Column x-center per sector
  const colWidth = sectors.length > 0 ? innerW / sectors.length : innerW / 11;
  const sectorX = useMemo(() => {
    const map: Record<string, number> = {};
    sectors.forEach((s, i) => {
      map[s] = i * colWidth + colWidth / 2;
    });
    return map;
  }, [sectors, colWidth]);

  // Top-3 stocks per sector by market cap (for labels)
  const labelSet = useMemo(() => {
    const bysector: Record<string, StockBubble[]> = {};
    for (const stock of stocks) {
      if (!bysector[stock.sector]) bysector[stock.sector] = [];
      bysector[stock.sector].push(stock);
    }
    const set = new Set<string>();
    for (const arr of Object.values(bysector)) {
      arr.sort((a, b) => b.marketCap - a.marketCap).slice(0, 3).forEach((s) => set.add(s.symbol));
    }
    return set;
  }, [stocks]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, stock: StockBubble) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        stock,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGCircleElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip((prev) => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false, stock: null }));
  }, []);

  const yAxisLabel = metric === 'pe' ? 'P/E Ratio' : 'Weekly Return %';

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ minHeight: height }}>
      {/* Legend */}
      <div className="flex items-center gap-6 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-full w-3 h-3"
            style={{ background: BUBBLE_COLORS.aboveAverage.fill, border: `1.5px solid ${BUBBLE_COLORS.aboveAverage.stroke}` }}
          />
          Above sector avg
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-full w-3 h-3"
            style={{ background: BUBBLE_COLORS.belowAverage.fill, border: `1.5px solid ${BUBBLE_COLORS.belowAverage.stroke}` }}
          />
          Below sector avg
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-gray-400 dark:border-gray-500" />
          Sector avg
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, background: '#94a3b8' }}
          />
          <span
            className="inline-block rounded-full"
            style={{ width: 14, height: 14, background: '#94a3b8' }}
          />
          Bubble size = market cap
        </div>
      </div>

      <svg
        width={width}
        height={height}
        style={{ overflow: 'visible', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Y-axis gridlines */}
          {Y_GRIDLINES.filter((v) => v >= peMin && v <= peMax).map((v) => (
            <g key={v}>
              <line
                x1={0}
                x2={innerW}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
                className="text-gray-500 dark:text-gray-400"
              />
              <text
                x={-8}
                y={yScale(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                className="fill-gray-400 dark:fill-gray-500"
                fill="currentColor"
                fillOpacity={0.7}
              >
                {v}
              </text>
            </g>
          ))}

          {/* Y-axis label */}
          <text
            transform={`translate(-38, ${innerH / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={11}
            className="fill-gray-500 dark:fill-gray-400"
            fill="currentColor"
            fillOpacity={0.8}
          >
            {yAxisLabel}
          </text>

          {/* Sector columns */}
          {sectors.map((sector, i) => {
            const cx = sectorX[sector] ?? 0;
            const avgPe = sectorAverages[sector] ?? 0;
            const avgY = yScale(avgPe);
            const abbr = SECTOR_ABBREVIATIONS[sector] ?? sector;
            const isLast = i === sectors.length - 1;

            return (
              <g key={sector}>
                {/* Vertical divider (skip last) */}
                {!isLast && (
                  <line
                    x1={cx + colWidth / 2}
                    x2={cx + colWidth / 2}
                    y1={0}
                    y2={innerH}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    className="text-gray-400"
                  />
                )}

                {/* Sector average dashed line */}
                {avgPe > 0 && (
                  <line
                    x1={cx - colWidth / 2 + 4}
                    x2={cx + colWidth / 2 - 4}
                    y1={avgY}
                    y2={avgY}
                    stroke="currentColor"
                    strokeOpacity={0.5}
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    className="text-gray-400 dark:text-gray-500"
                  />
                )}

                {/* Sector header label */}
                <text
                  x={cx}
                  y={-20}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={500}
                  className="fill-gray-500 dark:fill-gray-400"
                  fill="currentColor"
                  fillOpacity={0.85}
                >
                  {abbr}
                </text>

                {/* Sector name at bottom */}
                <text
                  x={cx}
                  y={innerH + 16}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-gray-400 dark:fill-gray-500"
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  {avgPe > 0 ? `avg ${avgPe.toFixed(0)}x` : ''}
                </text>
              </g>
            );
          })}

          {/* Bubbles — render smaller ones first so larger sit on top */}
          {[...stocks]
            .sort((a, b) => b.marketCap - a.marketCap)
            .reverse()
            .map((stock) => {
              const cx = sectorX[stock.sector];
              if (cx === undefined) return null;
              const cy = yScale(stock.peRatio);
              const r = rScale(stock.marketCap);
              const colors = stock.isAboveAverage ? BUBBLE_COLORS.aboveAverage : BUBBLE_COLORS.belowAverage;
              const showLabel = labelSet.has(stock.symbol);

              return (
                <g key={stock.symbol} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={1}
                    onMouseEnter={(e) => handleMouseEnter(e, stock)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{ transition: 'r 0.2s ease' }}
                  />
                  {showLabel && (
                    <text
                      x={cx}
                      y={cy - r - 3}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight={600}
                      className="fill-gray-700 dark:fill-gray-200"
                      fill="currentColor"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {stock.symbol}
                    </text>
                  )}
                </g>
              );
            })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip.visible && tooltip.stock && (
        <div
          className="absolute z-50 pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            maxWidth: 220,
            transform: tooltip.x > width - 240 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{tooltip.stock.symbol}</div>
          <div className="text-gray-600 dark:text-gray-300 mb-1 truncate">{tooltip.stock.security}</div>
          <div className="text-gray-500 dark:text-gray-400 mb-1">{tooltip.stock.sector}</div>
          <div className="flex gap-3">
            <span className="text-gray-700 dark:text-gray-200">
              P/E: <strong>{tooltip.stock.peRatio.toFixed(1)}x</strong>
            </span>
            <span className="text-gray-700 dark:text-gray-200">
              Mkt Cap: <strong>{formatMarketCap(tooltip.stock.marketCap)}</strong>
            </span>
          </div>
          <div
            className="mt-1 text-xs font-medium"
            style={{
              color: tooltip.stock.isAboveAverage
                ? BUBBLE_COLORS.aboveAverage.stroke
                : BUBBLE_COLORS.belowAverage.stroke,
            }}
          >
            {tooltip.stock.isAboveAverage ? 'Above' : 'Below'} sector average
          </div>
        </div>
      )}
    </div>
  );
}
