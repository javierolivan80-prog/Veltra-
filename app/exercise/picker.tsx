import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { ModalHeader } from "@/src/design-system/components/ModalHeader";
import { Screen } from "@/src/design-system/components/Screen";
import { EmptyState } from "@/src/design-system/components/EmptyState";
import { useExercises, useRecommendedExercises, useToggleFavorite } from "@/src/features/exercises/hooks";
import { useExercisePickerStore } from "@/src/state/exercisePicker.store";
import type { Exercise } from "@/src/types/models";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

export default function ExercisePickerScreen() {
  const { data: exercises = [] } = useExercises();
  const { data: recommended = [] } = useRecommendedExercises(6);
  const toggleFavorite = useToggleFavorite();
  const resolve = useExercisePickerStore((s) => s.resolve);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase();
    const list = norm ? exercises.filter((e) => e.name.toLowerCase().includes(norm)) : exercises;
    return [...list].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name));
  }, [exercises, query]);

  const close = (exercise: Exercise | null) => {
    resolve(exercise);
    router.back();
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <Pressable onPress={() => close(item)} className="flex-row items-center py-3.5 border-b border-line-subtle">
      <View className="flex-1">
        <Text className="text-ink text-base font-body-semibold">{item.name}</Text>
        <Text className="text-ink-faint text-xs font-body mt-0.5">{item.muscleGroups.map((m) => MUSCLE_LABEL[m] ?? m).join(" · ")}</Text>
      </View>
      <Pressable hitSlop={10} onPress={() => toggleFavorite.mutate(item.id)} className="p-2">
        <Feather name="star" size={18} color={item.isFavorite ? colors.record.DEFAULT : colors.line.DEFAULT} />
      </Pressable>
    </Pressable>
  );

  return (
    <Screen scroll={false} contentClassName="pt-4">
      <ModalHeader title="Elegir ejercicio" onClose={() => close(null)} />

      <View className="flex-row items-center bg-surface border border-line-subtle rounded-2xl px-4 mb-4">
        <Feather name="search" size={16} color={colors.ink.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar ejercicio…"
          placeholderTextColor={colors.ink.faint}
          className="flex-1 text-ink text-base font-body-medium py-3 ml-2.5"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !query && recommended.length > 0 ? (
            <View className="mb-5">
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <Feather name="cpu" size={13} color={colors.ai.DEFAULT} />
                <Text className="text-ai text-xs font-body-bold uppercase tracking-wider">Recomendado por tu IA</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 pr-2">
                {recommended.map((rec) => (
                  <Pressable key={rec.exercise.id} onPress={() => close(rec.exercise)} className="w-40 bg-ai-bg border border-ai/25 rounded-2xl p-3.5">
                    <Text className="text-ink text-sm font-body-semibold" numberOfLines={1}>{rec.exercise.name}</Text>
                    <Text className="text-ink-dim text-[11px] font-body mt-1 leading-4" numberOfLines={2}>{rec.reason}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState title="Sin resultados" description="Prueba otra búsqueda o crea un ejercicio nuevo." />}
        ListFooterComponent={
          <Pressable onPress={() => router.push("/exercise/new")} className="flex-row items-center gap-2 py-4">
            <Feather name="plus-circle" size={18} color={colors.progress.DEFAULT} />
            <Text className="text-progress font-body-semibold">Crear ejercicio nuevo</Text>
          </Pressable>
        }
      />
    </Screen>
  );
}
