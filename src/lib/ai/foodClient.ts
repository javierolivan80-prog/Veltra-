import { addFoodMeal, addFoodMessage, listFoodMessages } from "@/features/food/repo";
import { dataUrlToImageBlock } from "@/lib/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { FoodMessage } from "@/types/models";
import { buildFoodContext } from "./foodContext";
import { AI_FUNCTION_NAME } from "./functionName";
import { analyzeFoodLocally, type FoodAnalysis } from "./localFood";

export interface SendFoodMessageInput {
  conversationId: string;
  date: string;
  text: string;
  photos: string[]; // compressed data URLs
}

// TEMP DIAGNOSTIC — extracts the real reason an edge invoke failed.
async function describeInvokeError(err: unknown): Promise<string> {
  const context = (err as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return `${String(body.error)} (HTTP ${context.status})`;
    } catch {
      /* not JSON */
    }
    try {
      const text = await context.text();
      if (text) return `${text.slice(0, 300)} (HTTP ${context.status})`;
    } catch {
      /* ignore */
    }
    return `HTTP ${context.status}`;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Registers a food chat turn: stores the user's message, asks the AI (or the
 * offline estimator) to analyze text + photos, and — when the analysis yields
 * a meal — writes the meal record so the day's totals update. Returns the
 * assistant reply message. Falls back to the local estimator on any failure so
 * the chat always responds.
 */
export async function sendFoodMessage(input: SendFoodMessageInput): Promise<FoodMessage> {
  const { conversationId, date, text, photos } = input;
  await addFoodMessage(conversationId, "user", text, photos);

  let analysis: FoodAnalysis | null = null;
  let debugError: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseBrowserClient()!;
      const [history, context] = await Promise.all([listFoodMessages(conversationId), buildFoodContext(date)]);
      const images = photos.map(dataUrlToImageBlock).filter(Boolean);
      const { data, error } = await supabase.functions.invoke(AI_FUNCTION_NAME, {
        body: {
          type: "food",
          message: text,
          images,
          context,
          history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data && typeof data.reply === "string") {
        analysis = { reply: data.reply, meal: data.meal ?? null };
      } else if (data?.error) {
        debugError = String(data.error);
      }
    } catch (err) {
      analysis = null;
      // TEMP DIAGNOSTIC — surface the real edge-function failure instead of
      // silently dropping to the offline estimator. Remove once confirmed.
      debugError = await describeInvokeError(err);
    }
  }

  if (!analysis) {
    analysis = analyzeFoodLocally(text, photos.length > 0);
    if (debugError) analysis = { ...analysis, reply: `⚠️ [debug food] ${debugError}\n\n${analysis.reply}` };
  }

  let mealId: string | null = null;
  if (analysis.meal) {
    const n = (v: unknown) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    const foods = Array.isArray(analysis.meal.foods) ? analysis.meal.foods : [];
    const sum = (k: "calories" | "protein" | "carbs" | "fat" | "fiber") => foods.reduce((s, f) => s + n((f as any)?.[k]), 0);
    // Trust provided totals, fall back to summing foods when they're zero — so a
    // slightly-inconsistent AI response still updates the daily totals.
    const calories = n(analysis.meal.calories) || sum("calories");
    const protein = n(analysis.meal.protein) || sum("protein");
    const carbs = n(analysis.meal.carbs) || sum("carbs");
    const fat = n(analysis.meal.fat) || sum("fat");
    const fiber = n(analysis.meal.fiber) || sum("fiber");

    // Only register something with actual nutrition — never a ghost 0-kcal meal.
    if (calories > 0 || foods.length > 0) {
      const meal = await addFoodMeal({
        conversationId,
        messageId: null,
        date,
        note: analysis.meal.note || "Comida",
        foods,
        calories,
        protein,
        carbs,
        fat,
        fiber,
      });
      mealId = meal.id;
    }
  }

  return addFoodMessage(conversationId, "assistant", analysis.reply, [], mealId);
}
