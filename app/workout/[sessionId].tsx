import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "@/src/design-system/colors";
import { PRCelebration } from "@/src/design-system/components/PRCelebration";
import { RankUpCelebration } from "@/src/design-system/components/RankUpCelebration";
import { RestTimer } from "@/src/design-system/components/RestTimer";
import { Screen } from "@/src/design-system/components/Screen";
import { Stepper } from "@/src/design-system/components/Stepper";
import { useExercises } from "@/src/features/exercises/hooks";
import { computeRank, isRankEligible } from "@/src/features/exercises/ranks";
import { useProfile } from "@/src/features/profile/hooks";
import { useRoutine } from "@/src/features/routines/hooks";
import { useAddSet, useEndSession, useLastSetForExercise, useSession, useSessionSets } from "@/src/features/workouts/hooks";
import { formatDuration, formatWeight } from "@/src/lib/format";
import { useWorkoutSessionStore } from "@/src/state/workoutSession.store";
import { useExercisePickerStore } from "@/src/state/exercisePicker.store";
import type { Exercise, PersonalRecord, RankTier } from "@/src/types/models";

interface WorkoutExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
}

const PR_PRIORITY: PersonalRecord["type"][] = ["1rm", "weight", "volume", "reps"];

function useElapsed(startedAt?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!startedAt) return "0:00";
  return formatDuration(Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)));
}

