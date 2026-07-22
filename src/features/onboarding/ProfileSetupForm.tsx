import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "@/src/design-system/components/Button";
import { Chip } from "@/src/design-system/components/Chip";
import { SegmentedControl } from "@/src/design-system/components/SegmentedControl";
import { TextField } from "@/src/design-system/components/TextField";
import type { Equipment, ExperienceLevel, Goal, Sex } from "@/src/types/models";

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Mancuernas" },
  { value: "machine", label: "Máquinas" },
  { value: "cable", label: "Poleas" },
  { value: "bodyweight", label: "Peso corporal" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "band", label: "Bandas" },
];

export interface ProfileFormValues {
  fullName: string;
  sex: Sex;
  age: string;
  heightCm: string;
  bodyweightKg: string;
  experienceLevel: ExperienceLevel;
  goal: Goal;
  equipmentAvailable: Equipment[];
}

export function ProfileSetupForm({
  onSubmit,
  submitting,
  initial,
  submitLabel = "Continuar",
}: {
  onSubmit: (values: ProfileFormValues) => void;
  submitting?: boolean;
  initial?: Partial<ProfileFormValues>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<ProfileFormValues>({
    fullName: "",
    sex: "male",
    age: "",
    heightCm: "",
    bodyweightKg: "",
    experienceLevel: "beginner",
    goal: "general_fitness",
    equipmentAvailable: ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
    ...initial,
  });

  const toggleEquipment = (eq: Equipment) => {
    setValues((v) => ({
      ...v,
      equipmentAvailable: v.equipmentAvailable.includes(eq) ? v.equipmentAvailable.filter((e) => e !== eq) : [...v.equipmentAvailable, eq],
    }));
  };

  const canSubmit = values.fullName.trim().length > 0 && values.age.length > 0 && values.bodyweightKg.length > 0;

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 pb-6">
        <View>
          <Text className="text-ink text-2xl font-display">Hablemos de ti</Text>
          <Text className="text-ink-dim text-sm font-body mt-1">Esto nos permite calcular tu rango de fuerza real y adaptar al entrenador IA.</Text>
        </View>

        <TextField label="Nombre" placeholder="¿Cómo te llamas?" value={values.fullName} onChangeText={(t) => setValues((v) => ({ ...v, fullName: t }))} />

        <SegmentedControl
          label="Sexo"
          value={values.sex}
          onChange={(sex) => setValues((v) => ({ ...v, sex }))}
          options={[
            { value: "male", label: "Hombre" },
            { value: "female", label: "Mujer" },
            { value: "other", label: "Otro" },
          ]}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="Edad" placeholder="28" keyboardType="number-pad" suffix="años" value={values.age} onChangeText={(t) => setValues((v) => ({ ...v, age: t.replace(/[^0-9]/g, "") }))} />
          </View>
          <View className="flex-1">
            <TextField label="Altura" placeholder="178" keyboardType="number-pad" suffix="cm" value={values.heightCm} onChangeText={(t) => setValues((v) => ({ ...v, heightCm: t.replace(/[^0-9]/g, "") }))} />
          </View>
        </View>

        <TextField
          label="Peso corporal actual"
          placeholder="75"
          keyboardType="decimal-pad"
          suffix="kg"
          value={values.bodyweightKg}
          onChangeText={(t) => setValues((v) => ({ ...v, bodyweightKg: t.replace(/[^0-9.]/g, "") }))}
        />

        <SegmentedControl
          label="Experiencia entrenando"
          value={values.experienceLevel}
          onChange={(experienceLevel) => setValues((v) => ({ ...v, experienceLevel }))}
          options={[
            { value: "beginner", label: "Principiante" },
            { value: "intermediate", label: "Intermedio" },
            { value: "advanced", label: "Avanzado" },
            { value: "elite", label: "Elite" },
          ]}
        />

        <SegmentedControl
          label="Objetivo principal"
          value={values.goal}
          onChange={(goal) => setValues((v) => ({ ...v, goal }))}
          options={[
            { value: "hypertrophy", label: "Hipertrofia" },
            { value: "strength", label: "Fuerza" },
            { value: "fat_loss", label: "Pérdida de grasa" },
            { value: "endurance", label: "Resistencia" },
            { value: "general_fitness", label: "Fitness general" },
          ]}
        />

        <View>
          <Text className="text-ink-dim text-sm font-body-medium mb-2">Equipamiento disponible</Text>
          <View className="flex-row flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={opt.label} active={values.equipmentAvailable.includes(opt.value)} onPress={() => toggleEquipment(opt.value)} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="pt-2">
        <Button label={submitLabel} onPress={() => onSubmit(values)} disabled={!canSubmit} loading={submitting} fullWidth size="lg" />
      </View>
    </View>
  );
}
