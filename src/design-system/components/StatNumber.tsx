"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
  xl: "text-7xl",
};

interface StatNumberProps {
  value: string | number;
  unit?: string;
  label?: string;
  size?: Size;
  color?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
}

export function StatNumber({ value, unit, label, size = "lg", color = "text-ink", trend }: StatNumberProps) {
  const trendColor = trend?.direction === "up" ? "text-progress" : trend?.direction === "down" ? "text-danger" : "text-ink-faint";

  return (
    <div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0, scale: 0.92, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 14, stiffness: 180 }}
        className="flex items-baseline gap-1.5"
      >
        <span className={cn("font-display tracking-tight", SIZE_CLASSES[size], color)}>{value}</span>
        {unit ? <span className="text-base font-medium text-ink-dim mb-1">{unit}</span> : null}
      </motion.div>
      {label ? <p className="text-sm font-medium text-ink-dim mt-1">{label}</p> : null}
      {trend ? (
        <p className={cn("text-xs font-semibold mt-0.5", trendColor)}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
        </p>
      ) : null}
    </div>
  );
}
