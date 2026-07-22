import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { Badge } from "@/src/design-system/components/Badge";
import { Card } from "@/src/design-system/components/Card";
import { ProgressRing } from "@/src/design-system/components/ProgressRing";
import { RankBadge } from "@/src/design-system/components/RankBadge";
import { Screen } from "@/src/design-system/components/Screen";
import { SectionHeader } from "@/src/design-system/components/SectionHeader";
import { SegmentedControl } from "@/src/design-system/components/SegmentedControl";
import { StatNumber } from "@/src/design-system/components/StatNumber";
import { LineChart } from "@/src/design-system/charts/LineChart";
import { FrequencyBars } from "@/src/design-system/charts/FrequencyBars";
import { useExercise, usePersonalRecords, useToggleFavorite } from "@/src/features/exercises/hooks";
import { explainExerciseProgress, monthComparison } from "@/src/features/exercises/insights";
import { RANK_META, computeRank, isRankEligible } from "@/src/features/exercises/ranks";
import { bestSession, linearPrediction, oneRmSeries, repsSeries, totalTrainingMinutes, volumeSeries, weeklyFrequency, weightSeries } from "@/src/features/exercises/stats";
import { useProfile } from "@/src/features/profile/hooks";
import { useSetsForExercise } from "@/src/features/workouts/hooks";
import { formatDateLong, formatVolume, formatWeight } from "@/src/lib/format";
import type { PersonalRecord } from "@/src/types/models";

type MetricTab = "weight" | "volume" | "1rm" | "reps";

const PR_META: Record<PersonalRecord["type"], { label: string; unit: string; emoji: string }> = {
  weight: { label: "Peso máximo", unit: "kg", emoji: "🏋️" },
  "1rm": { label: "1RM estimado", unit: "kg", emoji: "🥇" },
  volume: { label: "Volumen (sesión)", unit: "kg", emoji: "📈" },
  reps: { label: "Repeticiones", unit: "reps", emoji: "🔁" },
};

