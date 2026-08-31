"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as repo from "./repo";
import type { ExpenseInput } from "./repo";

export const financeKeys = {
  expenses: ["expenses"] as const,
  goals: ["financeGoals"] as const,
};

export function useExpenses() {
  return useQuery({ queryKey: financeKeys.expenses, queryFn: repo.listExpenses });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => repo.addExpense(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.expenses }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.expenses }),
  });
}

export function useFinanceGoals() {
  return useQuery({ queryKey: financeKeys.goals, queryFn: repo.getFinanceGoals });
}

export function useUpsertFinanceGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (monthlySavingsGoal: number | null) => repo.upsertFinanceGoals(monthlySavingsGoal),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.goals }),
  });
}
