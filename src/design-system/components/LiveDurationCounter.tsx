"use client";

import { useEffect, useState } from "react";
import { formatElapsedLong } from "@/lib/duration";
import { StatNumber } from "./StatNumber";

/** Ticking "X días, Y horas y Z minutos" display — re-renders once a minute. */
export function LiveDurationCounter({ sinceMs, color = "text-addiction" }: { sinceMs: number; color?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = Math.max(0, now - sinceMs);
  const days = Math.floor(elapsedMs / 86400000);

  return (
    <div>
      <StatNumber value={days} unit="días" size="xl" color={color} />
      <p className="text-ink-dim text-sm mt-1">{formatElapsedLong(elapsedMs)}</p>
    </div>
  );
}
