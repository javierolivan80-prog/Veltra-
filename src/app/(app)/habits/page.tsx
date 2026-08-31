"use client";

import { Bell, Check, Flame, Plus, SkipForward, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { HabitFormDialog } from "@/features/habits/HabitFormDialog";
import { useHabitLogs, useHabits, useLogHabit, useTodayHabitLogs } from "@/features/habits/hooks";
import { computeStreaks } from "@/features/habits/stats";
import { todayKey } from "@/lib/date";
import { enableHabitReminders, isPushSupported, notificationPermission } from "@/lib/notifications/push";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Habit, HabitLogStatus } from "@/types/models";

function isDue(habit: Habit): boolean {
  if (!habit.notificationTime) return true;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return nowHHMM >= habit.notificationTime;
}

function PendingCard({ habit }: { habit: Habit }) {
  const logHabit = useLogHabit();
  const respond = (status: HabitLogStatus) => logHabit.mutate({ habitId: habit.id, date: todayKey(), status });

  return (
    <Card raised className="bg-progress-bg border-progress/30">
      <p className="text-ink font-semibold">¿Hiciste &ldquo;{habit.name}&rdquo; hoy?</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => respond("done")}
          className="flex-1 flex items-center justify-center gap-1.5 bg-progress rounded-xl py-2.5 text-bg-deep text-sm font-bold"
        >
          <Check size={15} /> Sí
        </button>
        <button
          onClick={() => respond("not_done")}
          className="flex-1 flex items-center justify-center gap-1.5 bg-surface-raised border border-line-subtle rounded-xl py-2.5 text-ink text-sm font-bold"
        >
          <X size={15} /> No
        </button>
        <button
          onClick={() => respond("skipped")}
          className="flex-1 flex items-center justify-center gap-1.5 bg-surface-raised border border-line-subtle rounded-xl py-2.5 text-ink-dim text-sm font-bold"
        >
          <SkipForward size={15} /> Saltar
        </button>
      </div>
    </Card>
  );
}

function HabitRow({ habit, onClick }: { habit: Habit; onClick: () => void }) {
  const { data: logs = [] } = useHabitLogs(habit.id);
  const { current } = useMemo(() => computeStreaks(logs), [logs]);

  return (
    <Card raised onClick={onClick} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-ink font-semibold truncate">{habit.name}</p>
        <p className="text-ink-dim text-xs mt-0.5">{habit.notificationTime ? `Aviso a las ${habit.notificationTime}` : "Sin hora fija"}</p>
      </div>
      <div className="flex items-center gap-1 text-progress shrink-0">
        <Flame size={16} />
        <span className="font-display text-lg">{current}</span>
      </div>
    </Card>
  );
}

function NotificationsBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPermission(notificationPermission()), []);

  if (!isSupabaseConfigured || !isPushSupported() || permission === "granted" || permission === "unsupported") return null;

  const enable = async () => {
    setEnabling(true);
    setError(null);
    try {
      await enableHabitReminders();
      setPermission("granted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setEnabling(false);
    }
  };

  return (
    <Card raised className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-progress-bg flex items-center justify-center shrink-0">
        <Bell size={16} className="text-progress" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink text-sm font-semibold">Recibe avisos de tus hábitos</p>
        <p className="text-ink-dim text-xs mt-0.5">{error ?? "Aunque tengas la app cerrada, te avisamos a la hora que elijas."}</p>
      </div>
      <button onClick={enable} disabled={enabling} className="shrink-0 px-4 py-2 rounded-full bg-progress text-bg-deep text-sm font-bold disabled:opacity-50">
        {enabling ? "..." : "Activar"}
      </button>
    </Card>
  );
}

export default function HabitsPage() {
  const router = useRouter();
  const { data: habits = [] } = useHabits();
  const { data: todayLogs = [] } = useTodayHabitLogs();
  const [formOpen, setFormOpen] = useState(false);

  const answeredIds = useMemo(() => new Set(todayLogs.map((l) => l.habitId)), [todayLogs]);
  const pending = useMemo(() => habits.filter((h) => isDue(h) && !answeredIds.has(h.id)), [habits, answeredIds]);

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/mind" label="Mente" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink-dim text-sm">Mente</p>
          <h1 className="text-ink text-2xl font-display mt-0.5">Hábitos</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="w-11 h-11 rounded-full bg-progress flex items-center justify-center text-bg-deep"
          aria-label="Nuevo hábito"
        >
          <Plus size={20} />
        </button>
      </div>

      {habits.length > 0 ? <NotificationsBanner /> : null}

      {pending.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SectionHeader title="Pendientes hoy" />
          {pending.map((h) => (
            <PendingCard key={h.id} habit={h} />
          ))}
        </div>
      ) : null}

      <div>
        <SectionHeader title="Tus hábitos" />
        {habits.length === 0 ? (
          <Card raised>
            <EmptyState
              title="Todavía no tienes hábitos"
              description="Crea tu primer hábito y Veltra te preguntará cada día a la hora que elijas."
              actionLabel="Crear hábito"
              onAction={() => setFormOpen(true)}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {habits.map((h) => (
              <HabitRow key={h.id} habit={h} onClick={() => router.push(`/habits/${h.id}`)} />
            ))}
          </div>
        )}
      </div>

      <HabitFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
