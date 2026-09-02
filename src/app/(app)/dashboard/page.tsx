"use client";

import { Book, Brain, Check, Dumbbell, Moon, Play, Target, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFocusSessions } from "@/features/focus/hooks";
import { useDailyNutrition, useNutritionGoals } from "@/features/food/hooks";
import { useHabits, useLogHabit, useTodayHabitLogs } from "@/features/habits/hooks";
import { useJournalEntryByDate } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogByDate } from "@/features/sleep/hooks";
import { useActiveSession, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { cn } from "@/lib/cn";
import { todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";
import type { Habit } from "@/types/models";

function isDue(habit: Habit): boolean {
  if (!habit.notificationTime) return true;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return nowHHMM >= habit.notificationTime;
}

function timeLabelOf(iso: string): { label: string; minutes: number } {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return { label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, minutes: h * 60 + m };
}

function minutesOfHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** A single stop on "Tu día" — past (done), the current moment (now), or
 *  something still ahead (pending). Time is the only hierarchy: everything
 *  lives on one chronological line instead of being split into rings, a
 *  stat grid and a separate to-do list. */
interface DayItem {
  id: string;
  minutes: number;
  timeLabel: string;
  kicker: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  colorClass: string;
  state: "done" | "now" | "pending";
  onToggle?: () => void;
  href?: string;
  cta?: { label: string; onClick: () => void };
}

export default function DashboardPage() {
  const router = useRouter();
  const today = todayKey();
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  const { data: lastNight } = useSleepLogByDate(today);
  const { data: habits = [] } = useHabits();
  const { data: todayHabitLogs = [] } = useTodayHabitLogs();
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: todayJournal } = useJournalEntryByDate(today);
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: nutrition } = useDailyNutrition(today);
  const { data: nutritionGoals } = useNutritionGoals();
  const logHabit = useLogHabit();
  const [nowMs] = useState(() => Date.now());

  const dueHabits = useMemo(() => habits.filter(isDue), [habits]);
  const answeredIds = useMemo(() => new Set(todayHabitLogs.map((l) => l.habitId)), [todayHabitLogs]);
  const pendingHabits = useMemo(() => dueHabits.filter((h) => !answeredIds.has(h.id)), [dueHabits, answeredIds]);

  const suggestedRoutine = useMemo(() => {
    if (routines.length === 0) return null;
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((s) => s.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    return [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
  }, [routines, recentSessions]);

  const completedSessionToday = useMemo(
    () => recentSessions.find((s) => s.status === "completed" && s.startedAt.slice(0, 10) === today) ?? null,
    [recentSessions, today]
  );
  const workoutDoneToday = completedSessionToday !== null;
  const meditatedTodaySessions = useMemo(() => meditationSessions.filter((s) => s.completedAt.slice(0, 10) === today), [meditationSessions, today]);
  const focusedTodaySessions = useMemo(() => focusSessions.filter((s) => s.completedAt.slice(0, 10) === today), [focusSessions, today]);
  const focusedToday = focusedTodaySessions.length > 0;

  const remainingKcal = nutritionGoals && nutrition ? Math.max(0, Math.round(nutritionGoals.calories - nutrition.calories)) : null;
  const isEvening = new Date().getHours() >= 17;
  const nowMinutes = useMemo(() => {
    const d = new Date(nowMs);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowMs]);

  const handleStart = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({ routineId: suggestedRoutine?.id ?? null, routineName: suggestedRoutine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

  const { doneCount, totalCount } = useMemo(() => {
    const total = 1 + dueHabits.length + 1 + (isEvening ? 1 : 0);
    const done =
      (workoutDoneToday ? 1 : 0) +
      (dueHabits.length - pendingHabits.length) +
      (focusedToday ? 1 : 0) +
      (isEvening ? (remainingKcal === null || remainingKcal <= 0 ? 1 : 0) : 0);
    return { doneCount: done, totalCount: total };
  }, [dueHabits.length, pendingHabits.length, workoutDoneToday, focusedToday, isEvening, remainingKcal]);
  const dayProgressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

  const activeRoutine = useMemo(
    () => (activeSession?.routineId ? routines.find((r) => r.id === activeSession.routineId) ?? null : null),
    [activeSession, routines]
  );

  const items: DayItem[] = useMemo(() => {
    const list: DayItem[] = [];

    if (lastNight) {
      list.push({
        id: "sleep",
        minutes: minutesOfHHMM(lastNight.riseTime),
        timeLabel: lastNight.riseTime,
        kicker: "Recuperación",
        title: `Sueño ${formatHoursMinutes(sleptMinutes(lastNight))}`,
        meta: lastNight.quality ? `Calidad ${lastNight.quality}/10` : "Sin calidad registrada",
        icon: Moon,
        colorClass: "text-sleep",
        state: "done",
      });
    }

    meditatedTodaySessions.forEach((s) => {
      const { label, minutes } = timeLabelOf(s.completedAt);
      list.push({
        id: `med-${s.id}`,
        minutes,
        timeLabel: label,
        kicker: "Mente",
        title: `Meditación ${s.durationMinutes} min`,
        meta: "Sesión completada",
        icon: Brain,
        colorClass: "text-ai",
        state: "done",
      });
    });

    if (todayJournal) {
      const { label, minutes } = timeLabelOf(todayJournal.createdAt);
      list.push({ id: "journal", minutes, timeLabel: label, kicker: "Mente", title: "Journaling", meta: "Entrada de hoy", icon: Book, colorClass: "text-ai", state: "done" });
    }

    focusedTodaySessions.forEach((s) => {
      const { label, minutes } = timeLabelOf(s.completedAt);
      list.push({
        id: `focus-${s.id}`,
        minutes,
        timeLabel: label,
        kicker: "Mente",
        title: `Foco ${s.durationMinutes} min`,
        meta: "Bloque completado",
        icon: Target,
        colorClass: "text-ai",
        state: "done",
      });
    });

    if (!focusedToday) {
      list.push({
        id: "focus-pending",
        minutes: nowMinutes + 2,
        timeLabel: "Pendiente",
        kicker: "Mente",
        title: "Bloque de foco",
        meta: "Elige la duración",
        icon: Target,
        colorClass: "text-ai",
        state: "pending",
        href: "/focus",
      });
    }

    if (activeSession) {
      const { label, minutes } = timeLabelOf(activeSession.startedAt);
      list.push({
        id: "workout-now",
        minutes,
        timeLabel: label,
        kicker: "Ahora",
        title: activeSession.routineName ?? "Sesión libre",
        meta: activeRoutine ? `${activeRoutine.exercises.length} ejercicios` : "Entrenamiento libre",
        icon: Dumbbell,
        colorClass: "text-progress",
        state: "now",
        cta: { label: "Continuar entrenamiento", onClick: () => router.push(`/workout/${activeSession.id}`) },
      });
    } else if (completedSessionToday) {
      const { label, minutes } = timeLabelOf(completedSessionToday.startedAt);
      list.push({
        id: "workout-done",
        minutes,
        timeLabel: label,
        kicker: "Cuerpo",
        title: completedSessionToday.routineName ?? "Entrenamiento",
        meta: "Completado",
        icon: Dumbbell,
        colorClass: "text-progress",
        state: "done",
      });
    } else {
      list.push({
        id: "workout-suggested",
        minutes: nowMinutes,
        timeLabel: "Ahora",
        kicker: "Cuerpo",
        title: suggestedRoutine?.name ?? "Entrenamiento",
        meta: suggestedRoutine ? `${suggestedRoutine.exercises.length} ejercicios` : "Elige tu rutina",
        icon: Dumbbell,
        colorClass: "text-progress",
        state: "now",
        cta: { label: "Empezar entrenamiento", onClick: handleStart },
      });
    }

    dueHabits.forEach((h) => {
      const log = todayHabitLogs.find((l) => l.habitId === h.id);
      if (log?.status === "done") {
        const { label, minutes } = timeLabelOf(log.respondedAt);
        list.push({ id: `habit-${h.id}`, minutes, timeLabel: label, kicker: "Mente", title: h.name, meta: "Hecho", icon: Check, colorClass: "text-progress", state: "done" });
      } else {
        list.push({
          id: `habit-${h.id}`,
          minutes: h.notificationTime ? minutesOfHHMM(h.notificationTime) : nowMinutes + 1,
          timeLabel: h.notificationTime ?? "Pendiente",
          kicker: "Mente",
          title: h.name,
          meta: "hábito",
          icon: Check,
          colorClass: "text-progress",
          state: "pending",
          onToggle: () => logHabit.mutate({ habitId: h.id, date: today, status: "done" }),
        });
      }
    });

    if (isEvening && remainingKcal !== null) {
      if (remainingKcal > 0) {
        list.push({
          id: "nutrition-pending",
          minutes: nowMinutes + 3,
          timeLabel: "Pendiente",
          kicker: "Nutrición",
          title: "Registrar cena",
          meta: `${remainingKcal} kcal disponibles`,
          icon: UtensilsCrossed,
          colorClass: "text-progress",
          state: "pending",
          href: "/food",
        });
      } else {
        list.push({
          id: "nutrition-done",
          minutes: nowMinutes - 1,
          timeLabel: "Hoy",
          kicker: "Nutrición",
          title: "Objetivo de hoy cubierto",
          meta: `${Math.round(nutrition?.calories ?? 0)} kcal registradas`,
          icon: UtensilsCrossed,
          colorClass: "text-progress",
          state: "done",
        });
      }
    }

    return list.sort((a, b) => a.minutes - b.minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lastNight,
    meditatedTodaySessions,
    todayJournal,
    focusedTodaySessions,
    focusedToday,
    activeSession,
    activeRoutine,
    completedSessionToday,
    suggestedRoutine,
    dueHabits,
    todayHabitLogs,
    isEvening,
    remainingKcal,
    nutrition,
    nowMinutes,
    router,
    logHabit,
    today,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-end justify-between mb-2">
          <h1 className="text-ink font-display font-semibold text-[26px] leading-tight tracking-tight">Tu día</h1>
          <span className="text-ink-faint text-xs font-semibold">
            {doneCount} de {totalCount}
          </span>
        </div>
        <div className="h-[2px] bg-[#1B1B1E]">
          <div className="h-[2px] bg-progress transition-all" style={{ width: `${dayProgressPct}%` }} />
        </div>
      </div>

      <div className="relative pl-6">
        <span className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-transparent via-line to-transparent" />
        <div className="flex flex-col gap-5">
          {items.map((it) => {
            const Icon = it.icon;
            const card = (
              <div
                className={cn(
                  "rounded-[14px] p-4",
                  it.state === "now" ? "border border-progress/25 bg-gradient-to-b from-[#121614] to-[#0E0F0E]" : "border border-line-subtle bg-[#0E0E0E]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={it.state === "now" ? 20 : 16} className={cn(it.colorClass, "shrink-0")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-display font-semibold truncate", it.state === "now" ? "text-ink text-[20px]" : "text-ink text-[15px]")}>{it.title}</p>
                    <p className="text-ink-faint text-xs mt-0.5 truncate">{it.meta}</p>
                  </div>
                  {it.onToggle ? (
                    <button
                      type="button"
                      onClick={it.onToggle}
                      className="w-7 h-7 rounded-lg border border-line flex items-center justify-center shrink-0"
                      aria-label={`Marcar ${it.title} como hecho`}
                    >
                      <Check size={14} className="text-ink-faint" />
                    </button>
                  ) : it.state === "done" && !it.cta ? (
                    <span className="w-7 h-7 rounded-lg bg-progress/15 border border-progress/30 flex items-center justify-center shrink-0">
                      <Check size={14} className="text-progress" />
                    </span>
                  ) : null}
                </div>
                {it.cta ? (
                  <button
                    onClick={it.cta.onClick}
                    className="w-full flex items-center justify-center gap-2 mt-3.5 border border-progress text-progress font-semibold text-sm py-3 rounded-xl hover:bg-progress/10 transition-colors"
                  >
                    <Play size={13} fill="currentColor" />
                    {it.cta.label}
                  </button>
                ) : null}
              </div>
            );

            return (
              <div key={it.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border",
                    it.state === "now"
                      ? "bg-progress border-progress shadow-[0_0_0_4px_rgba(44,230,160,.14)]"
                      : it.state === "done"
                        ? "bg-progress/70 border-progress/70"
                        : "bg-bg border-line"
                  )}
                />
                <div className="flex items-baseline gap-2">
                  <span className={cn("font-display text-[13px] font-semibold tracking-wide", it.state === "now" ? "text-progress" : "text-ink-faint")}>{it.timeLabel}</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-[.14em]", it.state === "now" ? "text-progress" : "text-line")}>{it.kicker}</span>
                </div>
                <div className="mt-2.5">{it.href ? <Link href={it.href}>{card}</Link> : card}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
