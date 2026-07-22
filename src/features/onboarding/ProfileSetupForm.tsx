"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Chip } from "@/design-system/components/Chip";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { TextField } from "@/design-system/components/TextField";
import type { Equipment, ExperienceLevel, Goal, Sex } from "@/types/models";

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
  trainingDaysPerWeek: number;
  equipmentAvailable: Equipment[];
  injuryArea: string;
  injuryNote: string;
}

export function ProfileSetupForm({
  onSubmit,
  submitting,
  initial,
  submitLabel = "Continuar",
  error,
  compact = false,
}: {
  onSubmit: (values: ProfileFormValues) => void;
  submitting?: boolean;
  initial?: Partial<ProfileFormValues>;
  submitLabel?: string;
  error?: string | null;
  /** Only asks for name, sex, age, height and weight — the rest keeps its default and can be filled in later from Perfil → Editar. */
  compact?: boolean;
}) {
  const [values, setValues] = useState<ProfileFormValues>({
    fullName: "",
    sex: "male",
    age: "",
    heightCm: "",
    bodyweightKg: "",
    experienceLevel: "beginner",
    goal: "general_fitness",
    trainingDaysPerWeek: 3,
    equipmentAvailable: ["barbell", "dumbbell", "machine", "cable", "bodyweight"],
    injuryArea: "",
    injuryNote: "",
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-2xl font-display">Hablemos de ti</h1>
        <p className="text-ink-dim text-sm mt-1">Esto nos permite calcular tu rango de fuerza real y adaptar al entrenador IA.</p>
      </div>

      <TextField label="Nombre" placeholder="¿Cómo te llamas?" value={values.fullName} onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))} />

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

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Edad" placeholder="28" inputMode="numeric" suffix="años" value={values.age} onChange={(e) => setValues((v) => ({ ...v, age: e.target.value.replace(/[^0-9]/g, "") }))} />
        <TextField label="Altura" placeholder="178" inputMode="numeric" suffix="cm" value={values.heightCm} onChange={(e) => setValues((v) => ({ ...v, heightCm: e.target.value.replace(/[^0-9]/g, "") }))} />
      </div>

      <TextField
        label="Peso corporal actual"
        placeholder="75"
        inputMode="decimal"
        suffix="kg"
        value={values.bodyweightKg}
        onChange={(e) => setValues((v) => ({ ...v, bodyweightKg: e.target.value.replace(/[^0-9.]/g, "") }))}
      />

      {!compact ? (
        <>
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

          <SegmentedControl
            label="Días que entrenas por semana"
            value={String(values.trainingDaysPerWeek)}
            onChange={(v) => setValues((prev) => ({ ...prev, trainingDaysPerWeek: Number(v) }))}
            options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} días` }))}
          />

          <div>
            <p className="text-ink-dim text-sm font-medium mb-2">Equipamiento disponible</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((opt) => (
                <Chip key={opt.value} label={opt.label} active={values.equipmentAvailable.includes(opt.value)} onClick={() => toggleEquipment(opt.value)} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-ink-dim text-sm font-medium mb-2">¿Alguna lesión que debamos tener en cuenta? (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <TextField placeholder="Zona, p. ej. hombro derecho" value={values.injuryArea} onChange={(e) => setValues((v) => ({ ...v, injuryArea: e.target.value }))} />
              <TextField placeholder="Nota breve" value={values.injuryNote} onChange={(e) => setValues((v) => ({ ...v, injuryNote: e.target.value }))} />
            </div>
          </div>
        </>
      ) : (
        <p className="text-ink-faint text-xs -mt-2">
          Objetivo, experiencia, equipamiento y lesiones se pueden añadir luego desde Perfil → Editar, para que esto sea rápido ahora.
        </p>
      )}

      {error ? <p className="text-danger text-sm font-medium">{error}</p> : null}
      <Button label={submitLabel} onClick={() => onSubmit(values)} disabled={!canSubmit} loading={submitting} fullWidth size="lg" />
    </div>
  );
}
