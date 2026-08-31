"use client";

import { Brain, Dumbbell, Flame, Moon, ShieldCheck, Target, UtensilsCrossed, Scale, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { useAddictions, useAllRelapses } from "@/features/addictions/hooks";
import { currentStreakStartMs } from "@/features/addictions/stats";
import { computeCombinedStreak } from "@/features/dashboard/combinedStreak";
import { useFocusSessions } from "@/features/focus/hooks";
import { useDailyNutrition, useNutritionGoals } from "@/features/food/hooks";
import { useAllHabitLogs, useHabits, useLogHabit, useTodayHabitLogs } from "@/features/habits/hooks";
import { useJournalEntryByDate } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { useBodyWeightLogs, useProfile } from "@/features/profile/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogByDate, useSleepLogs } from "@/features/sleep/hooks";
import { useActiveSession, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { cn } from "@/lib/cn";
import { todayFullLabel, todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";
import type { Habit } from "@/types/models";

function isDue(habit: Habit): boolean {
  if (!habit.notificationTime) return true;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return nowHHMM >= habit.notificationTime;
}

const SLEEP_GOAL_MIN = 8 * 60;

/** A pending row can toggle inline (habits), navigate (focus/nutrition), or start a workout. */
type PendingItem = {
  id: string;
  title: string;
  meta: string;
  icon: typeof Dumbbell;
  colorClass: string;
} & ({ kind: "toggle"; onToggle: () => void } | { kind: "link"; href: string } | { kind: "action"; onAction: () => void });

export default function DashboardPage() {
  const router = useRouter();
  const today = todayKey();
  const { data: profile } = useProfile();
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  const { data: lastNight } = useSleepLogByDate(today);
  const { data: allSleepLogs = [] } = useSleepLogs();
  const { data: habits = [] } = useHabits();
  const { data: todayHabitLogs = [] } = useTodayHabitLogs();
  const { data: allHabitLogs = [] } = useAllHabitLogs();
  const { data: addictions = [] } = useAddictions();
  const { data: allRelapses = [] } = useAllRelapses();
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: todayJournal } = useJournalEntryByDate(today);
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: nutrition } = useDailyNutrition(today);
  const { data: nutritionGoals } = useNutritionGoals();
  const { data: weightLogs = [] } = useBodyWeightLogs();
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

  const thisWeekCount = useMemo(() => {
    const weekAgo = nowMs - 7 * 86400000;
    return recentSessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo).length;
  }, [recentSessions, nowMs]);

  const workoutDoneToday = useMemo(
    () => recentSessions.some((s) => s.status === "completed" && s.startedAt.slice(0, 10) === today),
    [recentSessions, today]
  );
  const meditatedToday = useMemo(() => meditationSessions.some((s) => s.completedAt.slice(0, 10) === today), [meditationSessions, today]);
  const focusedToday = useMemo(() => focusSessions.some((s) => s.completedAt.slice(0, 10) === today), [focusSessions, today]);

  const generalStreak = useMemo(() => computeCombinedStreak(allHabitLogs, allSleepLogs, allRelapses), [allHabitLogs, allSleepLogs, allRelapses]);

  // --- Rings: Cuerpo (sesiones esta semana / objetivo), Mente (tareas de hoy hechas), Recuperación (adicciones sin caída hoy) ---
  const cuerpoProgress = Math.min(1, thisWeekCount / (profile?.trainingDaysPerWeek || 3));

  const menteProgress = useMemo(() => {
    const parts: number[] = [meditatedToday ? 1 : 0, todayJournal ? 1 : 0, focusedToday ? 1 : 0];
    if (dueHabits.length > 0) parts.push(todayHabitLogs.filter((l) => l.status === "done").length / dueHabits.length);
    return parts.reduce((a, b) => a + b, 0) / parts.length;
  }, [meditatedToday, todayJournal, focusedToday, dueHabits, todayHabitLogs]);

  const recupProgress = useMemo(() => {
    if (addictions.length === 0) return 1;
    const cleanToday = addictions.filter((a) => !allRelapses.some((r) => r.addictionId === a.id && r.fallenAt.slice(0, 10) === today)).length;
    return cleanToday / addictions.length;
  }, [addictions, allRelapses, today]);

  const bestCleanStreakDays = useMemo(() => {
    if (addictions.length === 0) return null;
    const days = addictions.map((a) => Math.floor((nowMs - currentStreakStartMs(a, allRelapses.filter((r) => r.addictionId === a.id))) / 86400000));
    return Math.max(...days);
  }, [addictions, allRelapses, nowMs]);

  const weightTrendKg = useMemo(() => {
    const cutoff = nowMs - 30 * 86400000;
    const recent = weightLogs.filter((l) => new Date(l.date).getTime() >= cutoff);
    if (recent.length < 2) return null;
    return Math.round((recent[recent.length - 1].weightKg - recent[0].weightKg) * 10) / 10;
  }, [weightLogs, nowMs]);

  const remainingKcal = nutritionGoals && nutrition ? Math.max(0, Math.round(nutritionGoals.calories - nutrition.calories)) : null;
  const isEvening = new Date().getHours() >= 17;

  const handleStart = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({ routineId: suggestedRoutine?.id ?? null, routineName: suggestedRoutine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

  const pending: PendingItem[] = useMemo(() => {
    const items: PendingItem[] = [];
    if (!workoutDoneToday) {
      items.push({
        id: "workout",
        title: activeSession ? activeSession.routineName ?? "Sesión libre" : (suggestedRoutine?.name ?? "Entrenamiento"),
        meta: `Cuerpo · ${suggestedRoutine ? `${suggestedRoutine.exercises.length} ejercicios` : "elige tu rutina"}`,
        icon: Dumbbell,
        colorClass: "text-progress",
        kind: "action",
        onAction: handleStart,
      });
    }
    pendingHabits.forEach((h) =>
      items.push({
        id: `habit-${h.id}`,
        title: h.name,
        meta: "Mente · hábito",
        icon: Check,
        colorClass: "text-progress",
        kind: "toggle",
        onToggle: () => logHabit.mutate({ habitId: h.id, date: today, status: "done" }),
      })
    );
    if (!focusedToday) {
      items.push({ id: "focus", title: "Bloque de foco", meta: "Mente · elige la duración", icon: Target, colorClass: "text-ai", kind: "link", href: "/focus" });
    }
    if (isEvening && remainingKcal !== null && remainingKcal > 0) {
      items.push({
        id: "nutrition",
        title: "Registrar cena",
        meta: `Nutrición · ${remainingKcal} kcal disponibles`,
        icon: UtensilsCrossed,
        colorClass: "text-progress",
        kind: "link",
        href: "/food",
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutDoneToday, activeSession, suggestedRoutine, pendingHabits, focusedToday, isEvening, remainingKcal, logHabit, today]);

  const rings = [
    { id: "cuerpo", label: "Cuerpo", value: cuerpoProgress, color: "#2CE6A0", icon: Dumbbell, href: "/body" },
    { id: "mente", label: "Mente", value: menteProgress, color: "#A374FF", icon: Brain, href: "/mind" },
    { id: "recup", label: "Recuper.", value: recupProgress, color: "#FF6A3D", icon: ShieldCheck, href: "/recovery" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-ink font-display font-semibold text-[22px] leading-tight">Hoy</h1>
          <p className="text-ink-faint text-xs mt-0.5">{todayFullLabel()}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-full">
          <Flame size={14} className="text-record" />
          <span className="text-ink text-xs font-semibold">{generalStreak}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        {rings.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.id} href={r.href} className="flex flex-col items-center gap-2">
              <ProgressRing progress={r.value} size={94} strokeWidth={7} color={r.color} trackColor="#1B1B1E">
                <Icon size={16} style={{ color: r.color }} />
                <span className="text-ink text-[15px] font-display font-semibold mt-0.5">{Math.round(r.value * 100)}%</span>
              </ProgressRing>
              <span className="text-ink-dim text-[11.5px] font-semibold tracking-wide">{r.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/sleep" className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <Moon size={13} className="text-sleep" />
            <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Sueño</span>
          </div>
          <p className="text-ink font-display font-semibold text-[22px] mt-2">
            {lastNight ? formatHoursMinutes(sleptMinutes(lastNight)) : "—"}
            <span className="text-ink-faint text-xs font-medium"> / 8h</span>
          </p>
          <div className="h-[2px] bg-[#1B1B1E] mt-2.5">
            <div className="h-[2px] bg-sleep" style={{ width: `${Math.min(100, Math.round(((lastNight ? sleptMinutes(lastNight) : 0) / SLEEP_GOAL_MIN) * 100))}%` }} />
          </div>
        </Link>
        <Link href="/food" className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed size={13} className="text-progress" />
            <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Nutrición</span>
          </div>
          <p className="text-ink font-display font-semibold text-[22px] mt-2">
            {Math.round(nutrition?.calories ?? 0)}
            <span className="text-ink-faint text-xs font-medium"> / {Math.round(nutritionGoals?.calories ?? 2400)}</span>
          </p>
          <div className="h-[2px] bg-[#1B1B1E] mt-2.5">
            <div
              className="h-[2px] bg-progress"
              style={{ width: `${Math.min(100, Math.round(((nutrition?.calories ?? 0) / (nutritionGoals?.calories ?? 2400)) * 100))}%` }}
            />
          </div>
        </Link>
        <Link href="/recovery" className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-addiction" />
            <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Limpio</span>
          </div>
          <p className="text-ink font-display font-semibold text-[22px] mt-2">
            {bestCleanStreakDays ?? "—"}
            <span className="text-ink-faint text-xs font-medium"> días</span>
          </p>
          <div className="h-[2px] bg-[#1B1B1E] mt-2.5">
            <div className="h-[2px] bg-addiction" style={{ width: `${Math.min(100, Math.round(((bestCleanStreakDays ?? 0) / 30) * 100))}%` }} />
          </div>
        </Link>
        <Link href="/weight" className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <Scale size={13} className="text-info" />
            <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Peso</span>
          </div>
          <p className="text-ink font-display font-semibold text-[22px] mt-2">
            {profile?.bodyweightKg ?? "—"}
            <span className="text-ink-faint text-xs font-medium"> kg</span>
          </p>
          {weightTrendKg !== null ? (
            <p className={cn("text-[11px] font-semibold mt-2.5", weightTrendKg <= 0 ? "text-progress" : "text-ink-dim")}>
              {weightTrendKg <= 0 ? "↓" : "↑"} {Math.abs(weightTrendKg)} kg en 30 días
            </p>
          ) : (
            <p className="text-ink-faint text-[11px] mt-2.5">Sin histórico</p>
          )}
        </Link>
      </div>

      <div>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Pendiente · {pending.length}</p>
        {pending.length === 0 ? (
          <p className="text-ink-dim text-sm">Todo hecho por hoy. 🎉</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((item) => {
              const Icon = item.icon;
              const row = (
                <>
                  <Icon size={17} className={cn(item.colorClass, "shrink-0")} />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-ink text-[14.5px] font-semibold truncate">{item.title}</span>
                    <span className="block text-ink-faint text-[11.5px] mt-0.5 truncate">{item.meta}</span>
                  </span>
                  <span className="w-[22px] h-[22px] rounded-md border border-line shrink-0" />
                </>
              );
              const rowClass = "flex items-center gap-3 w-full bg-[#0E0E0E] border border-line-subtle rounded-lg px-3.5 py-3 hover:border-line transition-colors text-left";
              if (item.kind === "toggle") return <button key={item.id} onClick={item.onToggle} className={rowClass}>{row}</button>;
              if (item.kind === "action") return <button key={item.id} onClick={item.onAction} className={rowClass}>{row}</button>;
              return <Link key={item.id} href={item.href} className={rowClass}>{row}</Link>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
