"use client";

import { BookOpen, Brain, Check, Focus, Frown, Meh, Plus, Smile, Sparkles, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HabitFormDialog } from "@/features/habits/HabitFormDialog";
import { useAllHabitLogs, useHabits, useLogHabit } from "@/features/habits/hooks";
import { computeStreaks } from "@/features/habits/stats";
import { useJournalEntries, useJournalEntryByDate } from "@/features/journaling/hooks";
import { useMeditationSessions } from "@/features/meditation/hooks";
import { computeMeditationStreak } from "@/features/meditation/stats";
import { buildMenteInsight, type DailyTrackable } from "@/features/mind/insights";
import { useDailyMoodByDate, useUpsertDailyMood } from "@/features/mood/hooks";
import { cn } from "@/lib/cn";
import { computeDayStreak, lastNDayKeys, shiftDayKey, todayKey } from "@/lib/date";
import type { HabitLog, MoodOption } from "@/types/models";

const MOOD_OPTIONS: { value: MoodOption; label: string; icon: typeof Frown }[] = [
  { value: "low", label: "Bajo", icon: Frown },
  { value: "flat", label: "Plano", icon: Meh },
  { value: "good", label: "Bien", icon: Smile },
  { value: "focused", label: "Enfocado", icon: Focus },
];

function streakLabel(n: number): string {
  return `Racha ${n} día${n === 1 ? "" : "s"}`;
}

/** Today/yesterday-aware status line for a habit row — mirrors the copy used
 *  on the dedicated Hábitos page (racha, pendiente, fallaste ayer). */
function habitStatus(logs: HabitLog[]): { done: boolean; meta: string } {
  const { current } = computeStreaks(logs);
  const today = todayKey();
  const yesterday = shiftDayKey(today, -1);
  const todayLog = logs.find((l) => l.date === today);
  const yesterdayLog = logs.find((l) => l.date === yesterday);
  const done = todayLog?.status === "done";

  if (done) return { done, meta: current > 0 ? streakLabel(current) : "Hecho hoy" };
  if (yesterdayLog?.status === "not_done") return { done, meta: "Fallaste ayer" };
  return { done, meta: current > 0 ? `${streakLabel(current)} · pendiente hoy` : "Pendiente hoy" };
}

/** Last 7 local days, oldest first, as done/not-done against a set of day keys. */
function last7Dots(doneDates: Set<string>): boolean[] {
  return lastNDayKeys(7).map((d) => doneDates.has(d));
}

function ChecklistRow({
  icon: Icon,
  name,
  meta,
  done,
  dots,
  onToggle,
  href,
}: {
  icon: LucideIcon;
  name: string;
  meta: string;
  done: boolean;
  dots: boolean[];
  onToggle?: () => void;
  href?: string;
}) {
  const checkbox = (
    <span
      className={cn(
        "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0",
        done ? "bg-progress border-progress" : "border-line"
      )}
    >
      {done ? <Check size={14} className="text-bg-deep" /> : null}
    </span>
  );

  const content = (
    <>
      <Icon size={17} className="text-ai shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold truncate", done ? "text-ink-faint line-through" : "text-ink")}>{name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="flex gap-[3px] shrink-0">
            {dots.map((d, i) => (
              <span key={i} className={cn("w-1.5 h-1.5 rounded-full", d ? "bg-ai" : "bg-line")} />
            ))}
          </span>
          <span className="text-ink-faint text-xs truncate">{meta}</span>
        </div>
      </div>
      {checkbox}
    </>
  );

  const rowClass = "flex items-center gap-3 bg-surface-raised border border-line-subtle rounded-2xl px-4 py-3.5";

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onToggle} disabled={done} className={cn(rowClass, "text-left w-full", done && "cursor-default")}>
      {content}
    </button>
  );
}

