"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextAreaField, TextField } from "@/design-system/components/TextField";
import { useCreateGoal } from "./hooks";

export function GoalFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const createGoal = useCreateGoal();

  const save = async () => {
    if (!name.trim()) return;
    await createGoal.mutateAsync({ name: name.trim(), description: description.trim() || null, targetDate: targetDate || null });
    setName("");
    setDescription("");
    setTargetDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Nueva meta">
      <div className="flex flex-col gap-4">
        <TextField label="Nombre" placeholder="p. ej. Correr una media maratón" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextAreaField label="Descripción (opcional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField label="Fecha objetivo (opcional)" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <Button label="Crear meta" onClick={save} loading={createGoal.isPending} fullWidth disabled={!name.trim()} />
      </div>
    </Dialog>
  );
}
