"use client";

import { Book, Brain, Check, ChevronRight, Cpu, MoreHorizontal, Play, ShieldCheck, User, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAddictions, useAllRelapses } from "@/features/addictions/hooks";
import { currentStreakStartMs } from "@/features/addictions/stats";
import { useDailyNutrition, useNutritionGoals } from "@/features/food/hooks";
import { useHabits, useLogHabit, useTodayHabitLogs } from "@/features/habits/hooks";
import { useJournalEntryByDate } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { useProfile } from "@/features/profile/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogByDate } from "@/features/sleep/hooks";
import { useActiveSession, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { cn } from "@/lib/cn";
import { formatHoursMinutes } from "@/lib/duration";
import { todayKey, todayKicker } from "@/lib/date";
import type { Habit } from "@/types/models";

function isDue(habit: Habit): boolean {
  if (!habit.notificationTime) return true;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return nowHHMM >= habit.notificationTime;
}

function nowLabel(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** A "later" row can either toggle inline (habits) or navigate to its module. */
type LaterItem = {
  id: string;
  title: string;
  meta: string;
  icon: typeof Brain;
  colorClass: string;
} & ({ kind: "toggle"; onToggle: () => void } | { kind: "link"; href: string });

export default function DashboardPage() {
  const router = useRouter();
  const today = todayKey();
  const { data: profile } = useProfile();
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  const { data: lastNight } = useSleepLogByDate(today);
  const { data: habits = [] } = useHabits();
  const { data: todayHabitLogs = [] } = useTodayHabitLogs();
  const { data: addictions = [] } = useAddictions();
  const { data: allRelapses = [] } = useAllRelapses();
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: todayJournal } = useJournalEntryByDate(today);
  const { data: nutrition } = useDailyNutrition(today);
  const { data: nutritionGoals } = useNutritionGoals();
  const logHabit = useLogHabit();

  const [now] = useState(nowLabel);
  const [nowMs] = useState(() => Date.now());

  const answeredIds = useMemo(() => new Set(todayHabitLogs.map((l) => l.habitId)), [todayHabitLogs]);
  const pendingHabits = useMemo(() => habits.filter((h) => isDue(h) && !answeredIds.has(h.id)), [habits, answeredIds]);

  const suggestedRoutine = useMemo(() => {
    if (routines.length === 0) return null;
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((s) => s.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    return [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
  }, [routines, recentSessions]);

  const meditatedToday = useMemo(() => meditationSessions.filter((s) => s.completedAt.slice(0, 10) === today), [meditationSessions, today]);
  const meditatedMinutesToday = meditatedToday.reduce((sum, s) => sum + s.durationMinutes, 0);

  const bestCleanStreakDays = useMemo(() => {
    if (addictions.length === 0) return null;
    const days = addictions.map((a) => Math.floor((nowMs - currentStreakStartMs(a, allRelapses.filter((r) => r.addictionId === a.id))) / 86400000));
    return Math.max(...days);
  }, [addictions, allRelapses, nowMs]);

  const remainingKcal = nutritionGoals && nutrition ? Math.max(0, Math.round(nutritionGoals.calories - nutrition.calories)) : null;
  const isEvening = new Date().getHours() >= 17;

  const later: LaterItem[] = useMemo(() => {
    const items: LaterItem[] = pendingHabits.map((h) => ({
      id: `habit-${h.id}`,
      title: h.name,
      meta: "Mente · hábito",
      icon: Check,
      colorClass: "text-progress",
      kind: "toggle",
      onToggle: () => logHabit.mutate({ habitId: h.id, date: today, status: "done" }),
    }));
    if (isEvening && remainingKcal !== null && remainingKcal > 0) {
      items.push({
        id: "nutrition",
        title: `Cena — te quedan ${remainingKcal} kcal`,
        meta: `Nutrición · objetivo ${Math.round(nutritionGoals!.calories)} kcal`,
        icon: UtensilsCrossed,
        colorClass: "text-progress",
        kind: "link",
        href: "/food",
      });
    }
    if (!todayJournal) {
      items.push({ id: "journal", title: "Journaling", meta: "Mente · 3 preguntas rápidas", icon: Book, colorClass: "text-ai", kind: "link", href: "/journal" });
    }
    if (meditatedToday.length === 0) {
      items.push({ id: "meditation", title: "Meditar", meta: "Mente · elige la duración", icon: Brain, colorClass: "text-ai", kind: "link", href: "/meditation" });
    }
    return items;
  }, [pendingHabits, isEvening, remainingKcal, nutritionGoals, todayJournal, meditatedToday, logHabit, today]);

  const doneChips = useMemo(() => {
    const chips: { key: string; label: string; icon: typeof Brain; colorClass: string }[] = [];
    if (lastNight) chips.push({ key: "sleep", label: `Sueño ${formatHoursMinutes(sleptMinutes(lastNight))}`, icon: Brain, colorClass: "text-sleep" });
    if (bestCleanStreakDays !== null) chips.push({ key: "clean", label: `${bestCleanStreakDays} días limpio`, icon: ShieldCheck, colorClass: "text-addiction" });
    if (meditatedMinutesToday > 0) chips.push({ key: "meditation", label: `Meditación ${meditatedMinutesToday} min`, icon: Brain, colorClass: "text-ai" });
    if (nutrition && nutrition.mealCount > 0) chips.push({ key: "food", label: `${Math.round(nutrition.calories)} kcal`, icon: UtensilsCrossed, colorClass: "text-progress" });
    return chips;
  }, [lastNight, bestCleanStreakDays, meditatedMinutesToday, nutrition]);

  const insight = useMemo(() => {
    if (lastNight && sleptMinutes(lastNight) < 360) return "Dormiste menos de 6h — considera bajar el volumen de hoy.";
    if (lastNight?.quality !== null && lastNight?.quality !== undefined && lastNight.quality <= 4) return "Anoche descansaste mal — pregúntale a tu entrenador cómo ajustar hoy.";
    return "Pregúntale a tu entrenador qué peso usar hoy.";
  }, [lastNight]);

  const handleStart = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({ routineId: suggestedRoutine?.id ?? null, routineName: suggestedRoutine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

  const firstName = profile?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">{todayKicker()}</p>
          <h1 className="text-ink font-display font-semibold text-[32px] leading-tight tracking-tight mt-1.5">{firstName ? `Hoy, ${firstName}` : "Hoy"}</h1>
        </div>
        <Link href="/profile" className="w-10 h-10 rounded-full bg-surface border border-line-subtle flex items-center justify-center shrink-0">
          <User size={17} className="text-ink-dim" />
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-progress shadow-[0_0_10px_#2CE6A0]" />
        <span className="text-progress text-[11px] font-bold uppercase tracking-[.14em]">Ahora · {now}</span>
      </div>

      <div className="relative bg-gradient-to-b from-[#131a17] to-[#101211] border border-progress/20 rounded-[20px] px-[22px] py-6 overflow-hidden">
        <span className="absolute left-0 top-[22px] bottom-[22px] w-[2px] bg-[linear-gradient(180deg,transparent,#2CE6A0,transparent)]" />
        <p className="text-ink-dim text-xs font-semibold uppercase tracking-wide">Cuerpo · Entreno</p>
        <p className="text-ink font-display font-semibold text-[30px] leading-tight tracking-tight mt-2">
          {activeSession ? activeSession.routineName ?? "Sesión libre" : (suggestedRoutine?.name ?? "Crea tu primera rutina")}
        </p>
        <p className="text-ink-dim text-sm mt-2">
          {activeSession ? "Entrenamiento en curso" : suggestedRoutine ? `${suggestedRoutine.exercises.length} ejercicios` : "Empieza por definir tu rutina"}
        </p>
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={handleStart}
            className="flex-1 flex items-center justify-center gap-2 border border-progress text-progress font-semibold text-[15px] py-3.5 rounded-xl hover:bg-progress/10 transition-colors"
          >
            <Play size={14} fill="currentColor" />
            {activeSession ? "Continuar entrenamiento" : "Empezar entrenamiento"}
          </button>
          <Link
            href="/routines"
            className="w-12 shrink-0 border border-line text-ink-dim rounded-xl flex items-center justify-center hover:border-line hover:text-ink transition-colors"
            aria-label="Ver rutinas"
          >
            <MoreHorizontal size={18} />
          </Link>
        </div>
      </div>

      {later.length > 0 ? (
        <div>
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-1">Después de esto</p>
          <div className="flex flex-col">
            {later.map((item) => {
              const Icon = item.icon;
              const row = (
                <>
                  <span className={cn("w-[2px] h-[26px] rounded-full shrink-0", item.colorClass.replace("text-", "bg-"))} />
                  <Icon size={17} className={cn(item.colorClass, "shrink-0")} />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-ink text-[15px] font-semibold truncate">{item.title}</span>
                    <span className="block text-ink-faint text-xs mt-0.5 truncate">{item.meta}</span>
                  </span>
                </>
              );
              return item.kind === "toggle" ? (
                <button key={item.id} onClick={item.onToggle} className="flex items-center gap-3 w-full text-left border-b border-[#171717] py-3.5 hover:bg-surface/60 transition-colors">
                  {row}
                  <Check size={20} className="text-line shrink-0" />
                </button>
              ) : (
                <Link key={item.id} href={item.href} className="flex items-center gap-3 w-full text-left border-b border-[#171717] py-3.5 hover:bg-surface/60 transition-colors">
                  {row}
                  <ChevronRight size={18} className="text-ink-faint shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {doneChips.length > 0 ? (
        <div>
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Ya hecho · {doneChips.length}</p>
          <div className="flex flex-wrap gap-2">
            {doneChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <span key={chip.key} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-line-subtle bg-[#101010] text-ink-dim text-[12.5px] font-medium">
                  <Icon size={14} className={chip.colorClass} />
                  {chip.label}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <Link href="/coach" className="border-t border-line-subtle pt-4 flex items-center gap-3">
        <Cpu size={18} className="text-ai shrink-0" />
        <span className="flex-1 text-ink-dim text-[13.5px] leading-snug">{insight}</span>
        <ChevronRight size={16} className="text-ink-faint shrink-0" />
      </Link>
    </div>
  );
}
