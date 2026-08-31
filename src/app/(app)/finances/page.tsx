"use client";

import { Plus, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { CategoryBackLink } from "@/design-system/components/CategoryBackLink";
import { EmptyState } from "@/design-system/components/EmptyState";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { StatNumber } from "@/design-system/components/StatNumber";
import { TextField } from "@/design-system/components/TextField";
import { LineChart } from "@/design-system/charts/LineChart";
import { ExpenseFormDialog } from "@/features/finances/ExpenseFormDialog";
import { useDeleteExpense, useExpenses, useFinanceGoals, useUpsertFinanceGoals } from "@/features/finances/hooks";
import { computeNoSpendStreak, monthlyTotals, totalForMonth } from "@/features/finances/stats";
import { todayKey } from "@/lib/date";
import { formatDateLong } from "@/lib/format";

export default function FinancesPage() {
  const { data: expenses = [] } = useExpenses();
  const { data: goals } = useFinanceGoals();
  const upsertGoals = useUpsertFinanceGoals();
  const deleteExpense = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const streak = useMemo(() => computeNoSpendStreak(expenses), [expenses]);
  const monthTotal = useMemo(() => totalForMonth(expenses), [expenses]);
  const chartData = useMemo(
    () => monthlyTotals(expenses, 6).map((m) => ({ x: m.month, y: Math.round(m.total * 100) / 100 })),
    [expenses]
  );

  const saveGoal = async () => {
    const value = Number(goalInput);
    await upsertGoals.mutateAsync(value > 0 ? value : null);
    setShowGoalForm(false);
  };

  const removeExpense = async (id: string) => {
    if (!confirm("¿Borrar este gasto?")) return;
    await deleteExpense.mutateAsync(id);
  };

  const recent = [...expenses].filter((e) => e.date >= todayKey().slice(0, 7)).reverse();

  return (
    <div className="flex flex-col gap-6">
      <CategoryBackLink href="/life" label="Vida" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink-dim text-sm">Vida</p>
          <h1 className="text-ink text-2xl font-display mt-0.5">Finanzas</h1>
        </div>
        <button onClick={() => setDialogOpen(true)} className="w-11 h-11 rounded-full bg-record text-bg-deep flex items-center justify-center" aria-label="Registrar gasto">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card raised>
          <StatNumber value={streak} unit="días" size="md" color="text-record" label="Sin gastos innecesarios" />
        </Card>
        <Card raised>
          <StatNumber value={`${monthTotal.toFixed(2)}€`} size="md" color="text-ink" label="Gastado este mes" />
        </Card>
      </div>

      <Card raised>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-record-bg flex items-center justify-center">
              <Wallet size={17} className="text-record" />
            </div>
            <div>
              <p className="text-ink text-sm font-semibold">Meta de ahorro mensual</p>
              <p className="text-ink-dim text-xs mt-0.5">{goals?.monthlySavingsGoal ? `${goals.monthlySavingsGoal}€ / mes` : "Sin definir"}</p>
            </div>
          </div>
          <button onClick={() => { setGoalInput(String(goals?.monthlySavingsGoal ?? "")); setShowGoalForm(true); }} className="text-record text-xs font-semibold">
            Editar
          </button>
        </div>
        {showGoalForm ? (
          <div className="flex items-end gap-3 mt-4">
            <div className="flex-1">
              <TextField inputMode="decimal" suffix="€" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} autoFocus />
            </div>
            <Button label="Guardar" size="sm" onClick={saveGoal} />
          </div>
        ) : null}
      </Card>

      <div>
        <SectionHeader title="Gastos por mes" subtitle="Últimos 6 meses" />
        <Card raised>
          <LineChart data={chartData} color="#FFC94D" formatX={(v) => v.slice(5)} />
        </Card>
      </div>

      <div>
        <SectionHeader title="Este mes" />
        {recent.length === 0 ? (
          <Card raised>
            <EmptyState title="Sin gastos este mes" description="Registra un gasto para empezar a llevar la cuenta." />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((e) => (
              <Card key={e.id} raised className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold">
                    {e.amount.toFixed(2)}€{e.category ? ` · ${e.category}` : ""}
                  </p>
                  <p className="text-ink-faint text-xs mt-0.5 truncate">
                    {formatDateLong(e.date)}
                    {e.note ? ` · ${e.note}` : ""}
                    {!e.isEssential ? " · no esencial" : ""}
                  </p>
                </div>
                <button onClick={() => removeExpense(e.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-faint hover:text-danger shrink-0" aria-label="Borrar">
                  <Trash2 size={14} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
