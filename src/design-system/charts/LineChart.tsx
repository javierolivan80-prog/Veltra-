"use client";

import { motion } from "framer-motion";

export interface ChartPoint {
  x: string;
  y: number;
}

interface LineChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
  formatX?: (v: string, index: number) => string;
  predictedY?: number;
}

function catmullRomPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function LineChart({ data, color = "#2CE6A0", height = 220, formatX, predictedY }: LineChartProps) {
  const width = 340;
  const paddingX = 16;
  const paddingTop = 28;
  const paddingBottom = 28;
  const gradientId = `area-${color.replace("#", "")}`;

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-ink-faint text-sm">Todavía no hay datos suficientes</p>
      </div>
    );
  }

  const values = data.map((d) => d.y);
  const allValues = predictedY !== undefined ? [...values, predictedY] : values;
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const rangeY = maxY - minY || 1;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const points = data.map((d, i) => ({
    x: paddingX + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth),
    y: paddingTop + chartHeight - ((d.y - minY) / rangeY) * chartHeight,
  }));

  const linePath = catmullRomPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  const last = points[points.length - 1];
  const predictedPoint =
    predictedY !== undefined
      ? { x: Math.min(width - paddingX, last.x + chartWidth * 0.18), y: paddingTop + chartHeight - ((predictedY - minY) / rangeY) * chartHeight }
      : null;

  const gridLines = [0.25, 0.5, 0.75].map((f) => paddingTop + chartHeight * f);

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.32} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => (
          <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#221F22" strokeWidth={1} />
        ))}

        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
        <motion.path
          d={linePath}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />

        {predictedPoint ? (
          <>
            <line x1={last.x} y1={last.y} x2={predictedPoint.x} y2={predictedPoint.y} stroke={color} strokeWidth={2} strokeDasharray="5,5" opacity={0.55} />
            <circle cx={predictedPoint.x} cy={predictedPoint.y} r={4} fill="none" stroke={color} strokeWidth={2} opacity={0.7} />
          </>
        ) : null}

        {points.map((p, i) =>
          i === points.length - 1 ? null : <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#0B0B0B" stroke={color} strokeWidth={1.5} opacity={0.6} />
        )}
        <motion.circle
          cx={last.x}
          cy={last.y}
          r={5}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 300, damping: 15 }}
        />
      </svg>

      <div className="flex justify-between px-1 -mt-2">
        <span className="text-ink-faint text-[11px]">{formatX ? formatX(data[0].x, 0) : data[0].x}</span>
        <span className="text-ink-faint text-[11px]">{formatX ? formatX(data[data.length - 1].x, data.length - 1) : data[data.length - 1].x}</span>
      </div>
    </div>
  );
}
