"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { TextField } from "@/design-system/components/TextField";
import { LineChart } from "@/design-system/charts/LineChart";
import { useScreenTimeByDate, useScreenTimeLogs, useUpsertScreenTimeLog } from "@/features/screenTime/hooks";
import { dayLabel, lastNDayKeys, todayKey } from "@/lib/date";

const GOAL_KEY = "veltra-screentime-goal";
const DEFAULT_GOAL = 3;

function getGoal(): number {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? Number(raw) : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

export default function ScreenTimePage() {
  const today = todayKey();
  const { data: todayLog } = useScreenTimeByDate(today);
  const { data: allLogs = [] } = useScreenTimeLogs();
  const upsert = useUpsertScreenTimeLog();

  const [hoursInput, setHoursInput] = useState("");
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => setGoal(getGoal()), []);
  useEffect(() => {
    if (todayLog) setHoursInput(String(todayLog.hours));
  }, [todayLog]);

  const last30 = useMemo(() => {
    const byDate = new Map(allLogs.map((l) => [l.date, l]));
    return lastNDayKeys(30)
      .map((date) => byDate.get(date))
      .filter((l): l is NonNullable<typeof l> => !!l);
  }, [allLogs]);

  const chartData = useMemo(() => last30.map((l) => ({ x: l.date, y: l.hours })), [last30]);

  const overGoalStreak = useMemo(() => {
    const byDate = new Map(allLogs.map((l) => [l.date, l]));
    let streak = 0;
    let cursor = today;
    while (true) {
      const log = byDate.get(cursor);
      if (!log || log.hours <= goal) break;
      streak++;
      const [y, m, d] = cursor.split("-").map(Number);
      const date = new Date(y, m - 1, d - 1);
      cursor = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    return streak;
  }, [allLogs, goal, today]);

  const save = async () => {
    const hours = Number(hoursInput);
    if (hours >= 0) await upsert.mutateAsync({ date: today, hours });
  };

  const saveGoal = () => {
    const g = Number(goalInput);
    if (g > 0) {
      setGoal(g);
      try {
        localStorage.setItem(GOAL_KEY, String(g));
      } catch {
        // storage unavailable — the setting just won't persist
      }
    }
    setShowGoalForm(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/recovery" label="Recuperación" />
      <div>
        <p className="text-ink-dim text-sm">Recuperación</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Screen Time</h1>
      </div>

      {overGoalStreak >= 3 ? (
        <p className="text-warn text-xs font-semibold bg-warn-bg rounded-xl px-3.5 py-2.5">
          Llevas {overGoalStreak} días seguidos por encima del objetivo de {goal}h.
        </p>
      ) : null}

      <Card raised>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-addiction-bg flex items-center justify-center shrink-0">
            <Smartphone size={19} className="text-addiction" />
          </div>
          <div>
            <p className="text-ink font-semibold">¿Cuántas horas usaste el móvil hoy?</p>
            <p className="text-ink-dim text-xs mt-0.5">Objetivo: {goal}h/día</p>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextField placeholder="2.5" inputMode="decimal" suffix="h" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} />
          </div>
          <Button label="Guardar" size="md" onClick={save} loading={upsert.isPending} disabled={!hoursInput} />
        </div>
        <button onClick={() => { setGoalInput(String(goal)); setShowGoalForm(true); }} className="mt-3 text-ink-faint text-xs font-semibold">
          Cambiar objetivo
        </button>
        {showGoalForm ? (
          <div className="flex items-end gap-3 mt-3">
            <div className="flex-1">
              <TextField label="Objetivo diario" inputMode="decimal" suffix="h" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} autoFocus />
            </div>
            <Button label="Guardar" size="sm" onClick={saveGoal} />
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={todayLog?.hours ?? "—"} unit={todayLog ? "h" : ""} size="md" color="text-addiction" label="Hoy" />
        </Card>
        <Card raised>
          <StatNumber value={last30.length} unit="/ 30" size="md" color="text-ink" label="Días registrados" />
        </Card>
      </div>

      <div>
        <SectionHeader title="Tendencia" subtitle="Últimos 30 días" />
        <Card raised>
          <LineChart data={chartData} color="#FF6A3D" formatX={(v) => dayLabel(v)} />
        </Card>
      </div>
    </div>
  );
}
