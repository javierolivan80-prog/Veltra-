"use client";

import { useMemo, useState } from "react";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { ProgressRing } from "@/design-system/components/ProgressRing";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { TextField } from "@/design-system/components/TextField";
import { LineChart } from "@/design-system/charts/LineChart";
import { useAddBodyWeightLog, useBodyWeightLogs, useProfile, useUpdateTargetWeight } from "@/features/profile/hooks";
import { estimateWeightGoalEta } from "@/features/profile/weightGoal";
import { formatDateLong } from "@/lib/format";

export default function WeightPage() {
  const { data: profile } = useProfile();
  const { data: weightLogs = [] } = useBodyWeightLogs();
  const addWeightLog = useAddBodyWeightLog();
  const updateTarget = useUpdateTargetWeight();

  const [weightInput, setWeightInput] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const current = profile?.bodyweightKg ?? null;
  const target = profile?.targetWeightKg ?? null;
  const first = weightLogs[0]?.weightKg ?? current;

  const progress =
    current !== null && target !== null && first !== null && first !== target
      ? Math.min(1, Math.max(0, (first - current) / (first - target)))
      : 0;

  const goalEta = useMemo(() => {
    if (current === null || target === null) return null;
    return estimateWeightGoalEta(weightLogs, target, current);
  }, [weightLogs, target, current]);

  const saveWeight = async () => {
    const kg = Number(weightInput);
    if (kg > 0) {
      await addWeightLog.mutateAsync(kg);
      setWeightInput("");
    }
  };

  const saveGoal = async () => {
    const kg = Number(goalInput);
    await updateTarget.mutateAsync(kg > 0 ? kg : null);
    setShowGoalForm(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/progress" label="Progreso" />
      <div>
        <p className="text-ink-dim text-sm">Cuerpo</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Peso</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={current ?? "—"} unit={current !== null ? "kg" : ""} size="md" color="text-info" label="Peso actual" />
        </Card>
        <Card raised>
          {target !== null ? (
            <div className="flex items-center gap-3">
              <ProgressRing progress={progress} size={44} strokeWidth={5} color="#2CE6A0" trackColor="#0E2A21" />
              <div>
                <p className="text-ink text-lg font-display leading-none">{target}kg</p>
                <p className="text-ink-dim text-xs mt-1">Meta</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowGoalForm(true)} className="text-progress text-sm font-semibold">
              Definir meta
            </button>
          )}
        </Card>
      </div>

      <div>
        <SectionHeader title="Registrar peso" />
        <Card raised>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <TextField placeholder="75.5" inputMode="decimal" suffix="kg" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
            </div>
            <Button label="Guardar" size="md" onClick={saveWeight} loading={addWeightLog.isPending} disabled={!weightInput} />
          </div>
        </Card>
      </div>

      {target !== null ? (
        <button onClick={() => { setGoalInput(String(target)); setShowGoalForm(true); }} className="-mt-3 text-ink-faint text-xs font-semibold self-start">
          Editar meta ({target}kg)
        </button>
      ) : null}

      {goalEta ? (
        <Card raised>
          <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-1">A este ritmo</p>
          <p className="text-ink text-lg font-display">
            Llegarías a tu meta el <span className="text-progress">{formatDateLong(goalEta.etaDate)}</span>
          </p>
          <p className="text-ink-faint text-xs mt-1">
            {goalEta.kgPerWeek > 0 ? "+" : ""}
            {goalEta.kgPerWeek}kg/semana · {goalEta.daysRemaining} días restantes
          </p>
        </Card>
      ) : null}

      {showGoalForm ? (
        <Card raised className="flex items-end gap-3">
          <div className="flex-1">
            <TextField label="Peso objetivo" placeholder="70" inputMode="decimal" suffix="kg" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} autoFocus />
          </div>
          <Button label="Guardar" size="md" onClick={saveGoal} loading={updateTarget.isPending} />
        </Card>
      ) : null}

      <div>
        <SectionHeader title="Evolución" subtitle="Últimos registros" />
        <Card raised>
          {weightLogs.length > 0 ? (
            <LineChart data={weightLogs.map((l) => ({ x: l.date, y: l.weightKg }))} color="#4DA3FF" height={180} formatX={(x) => formatDateLong(x).split(" de ")[0]} />
          ) : (
            <p className="text-ink-dim text-sm">Registra tu peso para ver la evolución aquí.</p>
          )}
        </Card>
      </div>

      <div>
        <SectionHeader title="Histórico" />
        {weightLogs.length === 0 ? (
          <Card raised>
            <p className="text-ink-dim text-sm">Todavía no hay registros.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {[...weightLogs].reverse().map((log) => (
              <Card key={log.id} raised className="flex items-center justify-between">
                <p className="text-ink text-sm font-semibold">{formatDateLong(log.date)}</p>
                <p className="text-ink text-sm font-bold">{log.weightKg}kg</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
