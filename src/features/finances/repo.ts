import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Expense, FinanceGoals } from "@/types/models";

const LOCAL_GOALS_ID = "local";
const DEFAULT_GOALS: FinanceGoals = { monthlySavingsGoal: null, updatedAt: new Date(0).toISOString() };

export interface ExpenseInput {
  amount: number;
  category: string | null;
  date: string;
  note: string | null;
  isEssential: boolean;
}

// --- Gastos ---

export async function listExpenses(): Promise<Expense[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<Expense>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("expenses", "date");
  return all;
}

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  const expense: Expense = {
    id: generateId(),
    amount: input.amount,
    category: input.category,
    date: input.date,
    note: input.note,
    isEssential: input.isEssential,
    createdAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("expenses").insert({ ...toSnakeCase(expense), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("expenses", expense);
  }
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("expenses").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("expenses", id);
}

// --- Meta de ahorro mensual ---

export async function getFinanceGoals(): Promise<FinanceGoals> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return DEFAULT_GOALS;
    const { data, error } = await supabase.from("finance_goals").select("*").eq("id", userData.user.id).maybeSingle();
    if (error || !data) return DEFAULT_GOALS;
    return toCamelCase<FinanceGoals>(data);
  }
  const db = await getDb();
  const stored = await db.get("financeGoals", LOCAL_GOALS_ID);
  if (!stored) return DEFAULT_GOALS;
  const { id: _id, ...goals } = stored;
  return goals;
}

export async function upsertFinanceGoals(monthlySavingsGoal: number | null): Promise<FinanceGoals> {
  const next: FinanceGoals = { monthlySavingsGoal, updatedAt: new Date().toISOString() };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("finance_goals").upsert({ id: userId, ...toSnakeCase(next) });
    if (error) throw error;
    return next;
  }
  const db = await getDb();
  await db.put("financeGoals", { id: LOCAL_GOALS_ID, ...next });
  return next;
}
