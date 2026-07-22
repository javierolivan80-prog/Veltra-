"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Stepper } from "@/design-system/components/Stepper";
import { TextField } from "@/design-system/components/TextField";
import { ExercisePickerDialog } from "@/features/exercises/ExercisePickerDialog";
import { useCreateRoutine } from "@/features/routines/hooks";
import type { RoutineExerciseInput } from "@/features/routines/repo";
import type { Exercise } from "@/types/models";

interface DraftExercise extends RoutineExerciseInput {
  key: string;
  name: string;
}

export default function NewRoutinePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const createRoutine = useCreateRoutine();

  const addExercise = (exercise: Exercise) => {
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
    const routine = await createRoutine.mutateAsync({
      name: name.trim(),
      exercises: draft.map(({ key: _key, name: _name, ...rest }) => rest),
    });
    router.replace(`/routines/${routine.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-ink text-2xl font-display">Nueva rutina</h1>

      <TextField label="Nombre de la rutina" placeholder="p. ej. Push Day" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="flex flex-col gap-3">
        {draft.map((item, index) => (
          <div key={item.key} className="bg-surface border border-line-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-ink text-base font-semibold pr-2">
                {index + 1}. {item.name}
              </p>
              <button onClick={() => removeDraft(item.key)}>
                <Trash2 size={16} className="text-danger" />
              </button>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Stepper label="Series" value={item.targetSets} min={1} max={10} onChange={(v) => updateDraft(item.key, { targetSets: v })} />
              <Stepper label="Reps mín" value={item.targetRepsMin} min={1} max={30} onChange={(v) => updateDraft(item.key, { targetRepsMin: v })} />
              <Stepper label="Reps máx" value={item.targetRepsMax} min={1} max={30} onChange={(v) => updateDraft(item.key, { targetRepsMax: v })} />
              <Stepper label="Descanso" value={item.restSeconds} min={15} max={300} step={15} format={(v) => `${v}s`} onChange={(v) => updateDraft(item.key, { restSeconds: v })} />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setPickerOpen(true)}
        className="flex items-center justify-center gap-2 border border-dashed border-line rounded-2xl py-4 text-progress font-semibold"
      >
        <Plus size={16} />
        Añadir ejercicio
      </button>

      <Button label="Guardar rutina" onClick={save} disabled={!canSave} loading={createRoutine.isPending} fullWidth size="lg" />

      <ExercisePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addExercise} />
    </div>
  );
}
