import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Badge } from "@/src/design-system/components/Badge";
import { Card } from "@/src/design-system/components/Card";
import { EmptyState } from "@/src/design-system/components/EmptyState";
import { Screen } from "@/src/design-system/components/Screen";
import { SectionHeader } from "@/src/design-system/components/SectionHeader";
import { StatNumber } from "@/src/design-system/components/StatNumber";
import { colors } from "@/src/design-system/colors";
import { useRecentPRs } from "@/src/features/exercises/hooks";
import { useRoutines } from "@/src/features/routines/hooks";
import { useProfile } from "@/src/features/profile/hooks";
import { useActiveSession, useCurrentStreak, useRecentSessions, useStartSession } from "@/src/features/workouts/hooks";
import { formatRelativeTime, formatWeight } from "@/src/lib/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const PR_LABEL: Record<string, string> = { weight: "peso", "1rm": "1RM est.", volume: "volumen", reps: "reps" };

export default function HomeScreen() {
  const { data: profile } = useProfile();
  const { data: streak = 0 } = useCurrentStreak();
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: recentPRs = [] } = useRecentPRs(6);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  const suggestedRoutine = useMemo(() => {
    if (routines.length === 0) return null;
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((s) => s.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    return [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
  }, [routines, recentSessions]);

  const thisWeekCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return recentSessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo).length;
  }, [recentSessions]);

  const handleStart = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({
      routineId: suggestedRoutine?.id ?? null,
      routineName: suggestedRoutine?.name ?? null,
    });
    router.push(`/workout/${session.id}`);
  };

  const firstName = profile?.fullName?.split(" ")[0] ?? "";

  return (
    <Screen contentClassName="pt-3 pb-32">
      <View className="flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-ink-dim text-sm font-body">{greeting()}{firstName ? "," : ""}</Text>
          <Text className="text-ink text-2xl font-display mt-0.5">{firstName || "Veltra"}</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/profile")} className="w-11 h-11 rounded-full bg-surface-raised border border-line-subtle items-center justify-center">
          <Feather name="user" size={18} color={colors.ink.dim} />
        </Pressable>
      </View>

      {activeSession ? (
        <Card onPress={() => router.push(`/workout/${activeSession.id}`)} className="mb-4 border-progress/40 bg-progress-bg" raised>
          <View className="flex-row items-center justify-between">
            <View>
              <Badge label="Entrenamiento en curso" tone="progress" />
              <Text className="text-ink text-lg font-display mt-2">{activeSession.routineName ?? "Sesión libre"}</Text>
              <Text className="text-ink-dim text-sm font-body mt-0.5">Toca para continuar</Text>
            </View>
            <Feather name="arrow-right-circle" size={30} color={colors.progress.DEFAULT} />
          </View>
        </Card>
      ) : (
        <Card onPress={handleStart} raised className="mb-4">
          <Text className="text-ink-dim text-xs font-body-semibold uppercase tracking-wider">{suggestedRoutine ? "Hoy toca" : "Empezar"}</Text>
          <Text className="text-ink text-2xl font-display mt-1.5">{suggestedRoutine?.name ?? "Crea tu primera rutina"}</Text>
          <Text className="text-ink-dim text-sm font-body mt-1">
            {suggestedRoutine ? `${suggestedRoutine.exercises.length} ejercicios` : "Empieza por definir tu rutina o explora la biblioteca"}
          </Text>
          <View className="flex-row items-center gap-2 mt-4 bg-progress self-start px-5 py-2.5 rounded-full">
            <Feather name="play" size={14} color={colors.bg.deep} />
            <Text className="text-bg-deep font-body-bold text-sm">{suggestedRoutine ? "Empezar entrenamiento" : "Crear rutina"}</Text>
          </View>
        </Card>
      )}

      <View className="flex-row gap-3 mb-6">
        <Card className="flex-1" raised>
          <StatNumber value={streak} unit="días" size="md" color="text-progress" label="Racha actual" />
        </Card>
        <Card className="flex-1" raised>
          <StatNumber value={thisWeekCount} unit="/ sem" size="md" color="text-info" label="Sesiones esta semana" />
        </Card>
      </View>

      <SectionHeader title="Récords recientes" action={recentPRs.length > 0 ? "Ver todo" : undefined} onActionPress={() => router.push("/(tabs)/routines")} />
      {recentPRs.length === 0 ? (
        <Card className="mb-6">
          <EmptyState title="Todavía no hay récords" description="Registra tu primera serie y Veltra empezará a rastrear tus PRs automáticamente." />
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2 mb-6">
          {recentPRs.map((pr) => (
            <Card key={pr.id} raised className="w-44">
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text className="text-ink text-xl font-display mt-2">
                {formatWeight(pr.value)}
                <Text className="text-sm text-ink-dim"> {pr.type === "reps" ? "reps" : "kg"}</Text>
              </Text>
              <Text className="text-ink-dim text-xs font-body mt-0.5" numberOfLines={1}>
                {pr.exerciseName} · {PR_LABEL[pr.type]}
              </Text>
              <Text className="text-ink-faint text-[11px] font-body mt-1.5">{formatRelativeTime(pr.achievedAt)}</Text>
            </Card>
          ))}
        </ScrollView>
      )}

      <SectionHeader title="Entrenador IA" subtitle="Pregunta lo que quieras sobre tu progreso" />
      <Card onPress={() => router.push("/(tabs)/coach")} raised className="bg-ai-bg border-ai/30">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-full bg-ai/20 items-center justify-center">
            <Feather name="cpu" size={20} color={colors.ai.DEFAULT} />
          </View>
          <View className="flex-1">
            <Text className="text-ink font-body-semibold">¿Qué peso debería usar hoy?</Text>
            <Text className="text-ink-dim text-xs font-body mt-0.5">Toca para hablar con tu entrenador</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.ink.faint} />
        </View>
      </Card>
    </Screen>
  );
}
