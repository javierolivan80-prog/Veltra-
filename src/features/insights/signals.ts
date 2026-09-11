import { listDailyMoods } from "@/features/mood/repo";
import { listMeditationSessions } from "@/features/meditation/repo";
import { listSleepLogs } from "@/features/sleep/repo";
import { listAllSets, listRecentSessions } from "@/features/workouts/repo";
import { dayKey, shiftDayKey, todayKey } from "@/lib/date";
import type { MoodOption } from "@/types/models";

export interface Insight {
  id: string;
  text: string;
}

// Ventana de referencia y evidencia mínima antes de afirmar nada — mismo
// espíritu que features/review/rules.ts: nunca un patrón a partir de un
// puñado de días sueltos, y nunca comparar un lado con 1-2 días contra el
// otro con 20.
const WINDOW_DAYS = 30;
const MIN_BUCKET_DAYS = 3;
const MOOD_SCORE: Record<MoodOption, number> = { low: 1, flat: 2, good: 3, focused: 4 };

function avg(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/**
 * Cruza señales que hoy viven en módulos aislados (sueño, ánimo, actividad)
 * para encontrar patrones reales — nunca inventados: cada uno exige un
 * mínimo de días en ambos lados de la comparación y una diferencia clara
 * antes de convertirse en una frase. Sin evidencia suficiente, la lista sale
 * vacía; eso es una respuesta válida, no un fallo.
 */
export async function computeInsights(): Promise<Insight[]> {
  const cutoff = shiftDayKey(todayKey(), -WINDOW_DAYS);
  const [sleepLogs, moods, meditations, sessions, sets] = await Promise.all([
    listSleepLogs(),
    listDailyMoods(),
    listMeditationSessions(),
    listRecentSessions(90),
    listAllSets(),
  ]);

  const moodByDate = new Map(moods.filter((m) => m.date >= cutoff).map((m) => [m.date, MOOD_SCORE[m.mood]] as const));
  const sleepByDate = new Map(
    sleepLogs.filter((l) => l.quality != null && l.date >= cutoff).map((l) => [l.date, l.quality as number] as const)
  );

  const insights: Insight[] = [];

  // Señal 1: calidad de la noche de un día D frente al ánimo del día D+1 —
  // el sueño de anoche pesa en cómo te sientes hoy, no en cómo te sentiste
  // ayer por la tarde cuando te fuiste a la cama.
  const moodAfterGoodSleep: number[] = [];
  const moodAfterPoorSleep: number[] = [];
  for (const [date, quality] of sleepByDate) {
    const mood = moodByDate.get(shiftDayKey(date, 1));
    if (mood === undefined) continue;
    if (quality >= 7) moodAfterGoodSleep.push(mood);
    else if (quality <= 4) moodAfterPoorSleep.push(mood);
  }
  if (moodAfterGoodSleep.length >= MIN_BUCKET_DAYS && moodAfterPoorSleep.length >= MIN_BUCKET_DAYS) {
    const diff = avg(moodAfterGoodSleep) - avg(moodAfterPoorSleep);
    if (diff >= 0.6) {
      insights.push({
        id: "sleep-mood",
        text: `Los días después de dormir bien (7+/10) tu ánimo es claramente mejor que tras una noche floja (4 o menos) — ${moodAfterPoorSleep.length} noches flojas de referencia en el último mes.`,
      });
    }
  }

  // Señal 2: días con entrenamiento o meditación frente a días sin ninguna
  // de las dos, comparando el ánimo registrado ese mismo día.
  const activeDays = new Set<string>();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const key = dayKey(new Date(s.startedAt));
    if (key >= cutoff) activeDays.add(key);
  }
  for (const m of meditations) {
    const key = dayKey(new Date(m.completedAt));
    if (key >= cutoff) activeDays.add(key);
  }

  const moodOnActiveDays: number[] = [];
  const moodOnRestDays: number[] = [];
  for (const [date, mood] of moodByDate) {
    (activeDays.has(date) ? moodOnActiveDays : moodOnRestDays).push(mood);
  }
  if (moodOnActiveDays.length >= MIN_BUCKET_DAYS && moodOnRestDays.length >= MIN_BUCKET_DAYS) {
    const diff = avg(moodOnActiveDays) - avg(moodOnRestDays);
    if (diff >= 0.6) {
      insights.push({
        id: "activity-mood",
        text: "Los días que entrenas o meditas tu ánimo tiende a ser mejor que los días que no — no prueba causa, pero el patrón se repite en el último mes.",
      });
    }
  }

  // Señal 3: fatiga acumulada — entrenando muy cerca del fallo (RIR bajo) en
  // los últimos 10 días justo cuando el sueño ha bajado frente a la ventana
  // anterior. Ninguna señal sola basta (RIR bajo también pasa en una buena
  // racha de progreso, y el sueño varía por mil motivos); juntas son la
  // combinación real detrás de recomendar una descarga.
  const recentCutoff = shiftDayKey(todayKey(), -10);
  const priorCutoff = shiftDayKey(todayKey(), -30);
  const recentRirValues = sets.filter((s) => !s.isWarmup && s.rir !== null && s.completedAt.slice(0, 10) >= recentCutoff).map((s) => s.rir as number);

  const recentSleep = sleepLogs.filter((l) => l.quality != null && l.date >= recentCutoff).map((l) => l.quality as number);
  const priorSleep = sleepLogs.filter((l) => l.quality != null && l.date >= priorCutoff && l.date < recentCutoff).map((l) => l.quality as number);

  if (recentRirValues.length >= 12 && recentSleep.length >= MIN_BUCKET_DAYS && priorSleep.length >= MIN_BUCKET_DAYS) {
    const avgRir = avg(recentRirValues);
    const sleepDrop = avg(priorSleep) - avg(recentSleep);
    if (avgRir <= 1.2 && sleepDrop >= 1) {
      insights.push({
        id: "fatigue-deload",
        text: `Llevas 10 días entrenando muy cerca del fallo (RIR medio ${avgRir.toFixed(1)}) justo cuando tu sueño ha bajado — puede ser buen momento para una semana de descarga.`,
      });
    }
  }

  return insights;
}
