"use client";

import { ArrowRightCircle, ChevronRight, Cpu, Play, User, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { useRecentPRs } from "@/features/exercises/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { useProfile } from "@/features/profile/hooks";
import { useActiveSession, useCurrentStreak, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { formatRelativeTime, formatWeight } from "@/lib/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const PR_LABEL: Record<string, string> = { weight: "peso", "1rm": "1RM est.", volume: "volumen", reps: "reps" };

export default function DashboardPage() {
  const router = useRouter();
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
    const session = await startSession.mutateAsync({ routineId: suggestedRoutine?.id ?? null, routineName: suggestedRoutine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

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

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={streak} unit="días" size="md" color="text-progress" label="Racha actual" />
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
