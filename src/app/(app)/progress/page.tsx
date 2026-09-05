"use client";

import { Check, ChevronDown, ChevronRight, Flame, LineChart as LineChartIcon, Sparkles } from "lucide-react";
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
import { useFocusSessions } from "@/features/focus/hooks";
import { useJournalEntries } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { useBodyWeightLogs, useProfile } from "@/features/profile/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogs } from "@/features/sleep/hooks";
import { useAllSets, useCurrentStreak, useRecentSessions, useSetsForExercise } from "@/features/workouts/hooks";
import Link from "next/link";
import { dayOfArc, daysLeft } from "@/features/contract/arc";
import { FOCUS_OPTIONS } from "@/features/contract/catalogue";
import { useActiveContract, useCommitments, useContracts } from "@/features/contract/hooks";
import type { DoneDaysByKind } from "@/features/review/aggregate";
import { currentReviewMonthStart, currentReviewWeekStart } from "@/features/review/aggregate";
import {
  useAcceptProposal,
  useEnsureLocalMonthlyReview,
  useEnsureLocalWeeklyReview,
  useKeepProposal,
  useMonthlyReviews,
  useReviews,
} from "@/features/review/hooks";
import { cn } from "@/lib/cn";
import { formatHoursMinutes } from "@/lib/duration";
import { formatDateLong, formatWeight } from "@/lib/format";
import { monthLabel, shiftDayKey } from "@/lib/date";
import type { Exercise, MonthlyReview, MuscleGroup, SetEntry, WeeklyReview } from "@/types/models";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

const MUSCLE_ORDER: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "quads", "hamstrings", "glutes", "calves", "abs", "traps", "cardio", "full_body",
];

