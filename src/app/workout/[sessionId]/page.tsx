"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PRCelebration } from "@/design-system/components/PRCelebration";
import { RankUpCelebration } from "@/design-system/components/RankUpCelebration";
import { RestTimer } from "@/design-system/components/RestTimer";
import { Stepper } from "@/design-system/components/Stepper";
import { ExercisePickerDialog } from "@/features/exercises/ExercisePickerDialog";
import { useExercises } from "@/features/exercises/hooks";
import { computeRank, isRankEligible } from "@/features/exercises/ranks";
import { useProfile } from "@/features/profile/hooks";
import { useRoutine } from "@/features/routines/hooks";
import {
  useAddSet,
  useDeleteExerciseFromSession,
  useDeleteSession,
  useDeleteSet,
  useEndSession,
  useLastSetForExercise,
  useSession,
  useSessionSets,
} from "@/features/workouts/hooks";
import { primeAlerts } from "@/lib/alert";
import { cn } from "@/lib/cn";
import { formatDuration, formatWeight } from "@/lib/format";
import { useWorkoutSessionStore } from "@/state/workoutSession.store";
import type { Exercise, PersonalRecord, RankTier } from "@/types/models";

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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!startedAt) return "0:00";
  return formatDuration(Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)));
}

export default function ActiveWorkoutPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const { data: session } = useSession(sessionId ?? null);
  const { data: routine } = useRoutine(session?.routineId ?? null);
  const { data: allExercises = [] } = useExercises();
  const { data: sessionSets = [] } = useSessionSets(sessionId ?? null);
  const { data: profile } = useProfile();
  const addSet = useAddSet();
  const endSession = useEndSession();
  const deleteSession = useDeleteSession();
  const deleteSet = useDeleteSet();
  const deleteExercise = useDeleteExerciseFromSession();
  const startRest = useWorkoutSessionStore((s) => s.startRest);

  const [extra, setExtra] = useState<WorkoutExercise[]>([]);
  // Routine exercises the user dropped from *this* session only (the routine itself is untouched).
  const [hidden, setHidden] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [weightKg, setWeightKg] = useState(20);
  const [reps, setReps] = useState(8);
  const [rir, setRir] = useState<number | null>(2);
  const [rpe, setRpe] = useState<number | null>(8);
  const [celebrating, setCelebrating] = useState<PersonalRecord | null>(null);
  const [rankUp, setRankUp] = useState<RankTier | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const exerciseList = useMemo(
    () => [...routineExercises, ...extra].filter((e) => !hidden.includes(e.exerciseId)),
    [routineExercises, extra, hidden]
  );
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

  if (!session || !sessionId) return null;

  const addExerciseOnTheFly = (exercise: Exercise) => {
    const idx = exerciseList.findIndex((e) => e.exerciseId === exercise.id);
    if (idx >= 0) {
      setCurrentIndex(idx);
      return;
    }
    setExtra((e) => [...e, { exerciseId: exercise.id, name: exercise.name, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 }]);
    setCurrentIndex(exerciseList.length);
  };

  const logSet = async () => {
    if (!current) return;
    // Unlock audio here: iOS only allows sound from an AudioContext opened
    // inside a user gesture, and this tap is what schedules the rest alert.
    primeAlerts();
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

  const finish = async () => {
    if (!confirm("¿Terminar y guardar esta sesión?")) return;
    await endSession.mutateAsync({ id: sessionId, status: "completed" });
    router.replace("/dashboard");
  };

  const removeSet = async (setId: string) => {
    if (!confirm("¿Borrar esta serie? No contará en tus estadísticas.")) return;
    await deleteSet.mutateAsync(setId);
  };

  /** Drops the exercise from this session: deletes its logged sets and, when it
   *  was added on the fly, takes it out of the list too. */
  const removeCurrentExercise = async () => {
    if (!current) return;
    const logged = sessionSets.filter((s) => s.exerciseId === current.exerciseId).length;
    const msg = logged > 0
      ? `¿Quitar ${current.name} de este entrenamiento? Se borrarán sus ${logged} serie${logged !== 1 ? "s" : ""} registrada${logged !== 1 ? "s" : ""}.`
      : `¿Quitar ${current.name} de este entrenamiento?`;
    if (!confirm(msg)) return;
    if (logged > 0) await deleteExercise.mutateAsync({ sessionId, exerciseId: current.exerciseId });
    setExtra((list) => list.filter((e) => e.exerciseId !== current.exerciseId));
    setHidden((h) => [...h, current.exerciseId]);
    setCurrentIndex(0);
  };

  const cancel = async () => {
    if (!confirm("¿Cancelar este entrenamiento? Se borrará todo lo registrado en esta sesión y no contará en tu historial ni estadísticas.")) return;
    await deleteSession.mutateAsync(sessionId);
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-16">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-ink-dim text-xs font-medium">{session.routineName ?? "Sesión libre"}</p>
            <p className="text-ink text-xl font-display mt-0.5">{elapsed}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancel} className="px-3.5 py-2.5 text-danger/80 text-sm font-semibold">
              Cancelar
            </button>
            <button onClick={finish} className="px-4 py-2.5 rounded-full bg-surface-raised border border-line-subtle text-ink-dim text-sm font-semibold">
              Finalizar
            </button>
          </div>
        </div>

        <RestTimer />

        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-fade-x pb-5 pr-2">
          {exerciseList.map((ex, i) => {
            const count = sessionSets.filter((s) => s.exerciseId === ex.exerciseId).length;
            const done = count >= ex.targetSets;
            const active = i === currentIndex;
            return (
              <button
                key={ex.exerciseId}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "px-4 py-2.5 rounded-full border flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold",
                  active ? "bg-progress border-progress text-bg-deep" : done ? "bg-progress-bg border-progress/30 text-progress" : "bg-surface border-line-subtle text-ink-dim"
                )}
              >
                {done ? <Check size={12} /> : null}
                {ex.name}
              </button>
            );
          })}
          <button
            onClick={() => setPickerOpen(true)}
            className="px-4 py-2.5 rounded-full border border-dashed border-line flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-ink-dim"
          >
            <Plus size={13} />
            Añadir
          </button>
        </div>

        {!current ? (
          <div className="py-14 text-center flex flex-col items-center gap-4">
            <p className="text-ink text-lg font-display">Elige qué vas a entrenar</p>
            <p className="text-ink-dim text-sm max-w-xs leading-5">Añade los ejercicios que quieras hacer hoy. Puedes ir sumando más sobre la marcha.</p>
            <button onClick={() => setPickerOpen(true)} className="mt-1 bg-progress rounded-2xl px-6 py-3.5 text-bg-deep font-bold">
              Elegir ejercicio
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-ink text-2xl font-display">{current.name}</h1>
                <p className="text-ink-dim text-sm mt-1">
                  Serie {sessionSetsForCurrent.length + 1} · objetivo {current.targetSets} × {current.targetRepsMin}-{current.targetRepsMax}
                </p>
              </div>
              <button
                onClick={removeCurrentExercise}
                aria-label="Quitar ejercicio"
                className="w-10 h-10 rounded-full bg-surface border border-line-subtle flex items-center justify-center text-ink-faint shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {sessionSetsForCurrent.length > 0 ? (
              <div className="mb-5 flex flex-col gap-1.5">
                {sessionSetsForCurrent.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 bg-surface rounded-xl pl-4 pr-1.5 py-1.5">
                    <span className="text-ink-dim text-sm font-medium">Serie {s.setNumber}</span>
                    <span className="text-ink text-sm font-bold flex-1 text-right">
                      {formatWeight(s.weightKg)}kg × {s.reps}
                      {s.rir !== null ? <span className="text-ink-faint font-normal"> · RIR {s.rir}</span> : null}
                    </span>
                    <button
                      onClick={() => removeSet(s.id)}
                      aria-label={`Borrar serie ${s.setNumber}`}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-faint hover:text-danger shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="bg-surface-raised border border-line-subtle rounded-3xl p-5 mb-5">
              <div className="flex justify-around mb-5">
                <div className="flex flex-col items-center">
                  <Stepper label="PESO (KG)" value={weightKg} step={2.5} min={0} max={500} format={formatWeight} onChange={setWeightKg} />
                  {crossSessionLast ? <p className="text-ink-faint text-[11px] mt-1.5">Último: {formatWeight(crossSessionLast.weightKg)}kg</p> : null}
                </div>
                <Stepper label="REPS" value={reps} step={1} min={0} max={100} onChange={setReps} />
              </div>
              <div className="flex justify-around">
                <Stepper label="RIR" value={rir ?? 0} step={1} min={0} max={5} onChange={setRir} />
                <Stepper label="RPE" value={rpe ?? 0} step={0.5} min={0} max={10} onChange={setRpe} />
              </div>
            </div>

            <button onClick={logSet} disabled={addSet.isPending} className="w-full bg-progress rounded-2xl py-5 text-bg-deep text-lg font-bold">
              Registrar serie
            </button>
          </>
        )}
      </div>

      <PRCelebration record={celebrating} exerciseName={current?.name ?? ""} onDismiss={() => setCelebrating(null)} />
      <RankUpCelebration tier={rankUp} exerciseName={current?.name ?? ""} onDismiss={() => setRankUp(null)} />
      <ExercisePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addExerciseOnTheFly} />
    </div>
  );
}
