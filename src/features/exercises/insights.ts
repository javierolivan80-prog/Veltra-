import type { Exercise, SetEntry } from "@/src/types/models";
import { oneRmSeries, weeklyFrequency, weightSeries } from "./stats";
import { formatWeight } from "@/src/lib/format";

/** Deterministic, data-grounded blurb — the same rule the AI coach follows: no numbers that aren't actually in the local history. */
export function explainExerciseProgress(exercise: Exercise, sets: SetEntry[]): string {
  if (sets.length === 0) {
    return `Todavía no tienes series registradas de ${exercise.name}. En cuanto empieces, Veltra analizará tu progreso automáticamente.`;
  }

  const oneRm = oneRmSeries(sets, exercise, null);
  const freq = weeklyFrequency(sets, 8);
  const avgRir = sets.filter((s) => s.rir !== null).slice(-6);
  const avgRirValue = avgRir.length > 0 ? avgRir.reduce((sum, s) => sum + (s.rir ?? 0), 0) / avgRir.length : null;

  const parts: string[] = [];

  if (oneRm.length >= 2) {
    const change = ((oneRm[oneRm.length - 1].value - oneRm[0].value) / oneRm[0].value) * 100;
    if (Math.abs(change) < 1) {
      parts.push(`Tu 1RM estimado en ${exercise.name} se mantiene estable en torno a ${formatWeight(oneRm[oneRm.length - 1].value)}kg.`);
    } else if (change > 0) {
      parts.push(`Tu 1RM estimado ha subido un ${change.toFixed(0)}% desde tu primer registro, hasta ${formatWeight(oneRm[oneRm.length - 1].value)}kg.`);
    } else {
      parts.push(`Tu 1RM estimado ha bajado un ${Math.abs(change).toFixed(0)}% recientemente — puede ser fatiga acumulada o una fase de descarga.`);
    }
  }

  if (freq > 0) {
    parts.push(`Lo entrenas ${freq}x por semana de media en los últimos meses.`);
  }

  if (avgRirValue !== null) {
    if (avgRirValue <= 1) parts.push(`Tu RIR medio reciente es ${avgRirValue.toFixed(1)} — estás entrenando cerca del fallo.`);
    else if (avgRirValue >= 3) parts.push(`Tu RIR medio reciente es ${avgRirValue.toFixed(1)} — tienes margen para apretar un poco más.`);
    else parts.push(`Tu RIR medio reciente es ${avgRirValue.toFixed(1)}, un rango de intensidad sólido.`);
  }

  return parts.join(" ");
}

export function monthComparison(sets: SetEntry[], exercise: Exercise): { thisMonth: number; lastMonth: number; deltaPct: number | null } {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const wSeries = weightSeries(sets);
  const thisMonthPoints = wSeries.filter((p) => new Date(p.date).getTime() >= startOfThisMonth);
  const lastMonthPoints = wSeries.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= startOfLastMonth && t < startOfThisMonth;
  });

  const avg = (points: typeof wSeries) => (points.length > 0 ? points.reduce((s, p) => s + p.value, 0) / points.length : 0);
  const thisMonth = avg(thisMonthPoints);
  const lastMonth = avg(lastMonthPoints);
  const deltaPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  return { thisMonth, lastMonth, deltaPct };
}
