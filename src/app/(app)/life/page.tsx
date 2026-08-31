"use client";

import { Target, Wallet } from "lucide-react";
import { useMemo } from "react";
import { ModuleCard } from "@/design-system/components/ModuleCard";
import { useExpenses } from "@/features/finances/hooks";
import { computeNoSpendStreak } from "@/features/finances/stats";
import { useGoals } from "@/features/goals/hooks";

export default function LifePage() {
  const { data: expenses = [] } = useExpenses();
  const { data: goals = [] } = useGoals();

  const noSpendStreak = useMemo(() => computeNoSpendStreak(expenses), [expenses]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-ink-dim text-sm">Categoría</p>
        <h1 className="text-ink text-2xl font-display mt-0.5">Vida</h1>
      </div>

      <div className="flex flex-col gap-2.5">
        <ModuleCard
          href="/finances"
          icon={Wallet}
          name="Finanzas"
          quickStat={noSpendStreak > 0 ? `Racha de ${noSpendStreak} días` : "Registra un gasto"}
          colorClass="text-record"
          bgClass="bg-record-bg"
        />
        <ModuleCard
          href="/goals"
          icon={Target}
          name="Metas"
          quickStat={goals.length > 0 ? `${goals.length} activas` : "Crea tu primera meta"}
          colorClass="text-record"
          bgClass="bg-record-bg"
        />
      </div>
    </div>
  );
}