export default function MindPage() {
  const today = todayKey();
  const { data: habits = [] } = useHabits();
  const { data: allHabitLogs = [] } = useAllHabitLogs();
  const { data: meditationSessions = [] } = useMeditationSessions();
  const { data: journalEntries = [] } = useJournalEntries();
  const { data: todayJournalEntry } = useJournalEntryByDate(today);
  const { data: todayMood } = useDailyMoodByDate(today);
  const logHabit = useLogHabit();
  const upsertMood = useUpsertDailyMood();
  const [formOpen, setFormOpen] = useState(false);

  const meditatedToday = useMemo(() => meditationSessions.some((s) => s.completedAt.slice(0, 10) === today), [meditationSessions, today]);
  const meditationStreak = useMemo(() => computeMeditationStreak(meditationSessions), [meditationSessions]);
  const journalStreak = useMemo(() => computeDayStreak(journalEntries.map((e) => e.date)), [journalEntries]);

  const meditationDots = useMemo(() => last7Dots(new Set(meditationSessions.map((s) => s.completedAt.slice(0, 10)))), [meditationSessions]);
  const journalDots = useMemo(() => last7Dots(new Set(journalEntries.map((e) => e.date))), [journalEntries]);

  const habitRows = useMemo(
    () =>
      habits.map((h) => {
        const logs = allHabitLogs.filter((l) => l.habitId === h.id);
        return { habit: h, ...habitStatus(logs), dots: last7Dots(new Set(logs.filter((l) => l.status === "done").map((l) => l.date))) };
      }),
    [habits, allHabitLogs]
  );

  const doneCount = habitRows.filter((r) => r.done).length + (meditatedToday ? 1 : 0) + (todayJournalEntry ? 1 : 0);
  const totalCount = habitRows.length + 2;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const insight = useMemo(() => {
    const trackables: DailyTrackable[] = [
      ...habitRows.map((r): DailyTrackable => ({
        name: r.habit.name,
        doneDates: new Set(allHabitLogs.filter((l) => l.habitId === r.habit.id && l.status === "done").map((l) => l.date)),
      })),
      { name: "Meditación", doneDates: new Set(meditationSessions.map((s) => s.completedAt.slice(0, 10))) },
      { name: "Journaling", doneDates: new Set(journalEntries.map((e) => e.date)) },
    ];
    return buildMenteInsight(trackables);
  }, [habitRows, allHabitLogs, meditationSessions, journalEntries]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Hábitos · Meditación · Journaling · Foco</p>
          <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">Mente</h1>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim shrink-0"
          aria-label="Nuevo hábito"
        >
          <Plus size={18} />
        </button>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-ink-dim text-sm font-medium">
            {doneCount} de {totalCount} tareas · {pct}% del día
          </p>
          <span className="text-ai font-display font-bold text-sm">{pct}%</span>
        </div>
        <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
          <div className="h-full bg-ai rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <ChecklistRow
          icon={Brain}
          name="Meditar"
          meta={meditatedToday ? (meditationStreak > 0 ? streakLabel(meditationStreak) : "Hecho hoy") : meditationStreak > 0 ? `${streakLabel(meditationStreak)} · pendiente hoy` : "Pendiente hoy"}
          done={meditatedToday}
          dots={meditationDots}
          href="/meditation"
        />
        <ChecklistRow
          icon={BookOpen}
          name="Journaling"
          meta={todayJournalEntry ? (journalStreak > 0 ? streakLabel(journalStreak) : "Hecho hoy") : journalStreak > 0 ? `${streakLabel(journalStreak)} · pendiente hoy` : "Pendiente hoy"}
          done={!!todayJournalEntry}
          dots={journalDots}
          href="/journal"
        />
        {habitRows.map(({ habit, done, meta, dots }) => (
          <ChecklistRow
            key={habit.id}
            icon={Target}
            name={habit.name}
            meta={meta}
            done={done}
            dots={dots}
            onToggle={() => logHabit.mutate({ habitId: habit.id, date: today, status: "done" })}
          />
        ))}
        {habits.length === 0 ? (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center justify-center gap-2 bg-surface-raised border border-dashed border-line rounded-2xl px-4 py-3.5 text-ink-dim text-sm font-semibold"
          >
            <Plus size={15} />
            Añadir un hábito
          </button>
        ) : null}
      </div>

      <div>
        <p className="text-ink-faint text-[11px] font-bold uppercase tracking-[.14em] mb-2.5">¿Cómo estás hoy?</p>
        <div className="grid grid-cols-4 gap-2">
          {MOOD_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = todayMood?.mood === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => upsertMood.mutate({ date: today, mood: opt.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-semibold transition-colors",
                  active ? "bg-ai/15 border-ai text-ai" : "bg-surface-raised border-line-subtle text-ink-dim"
                )}
              >
                <Icon size={18} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-ai-bg border border-ai/25 rounded-2xl px-4 py-3.5">
        <Sparkles size={16} className="text-ai shrink-0 mt-0.5" />
        <p className="text-ink text-sm leading-5">{insight}</p>
      </div>

      <HabitFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
