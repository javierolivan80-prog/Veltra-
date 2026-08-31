"use client";

import { BookOpen, CheckCircle2, Timer, Wind } from "lucide-react";
import { useMemo } from "react";
import { ModuleCard } from "@/design-system/components/ModuleCard";
import { useFocusSessions } from "@/features/focus/hooks";
import { useHabits, useTodayHabitLogs } from "@/features/habits/hooks";
import { useJournalEntryByDate } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { computeMeditationStreak } from "@/features/meditation/stats";
import { todayKey } from "@/lib/date";

export default function MindPage() {
  const today = todayKey();
  const { data: habits = [] } = useHabits();
  const { data: todayLogs = [] } = useTodayHabitLogs();
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: todayEntry } = useJournalEntryByDate(today);
  const { data: focusSessions = [] } = useFocusSessions();

  const meditationStreak = useMemo(() => computeMeditationStreak(meditationSessions), [meditationSessions]);
  const focusToday = useMemo(() => focusSessions.filter((s) => s.completedAt.slice(0, 10) === today).length, [focusSessions, today]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Hábitos · Meditación · Journaling · Foco</p>
        <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">Mente</h1>
      </div>

      <div className="flex flex-col gap-2.5">
        <ModuleCard
          href="/habits"
          icon={CheckCircle2}
          name="Hábitos"
          quickStat={habits.length > 0 ? `${todayLogs.length}/${habits.length} hoy` : "Crea tu primer hábito"}
          colorClass="text-progress"
          bgClass="bg-progress-bg"
        />
        <ModuleCard
          href="/meditation"
          icon={Wind}
          name="Meditación"
          quickStat={meditationStreak > 0 ? `Racha de ${meditationStreak} días` : "Empieza hoy"}
          colorClass="text-progress"
          bgClass="bg-progress-bg"
        />
        <ModuleCard
          href="/journal"
          icon={BookOpen}
          name="Journaling"
          quickStat={todayEntry ? "Escrito hoy" : "Sin escribir hoy"}
          colorClass="text-progress"
          bgClass="bg-progress-bg"
        />
        <ModuleCard
          href="/focus"
          icon={Timer}
          name="Foco"
          quickStat={focusToday > 0 ? `${focusToday} bloques hoy` : "Sin bloques hoy"}
          colorClass="text-progress"
          bgClass="bg-progress-bg"
        />
      </div>
    </div>
  );
}
