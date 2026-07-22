"use client";

import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { useExercises } from "@/features/exercises/hooks";
import { useDeleteRoutine, useRoutine } from "@/features/routines/hooks";
import { useStartSession } from "@/features/workouts/hooks";

export default function RoutineDetailPage() {
  const params = useParams<{ routineId: string }>();
  const router = useRouter();
  const { data: routine } = useRoutine(params.routineId ?? null);
  const { data: exercises = [] } = useExercises();
  const startSession = useStartSession();
  const deleteRoutine = useDeleteRoutine();

  if (!routine) return null;

  const exerciseName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "Ejercicio";

  const handleStart = async () => {
    const session = await startSession.mutateAsync({ routineId: routine.id, routineName: routine.name });
    router.push(`/workout/${session.id}`);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Seguro que quieres eliminar "${routine.name}"?`)) return;
    await deleteRoutine.mutateAsync(routine.id);
    router.push("/routines");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/routines" className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-danger">
          <Trash2 size={16} />
        </button>
      </div>

      <div>
        <h1 className="text-ink text-3xl font-display">{routine.name}</h1>
        <p className="text-ink-dim text-sm mt-1">{routine.exercises.length} ejercicios</p>
      </div>

      <div className="flex flex-col gap-3">
        {routine.exercises.map((re, i) => (
          <Card key={re.id}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <p className="text-ink-faint text-xs font-semibold mb-0.5">EJERCICIO {i + 1}</p>
                <p className="text-ink text-base font-semibold truncate">{exerciseName(re.exerciseId)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-ink font-bold">
                  {re.targetSets} × {re.targetRepsMin}-{re.targetRepsMax}
                </p>
                <p className="text-ink-faint text-xs mt-0.5">{re.restSeconds}s descanso</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button label="Empezar entrenamiento" onClick={handleStart} loading={startSession.isPending} fullWidth size="lg" />
    </div>
  );
}
