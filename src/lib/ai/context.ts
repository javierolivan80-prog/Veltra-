import { listPersonalRecords } from "@/features/exercises/prs";
import { listExercises } from "@/features/exercises/repo";
import { isRankEligible } from "@/features/exercises/ranks";
import { getSetsForExercise, listRecentSessions, getExerciseIdsInSession } from "@/features/workouts/repo";
import { listMemoryFacts } from "@/features/coach/repo";
import { dayKey } from "@/features/food/dates";
import { getDailyNutrition, getNutritionGoals } from "@/features/food/repo";
import { computeInsights } from "@/features/insights/signals";
import { getProfile, listInjuries } from "@/features/profile/repo";
import { weeklyFrequency } from "@/features/exercises/stats";
import type { Exercise } from "@/types/models";

export interface CoachContext {
  profileSummary: string;
  injuriesSummary: string;
  memorySummary: string;
  recentSessionsSummary: string;
  strongestLifts: string;
  laggingMuscleGroups: string;
  nutritionSummary: string;
  wellbeingSummary: string;
}

/**
 * Last few days of nutrition vs. goals, so the coach can connect training to
 * eating ("llevas 3 días por debajo de proteína") instead of treating Veltra
 * Food as a separate app. Days with nothing logged are skipped rather than
 * counted as zero, which would make the average lie.
 */
async function buildNutritionSummary(): Promise<string> {
  try {
    const goals = await getNutritionGoals();
    const days: { key: string; totals: Awaited<ReturnType<typeof getDailyNutrition>> }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      days.push({ key, totals: await getDailyNutrition(key) });
    }

    const logged = days.filter((d) => d.totals.mealCount > 0);
    if (logged.length === 0) return "El usuario no ha registrado comidas todavía en Veltra Food.";

    const today = days[0].totals;
    const avg = (pick: (t: (typeof logged)[number]["totals"]) => number) =>
      Math.round(logged.reduce((sum, d) => sum + pick(d.totals), 0) / logged.length);

    const todayLine =
      today.mealCount > 0
        ? `Hoy lleva ${Math.round(today.calories)} kcal, ${Math.round(today.protein)}g proteína, ${Math.round(today.carbs)}g carbos, ${Math.round(today.fat)}g grasa (${today.mealCount} comidas).`
        : "Hoy todavía no ha registrado ninguna comida.";

    return (
      `Objetivos diarios: ${goals.calories} kcal, ${goals.protein}g proteína, ${goals.carbs}g carbos, ${goals.fat}g grasa. ` +
      `${todayLine} ` +
      `Media de los últimos ${logged.length} días con registro: ${avg((t) => t.calories)} kcal, ${avg((t) => t.protein)}g proteína, ` +
      `${avg((t) => t.carbs)}g carbos, ${avg((t) => t.fat)}g grasa.`
    );
  } catch {
    // Nutrition is supporting context — never let it break the coach.
    return "Sin datos de nutrición disponibles.";
  }
}

/**
 * Cruces entre sueño, ánimo y actividad (features/insights) — el mismo
 * cálculo que la tarjeta "Patrón detectado" de Hoy, para que el coach ya
 * conozca el patrón sin que el usuario tenga que repetírselo en el chat.
 */
async function buildWellbeingSummary(): Promise<string> {
  try {
    const insights = await computeInsights();
    if (insights.length === 0) return "Sin patrones claros todavía entre sueño, ánimo y actividad (hace falta más historial para afirmar algo).";
    return insights.map((i) => `- ${i.text}`).join("\n");
  } catch {
    return "Sin datos de bienestar disponibles.";
  }
}

/**
 * Assembles the same grounded context both the edge-function prompt and the
 * offline fallback coach use — the single place that decides what the AI is
 * "allowed to know" about the user, so it never has to invent anything.
 */
export async function buildCoachContext(): Promise<CoachContext> {
  const [profile, injuries, memory, recentSessions, exercises, nutritionSummary, wellbeingSummary] = await Promise.all([
    getProfile(),
    listInjuries(),
    listMemoryFacts(),
    listRecentSessions(8),
    listExercises(),
    buildNutritionSummary(),
    buildWellbeingSummary(),
  ]);

  const profileSummary = profile
    ? `${profile.fullName}, ${profile.sex}, ${profile.bodyweightKg ?? "?"}kg, nivel ${profile.experienceLevel}, objetivo ${profile.goal}, entrena ${profile.trainingDaysPerWeek} días/semana.`
    : "Perfil aún no configurado.";

  const injuriesSummary = injuries.filter((i) => i.active).map((i) => `${i.area}: ${i.note}`).join(" | ") || "Sin lesiones activas registradas.";

  const memorySummary = memory.map((m) => `- ${m.content}`).join("\n") || "Sin datos de memoria todavía.";

  const sessionLines: string[] = [];
  for (const session of recentSessions.slice(0, 5)) {
    const exIds = await getExerciseIdsInSession(session.id);
    const names = exIds.map((id) => exercises.find((e) => e.id === id)?.name).filter(Boolean);
    sessionLines.push(`${session.startedAt.slice(0, 10)} — ${session.routineName ?? "Sesión libre"}: ${names.join(", ")}`);
  }
  const recentSessionsSummary = sessionLines.join("\n") || "Sin sesiones registradas todavía.";

  const rankable = exercises.filter(isRankEligible);
  const scored: { exercise: Exercise; freq: number }[] = [];
  for (const ex of rankable) {
    const sets = await getSetsForExercise(ex.id);
    if (sets.length === 0) continue;
    const freq = weeklyFrequency(sets, 8);
    scored.push({ exercise: ex, freq });
  }
  const lagging = [...scored].sort((a, b) => a.freq - b.freq).slice(0, 3);
  const laggingMuscleGroups = lagging.map((s) => `${s.exercise.name} (${s.freq}x/semana)`).join(", ") || "Sin suficientes datos.";

  const prSummaries: string[] = [];
  for (const ex of rankable.slice(0, 8)) {
    const prs = await listPersonalRecords(ex.id);
    const oneRm = prs.find((p) => p.type === "1rm");
    if (oneRm) prSummaries.push(`${ex.name}: ${oneRm.value}kg 1RM est.`);
  }
  const strongestLifts = prSummaries.join(" | ") || "Sin PRs todavía.";

  return { profileSummary, injuriesSummary, memorySummary, recentSessionsSummary, strongestLifts, laggingMuscleGroups, nutritionSummary, wellbeingSummary };
}

export async function suggestNextWeight(exerciseId: string): Promise<{ weight: number; reps: number; reasoning: string } | null> {
  const exercises = await listExercises();
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) return null;
  const sets = await getSetsForExercise(exerciseId);
  if (sets.length === 0) return null;
  const last = sets[sets.length - 1];
  const recentAvgRir = sets.slice(-3).reduce((sum, s) => sum + (s.rir ?? 2), 0) / Math.min(3, sets.length);

  if (recentAvgRir >= 3) {
    return { weight: Math.round(last.weightKg * 1.025 * 4) / 4, reps: last.reps, reasoning: "tus últimas series se quedaron con margen (RIR alto), así que hay hueco para subir carga" };
  }
  if (recentAvgRir <= 0.5) {
    return { weight: last.weightKg, reps: last.reps, reasoning: "tus últimas series estuvieron al fallo o muy cerca, mantén el peso y consolida técnica" };
  }
  return { weight: last.weightKg, reps: last.reps, reasoning: "tu esfuerzo reciente está en un buen rango, repite el peso y busca una repetición más" };
}

