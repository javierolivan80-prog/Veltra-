"use client";

import { ChevronRight, Dumbbell, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { useFavoriteExercises } from "@/features/exercises/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { WorkoutSuggestions } from "@/features/workouts/WorkoutSuggestions";
import { useActiveSession, useStartSession } from "@/features/workouts/hooks";

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
        <h1 className="text-ink text-2xl font-display">Rutinas</h1>
        <Link href="/routines/new" className="w-10 h-10 rounded-full bg-progress flex items-center justify-center">
          <Plus size={18} className="text-bg-deep" />
        </Link>
      </div>

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
