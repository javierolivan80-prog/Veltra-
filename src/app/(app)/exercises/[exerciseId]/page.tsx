"use client";

import { ChevronLeft, Cpu, Edit2, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { RankBadge } from "@/design-system/components/RankBadge";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { SegmentedControl } from "@/design-system/components/SegmentedControl";
import { StatNumber } from "@/design-system/components/StatNumber";
import { FrequencyBars } from "@/design-system/charts/FrequencyBars";
import { LineChart } from "@/design-system/charts/LineChart";
import { ExerciseFormDialog } from "@/features/exercises/ExerciseFormDialog";
import { useExercise, useExercises, usePersonalRecords, useToggleFavorite } from "@/features/exercises/hooks";
import { explainExerciseProgress, monthComparison } from "@/features/exercises/insights";
import { findAlternatives } from "@/features/exercises/alternatives";
import { RANK_META, computeRank, isRankEligible } from "@/features/exercises/ranks";
import { linearPrediction, oneRmSeries, repsSeries, totalTrainingMinutes, weeklyFrequency, weightSeries } from "@/features/exercises/stats";
import { useProfile } from "@/features/profile/hooks";
import { useSetsForExercise } from "@/features/workouts/hooks";
import { formatDateLong, formatWeight } from "@/lib/format";
import type { PersonalRecord } from "@/types/models";

type MetricTab = "weight" | "1rm" | "reps";

const PR_META: Record<PersonalRecord["type"], { label: string; unit: string; emoji: string }> = {
  weight: { label: "Peso máximo", unit: "kg", emoji: "🏋️" },
  "1rm": { label: "1RM estimado", unit: "kg", emoji: "🥇" },
  reps: { label: "Repeticiones", unit: "reps", emoji: "🔁" },
};

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

export default function ExerciseProfilePage() {
  const params = useParams<{ exerciseId: string }>();
  const { data: exercise } = useExercise(params.exerciseId ?? null);
  const { data: sets = [] } = useSetsForExercise(params.exerciseId ?? null);
  const { data: profile } = useProfile();
  const { data: allExercises = [] } = useExercises();
  const { data: prs = [] } = usePersonalRecords(params.exerciseId ?? null);
  const toggleFavorite = useToggleFavorite();
  const [tab, setTab] = useState<MetricTab>("weight");
  const [editOpen, setEditOpen] = useState(false);

  const chartData = useMemo(() => {
    if (!exercise) return [];
    const bw = profile?.bodyweightKg ?? null;
    switch (tab) {
      case "weight":
        return weightSeries(sets);
      case "1rm":
        return oneRmSeries(sets, exercise, bw);
      case "reps":
        return repsSeries(sets);
    }
  }, [sets, exercise, tab, profile?.bodyweightKg]);

  const prediction = useMemo(() => linearPrediction(chartData, 3), [chartData]);

  const rank = useMemo(() => {
    if (!exercise || !profile?.bodyweightKg || !isRankEligible(exercise)) return null;
    const oneRmPr = prs.find((p) => p.type === "1rm");
    if (!oneRmPr) return null;
    return computeRank({
      exercise,
      oneRmKg: oneRmPr.value,
      bodyweightKg: profile.bodyweightKg,
      sex: profile.sex,
      birthDate: profile.birthDate,
      experienceLevel: profile.experienceLevel,
    });
  }, [exercise, profile, prs]);

  const weeklyBars = useMemo(() => {
    const now = new Date();
    const weeks: number[] = [];
    const labels: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7 - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = new Set(sets.filter((s) => new Date(s.completedAt) >= weekStart && new Date(s.completedAt) < weekEnd).map((s) => s.sessionId)).size;
      weeks.push(count);
      labels.push(i === 0 ? "Hoy" : `-${i}s`);
    }
    return { weeks, labels };
  }, [sets]);

  const alternatives = useMemo(() => {
    if (!exercise || !profile) return [];
    return findAlternatives(exercise, allExercises, profile.equipmentAvailable);
  }, [exercise, allExercises, profile]);

  if (!exercise) return null;

  const comparison = monthComparison(sets, exercise);
  const explanation = explainExerciseProgress(exercise, sets);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/routines" className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex gap-2">
          <button onClick={() => toggleFavorite.mutate(exercise.id)} className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center">
            <Star size={16} className={exercise.isFavorite ? "text-record fill-record" : "text-ink-faint"} />
          </button>
          <button onClick={() => setEditOpen(true)} className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
            <Edit2 size={15} />
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-ink text-3xl font-display">{exercise.name}</h1>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {exercise.muscleGroups.map((m) => (
            <Badge key={m} label={MUSCLE_LABEL[m] ?? m} tone="info" />
          ))}
        </div>
      </div>

      {rank ? (
        <Card raised>
          <div className="flex items-center gap-4">
            <RankBadge tier={rank.tier} size="lg" showLabel={false} />
            <div className="flex-1 min-w-0">
              <p className="text-ink text-xl font-display">
                {RANK_META[rank.tier].emoji} {RANK_META[rank.tier].label}
              </p>
              <p className="text-ink-dim text-xs mt-0.5">
                Percentil {rank.percentile.toFixed(0)} · más fuerte que el {rank.percentile.toFixed(0)}% de usuarios similares
              </p>
            </div>
            {rank.nextTier ? (
              <ProgressRing progress={rank.progressToNext} size={54} strokeWidth={5} color="#8FC7FF">
                <span className="text-ink text-[10px] font-bold">{Math.round(rank.progressToNext * 100)}%</span>
              </ProgressRing>
            ) : null}
          </div>
          {rank.nextTier && rank.amountToNextKg ? (
            <p className="text-ink-dim text-xs mt-3">
              Te faltan <span className="text-ink font-bold">{formatWeight(rank.amountToNextKg)}kg</span> de 1RM para llegar a{" "}
              {RANK_META[rank.nextTier].label} {RANK_META[rank.nextTier].emoji}
            </p>
          ) : rank.tier === "elite" ? (
            <p className="text-ink-dim text-xs mt-3">Has alcanzado el rango máximo. 🚀</p>
          ) : null}
        </Card>
      ) : null}

      <div>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "weight", label: "Peso" },
            { value: "1rm", label: "1RM" },
            { value: "reps", label: "Reps" },
          ]}
        />
        <Card raised className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <StatNumber
              value={chartData.length > 0 ? formatWeight(chartData[chartData.length - 1].value) : "—"}
              unit={tab === "reps" ? "reps" : "kg"}
              size="md"
              color={tab === "1rm" ? "text-record" : "text-ink"}
            />
            {prediction && (tab === "weight" || tab === "1rm") ? <span className="text-ink-faint text-xs">proyección · {formatWeight(prediction)}kg</span> : null}
          </div>
          <LineChart
            data={chartData.map((p) => ({ x: p.date, y: p.value }))}
            color={tab === "1rm" ? "#FFC94D" : "#2CE6A0"}
            formatX={(x) => formatDateLong(x).split(" de ")[0]}
            predictedY={tab === "weight" || tab === "1rm" ? (prediction ?? undefined) : undefined}
          />
        </Card>
      </div>

      <Card raised className="bg-ai-bg border-ai/25">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-ai" />
          <span className="text-ai text-xs font-bold uppercase tracking-wider">Análisis de tu entrenador</span>
        </div>
        <p className="text-ink text-sm leading-5">{explanation}</p>
      </Card>

      <div>
        <SectionHeader title="Frecuencia semanal" subtitle="Últimas 8 semanas" />
        <Card raised>
          <FrequencyBars weeks={weeklyBars.weeks} labels={weeklyBars.labels} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={weeklyFrequency(sets, 12)} size="sm" color="text-info" label="Sesiones / semana" />
        </Card>
        <Card raised>
          <StatNumber value={Math.round(totalTrainingMinutes(sets) / 60)} unit="h" size="sm" color="text-ink" label="Tiempo total" />
        </Card>
      </div>

      {comparison.deltaPct !== null ? (
        <Card raised>
          <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-1">Comparativa mensual</p>
          <p className={`text-xl font-display ${comparison.deltaPct >= 0 ? "text-progress" : "text-danger"}`}>
            {comparison.deltaPct >= 0 ? "+" : ""}
            {comparison.deltaPct.toFixed(0)}% vs. mes anterior
          </p>
          <p className="text-ink-faint text-xs mt-1">
            {formatWeight(comparison.thisMonth)}kg de media este mes · {formatWeight(comparison.lastMonth)}kg el anterior
          </p>
        </Card>
      ) : null}

      <div>
        <SectionHeader title="Récords personales" />
        <div className="grid grid-cols-2 gap-3">
          {(["weight", "1rm", "reps"] as const).map((type) => {
            const pr = prs.find((p) => p.type === type);
            const meta = PR_META[type];
            return (
              <Card key={type} raised>
                <span className="text-lg">{meta.emoji}</span>
                <p className="text-ink text-lg font-display mt-1.5">
                  {pr ? formatWeight(pr.value) : "—"}
                  <span className="text-xs text-ink-dim"> {meta.unit}</span>
                </p>
                <p className="text-ink-faint text-[11px] mt-0.5">{meta.label}</p>
                {pr ? <p className="text-ink-faint text-[10px] mt-1">{formatDateLong(pr.achievedAt)}</p> : null}
              </Card>
            );
          })}
        </div>
      </div>

      {alternatives.length > 0 ? (
        <div>
          <SectionHeader title="Alternativas" subtitle="Con tu equipo disponible, si no puedes hacer este" />
          <div className="flex flex-col gap-2">
            {alternatives.map(({ exercise: alt, reason }) => (
              <Link
                key={alt.id}
                href={`/exercises/${alt.id}`}
                className="rounded-2xl border border-line-subtle bg-surface-raised px-4 py-3 flex items-center justify-between hover:border-line transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-ink text-sm font-semibold truncate">{alt.name}</p>
                  <p className="text-ink-faint text-[11px] mt-0.5">{reason === "same_pattern" ? "Mismo patrón de movimiento" : "Mismo grupo muscular"}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {alt.muscleGroups.slice(0, 2).map((m) => (
                    <Badge key={m} label={MUSCLE_LABEL[m] ?? m} tone="info" />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {exercise.notes ? (
        <div>
          <SectionHeader title="Notas técnicas" />
          <Card raised>
            <p className="text-ink-dim text-sm leading-5">{exercise.notes}</p>
          </Card>
        </div>
      ) : null}

      <ExerciseFormDialog open={editOpen} onOpenChange={setEditOpen} initial={exercise} />
    </div>
  );
}
