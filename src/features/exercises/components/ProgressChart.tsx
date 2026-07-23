"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ProgressChartProps {
  points: { date: string; value: number }[];
  color: string;
  unit: string;
  pr?: { value: number; date: string } | null;
  height?: number;
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function ChartTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-3 py-2 shadow-xl">
      <p className="text-ink-faint text-[10px] font-medium">{new Date(p.ts).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
      <p className="text-ink text-sm font-bold tabular-nums">
        {p.value} <span className="text-ink-dim font-medium">{unit}</span>
      </p>
    </div>
  );
}

export function ProgressChart({ points, color, unit, pr, height = 260 }: ProgressChartProps) {
  const gradientId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useMemo(() => points.map((p) => ({ ts: new Date(p.date).getTime(), value: p.value })), [points]);
  const prTs = pr ? new Date(pr.date).getTime() : null;

  if (!mounted) return <div style={{ height }} className="w-full animate-pulse rounded-2xl bg-surface" />;

  if (data.length === 0) {
    return (
      <div style={{ height }} className="w-full flex items-center justify-center rounded-2xl bg-surface">
        <p className="text-ink-faint text-sm">Sin datos en este periodo.</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#221f22" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={shortDate}
            tick={{ fill: "#6b6b72", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#221f22" }}
            minTickGap={40}
          />
          <YAxis
            width={44}
            tick={{ fill: "#6b6b72", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: color, strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={data.length <= 20 ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: color, stroke: "#0b0b0b", strokeWidth: 2 }}
            animationDuration={700}
          />
          {prTs !== null && pr ? <ReferenceDot x={prTs} y={pr.value} r={5} fill="#ffc94d" stroke="#0b0b0b" strokeWidth={2} /> : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
