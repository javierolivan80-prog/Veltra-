"use client";

import { Check, ChevronRight, Dumbbell, Play, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { commitmentsForDay } from "@/features/contract/arc";
import { useActiveContract, useCommitments } from "@/features/contract/hooks";
import { useFavoriteExercises } from "@/features/exercises/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { WorkoutSuggestions } from "@/features/workouts/WorkoutSuggestions";
import { RoutinePickerDialog } from "@/features/workouts/RoutinePickerDialog";
import { useActiveSession, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { todayKey } from "@/lib/date";
import type { Routine } from "@/types/models";

function timeLabelOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** El mismo "hoy" que antes vivía en Hoy, ahora aquí: si el contrato marca
 *  entrenamiento para hoy, esto es lo primero que se ve al entrar en la
 *  pestaña — antes de la lista de rutinas, no en vez de ella. */
function TodayWorkoutCard() {
  const router = useRouter();
  const today = todayKey();
  const { data: contract } = useActiveContract();
  const { data: commitments = [] } = useCommitments(contract?.id ?? null);
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(30);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();
  const [pickerOpen, setPickerOpen] = useState(false);

  const dueToday = useMemo(() => commitmentsForDay(commitments, today).some((c) => c.kind === "workout"), [commitments, today]);
  const suggestedRoutine = useMemo(() => {
    if (routines.length === 0) return null;
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((s) => s.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    return [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
  }, [routines, recentSessions]);
  const completedToday = useMemo(
    () => recentSessions.find((s) => s.status === "completed" && s.startedAt.slice(0, 10) === today) ?? null,
    [recentSessions, today]
  );

  const startWithRoutine = async (routine: Routine | null) => {
    setPickerOpen(false);
    const session = await startSession.mutateAsync({ routineId: routine?.id ?? null, routineName: routine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

  if (!dueToday) return null;

  if (activeSession) {
    return (
      <div className="rounded-2xl border border-progress/25 bg-progress-bg p-4">
        <p className="text-progress text-[11px] font-bold uppercase tracking-[.14em]">Ahora · {timeLabelOf(activeSession.startedAt)}</p>
        <p className="text-ink font-display font-semibold text-[20px] mt-1">{activeSession.routineName ?? "Entrenamiento libre"}</p>
        <button
          onClick={() => router.push(`/workout/${activeSession.id}`)}
          className="w-full flex items-center justify-center gap-2 mt-3.5 border border-progress text-progress font-semibold text-sm py-3 rounded-xl hover:bg-progress/10 transition-colors"
        >
          <Play size={13} fill="currentColor" />
          Continuar entrenamiento
        </button>
      </div>
    );
  }

  if (completedToday) {
    return (
      <div className="rounded-2xl border border-line-subtle bg-bg-soft p-4 flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg bg-progress/15 border border-progress/30 flex items-center justify-center shrink-0">
          <Check size={14} className="text-progress" />
        </span>
        <div className="min-w-0">
          <p className="text-ink text-[15px] font-display font-semibold">{completedToday.routineName ?? "Completado"}</p>
          <p className="text-ink-faint text-xs mt-0.5">{timeLabelOf(completedToday.startedAt)} · Entrenamiento de hoy</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-line-subtle bg-bg-soft p-4">
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Hoy toca entrenar</p>
        <p className="text-ink font-display font-semibold text-[20px] mt-1">
          {suggestedRoutine ? suggestedRoutine.name : "Elige tu rutina"}
        </p>
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-2 mt-3.5 border border-progress text-progress font-semibold text-sm py-3 rounded-xl hover:bg-progress/10 transition-colors"
        >
          <Play size={13} fill="currentColor" />
          Empezar entrenamiento
        </button>
      </div>
      <RoutinePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        routines={routines}
        suggestedRoutineId={suggestedRoutine?.id ?? null}
        onSelect={(routine) => startWithRoutine(routine)}
        onSelectFree={() => startWithRoutine(null)}
      />
    </>
  );
}

export default function RoutinesPage() {
  const router = useRouter();
  const { data: routines = [], isLoading } = useRoutines();
  const { data: favorites = [] } = useFavoriteExercises();
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  /** Train without a routine — the user picks each exercise during the session. */
  const startFree = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({ routineId: null, routineName: null });
    router.push(`/workout/${session.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-ink text-2xl font-display">Entrenamiento</h1>
        <Link href="/routines/new" className="w-10 h-10 rounded-full bg-progress flex items-center justify-center">
          <Plus size={18} className="text-bg-deep" />
        </Link>
      </div>

      <TodayWorkoutCard />

      <button
        onClick={startFree}
        className="rounded-3xl border border-dashed border-line bg-surface p-5 flex items-center gap-3 text-left hover:border-progress/50 transition-colors"
      >
        <span className="w-11 h-11 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
          <Dumbbell size={20} className="text-progress" />
        </span>
        <span className="min-w-0">
          <span className="block text-ink text-base font-semibold">Entrenamiento libre</span>
          <span className="block text-ink-dim text-xs mt-0.5">Empieza sin rutina y elige tú cada ejercicio sobre la marcha</span>
        </span>
      </button>

      <WorkoutSuggestions />

      {!isLoading && routines.length === 0 ? (
        <Card raised>
          <EmptyState
            title="Todavía no tienes rutinas"
            description="Crea tu rutina una sola vez — durante el entrenamiento solo tendrás que abrirla y pulsar el ejercicio actual."
            actionLabel="Crear mi primera rutina"
          />
          <div className="flex justify-center -mt-2">
            <Link href="/routines/new" className="text-progress text-sm font-semibold">
              Crear rutina
            </Link>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((routine) => (
            <Link
              key={routine.id}
              href={`/routines/${routine.id}`}
              className="rounded-3xl border border-line-subtle bg-surface-raised p-5 flex items-center justify-between hover:border-line transition-colors"
            >
              <div className="min-w-0 pr-3">
                <p className="text-ink text-lg font-display truncate">{routine.name}</p>
                <p className="text-ink-dim text-sm mt-1">
                  {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight size={20} className="text-ink-faint shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {favorites.length > 0 ? (
        <div>
          <SectionHeader title="Favoritos" subtitle="Acceso rápido a tus ejercicios preferidos" />
          <div className="flex flex-wrap gap-2">
            {favorites.map((ex) => (
              <Link
                key={ex.id}
                href={`/exercises/${ex.id}`}
                className="bg-surface border border-line-subtle px-4 py-2.5 rounded-full flex items-center gap-1.5 hover:border-line"
              >
                <Star size={12} className="text-record fill-record" />
                <span className="text-ink-dim text-sm font-medium">{ex.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
