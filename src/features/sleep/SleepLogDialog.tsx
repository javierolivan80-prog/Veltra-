"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextAreaField, TextField } from "@/design-system/components/TextField";
import { useUpsertSleepLog } from "./hooks";
import type { SleepLog } from "@/types/models";

export function SleepLogDialog({
  open,
  onOpenChange,
  date,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  existing?: SleepLog | null;
}) {
  const [bedTime, setBedTime] = useState("23:30");
  const [sleepTime, setSleepTime] = useState("00:00");
  const [wakeTime, setWakeTime] = useState("07:30");
  const [riseTime, setRiseTime] = useState("07:45");
  const [quality, setQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const upsert = useUpsertSleepLog();
  // Belt-and-suspenders guard alongside upsert.isPending: closes the brief gap
  // before React re-renders the disabled button, so a fast double-tap can
  // never fire this twice.
  const isSaving = useRef(false);

  useEffect(() => {
    if (!open) return;
    setBedTime(existing?.bedTime ?? "23:30");
    setSleepTime(existing?.sleepTime ?? "00:00");
    setWakeTime(existing?.wakeTime ?? "07:30");
    setRiseTime(existing?.riseTime ?? "07:45");
    setQuality(existing?.quality ?? null);
    setNotes(existing?.notes ?? "");
  }, [open, existing]);

  const save = async () => {
    if (isSaving.current) return;
    isSaving.current = true;
    try {
      await upsert.mutateAsync({ date, bedTime, sleepTime, wakeTime, riseTime, quality, notes: notes.trim() || null });
      onOpenChange(false);
    } catch {
      // El toast global (MutationCache en lib/queryClient.ts) ya avisa del
      // fallo — este catch solo evita cerrar el diálogo para poder reintentar.
    } finally {
      isSaving.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Registrar sueño">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Te acostaste" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
          <TextField label="Te dormiste" type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} />
          <TextField label="Te despertaste" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
          <TextField label="Te levantaste" type="time" value={riseTime} onChange={(e) => setRiseTime(e.target.value)} />
        </div>

        <div>
          <label className="block text-ink-dim text-sm font-medium mb-2">Calidad del sueño{quality !== null ? ` — ${quality}/10` : " (opcional)"}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={quality ?? 5}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-sleep"
          />
        </div>

        <TextAreaField label="Notas (opcional)" placeholder="p. ej. Pesadillas, muy descansado…" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <Button label="Guardar" onClick={save} loading={upsert.isPending} fullWidth />
      </div>
    </Dialog>
  );
}
