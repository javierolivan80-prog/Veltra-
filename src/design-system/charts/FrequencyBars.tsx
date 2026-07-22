"use client";

import { motion } from "framer-motion";

export function FrequencyBars({ weeks, labels }: { weeks: number[]; labels: string[] }) {
  const max = Math.max(1, ...weeks);

  return (
    <div className="flex items-end justify-between h-24 px-1">
      {weeks.map((count, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <span className="text-ink-dim text-[10px] font-semibold mb-1">{count > 0 ? count : ""}</span>
          <motion.div
            initial={{ height: 4 }}
            animate={{ height: Math.max(4, (count / max) * 56) }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 200, damping: 20 }}
            className={`w-3.5 rounded-full ${count > 0 ? "bg-info" : "bg-line"}`}
          />
          <span className="text-ink-faint text-[9px] mt-1.5">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
