"use client";

import { motion } from "framer-motion";

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string; // hex for the fill
}

/** A single animated macro progress bar. Turns celebratory once the goal is
 *  reached and clearly flags an overshoot, so hitting a target feels good. */
export function MacroBar({ label, current, goal, unit, color }: MacroBarProps) {
  const ratio = goal > 0 ? current / goal : 0;
  const pct = Math.round(ratio * 100);
  const reached = ratio >= 1;
  const over = ratio > 1.05;
  const fill = Math.min(1, ratio);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-ink-dim text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-xs font-semibold" style={{ color: over ? "#ff9548" : reached ? color : undefined }}>
          <span className="text-ink tabular-nums">{Math.round(current)}</span>
          <span className="text-ink-faint"> / {Math.round(goal)} {unit}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-surface overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: over ? "#ff9548" : color, boxShadow: `0 0 12px ${over ? "#ff9548" : color}55` }}
          initial={{ width: 0 }}
          animate={{ width: `${fill * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-end mt-1">
        <span className="text-[10px] font-bold tabular-nums" style={{ color: over ? "#ff9548" : reached ? color : "var(--color-ink-faint)" }}>
          {over ? `+${pct - 100}% por encima` : reached ? "objetivo alcanzado ✓" : `${pct}%`}
        </span>
      </div>
    </div>
  );
}
