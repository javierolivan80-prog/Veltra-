"use client";

import { ChevronDown, LineChart as LineChartIcon } from "lucide-react";
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
import { analyzeProgress, METRIC_UNIT, TIMEFRAMES, type ProgressMetric, type Timeframe } from "@/features/exercises/progressAnalysis";
import { useProfile } from "@/features/profile/hooks";
import { useSetsForExercise } from "@/features/workouts/hooks";
import { formatWeight } from "@/lib/format";

const METRIC_COLOR: Record<ProgressMetric, string> = {
  weight: "#2ce6a0",
  reps: "#a374ff",
  volume: "#4da3ff",
  "1rm": "#ffc94d",
};

export default function ProgressPage() {
  const { data: exercises = [] } = useExercises();
  const recentPRsQuery = useRecentPRs(1);
  const { data: profile } = useProfile();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<ProgressMetric>("weight");
  const [timeframe, setTimeframe] = useState<Timeframe>("3m");
  const [pickerOpen, setPickerOpen] = useState(false);

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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-ink text-2xl font-display">Progreso</h1>
        <p className="text-ink-dim text-sm mt-0.5">¿Estás progresando o toca cambiar algo?</p>
      </div>

      {/* Exercise selector */}
      <button
        onClick={() => setPickerOpen(true)}
        className="flex items-center justify-between rounded-2xl border border-line-subtle bg-surface-raised px-5 py-4 text-left"
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
      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map((tf) => (
          <Chip key={tf.value} label={tf.label} active={timeframe === tf.value} onClick={() => setTimeframe(tf.value)} />
        ))}
      </div>

      {/* Chart */}
      <Card raised>
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
      {analysis ? <ProgressAnalysisCard analysis={analysis} /> : null}

      <ExerciseSearchDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={(ex) => setSelectedId(ex.id)} />
    </div>
  );
}
