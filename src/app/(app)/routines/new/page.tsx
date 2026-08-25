"use client";

import { useRouter } from "next/navigation";
import { RoutineEditor } from "@/features/routines/RoutineEditor";
import { useCreateRoutine } from "@/features/routines/hooks";

export default function NewRoutinePage() {
  const router = useRouter();
  const createRoutine = useCreateRoutine();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-ink text-2xl font-display">Nueva rutina</h1>

      <RoutineEditor
        submitLabel="Guardar rutina"
        submitting={createRoutine.isPending}
        onSubmit={async (values) => {
          const routine = await createRoutine.mutateAsync(values);
          router.replace(`/routines/${routine.id}`);
        }}
      />
    </div>
  );
}
