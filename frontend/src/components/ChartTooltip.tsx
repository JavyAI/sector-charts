import React from 'react';

interface ChartTooltipProps {
  x: number;
  y: number;
  visible: boolean;
  containerWidth: number;
  children: React.ReactNode;
}

/**
 * Absolutely-positioned tooltip div overlaid on the chart container.
 * Dark bg, white text, rounded, shadow. Flips left when near right edge.
 */
export default function ChartTooltip({ x, y, visible, containerWidth, children }: ChartTooltipProps) {
  if (!visible) return null;

  const flipLeft = x > containerWidth - 240;

  return (
    <div
      className="absolute z-50 pointer-events-none rounded-lg shadow-lg text-sm"
      style={{
        left: x + 14,
        top: y - 10,
        transform: flipLeft ? 'translateX(-110%)' : undefined,
        background: '#1f2937',
        color: '#e5e7eb',
        padding: '10px 14px',
        minWidth: 160,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </div>
  );
}
