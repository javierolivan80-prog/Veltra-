import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "@/src/design-system/components/Button";
import { Chip } from "@/src/design-system/components/Chip";
import { SegmentedControl } from "@/src/design-system/components/SegmentedControl";
import { TextField } from "@/src/design-system/components/TextField";
import type { Equipment, Exercise, MuscleGroup, StrengthPattern } from "@/src/types/models";
import type { ExerciseInput } from "./repo";

const MUSCLE_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: "chest", label: "Pecho" },
  { value: "back", label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "forearms", label: "Antebrazos" },
  { value: "quads", label: "Cuádriceps" },
  { value: "hamstrings", label: "Isquios" },
  { value: "glutes", label: "Glúteos" },
  { value: "calves", label: "Gemelos" },
  { value: "abs", label: "Abdomen" },
  { value: "traps", label: "Trapecios" },
  { value: "cardio", label: "Cardio" },
  { value: "full_body", label: "Cuerpo completo" },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Mancuernas" },
  { value: "machine", label: "Máquina" },
  { value: "cable", label: "Polea" },
  { value: "bodyweight", label: "Peso corporal" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "band", label: "Banda" },
  { value: "other", label: "Otro" },
];

const PATTERN_OPTIONS: { value: StrengthPattern; label: string }[] = [
  { value: "squat", label: "Sentadilla" },
  { value: "hinge", label: "Bisagra de cadera" },
  { value: "horizontal_press", label: "Empuje horizontal" },
  { value: "vertical_press", label: "Empuje vertical" },
  { value: "horizontal_pull", label: "Tirón horizontal" },
  { value: "vertical_pull", label: "Tirón vertical" },
  { value: "isolation", label: "Aislamiento" },
  { value: "carry", label: "Acarreo" },
  { value: "core", label: "Core" },
];

export function ExerciseForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Guardar ejercicio",
}: {
  initial?: Exercise | null;
  onSubmit: (input: ExerciseInput) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(initial?.muscleGroups ?? []);
  const [equipment, setEquipment] = useState<Equipment[]>(initial?.equipment ?? []);
  const [pattern, setPattern] = useState<StrengthPattern>(initial?.pattern ?? "isolation");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");

  const toggle = <T,>(list: T[], value: T, setList: (v: T[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canSubmit = name.trim().length > 0 && muscleGroups.length > 0 && equipment.length > 0;

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 pb-6">
        <TextField label="Nombre del ejercicio" placeholder="p. ej. Press inclinado con barra" value={name} onChangeText={setName} />

        <View>
          <Text className="text-ink-dim text-sm font-body-medium mb-2">Grupo muscular</Text>
          <View className="flex-row flex-wrap gap-2">
            {MUSCLE_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={opt.label} active={muscleGroups.includes(opt.value)} onPress={() => toggle(muscleGroups, opt.value, setMuscleGroups)} />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-ink-dim text-sm font-body-medium mb-2">Equipamiento</Text>
          <View className="flex-row flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={opt.label} active={equipment.includes(opt.value)} onPress={() => toggle(equipment, opt.value, setEquipment)} />
            ))}
          </View>
        </View>

        <SegmentedControl label="Patrón de fuerza (para el sistema de rangos)" value={pattern} onChange={setPattern} options={PATTERN_OPTIONS} />

        <TextField label="Notas técnicas (opcional)" placeholder="Puntos clave de ejecución…" value={notes ?? ""} onChangeText={setNotes} multiline numberOfLines={3} />

        <TextField label="Vídeo o GIF (URL, opcional)" placeholder="https://…" autoCapitalize="none" value={videoUrl ?? ""} onChangeText={setVideoUrl} />
      </ScrollView>

      <View className="pt-2">
        <Button
          label={submitLabel}
          disabled={!canSubmit}
          loading={submitting}
          fullWidth
          size="lg"
          onPress={() =>
            onSubmit({
              name: name.trim(),
              muscleGroups,
              equipment,
              pattern,
              notes: notes.trim() || null,
              videoUrl: videoUrl.trim() || null,
            })
          }
        />
      </View>
    </View>
  );
}
