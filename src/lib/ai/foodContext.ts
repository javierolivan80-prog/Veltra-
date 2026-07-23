import { getDailyNutrition, getNutritionGoals } from "@/features/food/repo";
import { getProfile } from "@/features/profile/repo";

export interface FoodContext {
  profileSummary: string;
  goalsSummary: string;
  dailyProgressSummary: string;
}

/**
 * The grounded context both the food edge function and the offline estimator
 * use, so the assistant can talk about the day's progress ("te faltan 550 kcal")
 * using real numbers instead of guessing.
 */
export async function buildFoodContext(date: string): Promise<FoodContext> {
  const [profile, goals, totals] = await Promise.all([getProfile(), getNutritionGoals(), getDailyNutrition(date)]);

  const profileSummary = profile
    ? `${profile.fullName || "Usuario"}, ${profile.sex}, ${profile.bodyweightKg ?? "?"}kg, objetivo ${profile.goal}.`
    : "Perfil aún no configurado.";

  const goalsSummary = `Calorías ${goals.calories} kcal, proteínas ${goals.protein} g, carbohidratos ${goals.carbs} g, grasas ${goals.fat} g.`;

  const dailyProgressSummary =
    `Consumido hoy (antes de esta comida): ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)} g proteína, ` +
    `${Math.round(totals.carbs)} g carbohidratos, ${Math.round(totals.fat)} g grasa. ` +
    `Restante para el objetivo: ${Math.round(goals.calories - totals.calories)} kcal, ${Math.round(goals.protein - totals.protein)} g proteína.`;

  return { profileSummary, goalsSummary, dailyProgressSummary };
}
