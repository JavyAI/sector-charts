interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ data, width = 120, height = 32 }: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#4b5563"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const padding = height * 0.05;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const xStep = width / (data.length - 1);
  const yScale = (v: number) =>
    height - padding - ((v - minVal) / range) * (height - 2 * padding);

  const points = data.map((v, i) => `${i * xStep},${yScale(v)}`).join(' ');

  const trending = data[data.length - 1] >= data[0];
  const lineColor = trending ? '#22c55e' : '#ef4444';
  const fillColor = trending ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';

  // Build filled path: line + close back along the bottom
  const lastX = (data.length - 1) * xStep;
  const lastY = yScale(data[data.length - 1]);
  const firstY = yScale(data[0]);
  const fillPath = `M0,${firstY} ${data
    .map((v, i) => `L${i * xStep},${yScale(v)}`)
    .join(' ')} L${lastX},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Subtle fill */}
      <path d={fillPath} fill={fillColor} />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
