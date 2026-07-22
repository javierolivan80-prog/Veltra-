import { listPersonalRecords } from "@/src/features/exercises/prs";
import { getExercise, listExercises } from "@/src/features/exercises/repo";
import { computeRank, isRankEligible } from "@/src/features/exercises/ranks";
import { getSetsForExercise, listRecentSessions, getExerciseIdsInSession } from "@/src/features/workouts/repo";
import { listMemoryFacts } from "@/src/features/coach/repo";
import { getProfile, listInjuries } from "@/src/features/profile/repo";
import { getDb } from "@/src/lib/db/client";
import { weightSeries, weeklyFrequency } from "@/src/features/exercises/stats";
import type { Exercise } from "@/src/types/models";

export interface CoachContext {
  profileSummary: string;
  injuriesSummary: string;
  memorySummary: string;
  recentSessionsSummary: string;
  strongestLifts: string;
  laggingMuscleGroups: string;
}

/**
 * Assembles the same grounded context both the edge-function prompt and the
 * offline fallback coach use — the single place that decides what the AI is
 * "allowed to know" about the user, so it never has to invent anything.
 */
export async function buildCoachContext(): Promise<CoachContext> {
  const [profile, injuries, memory, recentSessions, exercises] = await Promise.all([
    getProfile(),
    listInjuries(),
    listMemoryFacts(),
    listRecentSessions(8),
    listExercises(),
  ]);

  const profileSummary = profile
    ? `${profile.fullName}, ${profile.sex}, ${profile.bodyweightKg ?? "?"}kg, nivel ${profile.experienceLevel}, objetivo ${profile.goal}.`
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

  const db = await getDb();
  const rankable = exercises.filter(isRankEligible);
  const scored: { exercise: Exercise; freq: number; trendUp: boolean }[] = [];
  for (const ex of rankable) {
    const sets = await getSetsForExercise(ex.id);
    if (sets.length === 0) continue;
    const freq = weeklyFrequency(sets, 8);
    const series = weightSeries(sets);
    const trendUp = series.length >= 2 && series[series.length - 1].value > series[0].value;
    scored.push({ exercise: ex, freq, trendUp });
  }
  const lagging = [...scored].sort((a, b) => a.freq - b.freq).slice(0, 3);
  const laggingMuscleGroups = lagging.map((s) => `${s.exercise.name} (${s.freq}x/semana)`).join(", ") || "Sin suficientes datos.";

  const prSummaries: string[] = [];
  for (const ex of rankable.slice(0, 8)) {
    const prs = await listPersonalRecords(db, ex.id);
    const oneRm = prs.find((p) => p.type === "1rm");
    if (oneRm) prSummaries.push(`${ex.name}: ${oneRm.value}kg 1RM est.`);
  }
  const strongestLifts = prSummaries.join(" | ") || "Sin PRs todavía.";

  return { profileSummary, injuriesSummary, memorySummary, recentSessionsSummary, strongestLifts, laggingMuscleGroups };
}

export async function suggestNextWeight(exerciseId: string): Promise<{ weight: number; reps: number; reasoning: string } | null> {
  const exercise = await getExercise(exerciseId);
  if (!exercise) return null;
  const sets = await getSetsForExercise(exerciseId);
  if (sets.length === 0) return null;
  const last = sets[sets.length - 1];
  const recentAvgRir = sets.slice(-3).reduce((sum, s) => sum + (s.rir ?? 2), 0) / Math.min(3, sets.length);

  if (recentAvgRir >= 3) {
    return { weight: Math.round((last.weightKg * 1.025) * 4) / 4, reps: last.reps, reasoning: "tus últimas series se quedaron con margen (RIR alto), así que hay hueco para subir carga" };
  }
  if (recentAvgRir <= 0.5) {
    return { weight: last.weightKg, reps: last.reps, reasoning: "tus últimas series estuvieron al fallo o muy cerca, mantén el peso y consolida técnica" };
  }
  return { weight: last.weightKg, reps: last.reps, reasoning: "tu esfuerzo reciente está en un buen rango, repite el peso y busca una repetición más" };
}
