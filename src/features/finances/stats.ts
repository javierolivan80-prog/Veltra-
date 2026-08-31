import { shiftDayKey, todayKey } from "@/lib/date";
import type { Expense } from "@/types/models";

/** Días consecutivos (terminando hoy) sin ningún gasto marcado como "no
 *  esencial". 0 si no hay gastos registrados todavía. */
export function computeNoSpendStreak(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  const nonEssentialDates = new Set(expenses.filter((e) => !e.isEssential).map((e) => e.date));
  const firstDate = expenses.reduce((min, e) => (e.date < min ? e.date : min), expenses[0].date);

  let streak = 0;
  let cursor = todayKey();
  while (cursor >= firstDate) {
    if (nonEssentialDates.has(cursor)) break;
    streak++;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

export function totalForMonth(expenses: Expense[], monthKey: string = todayKey().slice(0, 7)): number {
  return expenses.filter((e) => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.amount, 0);
}

/** Total gastado por mes ("YYYY-MM"), últimos `months` meses, más antiguo primero. */
export function monthlyTotals(expenses: Expense[], months = 6): { month: string; total: number }[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys.map((month) => ({ month, total: totalForMonth(expenses, month) }));
}
