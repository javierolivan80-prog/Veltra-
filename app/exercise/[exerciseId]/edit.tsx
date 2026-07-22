import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Screen } from "@/src/design-system/components/Screen";
import { ModalHeader } from "@/src/design-system/components/ModalHeader";
import { ExerciseForm } from "@/src/features/exercises/ExerciseForm";
import { useExercise, useUpdateExercise } from "@/src/features/exercises/hooks";

export default function EditExerciseScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { data: exercise } = useExercise(exerciseId ?? null);
  const updateExercise = useUpdateExercise();

  if (!exercise) return <View className="flex-1 bg-bg" />;

  return (
    <Screen scroll={false} contentClassName="pt-4">
      <ModalHeader title="Editar ejercicio" onClose={() => router.back()} />
      <ExerciseForm
        initial={exercise}
        submitting={updateExercise.isPending}
        submitLabel="Guardar cambios"
        onSubmit={async (input) => {
          await updateExercise.mutateAsync({ id: exercise.id, input });
          router.back();
        }}
      />
    </Screen>
  );
}
