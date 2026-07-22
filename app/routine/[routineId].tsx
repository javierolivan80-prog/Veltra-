import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Button } from "@/src/design-system/components/Button";
import { Card } from "@/src/design-system/components/Card";
import { Screen } from "@/src/design-system/components/Screen";
import { useExercises } from "@/src/features/exercises/hooks";
import { useDeleteRoutine, useRoutine } from "@/src/features/routines/hooks";
import { useStartSession } from "@/src/features/workouts/hooks";

export default function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { data: routine } = useRoutine(routineId ?? null);
  const { data: exercises = [] } = useExercises();
  const startSession = useStartSession();
  const deleteRoutine = useDeleteRoutine();

  if (!routine) return <View className="flex-1 bg-bg" />;

  const exerciseName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "Ejercicio";

  const handleStart = async () => {
    const session = await startSession.mutateAsync({ routineId: routine.id, routineName: routine.name });
    router.push(`/workout/${session.id}`);
  };

  const handleDelete = () => {
    Alert.alert("Eliminar rutina", `¿Seguro que quieres eliminar "${routine.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteRoutine.mutateAsync(routine.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen contentClassName="pt-3 pb-32">
      <View className="flex-row items-center justify-between mb-1">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
          <Feather name="chevron-left" size={18} color={colors.ink.dim} />
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
          <Feather name="trash-2" size={16} color={colors.danger.DEFAULT} />
        </Pressable>
      </View>

      <Text className="text-ink text-3xl font-display mt-4">{routine.name}</Text>
      <Text className="text-ink-dim text-sm font-body mt-1 mb-6">{routine.exercises.length} ejercicios</Text>

      <View className="gap-3 mb-8">
        {routine.exercises.map((re, i) => (
          <Card key={re.id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-ink-faint text-xs font-body-semibold mb-0.5">EJERCICIO {i + 1}</Text>
                <Text className="text-ink text-base font-body-semibold">{exerciseName(re.exerciseId)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-ink font-body-bold">
                  {re.targetSets} × {re.targetRepsMin}-{re.targetRepsMax}
                </Text>
                <Text className="text-ink-faint text-xs font-body mt-0.5">{re.restSeconds}s descanso</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Button label="Empezar entrenamiento" onPress={handleStart} loading={startSession.isPending} fullWidth size="lg" />
    </Screen>
  );
}
