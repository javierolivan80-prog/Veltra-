"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextAreaField, TextField } from "@/design-system/components/TextField";
import { useCreateAddiction, useUpdateAddiction } from "./hooks";
import type { Addiction } from "@/types/models";

/** "YYYY-MM-DDTHH:MM", the format `<input type="datetime-local">` needs. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddictionFormDialog({ open, onOpenChange, addiction }: { open: boolean; onOpenChange: (open: boolean) => void; addiction?: Addiction | null }) {
  const [name, setName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [startDate, setStartDate] = useState(() => toLocalInputValue(new Date().toISOString()));
  const createAddiction = useCreateAddiction();
  const updateAddiction = useUpdateAddiction();
  const saving = createAddiction.isPending || updateAddiction.isPending;

  useEffect(() => {
    if (!open) return;
    setName(addiction?.name ?? "");
    setMotivation(addiction?.motivation ?? "");
    setStartDate(toLocalInputValue(addiction?.startDate ?? new Date().toISOString()));
  }, [open, addiction]);

  const save = async () => {
    if (!name.trim()) return;
    const isoStartDate = new Date(startDate).toISOString();
    if (addiction) {
      await updateAddiction.mutateAsync({ id: addiction.id, input: { name: name.trim(), motivation: motivation.trim() || null, startDate: isoStartDate } });
    } else {
      await createAddiction.mutateAsync({ name: name.trim(), motivation: motivation.trim() || null, startDate: isoStartDate });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={addiction ? "Editar" : "Nueva adicción"}>
      <div className="flex flex-col gap-4">
        <TextField label="Nombre" placeholder="p. ej. Fumar" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextAreaField
          label="Por qué quieres dejarla"
          placeholder="Tu motivación personal…"
          rows={3}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
        />
        <TextField label="Empezar a contar desde" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Button label={addiction ? "Guardar cambios" : "Crear"} onClick={save} disabled={!name.trim()} loading={saving} fullWidth />
      </div>
    </Dialog>
  );
}
