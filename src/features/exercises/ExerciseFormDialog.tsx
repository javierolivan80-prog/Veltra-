"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Chip } from "@/design-system/components/Chip";
import { Dialog } from "@/design-system/components/Dialog";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { TextAreaField, TextField } from "@/design-system/components/TextField";
import { useCreateExercise, useUpdateExercise } from "@/features/exercises/hooks";
import type { Equipment, Exercise, MuscleGroup, StrengthPattern } from "@/types/models";

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

export function ExerciseFormDialog({
  open,
  onOpenChange,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Exercise | null;
  onCreated?: (exercise: Exercise) => void;
}) {
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();

  const [name, setName] = useState(initial?.name ?? "");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(initial?.muscleGroups ?? []);
  const [equipment, setEquipment] = useState<Equipment[]>(initial?.equipment ?? []);
  const [pattern, setPattern] = useState<StrengthPattern>(initial?.pattern ?? "isolation");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setMuscleGroups(initial?.muscleGroups ?? []);
    setEquipment(initial?.equipment ?? []);
    setPattern(initial?.pattern ?? "isolation");
    setNotes(initial?.notes ?? "");
    setVideoUrl(initial?.videoUrl ?? "");
  }, [open, initial]);

  const toggle = <T,>(list: T[], value: T, setList: (v: T[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canSubmit = name.trim().length > 0 && muscleGroups.length > 0 && equipment.length > 0;
  const submitting = createExercise.isPending || updateExercise.isPending;

  const submit = async () => {
    const input = { name: name.trim(), muscleGroups, equipment, pattern, notes: notes.trim() || null, videoUrl: videoUrl.trim() || null };
    if (initial) {
      await updateExercise.mutateAsync({ id: initial.id, input });
      onOpenChange(false);
    } else {
      const created = await createExercise.mutateAsync(input);
      onOpenChange(false);
      onCreated?.(created);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={initial ? "Editar ejercicio" : "Nuevo ejercicio"}>
      <div className="flex flex-col gap-6">
        <TextField label="Nombre del ejercicio" placeholder="p. ej. Press inclinado con barra" value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <p className="text-ink-dim text-sm font-medium mb-2">Grupo muscular</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={opt.label} active={muscleGroups.includes(opt.value)} onClick={() => toggle(muscleGroups, opt.value, setMuscleGroups)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-ink-dim text-sm font-medium mb-2">Equipamiento</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={opt.label} active={equipment.includes(opt.value)} onClick={() => toggle(equipment, opt.value, setEquipment)} />
            ))}
          </div>
        </div>

        <SegmentedControl label="Patrón de fuerza (para el sistema de rangos)" value={pattern} onChange={setPattern} options={PATTERN_OPTIONS} />

        <TextAreaField label="Notas técnicas (opcional)" placeholder="Puntos clave de ejecución…" rows={3} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />

        <TextField label="Vídeo o GIF (URL, opcional)" placeholder="https://…" value={videoUrl ?? ""} onChange={(e) => setVideoUrl(e.target.value)} />

        <Button label={initial ? "Guardar cambios" : "Crear ejercicio"} onClick={submit} disabled={!canSubmit} loading={submitting} fullWidth size="lg" />
      </div>
    </Dialog>
  );
}