const METRIC_COLOR: Record<ProgressMetric, string> = {
  weight: "#2ce6a0",
  reps: "#a374ff",
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

/** Estructura fija: párrafo con números reales, un patrón (o su ausencia
 *  dicha con todas las letras), y como mucho una propuesta con aceptar o
 *  mantener. El morado es exclusivo de IA en esta app — esta es la única
 *  pantalla donde aparece. */
function WeeklyReviewCard({ review, onAccept, onKeep, pending }: { review: WeeklyReview; onAccept: () => void; onKeep: () => void; pending: boolean }) {
  const showActions = review.proposal !== null && review.proposalStatus === "pending";
  return (
    <div className="rounded-2xl border border-ai/30 bg-ai-bg px-4 py-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-ai shrink-0" />
        <p className="text-ai text-[11px] font-bold uppercase tracking-[.14em]">Revisión semanal</p>
      </div>
      <p className="text-ink text-sm mt-2.5 leading-5">{review.summary}</p>
      <p className="text-ink-dim text-sm mt-2 leading-5">{review.pattern ?? "Necesitas más semanas de datos para ver un patrón."}</p>

      {review.proposal ? (
        <div className="mt-3.5 border-t border-ai/20 pt-3.5">
          <p className="text-ink text-sm leading-5">{review.proposal.reason}</p>
          {showActions ? (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={onAccept}
                disabled={pending}
                className="flex-1 flex items-center justify-center gap-1.5 bg-ai text-bg-deep font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
              >
                <Check size={14} />
                Aceptar cambio
              </button>
              <button onClick={onKeep} disabled={pending} className="flex-1 border border-line text-ink-dim font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50">
                Mantener el plan
              </button>
            </div>
          ) : review.proposalStatus === "accepted" ? (
            <p className="text-progress text-xs mt-2.5 font-semibold">Cambio aplicado</p>
          ) : (
            <p className="text-ink-faint text-xs mt-2.5 font-semibold">Has mantenido el plan</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Vistazo más largo que la semanal, y sin acciones que tomar: solo el
 *  resumen del mes que acaba de cerrarse, con su punto fuerte y lo que más
 *  costó cuando los datos los sostienen. */
function MonthlyReviewCard({ review }: { review: MonthlyReview }) {
  return (
    <div className="rounded-2xl border border-ai/30 bg-ai-bg px-4 py-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-ai shrink-0" />
        <p className="text-ai text-[11px] font-bold uppercase tracking-[.14em]">Revisión mensual · {monthLabel(review.monthStart)}</p>
      </div>
      <p className="text-ink text-sm mt-2.5 leading-5">{review.summary}</p>
      {review.highlight ? <p className="text-progress text-sm mt-2 leading-5">{review.highlight}</p> : null}
      {review.lowlight ? <p className="text-ink-dim text-sm mt-2 leading-5">{review.lowlight}</p> : null}
    </div>
  );
}

export default function ProgressPage() {
  const { data: allExercises = [] } = useExercises();
  const { data: routines = [] } = useRoutines();
  const recentPRsQuery = useRecentPRs(1);
  const { data: profile } = useProfile();
  const { data: contract } = useActiveContract();
  const { data: contracts = [] } = useContracts();
  const { data: allSets = [] } = useAllSets();
  const { data: allMeals = [] } = useAllFoodMeals();
  const { data: allSleepLogs = [] } = useSleepLogs();
  const { data: weightLogs = [] } = useBodyWeightLogs();
  const { data: streak = 0 } = useCurrentStreak();

  // Solo los ejercicios que el usuario ya tiene en alguna rutina — no el
  // catálogo entero de ejercicios que existe en la app.
  const exercises = useMemo(() => {
    const ids = new Set<string>();
    for (const routine of routines) for (const re of routine.exercises) ids.add(re.exerciseId);
    return allExercises.filter((e) => ids.has(e.id));
  }, [allExercises, routines]);

  const { data: commitments = [] } = useCommitments(contract?.id ?? null);
  const { data: recentWorkoutSessions = [] } = useRecentSessions(60);
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: journalEntries = [] } = useJournalEntries();

  // Lo que la revisión semanal necesita saber: qué días, por tipo de
  // compromiso, hubo algo registrado. Un solo lugar donde se arma esta
  // tabla — igual que "Hoy" resuelve cada compromiso contra el día de hoy,
  // esto lo resuelve contra las últimas semanas.
  const doneDaysByKind: DoneDaysByKind = useMemo(
    () => ({
      workout: new Set(recentWorkoutSessions.map((s) => s.startedAt.slice(0, 10))),
      sleep: new Set(allSleepLogs.map((l) => l.date)),
      nutrition: new Set(allMeals.map((m) => m.date)),
      meditation: new Set(meditationSessions.map((s) => s.completedAt.slice(0, 10))),
      focus: new Set(focusSessions.map((s) => s.completedAt.slice(0, 10))),
      journaling: new Set(journalEntries.map((e) => e.date)),
    }),
    [recentWorkoutSessions, allSleepLogs, allMeals, meditationSessions, focusSessions, journalEntries]
  );
  useEnsureLocalWeeklyReview(contract, commitments, doneDaysByKind);
  const { data: reviews = [] } = useReviews(contract?.id ?? null);
  const currentWeekStart = currentReviewWeekStart();
  const currentReview = reviews.find((r) => r.weekStart === currentWeekStart) ?? null;
  const pastReviews = reviews.filter((r) => r.weekStart !== currentWeekStart);
  const acceptProposal = useAcceptProposal();
  const keepProposal = useKeepProposal();
  const [reviewHistoryOpen, setReviewHistoryOpen] = useState(false);

  useEnsureLocalMonthlyReview(contract, commitments, doneDaysByKind);
  const { data: monthlyReviews = [] } = useMonthlyReviews(contract?.id ?? null);
  const currentMonthlyReview = monthlyReviews.find((r) => r.monthStart === currentReviewMonthStart()) ?? null;
  const pastMonthlyReviews = monthlyReviews.filter((r) => r !== currentMonthlyReview);
  const [monthlyReviewHistoryOpen, setMonthlyReviewHistoryOpen] = useState(false);

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

    return { sessionCount, avgKcal, avgSleepMin, sleepDeltaMin, weightDelta };
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
    return rows.sort((a, b) => b.setCount - a.setCount);
  }, [allSets, exercises, profile]);

  // Agrupados por área muscular (el primer grupo de cada ejercicio) — más
  // fácil de escanear que una lista plana cuando hay ejercicios de varias
  // zonas mezclados.
  const groupedExerciseRows = useMemo(() => {
    const byGroup = new Map<MuscleGroup, ExerciseRow[]>();
    for (const row of exerciseRows) {
      const group = row.exercise.muscleGroups[0];
      if (!group) continue;
      const arr = byGroup.get(group);
      if (arr) arr.push(row);
      else byGroup.set(group, [row]);
    }
    return MUSCLE_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, rows: byGroup.get(g)! }));
  }, [exerciseRows]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-ink font-display font-semibold text-[26px] leading-tight tracking-tight">Progreso</h1>

      {contract ? (
        <Link href="/contract" className="block border border-line-subtle rounded-2xl bg-surface px-4 py-4 hover:border-line transition-colors">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Tu arco</p>
            <ChevronRight size={16} className="text-ink-faint shrink-0" />
          </div>
          <p className="text-ink font-display font-semibold text-[22px] mt-2">
            Día {dayOfArc(contract)} <span className="text-ink-faint text-sm font-medium">de {contract.durationDays}</span>
          </p>
          <div className="h-[3px] bg-[#1B1B1E] rounded-full mt-3">
            <div
              className="h-[3px] bg-progress rounded-full transition-all"
              style={{ width: `${Math.round((dayOfArc(contract) / contract.durationDays) * 100)}%` }}
            />
          </div>
          <p className="text-ink-dim text-xs mt-2.5">
            {FOCUS_OPTIONS.find((f) => f.value === contract.focus)?.title} · quedan {daysLeft(contract)} días
          </p>
        </Link>
      ) : null}

      {currentReview ? (
        <WeeklyReviewCard
          review={currentReview}
          onAccept={() => acceptProposal.mutate(currentReview)}
          onKeep={() => keepProposal.mutate(currentReview.id)}
          pending={acceptProposal.isPending || keepProposal.isPending}
        />
      ) : null}

      {pastReviews.length > 0 ? (
        <div>
          <button onClick={() => setReviewHistoryOpen((v) => !v)} className="flex items-center justify-between w-full">
            <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Revisiones anteriores · {pastReviews.length}</p>
            <ChevronDown size={16} className={cn("text-ink-faint transition-transform", reviewHistoryOpen && "rotate-180")} />
          </button>
          {reviewHistoryOpen ? (
            <div className="flex flex-col gap-2 mt-2.5">
              {pastReviews.map((r) => (
                <Card key={r.id} raised>
                  <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wide">
                    Semana del {formatDateLong(r.weekStart)} al {formatDateLong(shiftDayKey(r.weekStart, 6))}
                  </p>
                  <p className="text-ink text-sm mt-1.5 leading-5">{r.summary}</p>
                  {r.proposalStatus === "accepted" ? <p className="text-progress text-xs mt-2 font-semibold">Propuesta aceptada</p> : null}
                  {r.proposalStatus === "kept" ? <p className="text-ink-faint text-xs mt-2 font-semibold">Plan mantenido</p> : null}
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {currentMonthlyReview ? <MonthlyReviewCard review={currentMonthlyReview} /> : null}

      {pastMonthlyReviews.length > 0 ? (
        <div>
          <button onClick={() => setMonthlyReviewHistoryOpen((v) => !v)} className="flex items-center justify-between w-full">
            <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Meses anteriores · {pastMonthlyReviews.length}</p>
            <ChevronDown size={16} className={cn("text-ink-faint transition-transform", monthlyReviewHistoryOpen && "rotate-180")} />
          </button>
          {monthlyReviewHistoryOpen ? (
            <div className="flex flex-col gap-2 mt-2.5">
              {pastMonthlyReviews.map((r) => (
                <Card key={r.id} raised>
                  <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-wide">{monthLabel(r.monthStart)}</p>
                  <p className="text-ink text-sm mt-1.5 leading-5">{r.summary}</p>
                  {r.highlight ? <p className="text-progress text-xs mt-2 leading-5">{r.highlight}</p> : null}
                  {r.lowlight ? <p className="text-ink-dim text-xs mt-2 leading-5">{r.lowlight}</p> : null}
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {contracts.filter((c) => c.status !== "active").length > 0 ? (
        <div>
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">Arcos anteriores</p>
          <div className="flex flex-col gap-2">
            {contracts
              .filter((c) => c.status !== "active")
              .map((c) => (
                <div key={c.id} className="border border-line-subtle rounded-lg bg-bg-soft px-3.5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold truncate">{FOCUS_OPTIONS.find((f) => f.value === c.focus)?.title}</p>
                    <p className="text-ink-faint text-xs mt-0.5">
                      {c.durationDays} días · empezado el {formatDateLong(c.startedOn)}
                    </p>
                  </div>
                  <span className="text-ink-faint text-xs shrink-0">{c.status === "completed" ? "Completado" : "Terminado antes"}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-line-subtle pt-5">
        <h2 className="text-ink font-display font-semibold text-[20px] leading-tight">Entrenamiento</h2>
        {streak > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-full">
            <Flame size={14} className="text-record" />
            <span className="text-ink text-xs font-semibold">{streak}</span>
          </div>
        ) : null}
      </div>

      {exercises.length === 0 ? (
        <Card raised>
          <EmptyState title="Sin ejercicios en tus rutinas" description="Añade ejercicios a una rutina y aquí podrás analizar su progreso." />
        </Card>
      ) : null}

      <SegmentedControl value={statsWindow} onChange={setStatsWindow} options={STATS_WINDOWS.map((w) => ({ value: w.value, label: w.label }))} />

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-line-subtle rounded-lg bg-bg-soft px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Sesiones</span>
          <p className="text-progress font-display font-semibold text-[22px] mt-1.5">{aggregate.sessionCount}</p>
          <p className="text-ink-faint text-[11px] mt-1">entrenamientos</p>
        </div>
        <div className="border border-line-subtle rounded-lg bg-bg-soft px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Sueño medio</span>
          <p className="text-sleep font-display font-semibold text-[22px] mt-1.5">{aggregate.avgSleepMin !== null ? formatHoursMinutes(Math.round(aggregate.avgSleepMin)) : "—"}</p>
          <p className="text-ink-faint text-[11px] mt-1">
            {aggregate.sleepDeltaMin !== null ? `${aggregate.sleepDeltaMin >= 0 ? "+" : ""}${aggregate.sleepDeltaMin} min vs. periodo previo` : "sin datos previos"}
          </p>
        </div>
        <div className="border border-line-subtle rounded-lg bg-bg-soft px-3.5 py-3">
          <span className="text-ink-faint text-[10.5px] font-bold uppercase tracking-wide">Kcal medias</span>
          <p className="text-info font-display font-semibold text-[22px] mt-1.5">{aggregate.avgKcal !== null ? Math.round(aggregate.avgKcal).toLocaleString("es-ES") : "—"}</p>
          <p className="text-ink-faint text-[11px] mt-1">/ día</p>
        </div>
        <div className="border border-line-subtle rounded-lg bg-bg-soft px-3.5 py-3">
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

      {groupedExerciseRows.length > 0 ? (
        <div className="flex flex-col gap-5">
          {groupedExerciseRows.map(({ group, rows }) => (
            <div key={group}>
              <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">{MUSCLE_LABEL[group] ?? group}</p>
              <div className="flex flex-col gap-2">
                {rows.map((row) => {
                  const statusMeta = EXERCISE_STATUS_LABEL[row.status];
                  return (
                    <button
                      key={row.exercise.id}
                      onClick={() => {
                        setSelectedId(row.exercise.id);
                        setMetric("weight");
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full text-left bg-bg-soft border rounded-lg px-3.5 py-3 transition-colors",
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
          ))}
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
