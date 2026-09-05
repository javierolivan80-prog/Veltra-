"use client";

import { BookOpen, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { LineChart } from "@/design-system/charts/LineChart";
import { JournalEntryDialog } from "@/features/journaling/JournalEntryDialog";
import { useJournalEntries, useJournalEntryByDate } from "@/features/journaling/hooks";
import { dayLabel, todayKey } from "@/lib/date";
import type { JournalEntry } from "@/types/models";

export default function JournalPage() {
  const today = todayKey();
  const { data: todayEntry } = useJournalEntryByDate(today);
  const { data: entries = [] } = useJournalEntries();
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogExisting, setDialogExisting] = useState<JournalEntry | null>(null);

  const moodData = useMemo(
    () => entries.filter((e) => e.mood !== null).map((e) => ({ x: e.date, y: e.mood as number })),
    [entries]
  );

  const openDialog = (entry: JournalEntry | null) => {
    setDialogDate(entry?.date ?? today);
    setDialogExisting(entry);
  };

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/dashboard" label="Hoy" />
      <div>
        <p className="text-ink-dim text-sm">Mente</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Journaling</h1>
      </div>

      {todayEntry ? (
        <Card raised className="bg-progress-bg border-progress/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Hoy{todayEntry.mood !== null ? ` · ánimo ${todayEntry.mood}/10` : ""}</p>
              {todayEntry.gratitude ? <p className="text-ink text-sm mt-2 leading-5">🙏 {todayEntry.gratitude}</p> : null}
              {todayEntry.learned ? <p className="text-ink text-sm mt-1.5 leading-5">💡 {todayEntry.learned}</p> : null}
            </div>
            <button onClick={() => openDialog(todayEntry)} className="w-9 h-9 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim shrink-0" aria-label="Editar">
              <Pencil size={14} />
            </button>
          </div>
        </Card>
      ) : (
        <Card raised>
          <EmptyState
            icon={<BookOpen size={28} className="text-progress" />}
            title="Escribe tu entrada de hoy"
            description="Tres preguntas rápidas: qué agradeces, qué aprendiste y cómo te sientes."
            actionLabel="Escribir"
            onAction={() => openDialog(null)}
          />
        </Card>
      )}

      <div>
        <SectionHeader title="Estado de ánimo" subtitle="Evolución" />
        <Card raised>
          <LineChart data={moodData} color="#2CE6A0" formatX={(v) => dayLabel(v)} />
        </Card>
      </div>

      <div>
        <SectionHeader title="Entradas anteriores" />
        {entries.length === 0 ? (
          <Card raised>
            <p className="text-ink-dim text-sm">Todavía no hay entradas.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {[...entries].reverse().map((entry) => (
              <Card key={entry.id} raised onClick={() => openDialog(entry)}>
                <p className="text-ink font-semibold">{dayLabel(entry.date)}{entry.mood !== null ? ` · ${entry.mood}/10` : ""}</p>
                {entry.gratitude ? <p className="text-ink-dim text-sm mt-1 truncate">🙏 {entry.gratitude}</p> : null}
              </Card>
            ))}
          </div>
        )}
      </div>

      <JournalEntryDialog open={dialogDate !== null} onOpenChange={(open) => !open && setDialogDate(null)} date={dialogDate ?? today} existing={dialogExisting} />
    </div>
  );
}
