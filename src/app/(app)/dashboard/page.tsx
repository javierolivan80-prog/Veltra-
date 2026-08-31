"use client";

import { ArrowRightCircle, Check, ChevronRight, Cpu, Dumbbell, History, Moon, Play, ShieldAlert, SkipForward, User, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { useAddictions, useAllRelapses } from "@/features/addictions/hooks";
import { currentStreakStartMs } from "@/features/addictions/stats";
import { computeCombinedStreak } from "@/features/dashboard/combinedStreak";
import { useRecentPRs } from "@/features/exercises/hooks";
import { useAllHabitLogs, useHabits, useLogHabit, useTodayHabitLogs } from "@/features/habits/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { useProfile } from "@/features/profile/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogByDate, useSleepLogs } from "@/features/sleep/hooks";
import { useActiveSession, useCurrentStreak, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { formatHoursMinutes } from "@/lib/duration";
import { todayKey } from "@/lib/date";
import { formatRelativeTime, formatWeight } from "@/lib/format";
import type { Habit, HabitLogStatus } from "@/types/models";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const MOTIVATIONAL_QUOTES = [
  "La disciplina es elegir entre lo que quieres ahora y lo que quieres más.",
  "Un pequeño progreso cada día suma un gran resultado.",
  "No cuentan los días, cuenta lo que haces con ellos.",
  "El cuerpo logra lo que la mente cree.",
  "Consistencia, no perfección.",
  "Hoy es una nueva oportunidad para ser un poco mejor.",
  "El descanso también es parte del entrenamiento.",
];

function motivationalQuote(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

const PR_LABEL: Record<string, string> = { weight: "peso", "1rm": "1RM est.", volume: "volumen", reps: "reps" };

function isDue(habit: Habit): boolean {
  if (!habit.notificationTime) return true;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return nowHHMM >= habit.notificationTime;
}

export default function DashboardPage() {
  const router = useRouter();
  const today = todayKey();
  const { data: profile } = useProfile();
  const { data: streak = 0 } = useCurrentStreak();
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: recentPRs = [] } = useRecentPRs(6);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  const { data: lastNight } = useSleepLogByDate(today);
  const { data: allSleepLogs = [] } = useSleepLogs();
  const { data: habits = [] } = useHabits();
  const { data: todayHabitLogs = [] } = useTodayHabitLogs();
  const { data: allHabitLogs = [] } = useAllHabitLogs();
  const { data: addictions = [] } = useAddictions();
  const { data: allRelapses = [] } = useAllRelapses();
  const logHabit = useLogHabit();

  const answeredIds = useMemo(() => new Set(todayHabitLogs.map((l) => l.habitId)), [todayHabitLogs]);
  const pendingHabits = useMemo(() => habits.filter((h) => isDue(h) && !answeredIds.has(h.id)), [habits, answeredIds]);

  const generalStreak = useMemo(
    () => computeCombinedStreak(allHabitLogs, allSleepLogs, allRelapses),
    [allHabitLogs, allSleepLogs, allRelapses]
  );

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
    const session = await startSession.mutateAsync({ routineId: suggestedRoutine?.id ?? null, routineName: suggestedRoutine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

  /** Free session: no routine, the user picks each exercise as they go. */
  const handleStartFree = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({ routineId: null, routineName: null });
    router.push(`/workout/${session.id}`);
  };

  const respondHabit = (habitId: string, status: HabitLogStatus) => logHabit.mutate({ habitId, date: today, status });

  const firstName = profile?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink-dim text-sm">
            {greeting()}
            {firstName ? "," : ""}
          </p>
          <h1 className="text-ink text-2xl font-display mt-0.5">{firstName || "Veltra"}</h1>
        </div>
        <Link href="/profile" className="w-11 h-11 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center">
          <User size={18} className="text-ink-dim" />
        </Link>
      </div>

      <p className="text-ink-dim text-sm italic leading-5 -mt-3">&ldquo;{motivationalQuote()}&rdquo;</p>

      {generalStreak > 0 ? (
        <Card raised className="bg-record-bg border-record/30">
          <StatNumber value={generalStreak} unit="días" size="md" color="text-record" label="Racha general — hábitos, sueño y sin caídas" />
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/sleep" className="block">
          <Card raised className="h-full">
            <div className="flex items-center gap-2 mb-1.5">
              <Moon size={14} className="text-sleep" />
              <p className="text-ink-dim text-xs font-semibold">Anoche</p>
            </div>
            <p className="text-ink text-xl font-display">{lastNight ? formatHoursMinutes(sleptMinutes(lastNight)) : "—"}</p>
            <p className="text-ink-faint text-xs mt-0.5">{lastNight?.quality ? `Calidad ${lastNight.quality}/10` : "Sin registrar"}</p>
          </Card>
        </Link>
        <Link href="/habits" className="block">
          <Card raised className="h-full">
            <p className="text-ink-dim text-xs font-semibold mb-1.5">Hábitos hoy</p>
            <p className="text-ink text-xl font-display">
              {todayHabitLogs.filter((l) => l.status === "done").length}/{habits.length}
            </p>
            <p className="text-ink-faint text-xs mt-0.5">{pendingHabits.length > 0 ? `${pendingHabits.length} pendientes` : "Al día"}</p>
          </Card>
        </Link>
      </div>

      {pendingHabits.length > 0 ? (
        <div className="flex flex-col gap-2">
          {pendingHabits.map((habit) => (
            <Card key={habit.id} raised className="bg-progress-bg border-progress/30">
              <p className="text-ink font-semibold text-sm">¿Hiciste &ldquo;{habit.name}&rdquo; hoy?</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => respondHabit(habit.id, "done")} className="flex-1 flex items-center justify-center gap-1.5 bg-progress rounded-xl py-2 text-bg-deep text-xs font-bold">
                  <Check size={13} /> Sí
                </button>
                <button onClick={() => respondHabit(habit.id, "not_done")} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-raised border border-line-subtle rounded-xl py-2 text-ink text-xs font-bold">
                  <X size={13} /> No
                </button>
                <button onClick={() => respondHabit(habit.id, "skipped")} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-raised border border-line-subtle rounded-xl py-2 text-ink-dim text-xs font-bold">
                  <SkipForward size={13} /> Saltar
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {addictions.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-fade-x pb-1 pr-2">
          {addictions.map((addiction) => {
            const relapses = allRelapses.filter((r) => r.addictionId === addiction.id);
            const days = Math.floor((Date.now() - currentStreakStartMs(addiction, relapses)) / 86400000);
            return (
              <Link key={addiction.id} href={`/addictions/${addiction.id}`} className="shrink-0">
                <Card raised className="w-40 bg-addiction-bg border-addiction/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert size={13} className="text-addiction" />
                    <p className="text-ink-dim text-xs font-semibold truncate">{addiction.name}</p>
                  </div>
                  <p className="text-ink text-xl font-display">{days}</p>
                  <p className="text-ink-faint text-xs mt-0.5">días sin caer</p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}

      {activeSession ? (
        <Card onClick={() => router.push(`/workout/${activeSession.id}`)} raised className="border-progress/40 bg-progress-bg">
          <div className="flex items-center justify-between">
            <div>
              <Badge label="Entrenamiento en curso" tone="progress" />
              <p className="text-ink text-lg font-display mt-2">{activeSession.routineName ?? "Sesión libre"}</p>
              <p className="text-ink-dim text-sm mt-0.5">Toca para continuar</p>
            </div>
            <ArrowRightCircle size={30} className="text-progress" />
          </div>
        </Card>
      ) : (
        <Card onClick={handleStart} raised>
          <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">{suggestedRoutine ? "Hoy toca" : "Empezar"}</p>
          <p className="text-ink text-2xl font-display mt-1.5">{suggestedRoutine?.name ?? "Crea tu primera rutina"}</p>
          <p className="text-ink-dim text-sm mt-1">
            {suggestedRoutine ? `${suggestedRoutine.exercises.length} ejercicios` : "Empieza por definir tu rutina o explora la biblioteca"}
          </p>
          <div className="flex items-center gap-2 mt-4 bg-progress w-fit px-5 py-2.5 rounded-full">
            <Play size={14} className="text-bg-deep" fill="currentColor" />
            <span className="text-bg-deep font-bold text-sm">{suggestedRoutine ? "Empezar entrenamiento" : "Crear rutina"}</span>
          </div>
        </Card>
      )}

      {!activeSession ? (
        <button onClick={handleStartFree} className="-mt-2 flex items-center justify-center gap-2 py-2 text-ink-dim text-sm font-semibold hover:text-ink">
          <Dumbbell size={15} />
          Entrenamiento libre — elijo yo los ejercicios
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={streak} unit="días" size="md" color="text-progress" label="Racha de entreno" />
        </Card>
        <Card raised>
          <StatNumber value={thisWeekCount} unit="/ sem" size="md" color="text-info" label="Sesiones esta semana" />
        </Card>
      </div>

      <div>
        <SectionHeader title="Récords recientes" action={recentPRs.length > 0 ? "Ver progreso" : undefined} onAction={() => router.push("/progress")} />
        {recentPRs.length === 0 ? (
          <Card raised>
            <EmptyState title="Todavía no hay récords" description="Registra tu primera serie y Veltra empezará a rastrear tus PRs automáticamente." />
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-fade-x pb-1 pr-2">
            {recentPRs.map((pr) => (
              <Card key={pr.id} raised className="w-44 shrink-0">
                <span className="text-2xl">🏆</span>
                <p className="text-ink text-xl font-display mt-2">
                  {formatWeight(pr.value)}
                  <span className="text-sm text-ink-dim"> {pr.type === "reps" ? "reps" : "kg"}</span>
                </p>
                <p className="text-ink-dim text-xs mt-0.5 truncate">
                  {pr.exerciseName} · {PR_LABEL[pr.type]}
                </p>
                <p className="text-ink-faint text-[11px] mt-1.5">{formatRelativeTime(pr.achievedAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="Entrenador IA" subtitle="Pregunta lo que quieras sobre tu progreso" />
        <Card onClick={() => router.push("/coach")} raised className="bg-ai-bg border-ai/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-ai/20 flex items-center justify-center shrink-0">
              <Cpu size={20} className="text-ai" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink font-semibold">¿Qué peso debería usar hoy?</p>
              <p className="text-ink-dim text-xs mt-0.5">Toca para hablar con tu entrenador</p>
            </div>
            <ChevronRight size={18} className="text-ink-faint shrink-0" />
          </div>
        </Card>
      </div>

      <Link
        href="/history"
        className="flex items-center justify-between rounded-2xl border border-line-subtle bg-surface-raised px-5 py-4 hover:border-line transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0">
            <History size={17} className="text-ink-dim" />
          </span>
          <div>
            <p className="text-ink text-sm font-semibold">Historial de entrenamientos</p>
            <p className="text-ink-dim text-xs mt-0.5">Revisa qué hiciste cualquier día</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-faint shrink-0" />
      </Link>

      <div>
        <SectionHeader title="Veltra Food" subtitle="Registra tu comida tan fácil como un mensaje" />
        <Card onClick={() => router.push("/food")} raised className="bg-progress-bg border-progress/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-progress/20 flex items-center justify-center shrink-0">
              <UtensilsCrossed size={20} className="text-progress" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink font-semibold">¿Qué has comido hoy?</p>
              <p className="text-ink-dim text-xs mt-0.5">Escríbelo o haz una foto y la IA calcula tus macros</p>
            </div>
            <ChevronRight size={18} className="text-ink-faint shrink-0" />
          </div>
        </Card>
      </div>
    </div>
  );
}
