"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextField } from "@/design-system/components/TextField";
import { useCreateHabit, useUpdateHabit } from "./hooks";
import type { Habit } from "@/types/models";

export function HabitFormDialog({ open, onOpenChange, habit }: { open: boolean; onOpenChange: (open: boolean) => void; habit?: Habit | null }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("19:30");
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const saving = createHabit.isPending || updateHabit.isPending;

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setTime(habit?.notificationTime ?? "19:30");
  }, [open, habit]);

  const save = async () => {
    if (!name.trim()) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (habit) {
      await updateHabit.mutateAsync({ id: habit.id, input: { name: name.trim(), notificationTime: time } });
    } else {
      await createHabit.mutateAsync({ name: name.trim(), notificationTime: time, timezone });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={habit ? "Editar hábito" : "Nuevo hábito"}>
      <div className="flex flex-col gap-4">
        <TextField label="Nombre" placeholder="p. ej. Meditar" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextField label="Hora de notificación" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <Button label={habit ? "Guardar cambios" : "Crear hábito"} onClick={save} disabled={!name.trim()} loading={saving} fullWidth />
      </div>
    </Dialog>
  );
}
