"use client";

import { AlertTriangle, Book, Brain, Check, Cross, Dumbbell, Lightbulb, Moon, Play, Target, UtensilsCrossed, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useApplyAutoReductions, type DoneDaysByKind } from "@/features/contract/adaptive";
import { ArcCompletion } from "@/features/contract/ArcCompletion";
import { commitmentsForDay, dayOfArc, isArcOver } from "@/features/contract/arc";
import { buildMotivationalNudges } from "@/features/contract/nudges";
import { computePlanStreak } from "@/features/contract/streak";
import { updateContractStatus } from "@/features/contract/repo";
import { useFaithCheckInByDate, useFaithCheckIns } from "@/features/faith/hooks";
import { faithDoneCount, faithDoneDays } from "@/features/faith/stats";
import { useInsights } from "@/features/insights/hooks";
import { InstallPrompt } from "@/features/pwa/InstallPrompt";
import { PlanCelebration } from "@/design-system/components/PlanCelebration";
import { KIND_HREF, SLOT_LABEL, SLOT_ORDER } from "@/features/contract/catalogue";
import { contractKeys, useActiveContract, useCommitments } from "@/features/contract/hooks";
import { popAdaptiveNotices } from "@/features/contract/notices";
import { usePushMyProgress } from "@/features/friends/hooks";
import { useFocusSessions } from "@/features/focus/hooks";
import { useAllFoodMeals } from "@/features/food/hooks";
import { useJournalEntries, useJournalEntryByDate } from "@/features/journaling/hooks";
import { useAddictions, useAllRelapses } from "@/features/addictions/hooks";
import { currentStreakStartMs } from "@/features/addictions/stats";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { useProfile } from "@/features/profile/hooks";
import { sleptMinutes } from "@/features/sleep/calc";
import { useSleepLogByDate, useSleepLogs } from "@/features/sleep/hooks";
import { useRecentSessions } from "@/features/workouts/hooks";
import { cn } from "@/lib/cn";
import { daysBetweenDayKeys, todayKey } from "@/lib/date";
import { formatHoursMinutes } from "@/lib/duration";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CommitmentKind } from "@/types/models";

function timeLabelOf(iso: string): { label: string; minutes: number } {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return { label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, minutes: h * 60 + m };
}

const LAST_OPENED_KEY = "veltra:lastOpenedDay";
const PLAN_CELEBRATED_KEY = "veltra:planCelebratedDay";

/** Si han pasado dos días completos sin abrir la app, hoy se activa un modo
 *  mínimo: un solo bloque en vez del plan entero. Un par de días perdidos no
 *  tienen por qué convertirse en abandono por sobrecarga al volver. */
function useReturningAfterGap(today: string): boolean {
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const last = localStorage.getItem(LAST_OPENED_KEY);
        if (last && daysBetweenDayKeys(last, today) >= 3) setReturning(true);
        localStorage.setItem(LAST_OPENED_KEY, today);
      } catch {
        // localStorage no disponible — nunca activa el modo mínimo, no rompe nada más.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);
  return returning;
}

const KIND_ICON: Record<CommitmentKind, LucideIcon> = {
  workout: Dumbbell,
  sleep: Moon,
  nutrition: UtensilsCrossed,
  meditation: Brain,
  journaling: Book,
  focus: Target,
  habit: Check,
  faith: Cross,
};

