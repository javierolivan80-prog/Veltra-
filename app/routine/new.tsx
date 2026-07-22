import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Button } from "@/src/design-system/components/Button";
import { ModalHeader } from "@/src/design-system/components/ModalHeader";
import { Screen } from "@/src/design-system/components/Screen";
import { Stepper } from "@/src/design-system/components/Stepper";
import { TextField } from "@/src/design-system/components/TextField";
import { useCreateRoutine } from "@/src/features/routines/hooks";
import type { RoutineExerciseInput } from "@/src/features/routines/repo";
import { useExercisePickerStore } from "@/src/state/exercisePicker.store";
import type { Exercise } from "@/src/types/models";

interface DraftExercise extends RoutineExerciseInput {
  key: string;
  name: string;
}

export default function NewRoutineScreen() {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const createRoutine = useCreateRoutine();

  const addExercise = async () => {
    const exercise = await new Promise<Exercise | null>((resolve) => {
      useExercisePickerStore.getState().setResolver(resolve);
      router.push("/exercise/picker");
    });
    if (!exercise) return;
    setDraft((d) => [
      ...d,
      { key: `${exercise.id}-${Date.now()}`, exerciseId: exercise.id, name: exercise.name, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
    ]);
  };

  const updateDraft = (key: string, patch: Partial<DraftExercise>) => {
    setDraft((d) => d.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeDraft = (key: string) => setDraft((d) => d.filter((item) => item.key !== key));

  const canSave = name.trim().length > 0 && draft.length > 0;

  const save = async () => {
    await createRoutine.mutateAsync({
      name: name.trim(),
      exercises: draft.map(({ key, name, ...rest }) => rest),
    });
    router.back();
  };

  return (
    <Screen scroll={false} contentClassName="pt-4">
      <ModalHeader title="Nueva rutina" onClose={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-5 pb-6">
        <TextField label="Nombre de la rutina" placeholder="p. ej. Push Day" value={name} onChangeText={setName} />

        <View className="gap-3">
          {draft.map((item, index) => (
            <View key={item.key} className="bg-surface border border-line-subtle rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-ink text-base font-body-semibold flex-1 pr-2">
                  {index + 1}. {item.name}
                </Text>
                <Pressable onPress={() => removeDraft(item.key)} hitSlop={8}>
                  <Feather name="trash-2" size={16} color={colors.danger.DEFAULT} />
                </Pressable>
              </View>
              <View className="flex-row justify-between">
                <Stepper label="Series" value={item.targetSets} min={1} max={10} onChange={(v) => updateDraft(item.key, { targetSets: v })} />
                <Stepper label="Reps mín" value={item.targetRepsMin} min={1} max={30} onChange={(v) => updateDraft(item.key, { targetRepsMin: v })} />
                <Stepper label="Reps máx" value={item.targetRepsMax} min={1} max={30} onChange={(v) => updateDraft(item.key, { targetRepsMax: v })} />
                <Stepper label="Descanso" value={item.restSeconds} min={15} max={300} step={15} format={(v) => `${v}s`} onChange={(v) => updateDraft(item.key, { restSeconds: v })} />
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={addExercise} className="flex-row items-center justify-center gap-2 border border-dashed border-line rounded-2xl py-4">
          <Feather name="plus" size={16} color={colors.progress.DEFAULT} />
          <Text className="text-progress font-body-semibold">Añadir ejercicio</Text>
        </Pressable>
      </ScrollView>

      <View className="pt-2">
        <Button label="Guardar rutina" onPress={save} disabled={!canSave} loading={createRoutine.isPending} fullWidth size="lg" />
      </View>
    </Screen>
  );
}
