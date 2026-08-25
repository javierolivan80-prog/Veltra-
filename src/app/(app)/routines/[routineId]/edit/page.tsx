"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { RoutineEditor, type DraftExercise } from "@/features/routines/RoutineEditor";
import { useExercises } from "@/features/exercises/hooks";
import { useRoutine, useUpdateRoutine } from "@/features/routines/hooks";

export default function EditRoutinePage() {
  const params = useParams<{ routineId: string }>();
  const routineId = params.routineId;
  const router = useRouter();
  const { data: routine, isLoading } = useRoutine(routineId ?? null);
  const { data: exercises = [] } = useExercises();
  const updateRoutine = useUpdateRoutine();

  const initialExercises: DraftExercise[] = useMemo(
    () =>
      (routine?.exercises ?? []).map((re) => ({
        key: re.id,
        exerciseId: re.exerciseId,
        name: exercises.find((e) => e.id === re.exerciseId)?.name ?? "Ejercicio",
        targetSets: re.targetSets,
        targetRepsMin: re.targetRepsMin,
        targetRepsMax: re.targetRepsMax,
        restSeconds: re.restSeconds,
      })),
    [routine, exercises]
  );

  // Wait for both the routine and the exercise names before mounting the
  // editor — it seeds its state once, so mounting early would show "Ejercicio".
  if (isLoading || !routine || exercises.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/routines/${routineId}`} className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-ink text-2xl font-display">Editar rutina</h1>
      </div>

      <RoutineEditor
        initialName={routine.name}
        initialExercises={initialExercises}
        submitLabel="Guardar cambios"
        submitting={updateRoutine.isPending}
        onSubmit={async (values) => {
          await updateRoutine.mutateAsync({ id: routineId, input: values });
          router.replace(`/routines/${routineId}`);
        }}
      />
    </div>
  );
}
