"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextAreaField, TextField } from "@/design-system/components/TextField";
import { useRegisterRelapse } from "./hooks";

function nowLocalInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RelapseDialog({ open, onOpenChange, addictionId }: { open: boolean; onOpenChange: (open: boolean) => void; addictionId: string }) {
  const [fallenAt, setFallenAt] = useState(nowLocalInputValue());
  const [reason, setReason] = useState("");
  const registerRelapse = useRegisterRelapse();

  useEffect(() => {
    if (!open) return;
    setFallenAt(nowLocalInputValue());
    setReason("");
  }, [open]);

  const save = async () => {
    await registerRelapse.mutateAsync({ addictionId, fallenAt: new Date(fallenAt).toISOString(), reason: reason.trim() || null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Registrar una recaída">
      <div className="flex flex-col gap-4">
        <p className="text-ink-dim text-sm leading-5">El contador vuelve a empezar, pero los días que llevabas siguen contando: están en tu historial.</p>
        <TextField label="Fecha y hora" type="datetime-local" value={fallenAt} onChange={(e) => setFallenAt(e.target.value)} />
        <TextAreaField label="¿Qué pasó? (opcional)" placeholder="Para ti, si te sirve entenderlo…" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button label="Guardar" onClick={save} variant="secondary" loading={registerRelapse.isPending} fullWidth />
      </div>
    </Dialog>
  );
}
