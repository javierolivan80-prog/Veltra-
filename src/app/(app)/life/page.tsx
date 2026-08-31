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
        <p className="text-ink-faint text-[11px] font-semibold uppercase tracking-[.14em]">Finanzas · Metas</p>
        <h1 className="text-ink font-display font-semibold text-[28px] leading-tight tracking-tight mt-1.5">Vida</h1>
      </div>

      <div className="flex flex-col">
        <ModuleCard
          href="/finances"
          icon={Wallet}
          name="Finanzas"
          quickStat={noSpendStreak > 0 ? `Racha de ${noSpendStreak} días` : "Registra un gasto"}
          colorClass="text-record"
        />
        <ModuleCard
          href="/goals"
          icon={Target}
          name="Metas"
          quickStat={goals.length > 0 ? `${goals.length} activas` : "Crea tu primera meta"}
          colorClass="text-record"
          last
        />
      </div>
    </div>
  );
}
