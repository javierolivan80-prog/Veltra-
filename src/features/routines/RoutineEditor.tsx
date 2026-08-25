"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Stepper } from "@/design-system/components/Stepper";
import { TextField } from "@/design-system/components/TextField";
import { ExercisePickerDialog } from "@/features/exercises/ExercisePickerDialog";
import type { RoutineExerciseInput } from "@/features/routines/repo";
import type { Exercise } from "@/types/models";

export interface DraftExercise extends RoutineExerciseInput {
  key: string;
  name: string;
}

export function makeDraftExercise(exercise: Exercise): DraftExercise {
  return {
    key: `${exercise.id}-${Date.now()}`,
    exerciseId: exercise.id,
    name: exercise.name,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    restSeconds: 90,
  };
}

/** Shared create/edit form for a routine — same UI either way, so a routine
 *  always looks and behaves the same whether it's new or being corrected. */
export function RoutineEditor({
  initialName = "",
  initialExercises = [],
  submitLabel,
  submitting,
  onSubmit,
}: {
  initialName?: string;
  initialExercises?: DraftExercise[];
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: { name: string; exercises: RoutineExerciseInput[] }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState<DraftExercise[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addExercise = (exercise: Exercise) => setDraft((d) => [...d, makeDraftExercise(exercise)]);

  const updateDraft = (key: string, patch: Partial<DraftExercise>) =>
    setDraft((d) => d.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const removeDraft = (key: string) => setDraft((d) => d.filter((item) => item.key !== key));

  const move = (index: number, delta: number) => {
    setDraft((d) => {
      const next = [...d];
      const target = index + delta;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const canSave = name.trim().length > 0 && draft.length > 0;

  const submit = () =>
    onSubmit({
      name: name.trim(),
      exercises: draft.map(({ key: _key, name: _name, ...rest }) => rest),
    });

  return (
    <div className="flex flex-col gap-6">
      <TextField label="Nombre de la rutina" placeholder="p. ej. Push Day" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="flex flex-col gap-3">
        {draft.map((item, index) => (
          <div key={item.key} className="bg-surface border border-line-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 gap-2">
              <p className="text-ink text-base font-semibold min-w-0 truncate">
                {index + 1}. {item.name}
              </p>
              <div className="flex items-center shrink-0">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Subir ejercicio"
                  className="w-9 h-9 flex items-center justify-center text-ink-faint disabled:opacity-25"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  aria-label="Bajar ejercicio"
                  className="w-9 h-9 flex items-center justify-center text-ink-faint disabled:opacity-25"
                >
                  <ChevronDown size={16} />
                </button>
                <button onClick={() => removeDraft(item.key)} aria-label="Quitar ejercicio" className="w-9 h-9 flex items-center justify-center -mr-1.5">
                  <Trash2 size={16} className="text-danger" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Stepper label="Series" value={item.targetSets} min={1} max={10} onChange={(v) => updateDraft(item.key, { targetSets: v })} />
              <Stepper label="Reps mín" value={item.targetRepsMin} min={1} max={30} onChange={(v) => updateDraft(item.key, { targetRepsMin: v })} />
              <Stepper label="Reps máx" value={item.targetRepsMax} min={1} max={30} onChange={(v) => updateDraft(item.key, { targetRepsMax: v })} />
              <Stepper
                label="Descanso"
                value={item.restSeconds}
                min={15}
                max={300}
                step={15}
                format={(v) => `${v}s`}
                onChange={(v) => updateDraft(item.key, { restSeconds: v })}
              />
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

      <Button label={submitLabel} onClick={submit} disabled={!canSave} loading={submitting} fullWidth size="lg" />

      <ExercisePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addExercise} />
    </div>
  );
}
