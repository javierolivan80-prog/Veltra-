"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export type HeatmapTone = "progress" | "neutral" | "record" | "addiction" | "sleep" | "danger";

const TONE_BG: Record<HeatmapTone, string> = {
  progress: "bg-progress",
  neutral: "bg-line",
  record: "bg-record",
  addiction: "bg-addiction",
  sleep: "bg-sleep",
  danger: "bg-danger",
};

export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  tone: HeatmapTone;
  label?: string; // tooltip text, defaults to the date
}

/** GitHub-style contribution grid — one column per week, Monday at the top.
 *  `data` must be ordered oldest-first and contiguous (no gaps). */
export function HeatmapCalendar({ data }: { data: HeatmapCell[] }) {
  if (data.length === 0) return null;

  const [y, m, d] = data[0].date.split("-").map(Number);
  const jsWeekday = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  const leadingBlanks = (jsWeekday + 6) % 7; // 0=Mon..6=Sun

  const cells: (HeatmapCell | null)[] = [...Array(leadingBlanks).fill(null), ...data];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((cell, di) => (
            <motion.div
              key={di}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (wi * 7 + di) * 0.006 }}
              title={cell ? (cell.label ?? cell.date) : undefined}
              className={cn("w-3.5 h-3.5 rounded-[4px]", cell ? TONE_BG[cell.tone] : "bg-transparent")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
