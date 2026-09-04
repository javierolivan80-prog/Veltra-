"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Dialog } from "@/design-system/components/Dialog";
import { TextAreaField } from "@/design-system/components/TextField";
import { useUpsertJournalEntry } from "./hooks";
import { journalPrompts } from "./prompts";
import type { JournalEntry } from "@/types/models";

export function JournalEntryDialog({
  open,
  onOpenChange,
  date,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  existing?: JournalEntry | null;
}) {
  const [gratitude, setGratitude] = useState("");
  const [learned, setLearned] = useState("");
  const [mood, setMood] = useState<number>(5);
  const upsert = useUpsertJournalEntry();

  useEffect(() => {
    if (!open) return;
    setGratitude(existing?.gratitude ?? "");
    setLearned(existing?.learned ?? "");
    setMood(existing?.mood ?? 5);
  }, [open, existing]);

  const save = async () => {
    await upsert.mutateAsync({ date, gratitude: gratitude.trim(), learned: learned.trim(), mood });
    onOpenChange(false);
  };

  const prompts = journalPrompts(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Entrada de diario">
      <div className="flex flex-col gap-4">
        <TextAreaField label={prompts.gratitude} rows={2} value={gratitude} onChange={(e) => setGratitude(e.target.value)} autoFocus />
        <TextAreaField label={prompts.learned} rows={2} value={learned} onChange={(e) => setLearned(e.target.value)} />
        <div>
          <label className="block text-ink-dim text-sm font-medium mb-2">¿Cómo te sientes? — {mood}/10</label>
          <input type="range" min={1} max={10} value={mood} onChange={(e) => setMood(Number(e.target.value))} className="w-full accent-progress" />
        </div>
        <Button label="Guardar" onClick={save} loading={upsert.isPending} fullWidth />
      </div>
    </Dialog>
  );
}
