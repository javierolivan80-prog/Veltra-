"use client";

import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/design-system/components/Card";
import { TextField } from "@/design-system/components/TextField";
import {
  useAddCheckpoint,
  useCheckpoints,
  useDeleteCheckpoint,
  useDeleteGoal,
  useGoal,
  useToggleCheckpoint,
} from "@/features/goals/hooks";
import { computeGoalProgress } from "@/features/goals/stats";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/format";

export default function GoalDetailPage() {
  const params = useParams<{ goalId: string }>();
  const router = useRouter();
  const { data: goal } = useGoal(params.goalId ?? null);
  const { data: checkpoints = [] } = useCheckpoints(params.goalId ?? null);
  const addCheckpoint = useAddCheckpoint();
  const toggleCheckpoint = useToggleCheckpoint();
  const deleteCheckpoint = useDeleteCheckpoint();
  const deleteGoal = useDeleteGoal();
  const [newCheckpoint, setNewCheckpoint] = useState("");

  const progress = useMemo(() => (goal ? computeGoalProgress(goal, checkpoints) : 0), [goal, checkpoints]);

  if (!goal) return null;

  const addOne = async () => {
    const name = newCheckpoint.trim();
    if (!name) return;
    // Clear before the round-trip resolves so a fast next entry (Enter,
    // type, Enter) can't land on the still-populated field and concatenate.
    setNewCheckpoint("");
    await addCheckpoint.mutateAsync({ goalId: goal.id, name, position: checkpoints.length });
  };

  const remove = async () => {
    if (!confirm(`¿Borrar la meta "${goal.name}"?`)) return;
    await deleteGoal.mutateAsync(goal.id);
    router.replace("/goals");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/goals")} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </button>
        <button onClick={remove} className="w-10 h-10 rounded-full bg-surface-raised border border-line-subtle flex items-center justify-center text-danger" aria-label="Borrar">
          <Trash2 size={15} />
        </button>
      </div>

      <div>
        <h1 className="text-ink text-2xl font-display">{goal.name}</h1>
        {goal.description ? <p className="text-ink-dim text-sm mt-1.5 leading-5">{goal.description}</p> : null}
        {goal.targetDate ? <p className="text-ink-faint text-xs mt-1.5">Objetivo: {goal.targetDate}</p> : null}
      </div>

      <Card raised>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-ink-dim text-sm font-semibold">Progreso</p>
          <span className="text-record text-lg font-display">{pct(progress)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-record transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </Card>

      <div>
        <p className="text-ink-dim text-sm font-semibold mb-3">Hitos</p>
        <div className="flex flex-col gap-2 mb-3">
          {checkpoints.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-surface-raised border border-line-subtle rounded-xl px-3.5 py-3">
              <button
                onClick={() => toggleCheckpoint.mutate({ id: c.id, goalId: goal.id })}
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                  c.done ? "bg-record border-record" : "border-line"
                )}
                aria-label={c.done ? "Marcar pendiente" : "Marcar hecho"}
              >
                {c.done ? <span className="w-2.5 h-2.5 rounded-full bg-bg-deep" /> : null}
              </button>
              <span className={cn("flex-1 text-sm font-medium", c.done ? "text-ink-faint line-through" : "text-ink")}>{c.name}</span>
              <button onClick={() => deleteCheckpoint.mutate({ id: c.id, goalId: goal.id })} className="text-ink-faint hover:text-danger shrink-0" aria-label="Borrar hito">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TextField placeholder="Nuevo hito…" value={newCheckpoint} onChange={(e) => setNewCheckpoint(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOne()} />
          </div>
          <button onClick={addOne} className="w-11 h-11 rounded-2xl bg-surface-raised border border-line-subtle flex items-center justify-center text-ink-dim shrink-0" aria-label="Añadir hito">
            <Plus size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
