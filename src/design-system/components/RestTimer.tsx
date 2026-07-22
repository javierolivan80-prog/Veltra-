"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { useWorkoutSessionStore } from "@/state/workoutSession.store";
import { ProgressRing } from "./ProgressRing";

export function RestTimer() {
  const restTimer = useWorkoutSessionStore((s) => s.restTimer);
  const clearRest = useWorkoutSessionStore((s) => s.clearRest);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!restTimer.endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [restTimer.endsAt]);

  useEffect(() => {
    if (restTimer.endsAt && restTimer.endsAt <= now) {
      clearRest();
    }
  }, [now, restTimer.endsAt, clearRest]);

  if (!restTimer.endsAt) return null;

  const remainingMs = Math.max(0, restTimer.endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = restTimer.durationSeconds > 0 ? remainingMs / 1000 / restTimer.durationSeconds : 0;

  return (
    <div className="flex items-center justify-between bg-info-bg border border-info/25 rounded-2xl px-4 py-3 mb-4">
      <div className="flex items-center gap-3">
        <ProgressRing progress={1 - progress} size={40} strokeWidth={4} color="#4DA3FF" trackColor="#132844">
          <Clock size={14} className="text-info" />
        </ProgressRing>
        <div>
          <p className="text-info text-lg font-display leading-none">{formatDuration(remainingSec)}</p>
          <p className="text-ink-dim text-xs mt-1">Descanso</p>
        </div>
      </div>
      <button onClick={clearRest} className="px-3.5 py-2 rounded-full bg-surface-raised text-ink-dim text-xs font-semibold hover:text-ink">
        Saltar
      </button>
    </div>
  );
}
