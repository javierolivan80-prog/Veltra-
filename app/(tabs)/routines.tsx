import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Card } from "@/src/design-system/components/Card";
import { EmptyState } from "@/src/design-system/components/EmptyState";
import { Screen } from "@/src/design-system/components/Screen";
import { SectionHeader } from "@/src/design-system/components/SectionHeader";
import { useFavoriteExercises } from "@/src/features/exercises/hooks";
import { useRoutines } from "@/src/features/routines/hooks";

export default function RoutinesScreen() {
  const { data: routines = [], isLoading } = useRoutines();
  const { data: favorites = [] } = useFavoriteExercises();

  return (
    <Screen contentClassName="pt-3 pb-32">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-ink text-2xl font-display">Rutinas</Text>
        <Pressable onPress={() => router.push("/routine/new")} className="w-10 h-10 rounded-full bg-progress items-center justify-center">
          <Feather name="plus" size={18} color={colors.bg.deep} />
        </Pressable>
      </View>

      {!isLoading && routines.length === 0 ? (
        <Card raised>
          <EmptyState
            title="Todavía no tienes rutinas"
            description="Crea tu rutina una sola vez — durante el entrenamiento solo tendrás que abrirla y pulsar el ejercicio actual."
            actionLabel="Crear mi primera rutina"
            onAction={() => router.push("/routine/new")}
          />
        </Card>
      ) : (
        <View className="gap-3">
          {routines.map((routine) => (
            <Card key={routine.id} onPress={() => router.push(`/routine/${routine.id}`)} raised>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-ink text-lg font-display">{routine.name}</Text>
                  <Text className="text-ink-dim text-sm font-body mt-1">
                    {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.ink.faint} />
              </View>
            </Card>
          ))}
        </View>
      )}

      {favorites.length > 0 ? (
        <View className="mt-8">
          <SectionHeader title="Favoritos" subtitle="Acceso rápido a tus ejercicios preferidos" />
          <View className="flex-row flex-wrap gap-2">
            {favorites.map((ex) => (
              <Pressable key={ex.id} onPress={() => router.push(`/exercise/${ex.id}`)} className="bg-surface border border-line-subtle px-4 py-2.5 rounded-full flex-row items-center gap-1.5">
                <Feather name="star" size={12} color={colors.record.DEFAULT} />
                <Text className="text-ink-dim text-sm font-body-medium">{ex.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
