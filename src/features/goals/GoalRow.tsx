"use client";

import Link from "next/link";
import { Card } from "@/design-system/components/Card";
import { pct } from "@/lib/format";
import { useCheckpoints } from "./hooks";
import { computeGoalProgress } from "./stats";
import type { LifeGoal } from "@/types/models";

export function GoalRow({ goal }: { goal: LifeGoal }) {
  const { data: checkpoints = [] } = useCheckpoints(goal.id);
  const progress = computeGoalProgress(goal, checkpoints);
  const done = checkpoints.filter((c) => c.done).length;

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card raised>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-ink font-semibold truncate">{goal.name}</p>
          <span className="text-record text-sm font-bold shrink-0 ml-3">{pct(progress)}</span>
        </div>
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-record" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="text-ink-faint text-xs mt-2">
          {checkpoints.length > 0 ? `${done}/${checkpoints.length} hitos` : goal.targetDate ? `Objetivo: ${goal.targetDate}` : "Sin hitos"}
        </p>
      </Card>
    </Link>
  );
}
