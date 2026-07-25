import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DailyNutrition, DetectedFood, FoodConversation, FoodMeal, FoodMessage, MessageRole, NutritionGoals } from "@/types/models";
import { dayLabel, todayKey } from "./dates";

const LOCAL_GOALS_ID = "local";

const DEFAULT_GOALS: NutritionGoals = { calories: 2400, protein: 180, carbs: 250, fat: 70, updatedAt: new Date(0).toISOString() };

// ---------------------------------------------------------------------
// Conversations (one per day)
// ---------------------------------------------------------------------

export async function listFoodConversations(): Promise<FoodConversation[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("food_conversations").select("*").order("date", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<FoodConversation>(r));
  }
  const db = await getDb();
  const all = await db.getAll("foodConversations");
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getFoodConversation(id: string): Promise<FoodConversation | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("food_conversations").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<FoodConversation>(data);
  }
  const db = await getDb();
  return (await db.get("foodConversations", id)) ?? null;
}

async function findConversationByDate(date: string): Promise<FoodConversation | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("food_conversations").select("*").eq("date", date).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<FoodConversation>(data);
  }
  const db = await getDb();
  const matches = await db.getAllFromIndex("foodConversations", "date", date);
  return matches[0] ?? null;
}

/** Resolves the chat thread for a day, creating it on first use — the user never makes threads by hand. */
export async function getOrCreateConversationForDate(date: string): Promise<FoodConversation> {
  const existing = await findConversationByDate(date);
  if (existing) return existing;

  const now = new Date().toISOString();
  const conversation: FoodConversation = { id: generateId(), date, title: dayLabel(date), createdAt: now, updatedAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    // A concurrent tab may have created today's row first; the (user_id, date)
    // unique constraint turns that race into a recoverable conflict.
    const { error } = await supabase.from("food_conversations").insert({ ...toSnakeCase(conversation), user_id: userId });
    if (error) {
      const raced = await findConversationByDate(date);
      if (raced) return raced;
      throw error;
    }
    return conversation;
  }
  const db = await getDb();
  await db.put("foodConversations", conversation);
  return conversation;
}

export async function getOrCreateTodayConversation(): Promise<FoodConversation> {
  return getOrCreateConversationForDate(todayKey());
}

async function touchConversation(id: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("food_conversations").update({ updated_at: now }).eq("id", id);
    return;
  }
  const db = await getDb();
  const conv = await db.get("foodConversations", id);
  if (conv) await db.put("foodConversations", { ...conv, updatedAt: now });
}

// ---------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------

export async function listFoodMessages(conversationId: string): Promise<FoodMessage[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("food_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<FoodMessage>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("foodMessages", "conversationId", conversationId);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addFoodMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  photos: string[] = [],
  mealId: string | null = null
): Promise<FoodMessage> {
  const now = new Date().toISOString();
  const message: FoodMessage = { id: generateId(), conversationId, role, content, photos, mealId, createdAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("food_messages").insert({ ...toSnakeCase(message), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("foodMessages", message);
  }
  await touchConversation(conversationId);
  return message;
}

// ---------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------

export interface MealInput {
  conversationId: string;
  messageId: string | null;
  date: string;
  note: string;
  foods: DetectedFood[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export async function addFoodMeal(input: MealInput): Promise<FoodMeal> {
  const meal: FoodMeal = { id: generateId(), createdAt: new Date().toISOString(), ...input };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("food_meals").insert({ ...toSnakeCase(meal), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("foodMeals", meal);
  }
  return meal;
}

export async function listMealsForConversation(conversationId: string): Promise<FoodMeal[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("food_meals").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<FoodMeal>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("foodMeals", "conversationId", conversationId);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listMealsForDate(date: string): Promise<FoodMeal[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("food_meals").select("*").eq("date", date).order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<FoodMeal>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("foodMeals", "date", date);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteFoodMeal(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("food_meals").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("foodMeals", id);
}

export type MealPatch = Partial<Pick<FoodMeal, "note" | "calories" | "protein" | "carbs" | "fat" | "fiber">>;

/** Lets the user correct a meal's macros/label when the AI estimate was off. */
export async function updateFoodMeal(id: string, patch: MealPatch): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("food_meals").update(toSnakeCase(patch)).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("foodMeals", id);
  if (existing) await db.put("foodMeals", { ...existing, ...patch });
}

/** Daily totals are always summed from meals — never stored — so they can never drift out of sync. */
export async function getDailyNutrition(date: string): Promise<DailyNutrition> {
  const meals = await listMealsForDate(date);
  return meals.reduce<DailyNutrition>(
    (acc, m) => ({
      date,
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
      mealCount: acc.mealCount + 1,
    }),
    { date, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealCount: 0 }
  );
}

// ---------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------

export async function getNutritionGoals(): Promise<NutritionGoals> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return DEFAULT_GOALS;
    const { data, error } = await supabase.from("nutrition_goals").select("*").eq("id", userData.user.id).maybeSingle();
    if (error || !data) return DEFAULT_GOALS;
    return toCamelCase<NutritionGoals>(data);
  }
  const db = await getDb();
  const stored = await db.get("nutritionGoals", LOCAL_GOALS_ID);
  if (!stored) return DEFAULT_GOALS;
  const { id: _id, ...goals } = stored;
  return goals;
}

export async function upsertNutritionGoals(goals: Pick<NutritionGoals, "calories" | "protein" | "carbs" | "fat">): Promise<NutritionGoals> {
  const now = new Date().toISOString();
  const next: NutritionGoals = { ...goals, updatedAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("nutrition_goals").upsert({ id: userId, ...toSnakeCase(next) });
    if (error) throw error;
    return next;
  }
  const db = await getDb();
  await db.put("nutritionGoals", { id: LOCAL_GOALS_ID, ...next });
  return next;
}
