"use client";

import { ChevronDown, Dumbbell, Moon, Scale, SlidersHorizontal, UtensilsCrossed, Cpu } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDailyNutrition, useNutritionGoals } from "@/features/food/hooks";
import { useBodyWeightLogs, useProfile } from "@/features/profile/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { useCurrentStreak, useRecentSessions } from "@/features/workouts/hooks";
import { useSleepLogByDate, useSleepLogs } from "@/features/sleep/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { cn } from "@/lib/cn";
import { lastNDayKeys, todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";
import { formatRelativeTime } from "@/lib/format";

const SLEEP_GOAL_MIN = 8 * 60;

function CategoryRow({
  href,
  kicker,
  kickerColor,
  icon: Icon,
  iconColor,
  title,
  meta,
}: {
  href: string;
  kicker: string;
  kickerColor: string;
  icon: typeof Dumbbell;
  iconColor: string;
  title: string;
  meta: string;
}) {
  return (
    <Link href={href} className="block border border-line-subtle rounded-lg bg-[#0E0E0E] px-4 py-3.5 hover:border-line transition-colors">
      <p className={cn("text-[10.5px] font-bold uppercase tracking-[.1em] mb-1.5", kickerColor)}>{kicker}</p>
      <div className="flex items-center gap-3">
        <Icon size={17} className={cn(iconColor, "shrink-0")} />
        <div className="flex-1 min-w-0">
          <p className="text-ink font-display font-semibold text-[19px] truncate">{title}</p>
          <p className="text-ink-faint text-xs mt-0.5 truncate">{meta}</p>
        </div>
        <ChevronDown size={16} className="text-ink-faint shrink-0" />
      </div>
    </Link>
  );
}

export default function BodyPage() {
  const today = todayKey();
  const { data: streak = 0 } = useCurrentStreak();
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: lastNight } = useSleepLogByDate(today);
  const { data: allSleepLogs = [] } = useSleepLogs();
  const { data: nutrition } = useDailyNutrition(today);
  const { data: nutritionGoals } = useNutritionGoals();
  const { data: profile } = useProfile();
  const { data: weightLogs = [] } = useBodyWeightLogs();
  const [nowMs] = useState(() => Date.now());

  const suggestedRoutine = useMemo(() => {
    if (routines.length === 0) return null;
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((s) => s.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    return [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
  }, [routines, recentSessions]);

  const lastSessionForSuggested = useMemo(
    () => recentSessions.find((s) => s.routineId === suggestedRoutine?.id) ?? null,
    [recentSessions, suggestedRoutine]
  );

  const sleepBars = useMemo(() => {
    const byDate = new Map(allSleepLogs.map((l) => [l.date, l]));
    return lastNDayKeys(7).map((date) => {
      const log = byDate.get(date);
      const minutes = log ? sleptMinutes(log) : 0;
      return { date, pct: Math.min(100, Math.round((minutes / (9 * 60)) * 100)) };
    });
  }, [allSleepLogs]);

  const weightTrendKg = useMemo(() => {
    const cutoff = nowMs - 30 * 86400000;
    const recent = weightLogs.filter((l) => new Date(l.date).getTime() >= cutoff);
    if (recent.length < 2) return null;
    return Math.round((recent[recent.length - 1].weightKg - recent[0].weightKg) * 10) / 10;
  }, [weightLogs, nowMs]);

  const latestWeightLog = weightLogs[weightLogs.length - 1] ?? null;
  const latestWeightIsToday = latestWeightLog ? latestWeightLog.date.slice(0, 10) === today : false;
  const latestWeightTime = latestWeightIsToday ? new Date(latestWeightLog!.date).toTimeString().slice(0, 5) : null;

  const insight = useMemo(() => {
    const thisWeekAvgSleep =
      sleepBars.length > 0 ? allSleepLogs.filter((l) => sleepBars.some((b) => b.date === l.date)).reduce((s, l) => s + sleptMinutes(l), 0) / Math.max(1, sleepBars.filter((b) => b.pct > 0).length) : 0;
    const weekAgo = nowMs - 7 * 86400000;
    const sessionsThisWeek = recentSessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo).length;
    if (thisWeekAvgSleep > 0 && thisWeekAvgSleep < 390 && sessionsThisWeek >= 3) {
      return `Entrenas ${sessionsThisWeek} veces esta semana pero duermes poco (${formatHoursMinutes(Math.round(thisWeekAvgSleep))} de media). Vigila la recuperación.`;
    }
    if (streak > 0) return `Llevas ${streak} días seguidos entrenando. Sigue así.`;
    return "Registra tu entreno de hoy para que Veltra empiece a analizar tu progreso.";
  }, [sleepBars, allSleepLogs, recentSessions, streak, nowMs]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Ejercicio · Sueño · Nutrición · Peso</p>
          <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">Cuerpo</h1>
        </div>
        <Link href="/progress" className="w-9 h-9 rounded-full bg-surface border border-line-subtle flex items-center justify-center shrink-0" aria-label="Ver análisis">
          <SlidersHorizontal size={15} className="text-ink-dim" />
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        <CategoryRow
          href="/routines"
          kicker="Entrenamiento"
          kickerColor="text-progress"
          icon={Dumbbell}
          iconColor="text-progress"
          title={suggestedRoutine?.name ?? "Crea tu primera rutina"}
          meta={
            suggestedRoutine
              ? `${suggestedRoutine.exercises.length} ejercicios${lastSessionForSuggested ? ` · última ${formatRelativeTime(lastSessionForSuggested.startedAt)}` : ""}`
              : "Empieza por definir tu rutina"
          }
        />
        <CategoryRow
          href="/sleep"
          kicker="Sueño"
          kickerColor="text-sleep"
          icon={Moon}
          iconColor="text-sleep"
          title={lastNight ? formatHoursMinutes(sleptMinutes(lastNight)) : "Sin registrar"}
          meta={
            lastNight
              ? `${lastNight.quality ? `Calidad ${lastNight.quality}/10` : "Sin calidad"}${
                  sleptMinutes(lastNight) < SLEEP_GOAL_MIN ? ` · te faltan ${formatHoursMinutes(SLEEP_GOAL_MIN - sleptMinutes(lastNight))} para tu objetivo` : ""
                }`
              : "Registra cómo dormiste anoche"
          }
        />
        <CategoryRow
          href="/food"
          kicker="Nutrición"
          kickerColor="text-progress"
          icon={UtensilsCrossed}
          iconColor="text-progress"
          title={nutrition && nutrition.mealCount > 0 ? `${Math.round(nutrition.calories)} / ${Math.round(nutritionGoals?.calories ?? 2400)} kcal` : "Sin registrar hoy"}
          meta={nutrition && nutrition.mealCount > 0 ? `P ${Math.round(nutrition.protein)} g · C ${Math.round(nutrition.carbs)} g · G ${Math.round(nutrition.fat)} g` : "Registra lo que has comido"}
        />
        <CategoryRow
          href="/weight"
          kicker="Peso corporal"
          kickerColor="text-info"
          icon={Scale}
          iconColor="text-info"
          title={profile?.bodyweightKg ? `${profile.bodyweightKg} kg` : "Sin registrar"}
          meta={
            weightTrendKg !== null
              ? `${weightTrendKg <= 0 ? "↓" : "↑"} ${Math.abs(weightTrendKg)} kg en 30 días${latestWeightTime ? ` · medido hoy ${latestWeightTime}` : ""}`
              : "Registra tu peso para ver la tendencia"
          }
        />
      </div>

      <div>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Sueño · últimos 7 días</p>
        <div className="flex items-end justify-between gap-1.5 h-16">
          {sleepBars.map((b, i) => (
            <div key={b.date} className="flex-1 h-full flex items-end">
              <div
                className={cn("w-full rounded", i === sleepBars.length - 1 && b.pct > 0 ? "bg-sleep" : "bg-sleep/25")}
                style={{ height: `${Math.max(6, b.pct)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
            <span key={i} className="flex-1 text-center text-ink-faint text-[10px] font-semibold">
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-line-subtle pt-4 flex items-center gap-3">
        <Cpu size={17} className="text-ai shrink-0" />
        <p className="flex-1 text-ink-dim text-[13px] leading-snug">{insight}</p>
      </div>
    </div>
  );
}
