"use client";

import { Wind } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Stepper } from "@/design-system/components/Stepper";
import { StatNumber } from "@/design-system/components/StatNumber";
import { useAddMeditationSession, useMeditationSessions } from "@/features/meditation/hooks";
import { computeMeditationStreak, totalMinutes } from "@/features/meditation/stats";
import { playBell, playFinishedAlert, primeAlerts } from "@/lib/alert";
import { formatDateLong, formatDuration } from "@/lib/format";

const DURATION_KEY = "veltra-meditation-duration";

function getSavedDuration(): number {
  try {
    const raw = localStorage.getItem(DURATION_KEY);
    return raw ? Number(raw) : 10;
  } catch {
    return 10;
  }
}

export default function MeditationPage() {
  const { data: sessions = [] } = useMeditationSessions();
  const addSession = useAddMeditationSession();

  const [duration, setDuration] = useState(10);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startedDuration = useRef(10);

  useEffect(() => setDuration(getSavedDuration()), []);

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt && now >= endsAt) {
      setEndsAt(null);
      playFinishedAlert("Meditación completada", `Sesión de ${startedDuration.current} min terminada`);
      addSession.mutate(startedDuration.current);
    }
  }, [now, endsAt, addSession]);

  const streak = useMemo(() => computeMeditationStreak(sessions), [sessions]);
  const weekMinutes = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return totalMinutes(sessions.filter((s) => new Date(s.completedAt).getTime() >= weekAgo));
  }, [sessions]);

  const start = () => {
    primeAlerts();
    playBell();
    startedDuration.current = duration;
    try {
      localStorage.setItem(DURATION_KEY, String(duration));
    } catch {
      // storage unavailable — the setting just won't persist
    }
    const start = Date.now();
    setNow(start);
    setEndsAt(start + duration * 60000);
  };

  const stop = () => setEndsAt(null);

  const remainingSec = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const progress = endsAt ? 1 - remainingSec / (startedDuration.current * 60) : 0;

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/mind" label="Mente" />
      <div>
        <p className="text-ink-dim text-sm">Mente</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Meditación</h1>
      </div>

      <Card raised className="flex flex-col items-center py-8">
        {endsAt ? (
          <>
            <ProgressRing progress={progress} size={160} strokeWidth={10} color="#2CE6A0" trackColor="#0E2A21">
              <span className="text-ink text-3xl font-display">{formatDuration(remainingSec)}</span>
            </ProgressRing>
            <Button label="Detener" variant="secondary" size="md" onClick={stop} />
          </>
        ) : (
          <>
            <Wind size={40} className="text-progress mb-4" />
            <Stepper label="MINUTOS" value={duration} step={5} min={1} max={60} onChange={setDuration} />
            <div className="mt-6">
              <Button label="Empezar" size="lg" onClick={start} />
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={streak} unit="días" size="md" color="text-progress" label="Racha" />
        </Card>
        <Card raised>
          <StatNumber value={weekMinutes} unit="min" size="md" color="text-info" label="Esta semana" />
        </Card>
      </div>

      <div>
        <SectionHeader title="Histórico" />
        {sessions.length === 0 ? (
          <Card raised>
            <p className="text-ink-dim text-sm">Todavía no hay sesiones.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {[...sessions].reverse().slice(0, 30).map((s) => (
              <Card key={s.id} raised className="flex items-center justify-between">
                <p className="text-ink text-sm font-semibold">{formatDateLong(s.completedAt)}</p>
                <p className="text-ink-dim text-sm">{s.durationMinutes} min</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
