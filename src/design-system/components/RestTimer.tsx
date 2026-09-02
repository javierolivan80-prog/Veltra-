"use client";

import { Bell, BellOff, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isAlertMuted, playRestFinishedAlert, setAlertMuted } from "@/lib/alert";
import { formatDuration } from "@/lib/format";
import { useWorkoutSessionStore } from "@/state/workoutSession.store";
import { ProgressRing } from "./ProgressRing";

export function RestTimer({ sessionId }: { sessionId: string }) {
  const restTimer = useWorkoutSessionStore((s) => s.restTimer);
  const clearRest = useWorkoutSessionStore((s) => s.clearRest);
  const [now, setNow] = useState(() => Date.now());
  // Lazy initializer rather than an effect: this reads a synchronous browser
  // API, so there is nothing to synchronize after mount.
  const [muted, setMuted] = useState(() => (typeof window === "undefined" ? false : isAlertMuted()));
  // Guards against the alert firing twice if the effect re-runs on the same rest.
  const alertedFor = useRef<number | null>(null);

  // Ignore a rest timer left over from a different session (e.g. one that was
  // never cleared before the app closed) — it belongs to a different session.
  const endsAt = restTimer.sessionId === sessionId ? restTimer.endsAt : null;

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt && endsAt <= now) {
      if (alertedFor.current !== endsAt) {
        alertedFor.current = endsAt;
        playRestFinishedAlert();
      }
      clearRest();
    }
  }, [now, endsAt, clearRest]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAlertMuted(next);
  };

  if (!endsAt) return null;

  const remainingMs = Math.max(0, endsAt - now);
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
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleMute}
          aria-label={muted ? "Activar aviso de descanso" : "Silenciar aviso de descanso"}
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-faint hover:text-ink"
        >
          {muted ? <BellOff size={15} /> : <Bell size={15} />}
        </button>
        <button onClick={clearRest} className="px-3.5 py-2 rounded-full bg-surface-raised text-ink-dim text-xs font-semibold hover:text-ink">
          Saltar
        </button>
      </div>
    </div>
  );
}