export default function ExerciseProfileScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { data: exercise } = useExercise(exerciseId ?? null);
  const { data: sets = [] } = useSetsForExercise(exerciseId ?? null);
  const { data: profile } = useProfile();
  const { data: prs = [] } = usePersonalRecords(exerciseId ?? null);
  const toggleFavorite = useToggleFavorite();
  const [tab, setTab] = useState<MetricTab>("weight");

  const chartData = useMemo(() => {
    if (!exercise) return [];
    const bw = profile?.bodyweightKg ?? null;
    switch (tab) {
      case "weight":
        return weightSeries(sets);
      case "volume":
        return volumeSeries(sets, exercise, bw);
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
      const count = new Set(
        sets.filter((s) => new Date(s.completedAt) >= weekStart && new Date(s.completedAt) < weekEnd).map((s) => s.sessionId)
      ).size;
      weeks.push(count);
      labels.push(i === 0 ? "Hoy" : `-${i}s`);
    }
    return { weeks, labels };
  }, [sets]);

  if (!exercise) return <View className="flex-1 bg-bg" />;

  const best = bestSession(sets, exercise, profile?.bodyweightKg ?? null);
  const comparison = monthComparison(sets, exercise);
  const explanation = explainExerciseProgress(exercise, sets);

  return (
    <Screen contentClassName="pt-3 pb-32">
      <View className="flex-row items-center justify-between mb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
          <Feather name="chevron-left" size={18} color={colors.ink.dim} />
        </Pressable>
        <View className="flex-row gap-2">
          <Pressable onPress={() => toggleFavorite.mutate(exercise.id)} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
            <Feather name="star" size={16} color={exercise.isFavorite ? colors.record.DEFAULT : colors.ink.faint} />
          </Pressable>
          <Pressable onPress={() => router.push(`/exercise/${exercise.id}/edit`)} hitSlop={10} className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center">
            <Feather name="edit-2" size={15} color={colors.ink.dim} />
          </Pressable>
        </View>
      </View>

      <Text className="text-ink text-3xl font-display mt-3">{exercise.name}</Text>
      <View className="flex-row flex-wrap gap-1.5 mt-3 mb-6">
        {exercise.muscleGroups.map((m) => (
          <Badge key={m} label={m} tone="info" />
        ))}
      </View>

      {rank ? (
        <Card raised className="mb-6">
          <View className="flex-row items-center gap-4">
            <RankBadge tier={rank.tier} size="lg" showLabel={false} />
            <View className="flex-1">
              <Text className="text-ink text-xl font-display">
                {RANK_META[rank.tier].emoji} {RANK_META[rank.tier].label}
              </Text>
              <Text className="text-ink-dim text-xs font-body mt-0.5">Percentil {rank.percentile.toFixed(0)} · más fuerte que el {rank.percentile.toFixed(0)}% de usuarios similares</Text>
            </View>
            {rank.nextTier ? (
              <ProgressRing progress={rank.progressToNext} size={54} strokeWidth={5} color={colors.rank[rank.nextTier]}>
                <Text className="text-ink text-[10px] font-body-bold">{Math.round(rank.progressToNext * 100)}%</Text>
              </ProgressRing>
            ) : null}
          </View>
          {rank.nextTier && rank.amountToNextKg ? (
            <Text className="text-ink-dim text-xs font-body mt-3">
              Te faltan <Text className="text-ink font-body-bold">{formatWeight(rank.amountToNextKg)}kg</Text> de 1RM para llegar a{" "}
              {RANK_META[rank.nextTier].label} {RANK_META[rank.nextTier].emoji}
            </Text>
          ) : rank.tier === "elite" ? (
            <Text className="text-ink-dim text-xs font-body mt-3">Has alcanzado el rango máximo. 🚀</Text>
          ) : null}
        </Card>
      ) : null}

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "weight", label: "Peso" },
          { value: "volume", label: "Volumen" },
          { value: "1rm", label: "1RM" },
          { value: "reps", label: "Reps" },
        ]}
      />
      <Card raised className="mt-4 mb-6">
        <View className="flex-row items-baseline justify-between mb-2">
          <StatNumber
            value={chartData.length > 0 ? formatWeight(chartData[chartData.length - 1].value) : "—"}
            unit={tab === "reps" ? "reps" : "kg"}
            size="md"
            color={tab === "1rm" ? "text-record" : "text-ink"}
          />
          {prediction && (tab === "weight" || tab === "1rm") ? (
            <Text className="text-ink-faint text-xs font-body">
              proyección · {formatWeight(prediction)}kg
            </Text>
          ) : null}
        </View>
        <LineChart
          data={chartData.map((p) => ({ x: p.date, y: p.value }))}
          color={tab === "1rm" ? colors.record.DEFAULT : tab === "volume" ? colors.info.DEFAULT : colors.progress.DEFAULT}
          formatX={(x) => formatDateLong(x).split(" de ")[0]}
          predictedY={tab === "weight" || tab === "1rm" ? (prediction ?? undefined) : undefined}
        />
      </Card>

      <Card raised className="mb-6 bg-ai-bg border-ai/25">
        <View className="flex-row items-center gap-2 mb-2">
          <Feather name="cpu" size={14} color={colors.ai.DEFAULT} />
          <Text className="text-ai text-xs font-body-bold uppercase tracking-wider">Análisis de tu entrenador</Text>
        </View>
        <Text className="text-ink text-sm font-body leading-5">{explanation}</Text>
      </Card>

      <SectionHeader title="Frecuencia semanal" subtitle="Últimas 8 semanas" />
      <Card raised className="mb-6">
        <FrequencyBars weeks={weeklyBars.weeks} labels={weeklyBars.labels} />
      </Card>

      <View className="flex-row gap-3 mb-6">
        <Card className="flex-1" raised>
          <StatNumber value={weeklyFrequency(sets, 12)} size="sm" color="text-info" label="Sesiones / semana" />
        </Card>
        <Card className="flex-1" raised>
          <StatNumber value={Math.round(totalTrainingMinutes(sets) / 60)} unit="h" size="sm" color="text-ink" label="Tiempo total" />
        </Card>
      </View>

      {best ? (
        <Card raised className="mb-6">
          <Text className="text-ink-dim text-xs font-body-semibold uppercase tracking-wider mb-1">Mejor sesión histórica</Text>
          <Text className="text-ink text-xl font-display">{formatVolume(best.value)} de volumen</Text>
          <Text className="text-ink-faint text-xs font-body mt-1">{formatDateLong(best.date)}</Text>
        </Card>
      ) : null}

      {comparison.deltaPct !== null ? (
        <Card raised className="mb-6">
          <Text className="text-ink-dim text-xs font-body-semibold uppercase tracking-wider mb-1">Comparativa mensual</Text>
          <Text className={`text-xl font-display ${comparison.deltaPct >= 0 ? "text-progress" : "text-danger"}`}>
            {comparison.deltaPct >= 0 ? "+" : ""}
            {comparison.deltaPct.toFixed(0)}% vs. mes anterior
          </Text>
          <Text className="text-ink-faint text-xs font-body mt-1">
            {formatWeight(comparison.thisMonth)}kg de media este mes · {formatWeight(comparison.lastMonth)}kg el anterior
          </Text>
        </Card>
      ) : null}

      <SectionHeader title="Récords personales" />
      <View className="flex-row flex-wrap gap-3 mb-6">
        {(["weight", "1rm", "volume", "reps"] as const).map((type) => {
          const pr = prs.find((p) => p.type === type);
          const meta = PR_META[type];
          return (
            <Card key={type} raised className="flex-1 min-w-[45%]">
              <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
              <Text className="text-ink text-lg font-display mt-1.5">{pr ? `${formatWeight(pr.value)}` : "—"}<Text className="text-xs text-ink-dim"> {meta.unit}</Text></Text>
              <Text className="text-ink-faint text-[11px] font-body mt-0.5">{meta.label}</Text>
              {pr ? <Text className="text-ink-faint text-[10px] font-body mt-1">{formatDateLong(pr.achievedAt)}</Text> : null}
            </Card>
          );
        })}
      </View>

      {exercise.notes ? (
        <>
          <SectionHeader title="Notas técnicas" />
          <Card raised className="mb-6">
            <Text className="text-ink-dim text-sm font-body leading-5">{exercise.notes}</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
