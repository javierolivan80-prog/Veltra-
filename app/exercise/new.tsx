import { router } from "expo-router";
import { Screen } from "@/src/design-system/components/Screen";
import { ModalHeader } from "@/src/design-system/components/ModalHeader";
import { ExerciseForm } from "@/src/features/exercises/ExerciseForm";
import { useCreateExercise } from "@/src/features/exercises/hooks";

export default function NewExerciseScreen() {
  const createExercise = useCreateExercise();

  return (
    <Screen scroll={false} contentClassName="pt-4">
      <ModalHeader title="Nuevo ejercicio" onClose={() => router.back()} />
      <ExerciseForm
        submitting={createExercise.isPending}
        submitLabel="Crear ejercicio"
        onSubmit={async (input) => {
          await createExercise.mutateAsync(input);
          router.back();
        }}
      />
    </Screen>
  );
}
