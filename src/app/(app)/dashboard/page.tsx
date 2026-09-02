"use client";

import { Book, Brain, Check, Dumbbell, Moon, Play, Target, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { commitmentsForDay } from "@/features/contract/arc";
import { KIND_HREF, SLOT_LABEL, SLOT_ORDER } from "@/features/contract/catalogue";
import { useActiveContract, useCommitments } from "@/features/contract/hooks";
import { useFocusSessions } from "@/features/focus/hooks";
import { useDailyNutrition } from "@/features/food/hooks";
import { useJournalEntryByDate } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { useRoutines } from "@/features/routines/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogByDate } from "@/features/sleep/hooks";
import { useActiveSession, useRecentSessions, useStartSession } from "@/features/workouts/hooks";
import { cn } from "@/lib/cn";
import { todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";
import type { CommitmentKind } from "@/types/models";

function timeLabelOf(iso: string): { label: string; minutes: number } {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return { label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, minutes: h * 60 + m };
}

const KIND_ICON: Record<CommitmentKind, LucideIcon> = {
  workout: Dumbbell,
  sleep: Moon,
  nutrition: UtensilsCrossed,
  meditation: Brain,
  journaling: Book,
  focus: Target,
  habit: Check,
};

const KIND_COLOR: Record<CommitmentKind, string> = {
  workout: "text-progress",
  sleep: "text-sleep",
  nutrition: "text-progress",
  meditation: "text-ai",
  journaling: "text-ai",
  focus: "text-ai",
  habit: "text-progress",
};

/** Un alto en "Tu día": hecho, en marcha, o todavía por delante. El plan lo
 *  dictan los compromisos del contrato — no hay bloques que la app se invente
 *  por su cuenta. */
interface DayItem {
  id: string;
  order: number;
  timeLabel: string;
  kicker: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  colorClass: string;
  state: "done" | "now" | "pending";
  href?: string;
  cta?: { label: string; onClick: () => void };
}

export default function DashboardPage() {
  const router = useRouter();
  const today = todayKey();
  const { data: contract } = useActiveContract();
  const { data: commitments = [] } = useCommitments(contract?.id ?? null);
  const { data: routines = [] } = useRoutines();
  const { data: recentSessions = [] } = useRecentSessions(10);
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  const { data: lastNight } = useSleepLogByDate(today);
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: todayJournal } = useJournalEntryByDate(today);
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: nutrition } = useDailyNutrition(today);

  const suggestedRoutine = useMemo(() => {
    if (routines.length === 0) return null;
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((s) => s.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    return [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
  }, [routines, recentSessions]);

  const completedSessionToday = useMemo(
    () => recentSessions.find((s) => s.status === "completed" && s.startedAt.slice(0, 10) === today) ?? null,
    [recentSessions, today]
  );
  const meditatedToday = useMemo(() => meditationSessions.find((s) => s.completedAt.slice(0, 10) === today) ?? null, [meditationSessions, today]);
  const focusedToday = useMemo(() => focusSessions.find((s) => s.completedAt.slice(0, 10) === today) ?? null, [focusSessions, today]);
  const ateToday = (nutrition?.mealCount ?? 0) > 0;

  const todaysCommitments = useMemo(() => commitmentsForDay(commitments, today), [commitments, today]);

  const handleStart = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const session = await startSession.mutateAsync({ routineId: suggestedRoutine?.id ?? null, routineName: suggestedRoutine?.name ?? null });
    router.push(`/workout/${session.id}`);
  };

  /** Cada compromiso resuelto contra lo que el usuario ya ha registrado hoy. */
  const items: DayItem[] = useMemo(() => {
    return todaysCommitments.map((c, i): DayItem => {
      const base = {
        id: c.id,
        order: SLOT_ORDER[c.timeSlot] * 100 + i,
        timeLabel: SLOT_LABEL[c.timeSlot],
        kicker: "Compromiso",
        title: c.title,
        icon: KIND_ICON[c.kind],
        colorClass: KIND_COLOR[c.kind],
        href: KIND_HREF[c.kind],
      };

      switch (c.kind) {
        case "workout": {
          if (activeSession) {
            const { label } = timeLabelOf(activeSession.startedAt);
            return {
              ...base,
              timeLabel: label,
              kicker: "Ahora",
              title: activeSession.routineName ?? c.title,
              meta: "En marcha",
              state: "now",
              href: undefined,
              cta: { label: "Continuar entrenamiento", onClick: () => router.push(`/workout/${activeSession.id}`) },
            };
          }
          if (completedSessionToday) {
            const { label } = timeLabelOf(completedSessionToday.startedAt);
            return { ...base, timeLabel: label, meta: completedSessionToday.routineName ?? "Completado", state: "done", href: undefined };
          }
          return {
            ...base,
            meta: suggestedRoutine ? `${suggestedRoutine.name} · ${suggestedRoutine.exercises.length} ejercicios` : "Elige tu rutina",
            state: "pending",
            href: undefined,
            cta: { label: "Empezar entrenamiento", onClick: handleStart },
          };
        }
        case "sleep":
          return lastNight
            ? { ...base, timeLabel: lastNight.riseTime, meta: formatHoursMinutes(sleptMinutes(lastNight)), state: "done", href: undefined }
            : { ...base, meta: "Sin registrar", state: "pending" };
        case "nutrition":
          return ateToday
            ? { ...base, meta: `${Math.round(nutrition?.calories ?? 0)} kcal registradas`, state: "done", href: undefined }
            : { ...base, meta: "Sin registrar", state: "pending" };
        case "meditation":
          return meditatedToday
            ? { ...base, timeLabel: timeLabelOf(meditatedToday.completedAt).label, meta: `${meditatedToday.durationMinutes} min`, state: "done", href: undefined }
            : { ...base, meta: "Sin registrar", state: "pending" };
        case "journaling":
          return todayJournal
            ? { ...base, timeLabel: timeLabelOf(todayJournal.createdAt).label, meta: "Entrada de hoy", state: "done", href: undefined }
            : { ...base, meta: "Sin escribir", state: "pending" };
        case "focus":
          return focusedToday
            ? { ...base, timeLabel: timeLabelOf(focusedToday.completedAt).label, meta: `${focusedToday.durationMinutes} min`, state: "done", href: undefined }
            : { ...base, meta: "Sin empezar", state: "pending" };
        default:
          // Los hábitos propios se marcan en su módulo: aquí solo se recuerda
          // que tocan hoy.
          return { ...base, meta: "Márcalo en Hábitos", state: "pending" };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysCommitments, activeSession, completedSessionToday, suggestedRoutine, lastNight, ateToday, nutrition, meditatedToday, todayJournal, focusedToday, router]);

  const sorted = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items]);
  const doneCount = items.filter((i) => i.state === "done").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-end justify-between mb-2">
          <h1 className="text-ink font-display font-semibold text-[26px] leading-tight tracking-tight">Tu día</h1>
          <span className="text-ink-faint text-xs font-semibold">
            {doneCount} de {items.length}
          </span>
        </div>
        <div className="h-[2px] bg-[#1B1B1E]">
          <div
            className="h-[2px] bg-progress transition-all"
            style={{ width: `${items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100)}%` }}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-ink-dim text-sm">Hoy no toca ninguno de tus compromisos. Descansar también es parte del plan.</p>
      ) : (
        <div className="relative pl-6">
          <span className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-transparent via-line to-transparent" />
          <div className="flex flex-col gap-5">
            {sorted.map((it) => {
              const Icon = it.icon;
              const card = (
                <div
                  className={cn(
                    "rounded-[14px] p-4",
                    it.state === "now" ? "border border-progress/25 bg-gradient-to-b from-[#121614] to-[#0E0F0E]" : "border border-line-subtle bg-[#0E0E0E]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={it.state === "now" ? 20 : 16} className={cn(it.colorClass, "shrink-0")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-display font-semibold truncate", it.state === "now" ? "text-ink text-[20px]" : "text-ink text-[15px]")}>{it.title}</p>
                      <p className="text-ink-faint text-xs mt-0.5 truncate">{it.meta}</p>
                    </div>
                    {it.state === "done" ? (
                      <span className="w-7 h-7 rounded-lg bg-progress/15 border border-progress/30 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-progress" />
                      </span>
                    ) : null}
                  </div>
                  {it.cta ? (
                    <button
                      onClick={it.cta.onClick}
                      className="w-full flex items-center justify-center gap-2 mt-3.5 border border-progress text-progress font-semibold text-sm py-3 rounded-xl hover:bg-progress/10 transition-colors"
                    >
                      <Play size={13} fill="currentColor" />
                      {it.cta.label}
                    </button>
                  ) : null}
                </div>
              );

              return (
                <div key={it.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border",
                      it.state === "now"
                        ? "bg-progress border-progress shadow-[0_0_0_4px_rgba(44,230,160,.14)]"
                        : it.state === "done"
                          ? "bg-progress/70 border-progress/70"
                          : "bg-bg border-line"
                    )}
                  />
                  <div className="flex items-baseline gap-2">
                    <span className={cn("font-display text-[13px] font-semibold tracking-wide", it.state === "now" ? "text-progress" : "text-ink-faint")}>
                      {it.timeLabel}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-[.14em]", it.state === "now" ? "text-progress" : "text-line")}>{it.kicker}</span>
                  </div>
                  <div className="mt-2.5">{it.href ? <Link href={it.href}>{card}</Link> : card}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
