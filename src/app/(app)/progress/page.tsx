"use client";

import { ChevronDown, ChevronRight, Flame, LineChart as LineChartIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { Chip } from "@/design-system/components/Chip";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { StatNumber } from "@/design-system/components/StatNumber";
import { ExerciseSearchDialog } from "@/features/exercises/components/ExerciseSearchDialog";
import { ProgressAnalysisCard } from "@/features/exercises/components/ProgressAnalysisCard";
import { ProgressChart } from "@/features/exercises/components/ProgressChart";
import { useExercises, useRecentPRs } from "@/features/exercises/hooks";
import { analyzeProgress, METRIC_UNIT, TIMEFRAMES, type ProgressMetric, type ProgressStatus, type Timeframe } from "@/features/exercises/progressAnalysis";
import { computeRank, isRankEligible, RANK_META } from "@/features/exercises/ranks";
import { oneRmSeries, weightSeries } from "@/features/exercises/stats";
import { useAllFoodMeals } from "@/features/food/hooks";
import { useBodyWeightLogs, useProfile } from "@/features/profile/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogs } from "@/features/sleep/hooks";
import { useAllSets, useCurrentStreak, useSetsForExercise } from "@/features/workouts/hooks";
import { cn } from "@/lib/cn";
import { formatHoursMinutes } from "@/lib/duration";
import { formatWeight } from "@/lib/format";
import type { Exercise, SetEntry } from "@/types/models";

const METRIC_COLOR: Record<ProgressMetric, string> = {
  weight: "#2ce6a0",
  reps: "#a374ff",
  volume: "#4da3ff",
  "1rm": "#ffc94d",
};

const STATS_WINDOWS = [
  { value: "today", label: "Hoy", days: 1 },
  { value: "7d", label: "7 días", days: 7 },
  { value: "30d", label: "30 días", days: 30 },
] as const;
type StatsWindow = (typeof STATS_WINDOWS)[number]["value"];

const EXERCISE_STATUS_LABEL: Record<ProgressStatus, { label: string; colorClass: string }> = {
  progressing: { label: "Progresas", colorClass: "text-progress" },
  declining: { label: "Retrocede", colorClass: "text-danger" },
  plateau: { label: "Estancado", colorClass: "text-warn" },
  stable: { label: "Estable", colorClass: "text-ink-faint" },
};

interface ExerciseRow {
  exercise: Exercise;
  weightNow: number;
  rankLabel: string | null;
  weeklyPaceKg: number | null;
  status: ProgressStatus;
  d30: number;
  setCount: number;
}

export default function ProgressPage() {
  const { data: exercises = [] } = useExercises();
  const recentPRsQuery = useRecentPRs(1);
  const { data: profile } = useProfile();
  const { data: allSets = [] } = useAllSets();
  const { data: allMeals = [] } = useAllFoodMeals();
  const { data: allSleepLogs = [] } = useSleepLogs();
  const { data: weightLogs = [] } = useBodyWeightLogs();
  const { data: streak = 0 } = useCurrentStreak();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<ProgressMetric>("weight");
  const [timeframe, setTimeframe] = useState<Timeframe>("3m");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statsWindow, setStatsWindow] = useState<StatsWindow>("7d");
  const [nowMs] = useState(() => Date.now());

  // Seed the selection with the user's most recently active lift so the page
  // opens with something meaningful. Wait for the recent-PR query to settle
  // first, otherwise we'd fall back to the alphabetical first exercise (which
  // often has no history) before the real signal arrives.
  useEffect(() => {
    if (selectedId || exercises.length === 0 || recentPRsQuery.isPending) return;
    const seed = recentPRsQuery.data?.[0]?.exerciseId ?? exercises[0]?.id ?? null;
    setSelectedId(seed);
  }, [selectedId, exercises, recentPRsQuery.isPending, recentPRsQuery.data]);

  const exercise = useMemo(() => exercises.find((e) => e.id === selectedId) ?? null, [exercises, selectedId]);
  const { data: sets = [] } = useSetsForExercise(selectedId);

  const analysis = useMemo(() => (exercise ? analyzeProgress(sets, exercise, profile ?? null, metric, timeframe) : null), [exercise, sets, profile, metric, timeframe]);
  const latestValue = analysis && analysis.points.length > 0 ? analysis.points[analysis.points.length - 1].value : null;

  const windowDays = STATS_WINDOWS.find((w) => w.value === statsWindow)!.days;
  const windowCutoff = nowMs - windowDays * 86400000;

  const aggregate = useMemo(() => {
    const setsInWindow = allSets.filter((s) => new Date(s.completedAt).getTime() >= windowCutoff);
    const volume = setsInWindow.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
    const sessionCount = new Set(setsInWindow.map((s) => s.sessionId)).size;

    const mealsInWindow = allMeals.filter((m) => new Date(m.date).getTime() >= windowCutoff);
    const daysWithMeals = new Set(mealsInWindow.map((m) => m.date)).size;
    const avgKcal = daysWithMeals > 0 ? mealsInWindow.reduce((s, m) => s + m.calories, 0) / daysWithMeals : null;

    const sleepInWindow = allSleepLogs.filter((l) => new Date(l.date).getTime() >= windowCutoff);
    const avgSleepMin = sleepInWindow.length > 0 ? sleepInWindow.reduce((s, l) => s + sleptMinutes(l), 0) / sleepInWindow.length : null;
    const prevCutoff = windowCutoff - windowDays * 86400000;
    const prevSleep = allSleepLogs.filter((l) => {
      const t = new Date(l.date).getTime();
      return t >= prevCutoff && t < windowCutoff;
    });
    const prevAvgSleepMin = prevSleep.length > 0 ? prevSleep.reduce((s, l) => s + sleptMinutes(l), 0) / prevSleep.length : null;
    const sleepDeltaMin = avgSleepMin !== null && prevAvgSleepMin !== null ? Math.round(avgSleepMin - prevAvgSleepMin) : null;

    const weightInWindow = weightLogs.filter((l) => new Date(l.date).getTime() >= windowCutoff);
    const weightDelta = weightInWindow.length >= 2 ? Math.round((weightInWindow[weightInWindow.length - 1].weightKg - weightInWindow[0].weightKg) * 10) / 10 : null;

    return { volume, sessionCount, avgKcal, avgSleepMin, sleepDeltaMin, weightDelta };
  }, [allSets, allMeals, allSleepLogs, weightLogs, windowCutoff, windowDays]);

  const exerciseRows: ExerciseRow[] = useMemo(() => {
    const byExercise = new Map<string, SetEntry[]>();
    for (const s of allSets) {
      const arr = byExercise.get(s.exerciseId);
      if (arr) arr.push(s);
      else byExercise.set(s.exerciseId, [s]);
    }
    const rows: ExerciseRow[] = [];
    for (const [exerciseId, exSets] of byExercise) {
      if (exSets.length < 2) continue;
      const ex = exercises.find((e) => e.id === exerciseId);
      if (!ex) continue;
      const exAnalysis = analyzeProgress(exSets, ex, profile ?? null, "weight", "3m");
      const wSeries = weightSeries(exSets);
      const weightNow = wSeries.length > 0 ? wSeries[wSeries.length - 1].value : 0;
      let rankLabel: string | null = null;
      if (profile?.bodyweightKg && isRankEligible(ex)) {
        const oneRm = oneRmSeries(exSets, ex, profile.bodyweightKg);
        const oneRmNow = oneRm.length > 0 ? oneRm[oneRm.length - 1].value : 0;
        const rank = computeRank({ exercise: ex, oneRmKg: oneRmNow, bodyweightKg: profile.bodyweightKg, sex: profile.sex, birthDate: profile.birthDate, experienceLevel: profile.experienceLevel });
        if (rank) rankLabel = RANK_META[rank.tier].label;
      }
      const weeklyPaceKg = exAnalysis.pacePerMonth !== null ? Math.round((exAnalysis.pacePerMonth / 4.345) * 10) / 10 : null;
      rows.push({ exercise: ex, weightNow, rankLabel, weeklyPaceKg, status: exAnalysis.status, d30: exAnalysis.windows.d30.delta, setCount: exSets.length });
    }
    return rows.sort((a, b) => b.setCount - a.setCount).slice(0, 6);
  }, [allSets, exercises, profile]);

  if (exercises.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-ink text-2xl font-display">Progreso</h1>
        <Card raised>
          <EmptyState title="Aún no hay ejercicios" description="Registra algún entrenamiento y aquí podrás analizar la evolución de cada ejercicio." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-ink font-display font-semibold text-[22px] leading-tight">Cuerpo</h1>
        {streak > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-full">
            <Flame size={14} className="text-record" />
            <span className="text-ink text-xs font-semibold">{streak}</span>
          </div>
        ) : null}
      </div>

      <SegmentedControl value={statsWindow} onChange={setStatsWindow} options={STATS_WINDOWS.map((w) => ({ value: w.value, label: w.label }))} />

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Volumen</span>
          <p className="text-progress font-display font-semibold text-[22px] mt-1.5">
            {Math.round(aggregate.volume).toLocaleString("es-ES")} <span className="text-ink-faint text-xs font-medium">kg</span>
          </p>
          <p className="text-ink-faint text-[11px] mt-1">{aggregate.sessionCount} sesiones</p>
        </div>
        <div className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Sueño medio</span>
          <p className="text-sleep font-display font-semibold text-[22px] mt-1.5">{aggregate.avgSleepMin !== null ? formatHoursMinutes(Math.round(aggregate.avgSleepMin)) : "—"}</p>
          <p className="text-ink-faint text-[11px] mt-1">
            {aggregate.sleepDeltaMin !== null ? `${aggregate.sleepDeltaMin >= 0 ? "+" : ""}${aggregate.sleepDeltaMin} min vs. periodo previo` : "sin datos previos"}
          </p>
        </div>
        <div className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Kcal medias</span>
          <p className="text-info font-display font-semibold text-[22px] mt-1.5">{aggregate.avgKcal !== null ? Math.round(aggregate.avgKcal).toLocaleString("es-ES") : "—"}</p>
          <p className="text-ink-faint text-[11px] mt-1">/ día</p>
        </div>
        <div className="border border-line-subtle rounded-lg bg-[#0E0E0E] px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Peso</span>
          <p className="text-ink font-display font-semibold text-[22px] mt-1.5">
            {profile?.bodyweightKg ?? "—"} <span className="text-ink-faint text-xs font-medium">kg</span>
          </p>
          {aggregate.weightDelta !== null ? (
            <p className={cn("text-[11px] mt-1 font-semibold", aggregate.weightDelta <= 0 ? "text-progress" : "text-ink-dim")}>
              {aggregate.weightDelta <= 0 ? "↓" : "↑"} {Math.abs(aggregate.weightDelta)} kg
            </p>
          ) : (
            <p className="text-ink-faint text-[11px] mt-1">sin datos</p>
          )}
        </div>
      </div>

      {exerciseRows.length > 0 ? (
        <div>
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Ejercicios · rango y estado</p>
          <div className="flex flex-col gap-2">
            {exerciseRows.map((row) => {
              const statusMeta = EXERCISE_STATUS_LABEL[row.status];
              return (
                <button
                  key={row.exercise.id}
                  onClick={() => {
                    setSelectedId(row.exercise.id);
                    setMetric("weight");
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full text-left bg-[#0E0E0E] border rounded-lg px-3.5 py-3 transition-colors",
                    selectedId === row.exercise.id ? "border-progress/40" : "border-line-subtle hover:border-line"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusMeta.colorClass.replace("text-", "bg-"))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-[14.5px] font-semibold truncate">{row.exercise.name}</p>
                    <p className="text-ink-faint text-[11.5px] mt-0.5 truncate">
                      {row.rankLabel ? `${row.rankLabel} · ` : ""}
                      {row.status === "progressing" && row.weeklyPaceKg !== null
                        ? `+${row.weeklyPaceKg} kg/sem`
                        : row.status === "plateau" || row.status === "stable"
                          ? `${row.d30 >= 0 ? "+" : ""}${row.d30} kg en 30 días`
                          : `${row.weeklyPaceKg ?? 0} kg/sem`}
                      {" · "}
                      {formatWeight(row.weightNow)} kg
                    </p>
                  </div>
                  <span className={cn("text-xs font-semibold shrink-0", statusMeta.colorClass)}>{statusMeta.label}</span>
                  <ChevronRight size={16} className="text-ink-faint shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Análisis del ejercicio</p>

        {/* Exercise selector */}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center justify-between rounded-2xl border border-line-subtle bg-surface-raised px-5 py-4 text-left w-full mb-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
              <LineChartIcon size={17} className="text-progress" />
            </span>
            <div className="min-w-0">
              <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wider">Ejercicio</p>
              <p className="text-ink text-base font-semibold truncate">{exercise?.name ?? "Elige un ejercicio"}</p>
            </div>
          </div>
          <ChevronDown size={18} className="text-ink-faint shrink-0" />
        </button>

        {/* Metric selector */}
        <SegmentedControl
          value={metric}
          onChange={setMetric}
          options={[
            { value: "weight", label: "Peso" },
            { value: "reps", label: "Reps" },
            { value: "volume", label: "Volumen" },
            { value: "1rm", label: "1RM" },
          ]}
        />

        {/* Timeframe filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {TIMEFRAMES.map((tf) => (
            <Chip key={tf.value} label={tf.label} active={timeframe === tf.value} onClick={() => setTimeframe(tf.value)} />
          ))}
        </div>

        {/* Chart */}
        <Card raised className="mt-4">
          <div className="flex items-baseline justify-between mb-3">
            <StatNumber
              value={latestValue !== null ? formatWeight(latestValue) : "—"}
              unit={METRIC_UNIT[metric]}
              size="md"
              color="text-ink"
              label="Valor más reciente"
            />
            {analysis?.pr ? <span className="text-record text-xs font-semibold">🏆 PR {formatWeight(analysis.pr.value)} {METRIC_UNIT[metric]}</span> : null}
          </div>
          <ProgressChart points={analysis?.points ?? []} color={METRIC_COLOR[metric]} unit={METRIC_UNIT[metric]} pr={analysis?.pr ?? null} />
        </Card>

        {/* Intelligent analysis */}
        {analysis ? <div className="mt-4"><ProgressAnalysisCard analysis={analysis} /></div> : null}
      </div>

      <ExerciseSearchDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={(ex) => setSelectedId(ex.id)} />
    </div>
  );
}