// El morado es exclusivo de la IA (la revisión semanal en Progreso) — aquí
// serían solo iconos de tipo de compromiso, así que usan el único acento de
// acción de la app en vez de competir por ese color.
const KIND_COLOR: Record<CommitmentKind, string> = {
  workout: "text-progress",
  sleep: "text-sleep",
  nutrition: "text-progress",
  meditation: "text-progress",
  journaling: "text-progress",
  focus: "text-progress",
  habit: "text-progress",
  faith: "text-progress",
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
  const qc = useQueryClient();
  const today = todayKey();
  const [nowMs] = useState(() => Date.now());
  const { data: contract } = useActiveContract();
  const { data: commitments = [] } = useCommitments(contract?.id ?? null);
  // Entrenamiento tiene su propia pestaña — esta lista solo alimenta ya la
  // detección de fallos de la Fase 5 (doneDaysByKind), que mira hasta 3
  // semanas atrás, no un bloque de "empezar entrenamiento" en Hoy.
  const { data: recentSessions = [] } = useRecentSessions(30);

  const { data: lastNight } = useSleepLogByDate(today);
  const { data: allSleepLogs = [] } = useSleepLogs();
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: todayJournal } = useJournalEntryByDate(today);
  const { data: allJournalEntries = [] } = useJournalEntries();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: allMeals = [] } = useAllFoodMeals();
  const { data: profile } = useProfile();
  const { data: addictions = [] } = useAddictions();
  const { data: allRelapses = [] } = useAllRelapses();
  const { data: faithCheckIn } = useFaithCheckInByDate(today);
  const { data: allFaithCheckIns = [] } = useFaithCheckIns();
  const { data: insights = [] } = useInsights();

  const returning = useReturningAfterGap(today);
  const [dismissedMinimal, setDismissedMinimal] = useState(false);
  const minimalMode = returning && !dismissedMinimal;

  const [notices, setNotices] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const fresh = popAdaptiveNotices();
      if (fresh.length > 0) setNotices((prev) => [...prev, ...fresh]);
    })();
    return () => {
      cancelled = true;
    };
  }, [commitments]);

  // Qué día, por tipo de compromiso, hubo algo registrado — lo que la
  // Fase 5 necesita para saber si un compromiso lleva 3 fallos seguidos.
  const doneDaysByKind: DoneDaysByKind = useMemo(
    () => ({
      workout: new Set(recentSessions.map((s) => s.startedAt.slice(0, 10))),
      sleep: new Set(allSleepLogs.map((l) => l.date)),
      nutrition: new Set(allMeals.map((m) => m.date)),
      meditation: new Set(meditationSessions.map((s) => s.completedAt.slice(0, 10))),
      focus: new Set(focusSessions.map((s) => s.completedAt.slice(0, 10))),
      journaling: new Set(allJournalEntries.map((e) => e.date)),
      faith: faithDoneDays(allFaithCheckIns),
    }),
    [recentSessions, allSleepLogs, allMeals, meditationSessions, focusSessions, allJournalEntries, allFaithCheckIns]
  );
  useApplyAutoReductions(commitments, doneDaysByKind);

  const meditatedToday = useMemo(() => meditationSessions.find((s) => s.completedAt.slice(0, 10) === today) ?? null, [meditationSessions, today]);
  const focusedToday = useMemo(() => focusSessions.find((s) => s.completedAt.slice(0, 10) === today) ?? null, [focusSessions, today]);

  // Entrenamiento y Comida ya tienen su propia pestaña con su propio "hoy"
  // arriba — aquí solo queda el resto: sueño, meditación, foco, diario, fe.
  const todaysCommitments = useMemo(
    () => commitmentsForDay(commitments, today).filter((c) => c.kind !== "workout" && c.kind !== "nutrition"),
    [commitments, today]
  );
  const motivationalNudges = useMemo(
    () => buildMotivationalNudges(todaysCommitments, doneDaysByKind, today, contract?.why ?? null),
    [todaysCommitments, doneDaysByKind, today, contract?.why]
  );

  // Ninguna tarjeta puede ser solo una petición de datos: cuando hoy no hay
  // nada que registrar, cada una devuelve el agregado de los últimos 7 días
  // en vez de un "Sin registrar" sin contenido. Si tampoco hay nada en esa
  // ventana, el agregado es null y la tarjeta se queda en el estado simple.
  const sleepAvg7dMin = useMemo(() => {
    const cutoff = nowMs - 7 * 86400000;
    const inWindow = allSleepLogs.filter((l) => new Date(l.date).getTime() >= cutoff);
    if (inWindow.length === 0) return null;
    return Math.round(inWindow.reduce((s, l) => s + sleptMinutes(l), 0) / inWindow.length);
  }, [allSleepLogs, nowMs]);

  const meditation7dMin = useMemo(() => {
    const cutoff = nowMs - 7 * 86400000;
    const total = meditationSessions.filter((s) => new Date(s.completedAt).getTime() >= cutoff).reduce((sum, s) => sum + s.durationMinutes, 0);
    return total > 0 ? total : null;
  }, [meditationSessions, nowMs]);

  const focus7dMin = useMemo(() => {
    const cutoff = nowMs - 7 * 86400000;
    const total = focusSessions.filter((s) => new Date(s.completedAt).getTime() >= cutoff).reduce((sum, s) => sum + s.durationMinutes, 0);
    return total > 0 ? total : null;
  }, [focusSessions, nowMs]);

  const journal7dCount = useMemo(() => {
    const cutoff = nowMs - 7 * 86400000;
    const count = allJournalEntries.filter((e) => new Date(e.date).getTime() >= cutoff).length;
    return count > 0 ? count : null;
  }, [allJournalEntries, nowMs]);

  // Recuperación no es un compromiso del contrato: es una cuenta que corre
  // sola. Solo aparece si el usuario la ha activado en Perfil.
  const cleanDays = useMemo(() => {
    if (!profile?.recoveryEnabled || addictions.length === 0) return null;
    const days = addictions.map((a) =>
      Math.floor((Date.now() - currentStreakStartMs(a, allRelapses.filter((r) => r.addictionId === a.id))) / 86400000)
    );
    return Math.max(...days);
  }, [profile?.recoveryEnabled, addictions, allRelapses]);

  const faithToday = faithDoneCount(faithCheckIn);
  // Si Fe ya es un compromiso de hoy sale arriba, en el plan: el bloque
  // suelto de abajo sobraría y aparecería dos veces la misma cosa.
  const faithIsCommitment = todaysCommitments.some((c) => c.kind === "faith");

  // El arco tiene fecha de fin: pasado endsOn no queda ningún día del plan
  // que mostrar. Antes de hoy, esto simplemente no pasaba nada — dayOfArc
  // se quedaba clavado en durationDays y la app seguía enseñando un plan de
  // un contrato que ya había terminado.
  const arcOver = contract ? isArcOver(contract, today) : false;
  const handleStartNewArc = async () => {
    if (!contract) return;
    await updateContractStatus(contract.id, "completed");
    await qc.invalidateQueries({ queryKey: contractKeys.all });
    router.push("/onboarding/contract");
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
        case "sleep": {
          const avgLabel = sleepAvg7dMin !== null ? `media 7d: ${formatHoursMinutes(sleepAvg7dMin)}` : null;
          return lastNight
            ? {
                ...base,
                timeLabel: lastNight.riseTime,
                meta: avgLabel ? `${formatHoursMinutes(sleptMinutes(lastNight))} · ${avgLabel}` : formatHoursMinutes(sleptMinutes(lastNight)),
                state: "done",
                href: undefined,
              }
            : { ...base, meta: avgLabel ? `Sin registrar · ${avgLabel}` : "Sin registrar", state: "pending" };
        }
        case "meditation": {
          const weekLabel = meditation7dMin !== null ? `7d: ${meditation7dMin} min` : null;
          return meditatedToday
            ? { ...base, timeLabel: timeLabelOf(meditatedToday.completedAt).label, meta: `${meditatedToday.durationMinutes} min`, state: "done", href: undefined }
            : { ...base, meta: weekLabel ? `Sin registrar · ${weekLabel}` : "Sin registrar", state: "pending" };
        }
        case "journaling": {
          const weekLabel = journal7dCount !== null ? `${journal7dCount} ${journal7dCount === 1 ? "entrada" : "entradas"} esta semana` : null;
          return todayJournal
            ? { ...base, timeLabel: timeLabelOf(todayJournal.createdAt).label, meta: "Entrada de hoy", state: "done", href: undefined }
            : { ...base, meta: weekLabel ? `Sin escribir · ${weekLabel}` : "Sin escribir", state: "pending" };
        }
        case "focus": {
          const weekLabel = focus7dMin !== null ? `7d: ${focus7dMin} min` : null;
          return focusedToday
            ? { ...base, timeLabel: timeLabelOf(focusedToday.completedAt).label, meta: `${focusedToday.durationMinutes} min`, state: "done", href: undefined }
            : { ...base, meta: weekLabel ? `Sin empezar · ${weekLabel}` : "Sin empezar", state: "pending" };
        }
        case "faith":
          // Cumple con una de las cuatro; el "X de 4" es información, no un
          // listón que haya que completar para que el día cuente.
          return faithToday > 0
            ? { ...base, meta: `${faithToday} de 4 hoy`, state: "done" }
            : { ...base, meta: "Sin registrar", state: "pending" };
        default:
          // Los hábitos propios se marcan en su módulo: aquí solo se recuerda
          // que tocan hoy.
          return { ...base, meta: "Márcalo en Hábitos", state: "pending" };
      }
    });
  }, [
    todaysCommitments,
    lastNight,
    sleepAvg7dMin,
    meditatedToday,
    meditation7dMin,
    todayJournal,
    journal7dCount,
    focusedToday,
    focus7dMin,
    faithToday,
  ]);

  const sorted = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items]);
  const visibleItems = minimalMode ? sorted.slice(0, 1) : sorted;
  const doneCount = items.filter((i) => i.state === "done").length;
  const arcDay = contract ? dayOfArc(contract, today) : null;
  const planStreak = useMemo(
    () => (contract ? computePlanStreak(commitments, doneDaysByKind, contract.startedOn, today) : 0),
    [contract, commitments, doneDaysByKind, today]
  );

  // Amigos (Fase 6) solo lee de friend_progress, nunca de contracts u otras
  // tablas de módulos — así que es Hoy quien sube el resultado ya calculado
  // en vez de ampliar el RLS de todo lo demás para que otro usuario pueda
  // leerlo directamente.
  const pushProgress = usePushMyProgress();
  useEffect(() => {
    if (!isSupabaseConfigured || !profile || !contract) return;
    pushProgress.mutate({ displayName: profile.fullName, arcDay, arcDurationDays: contract.durationDays, streak: planStreak });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.fullName, contract?.id, arcDay, planStreak]);

  // El día completo se celebra una vez y ya: recargar Hoy después no vuelve
  // a lanzarlo, porque entonces dejaría de ser un momento y sería un cartel.
  const [celebratedStreak, setCelebratedStreak] = useState<number | null>(null);
  useEffect(() => {
    if (items.length === 0 || doneCount < items.length) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        if (localStorage.getItem(PLAN_CELEBRATED_KEY) === today) return;
        localStorage.setItem(PLAN_CELEBRATED_KEY, today);
      } catch {
        // Sin localStorage se celebra igual; como mucho se repetiría al recargar.
      }
      setCelebratedStreak(computePlanStreak(commitments, doneDaysByKind, contract?.startedOn ?? today, today));
    })();
    return () => {
      cancelled = true;
    };
  }, [items.length, doneCount, today, commitments, doneDaysByKind, contract?.startedOn]);

  return (
    <div className="flex flex-col gap-6">
      {notices.length > 0 ? (
        <div className="flex flex-col gap-2">
          {notices.map((text, i) => (
            <div key={i} className="flex items-start gap-2.5 border border-line-subtle rounded-xl bg-bg-soft px-3.5 py-3">
              <p className="text-ink-dim text-xs leading-5 flex-1">{text}</p>
              <button
                onClick={() => setNotices((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-ink-faint hover:text-ink shrink-0"
                aria-label="Descartar"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {arcOver && contract ? (
        <ArcCompletion contract={contract} commitments={commitments} doneDaysByKind={doneDaysByKind} onStartNew={handleStartNewArc} />
      ) : (
        <>
      <div>
        <div className="flex items-end justify-between mb-2">
          <h1 className="text-ink font-display font-semibold text-[26px] leading-tight tracking-tight">Tu día</h1>
          {arcDay !== null ? (
            <span className="text-ink-faint text-xs font-semibold">
              Día {arcDay} de {contract!.durationDays}
            </span>
          ) : items.length > 0 ? (
            <span className="text-ink-faint text-xs font-semibold">
              {doneCount} de {items.length}
            </span>
          ) : null}
        </div>
        <div className="h-[2px] bg-[#1B1B1E]">
          <div
            className="h-[2px] bg-progress transition-all"
            style={{ width: `${arcDay !== null ? Math.round((arcDay / contract!.durationDays) * 100) : items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100)}%` }}
          />
        </div>
      </div>

      {motivationalNudges.length > 0 ? (
        <div className="flex flex-col gap-2">
          {motivationalNudges.map((nudge) => (
            <div key={nudge.commitmentId} className="flex items-start gap-2.5 border border-warn/30 rounded-xl bg-warn/10 px-3.5 py-3">
              <AlertTriangle size={15} className="text-warn shrink-0 mt-0.5" />
              <p className="text-ink text-sm leading-5 flex-1">{nudge.message}</p>
            </div>
          ))}
        </div>
      ) : null}

      {minimalMode && sorted.length > 0 && contract?.why ? (
        <div className="border border-line-subtle rounded-2xl bg-surface px-4 py-4">
          <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Llevabas unos días fuera</p>
          <p className="text-ink text-sm mt-2 leading-5">&ldquo;{contract.why}&rdquo;</p>
          <button onClick={() => setDismissedMinimal(true)} className="text-ink-faint text-xs font-semibold mt-3.5 underline underline-offset-2">
            Ver el plan completo de hoy
          </button>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-ink-dim text-sm">Hoy no toca ninguno de tus compromisos. Descansar también es parte del plan.</p>
      ) : (
        <div className="relative pl-6">
          <span className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-transparent via-line to-transparent" />
          <div className="flex flex-col gap-5">
            {visibleItems.map((it) => {
              const Icon = it.icon;
              const card = (
                <div
                  className={cn(
                    "rounded-2xl p-4",
                    it.state === "now" ? "border border-progress/25 bg-progress-bg" : "border border-line-subtle bg-bg-soft"
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
        </>
      )}

      {cleanDays !== null ? (
        <Link
          href="/addictions"
          className="flex items-center gap-3 border border-line-subtle rounded-2xl bg-bg-soft p-4 hover:border-line transition-colors"
        >
          <ShieldAlert size={16} className="text-addiction shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-ink text-[15px] font-display font-semibold">
              {cleanDays} {cleanDays === 1 ? "día" : "días"}
            </p>
            <p className="text-ink-faint text-xs mt-0.5">sin recaer</p>
          </div>
        </Link>
      ) : null}

      {insights.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {insights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 border border-line-subtle rounded-2xl bg-bg-soft p-4">
              <span className="w-9 h-9 rounded-full bg-progress/15 flex items-center justify-center shrink-0">
                <Lightbulb size={16} className="text-progress" />
              </span>
              <div className="min-w-0">
                <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em]">Patrón detectado</p>
                <p className="text-ink-dim text-sm mt-1.5 leading-6">{insight.text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {profile?.faithEnabled && !faithIsCommitment ? (
        <Link href="/faith" className="flex items-center gap-3 border border-line-subtle rounded-2xl bg-bg-soft p-4 hover:border-line transition-colors">
          <Cross size={16} className="text-progress shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-ink text-[15px] font-display font-semibold">Fe</p>
            <p className="text-ink-faint text-xs mt-0.5">{faithToday} de 4 hoy</p>
          </div>
        </Link>
      ) : null}

      <InstallPrompt eligible={arcDay !== null && arcDay >= 2} />

      <PlanCelebration streak={celebratedStreak} onDismiss={() => setCelebratedStreak(null)} />
    </div>
  );
}
