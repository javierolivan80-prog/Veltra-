"use client";

import { Coffee, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Stepper } from "@/design-system/components/Stepper";
import { StatNumber } from "@/design-system/components/StatNumber";
import { useAddFocusSession, useFocusSessions } from "@/features/focus/hooks";
import { playFinishedAlert, primeAlerts } from "@/lib/alert";
import { todayKey } from "@/lib/date";
import { formatDuration } from "@/lib/format";

const WORK_KEY = "veltra-focus-work";
const BREAK_KEY = "veltra-focus-break";

function getSaved(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) : fallback;
  } catch {
    return fallback;
  }
}

type Phase = "idle" | "work" | "break";

export default function FocusPage() {
  const { data: sessions = [] } = useFocusSessions();
  const addSession = useAddFocusSession();

  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<Phase>("idle");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const workDuration = useRef(25);

  useEffect(() => {
    setWorkMinutes(getSaved(WORK_KEY, 25));
    setBreakMinutes(getSaved(BREAK_KEY, 5));
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt || now < endsAt) return;
    if (phase === "work") {
      playFinishedAlert("Bloque terminado", "Toca para descansar");
      addSession.mutate(workDuration.current);
      setPhase("break");
      setEndsAt(Date.now() + breakMinutes * 60000);
    } else if (phase === "break") {
      playFinishedAlert("Descanso terminado", "Listo para el siguiente bloque");
      setPhase("idle");
      setEndsAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, endsAt, phase]);

  const todayCount = useMemo(() => sessions.filter((s) => s.completedAt.slice(0, 10) === todayKey()).length, [sessions]);
  const weekHours = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const minutes = sessions.filter((s) => new Date(s.completedAt).getTime() >= weekAgo).reduce((sum, s) => sum + s.durationMinutes, 0);
    return Math.round((minutes / 60) * 10) / 10;
  }, [sessions]);
  const monthHours = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400000;
    const minutes = sessions.filter((s) => new Date(s.completedAt).getTime() >= monthAgo).reduce((sum, s) => sum + s.durationMinutes, 0);
    return Math.round((minutes / 60) * 10) / 10;
  }, [sessions]);

  const startWork = () => {
    primeAlerts();
    try {
      localStorage.setItem(WORK_KEY, String(workMinutes));
      localStorage.setItem(BREAK_KEY, String(breakMinutes));
    } catch {
      // storage unavailable — the setting just won't persist
    }
    workDuration.current = workMinutes;
    setPhase("work");
    const start = Date.now();
    setNow(start);
    setEndsAt(start + workMinutes * 60000);
  };

  const stop = () => {
    setPhase("idle");
    setEndsAt(null);
  };

  const remainingSec = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const totalSec = phase === "work" ? workDuration.current * 60 : breakMinutes * 60;
  const progress = endsAt ? 1 - remainingSec / totalSec : 0;

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/dashboard" label="Hoy" />
      <div>
        <p className="text-ink-dim text-sm">Mente</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Foco</h1>
      </div>

      <Card raised className="flex flex-col items-center py-8">
        {phase !== "idle" ? (
          <>
            <div className="flex items-center gap-1.5 mb-2 text-ink-dim text-xs font-semibold uppercase tracking-wider">
              {phase === "work" ? <Timer size={13} /> : <Coffee size={13} />}
              {phase === "work" ? "Trabajo" : "Descanso"}
            </div>
            <ProgressRing progress={progress} size={160} strokeWidth={10} color={phase === "work" ? "#2CE6A0" : "#4DA3FF"} trackColor="#151515">
              <span className="text-ink text-3xl font-display">{formatDuration(remainingSec)}</span>
            </ProgressRing>
            <div className="mt-6">
              <Button label="Detener" variant="secondary" size="md" onClick={stop} />
            </div>
          </>
        ) : (
          <>
            <Timer size={40} className="text-progress mb-4" />
            <div className="flex gap-6">
              <Stepper label="TRABAJO (MIN)" value={workMinutes} step={5} min={5} max={90} onChange={setWorkMinutes} />
              <Stepper label="DESCANSO (MIN)" value={breakMinutes} step={1} min={1} max={30} onChange={setBreakMinutes} />
            </div>
            <div className="mt-6">
              <Button label="Empezar" size="lg" onClick={startWork} />
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card raised>
          <StatNumber value={todayCount} size="sm" color="text-progress" label="Hoy" />
        </Card>
        <Card raised>
          <StatNumber value={weekHours} unit="h" size="sm" color="text-info" label="Esta semana" />
        </Card>
        <Card raised>
          <StatNumber value={monthHours} unit="h" size="sm" color="text-ink" label="Este mes" />
        </Card>
      </div>

      <div>
        <SectionHeader title="Histórico" />
        {sessions.length === 0 ? (
          <Card raised>
            <p className="text-ink-dim text-sm">Todavía no hay bloques completados.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {[...sessions].reverse().slice(0, 30).map((s) => (
              <Card key={s.id} raised className="flex items-center justify-between">
                <p className="text-ink text-sm font-semibold">{new Date(s.completedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
                <p className="text-ink-dim text-sm">{s.durationMinutes} min</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
