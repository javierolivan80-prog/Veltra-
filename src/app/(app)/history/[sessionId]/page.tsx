"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Card } from "@/design-system/components/Card";
import { StatNumber } from "@/design-system/components/StatNumber";
import { useExercises } from "@/features/exercises/hooks";
import { useSession, useSessionSets } from "@/features/workouts/hooks";
import { formatDateLong, formatDuration, formatWeight } from "@/lib/format";

export default function HistorySessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const { data: session } = useSession(sessionId ?? null);
  const { data: sets = [] } = useSessionSets(sessionId ?? null);
  const { data: exercises = [] } = useExercises();

  // Group the flat set list back into the exercises they belong to, keeping
  // the order they were first logged in.
  const byExercise = useMemo(() => {
    const map = new Map<string, typeof sets>();
    for (const s of [...sets].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
      map.set(s.exerciseId, [...(map.get(s.exerciseId) ?? []), s]);
    }
    return [...map.entries()];
  }, [sets]);

  const durationSec = useMemo(() => {
    if (!session?.endedAt) return null;
    return Math.max(0, Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
  }, [session]);

  if (!session) return null;

  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? "Ejercicio";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/history" className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-ink text-2xl font-display truncate">{session.routineName ?? "Sesión libre"}</h1>
          <p className="text-ink-dim text-sm mt-0.5">{formatDateLong(session.startedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card raised>
          <StatNumber value={byExercise.length} size="sm" color="text-ink" label="Ejercicios" />
        </Card>
        <Card raised>
          <StatNumber value={sets.length} size="sm" color="text-info" label="Series" />
        </Card>
        <Card raised>
          <StatNumber value={durationSec !== null ? formatDuration(durationSec) : "—"} size="sm" color="text-progress" label="Duración" />
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        {byExercise.map(([exerciseId, exerciseSets]) => (
          <Card key={exerciseId} raised>
            <Link href={`/exercises/${exerciseId}`} className="text-ink text-base font-semibold hover:text-progress">
              {name(exerciseId)}
            </Link>
            <div className="flex flex-col gap-1.5 mt-3">
              {exerciseSets.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between bg-surface rounded-xl px-3.5 py-2">
                  <span className="text-ink-dim text-sm font-medium">Serie {i + 1}</span>
                  <span className="text-ink text-sm font-bold tabular-nums">
                    {formatWeight(s.weightKg)}kg × {s.reps}
                    {s.rir !== null ? <span className="text-ink-faint font-normal"> · RIR {s.rir}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
