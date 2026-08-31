import type { GoalCheckpoint, LifeGoal } from "@/types/models";

/** % completado (0-1). Con checkpoints: hechos/total. Sin checkpoints: tiempo
 *  transcurrido/objetivo, si hay fecha objetivo — si no, 0. */
export function computeGoalProgress(goal: LifeGoal, checkpoints: GoalCheckpoint[]): number {
  if (checkpoints.length > 0) {
    return checkpoints.filter((c) => c.done).length / checkpoints.length;
  }
  if (!goal.targetDate) return 0;
  const start = new Date(goal.createdAt).getTime();
  const target = new Date(goal.targetDate).getTime();
  const now = Date.now();
  if (target <= start) return now >= target ? 1 : 0;
  return Math.min(1, Math.max(0, (now - start) / (target - start)));
}
