"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { GoalFormDialog } from "@/features/goals/GoalFormDialog";
import { useGoals } from "@/features/goals/hooks";
import { GoalRow } from "@/features/goals/GoalRow";

export default function GoalsPage() {
  const { data: goals = [] } = useGoals();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/life" label="Vida" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink-dim text-sm">Vida</p>
          <h1 className="text-ink text-2xl font-display mt-0.5">Metas</h1>
        </div>
        <button onClick={() => setDialogOpen(true)} className="w-11 h-11 rounded-full bg-record text-bg-deep flex items-center justify-center" aria-label="Nueva meta">
          <Plus size={20} />
        </button>
      </div>

      {goals.length === 0 ? (
        <Card raised>
          <EmptyState
            icon={<Target size={28} className="text-record" />}
            title="Crea tu primera meta"
            description="Define un objetivo a 3, 6 o 12 meses y ve marcando hitos hasta conseguirlo."
            actionLabel="Nueva meta"
            onAction={() => setDialogOpen(true)}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <GoalFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
