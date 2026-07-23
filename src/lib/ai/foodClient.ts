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
      }
    } catch {
      analysis = null;
    }
  }

  if (!analysis) {
    analysis = analyzeFoodLocally(text, photos.length > 0);
  }

  let mealId: string | null = null;
  if (analysis.meal) {
    const meal = await addFoodMeal({
      conversationId,
      messageId: null,
      date,
      note: analysis.meal.note,
      foods: analysis.meal.foods,
      calories: analysis.meal.calories,
      protein: analysis.meal.protein,
      carbs: analysis.meal.carbs,
      fat: analysis.meal.fat,
      fiber: analysis.meal.fiber,
    });
    mealId = meal.id;
  }

  return addFoodMessage(conversationId, "assistant", analysis.reply, [], mealId);
}
