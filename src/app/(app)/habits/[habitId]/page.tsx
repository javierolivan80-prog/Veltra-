"use client";

import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { HeatmapCalendar, type HeatmapCell } from "@/design-system/components/HeatmapCalendar";
import { StatNumber } from "@/design-system/components/StatNumber";
import { HabitFormDialog } from "@/features/habits/HabitFormDialog";
import { useDeleteHabit, useHabit, useHabitLogs } from "@/features/habits/hooks";
import { computeCompletionRate, computeStreaks, totalCompleted } from "@/features/habits/stats";
import { lastNDayKeys } from "@/lib/date";
import { pct } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = { done: "Hecho", not_done: "No hecho", skipped: "Saltado" };

export default function HabitDetailPage() {
  const params = useParams<{ habitId: string }>();
  const router = useRouter();
  const { data: habit } = useHabit(params.habitId ?? null);
  const { data: logs = [] } = useHabitLogs(params.habitId ?? null);
  const deleteHabit = useDeleteHabit();
  const [editOpen, setEditOpen] = useState(false);

  const { current, longest } = useMemo(() => computeStreaks(logs), [logs]);
  const completion = useMemo(() => computeCompletionRate(logs, 30), [logs]);
  const done = useMemo(() => totalCompleted(logs), [logs]);

  const heatmapData: HeatmapCell[] = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    return lastNDayKeys(30).map((date) => {
      const log = byDate.get(date);
      if (!log) return { date, tone: "neutral" as const };
      const tone = log.status === "done" ? ("progress" as const) : log.status === "skipped" ? ("record" as const) : ("danger" as const);
      return { date, tone, label: `${date} · ${STATUS_LABEL[log.status]}` };
    });
  }, [logs]);

  if (!habit) return null;

  const remove = async () => {
    if (!confirm(`¿Borrar el hábito "${habit.name}"? Se perderá todo su histórico.`)) return;
    await deleteHabit.mutateAsync(habit.id);
    router.replace("/habits");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/habits")} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim" aria-label="Editar">
            <Pencil size={15} />
          </button>
          <button onClick={remove} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-danger" aria-label="Borrar">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-ink text-2xl font-display">{habit.name}</h1>
        <p className="text-ink-dim text-sm mt-1">{habit.notificationTime ? `Aviso a las ${habit.notificationTime}` : "Sin hora fija"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={current} unit="días" size="md" color="text-progress" label="Racha actual" />
        </Card>
        <Card raised>
          <StatNumber value={longest} unit="días" size="md" color="text-record" label="Racha más larga" />
        </Card>
        <Card raised>
          <StatNumber value={pct(completion)} size="md" color="text-info" label="Cumplimiento (30d)" />
        </Card>
        <Card raised>
          <StatNumber value={done} unit="veces" size="md" color="text-ink" label="Total completado" />
        </Card>
      </div>

      <Card raised>
        <p className="text-ink-dim text-sm font-medium mb-3">Últimos 30 días</p>
        <HeatmapCalendar data={heatmapData} />
      </Card>

      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />
    </div>
  );
}