export default function ActiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { data: session } = useSession(sessionId ?? null);
  const { data: routine } = useRoutine(session?.routineId ?? null);
  const { data: allExercises = [] } = useExercises();
  const { data: sessionSets = [] } = useSessionSets(sessionId ?? null);
  const { data: profile } = useProfile();
  const addSet = useAddSet();
  const endSession = useEndSession();
  const startRest = useWorkoutSessionStore((s) => s.startRest);

  const [extra, setExtra] = useState<WorkoutExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [weightKg, setWeightKg] = useState(20);
  const [reps, setReps] = useState(8);
  const [rir, setRir] = useState<number | null>(2);
  const [rpe, setRpe] = useState<number | null>(8);
  const [celebrating, setCelebrating] = useState<PersonalRecord | null>(null);
  const [rankUp, setRankUp] = useState<RankTier | null>(null);

  const routineExercises: WorkoutExercise[] = useMemo(
    () =>
      (routine?.exercises ?? []).map((re) => ({
        exerciseId: re.exerciseId,
        name: allExercises.find((e) => e.id === re.exerciseId)?.name ?? "Ejercicio",
        targetSets: re.targetSets,
        targetRepsMin: re.targetRepsMin,
        targetRepsMax: re.targetRepsMax,
        restSeconds: re.restSeconds,
      })),
    [routine, allExercises]
  );

  const exerciseList = useMemo(() => [...routineExercises, ...extra], [routineExercises, extra]);
  const current = exerciseList[currentIndex] ?? null;

  const sessionSetsForCurrent = useMemo(
    () => sessionSets.filter((s) => s.exerciseId === current?.exerciseId).sort((a, b) => a.setNumber - b.setNumber),
    [sessionSets, current?.exerciseId]
  );

  const { data: crossSessionLast } = useLastSetForExercise(current?.exerciseId ?? null, sessionId);

  useEffect(() => {
    const source = sessionSetsForCurrent.length > 0 ? sessionSetsForCurrent[sessionSetsForCurrent.length - 1] : crossSessionLast;
    if (source) {
      setWeightKg(source.weightKg);
      setReps(source.reps);
      setRir(source.rir);
      setRpe(source.rpe);
    } else if (current) {
      setWeightKg(20);
      setReps(current.targetRepsMin);
      setRir(2);
      setRpe(8);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.exerciseId, sessionSetsForCurrent.length, crossSessionLast?.id]);

  const elapsed = useElapsed(session?.startedAt);

  if (!session || !sessionId) return <View className="flex-1 bg-bg" />;

  const addExerciseOnTheFly = async () => {
    const exercise = await new Promise<Exercise | null>((resolve) => {
      useExercisePickerStore.getState().setResolver(resolve);
      router.push("/exercise/picker");
    });
    if (!exercise) return;
    if (exerciseList.some((e) => e.exerciseId === exercise.id)) {
      setCurrentIndex(exerciseList.findIndex((e) => e.exerciseId === exercise.id));
      return;
    }
    setExtra((e) => [...e, { exerciseId: exercise.id, name: exercise.name, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 }]);
    setCurrentIndex(exerciseList.length);
  };

  const logSet = async () => {
    if (!current) return;
    const result = await addSet.mutateAsync({ sessionId, exerciseId: current.exerciseId, weightKg, reps, rir, rpe });
    startRest(current.restSeconds);

    const oneRmPr = result.prsBroken.find((p) => p.type === "1rm");
    const exerciseFull = allExercises.find((e) => e.id === current.exerciseId);
    if (oneRmPr && exerciseFull && profile?.bodyweightKg && isRankEligible(exerciseFull)) {
      const rankInput = { exercise: exerciseFull, bodyweightKg: profile.bodyweightKg, sex: profile.sex, birthDate: profile.birthDate, experienceLevel: profile.experienceLevel };
      const newRank = computeRank({ ...rankInput, oneRmKg: oneRmPr.value });
      const oldRank = oneRmPr.previousValue ? computeRank({ ...rankInput, oneRmKg: oneRmPr.previousValue }) : null;
      if (newRank && newRank.tier !== (oldRank?.tier ?? null)) {
        setRankUp(newRank.tier);
        return;
      }
    }

    const best = PR_PRIORITY.map((t) => result.prsBroken.find((p) => p.type === t)).find(Boolean);
    if (best) setCelebrating(best);
  };

  const finish = () => {
    Alert.alert("Finalizar entrenamiento", "¿Terminar y guardar esta sesión?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: async () => {
          await endSession.mutateAsync({ id: sessionId, status: "completed" });
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen contentClassName="pt-3 pb-12" edges={["top"]}>
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-ink-dim text-xs font-body-medium">{session.routineName ?? "Sesión libre"}</Text>
          <Text className="text-ink text-xl font-display mt-0.5">{elapsed}</Text>
        </View>
        <Pressable onPress={finish} className="px-4 py-2.5 rounded-full bg-surface-raised border border-line-subtle">
          <Text className="text-ink-dim text-sm font-body-semibold">Finalizar</Text>
        </Pressable>
      </View>

      <RestTimer />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-5">
        {exerciseList.map((ex, i) => {
          const count = sessionSets.filter((s) => s.exerciseId === ex.exerciseId).length;
          const done = count >= ex.targetSets;
          const active = i === currentIndex;
          return (
            <Pressable
              key={ex.exerciseId}
              onPress={() => setCurrentIndex(i)}
              className={`px-4 py-2.5 rounded-full border flex-row items-center gap-1.5 ${active ? "bg-progress border-progress" : done ? "bg-progress-bg border-progress/30" : "bg-surface border-line-subtle"}`}
            >
              {done ? <Feather name="check" size={12} color={active ? colors.bg.deep : colors.progress.DEFAULT} /> : null}
              <Text className={`text-sm font-body-semibold ${active ? "text-bg-deep" : done ? "text-progress" : "text-ink-dim"}`}>{ex.name}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={addExerciseOnTheFly} className="px-4 py-2.5 rounded-full border border-dashed border-line flex-row items-center gap-1.5">
          <Feather name="plus" size={13} color={colors.ink.dim} />
          <Text className="text-ink-dim text-sm font-body-semibold">Añadir</Text>
        </Pressable>
      </ScrollView>

      {!current ? (
        <View className="items-center py-16">
          <Text className="text-ink-dim text-center font-body">Añade un ejercicio para empezar a registrar series.</Text>
        </View>
      ) : (
        <>
          <View className="mb-5">
            <Text className="text-ink text-2xl font-display">{current.name}</Text>
            <Text className="text-ink-dim text-sm font-body mt-1">
              Serie {sessionSetsForCurrent.length + 1} · objetivo {current.targetSets} × {current.targetRepsMin}-{current.targetRepsMax}
            </Text>
          </View>

          {sessionSetsForCurrent.length > 0 ? (
            <View className="mb-5 gap-1.5">
              {sessionSetsForCurrent.map((s) => (
                <View key={s.id} className="flex-row items-center justify-between bg-surface rounded-xl px-4 py-2.5">
                  <Text className="text-ink-dim text-sm font-body-medium">Serie {s.setNumber}</Text>
                  <Text className="text-ink text-sm font-body-bold">
                    {formatWeight(s.weightKg)}kg × {s.reps}
                    {s.rir !== null ? <Text className="text-ink-faint font-body"> · RIR {s.rir}</Text> : null}
                  </Text>
                  <Feather name="check-circle" size={16} color={colors.progress.DEFAULT} />
                </View>
              ))}
            </View>
          ) : null}

          <View className="bg-surface-raised border border-line-subtle rounded-3xl p-5 mb-5">
            <View className="flex-row justify-around mb-5">
              <Stepper label="PESO (KG)" value={weightKg} step={2.5} min={0} max={500} format={formatWeight} onChange={setWeightKg} />
              <Stepper label="REPS" value={reps} step={1} min={0} max={100} onChange={setReps} />
            </View>
            <View className="flex-row justify-around">
              <Stepper label="RIR" value={rir ?? 0} step={1} min={0} max={5} onChange={setRir} />
              <Stepper label="RPE" value={rpe ?? 0} step={0.5} min={0} max={10} onChange={setRpe} />
            </View>
          </View>

          <Pressable onPress={logSet} disabled={addSet.isPending} className="bg-progress rounded-2xl py-5 items-center">
            <Text className="text-bg-deep text-lg font-body-bold">Registrar serie</Text>
          </Pressable>
        </>
      )}
      </Screen>

      <PRCelebration record={celebrating} exerciseName={current?.name ?? ""} onDismiss={() => setCelebrating(null)} />
      <RankUpCelebration tier={rankUp} exerciseName={current?.name ?? ""} onDismiss={() => setRankUp(null)} />
    </View>
  );
}
