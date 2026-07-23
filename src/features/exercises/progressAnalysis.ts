import type { Exercise, ExperienceLevel, Profile, SetEntry } from "@/types/models";
import { oneRmSeries, repsSeries, volumeSeries, weightSeries, type SessionPoint } from "./stats";

export type ProgressMetric = "weight" | "reps" | "volume" | "1rm";
export type Timeframe = "30d" | "3m" | "6m" | "1y" | "all";

export const METRIC_LABEL: Record<ProgressMetric, string> = {
  weight: "Peso",
  reps: "Reps",
  volume: "Volumen",
  "1rm": "1RM est.",
};

export const METRIC_UNIT: Record<ProgressMetric, string> = { weight: "kg", reps: "reps", volume: "kg", "1rm": "kg" };

export const TIMEFRAMES: { value: Timeframe; label: string; days: number | null }[] = [
  { value: "30d", label: "30 días", days: 30 },
  { value: "3m", label: "3 meses", days: 90 },
  { value: "6m", label: "6 meses", days: 180 },
  { value: "1y", label: "1 año", days: 365 },
  { value: "all", label: "Todo", days: null },
];

/** Overall verdict — drives the traffic-light indicator. */
export type ProgressStatus = "progressing" | "stable" | "plateau" | "declining";

export const STATUS_META: Record<ProgressStatus, { label: string; tone: "green" | "yellow" | "red"; color: string }> = {
  progressing: { label: "En progresión", tone: "green", color: "#2ce6a0" },
  stable: { label: "Estable", tone: "yellow", color: "#ffc94d" },
  plateau: { label: "Estancamiento", tone: "red", color: "#ff5470" },
  declining: { label: "Retroceso", tone: "red", color: "#ff5470" },
};

export interface WindowChange {
  days: number;
  hasData: boolean;
  delta: number;
  pct: number | null;
}

export interface ProgressAnalysis {
  metric: ProgressMetric;
  points: { date: string; value: number }[];
  status: ProgressStatus;
  headline: string;
  pacePerMonth: number | null;
  pacePctPerMonth: number | null;
  windows: { d30: WindowChange; d90: WindowChange; d365: WindowChange };
  pr: { value: number; date: string } | null;
  latestIsPr: boolean;
  expected: { verdict: "faster" | "onpar" | "slower"; note: string } | null;
  recommendations: string[];
  sessionCount: number;
}

function metricSeries(sets: SetEntry[], exercise: Exercise, bodyweightKg: number | null, metric: ProgressMetric): SessionPoint[] {
  switch (metric) {
    case "weight":
      return weightSeries(sets);
    case "reps":
      return repsSeries(sets);
    case "volume":
      return volumeSeries(sets, exercise, bodyweightKg);
    case "1rm":
      return oneRmSeries(sets, exercise, bodyweightKg);
  }
}

function cutoffFor(timeframe: Timeframe): number | null {
  const tf = TIMEFRAMES.find((t) => t.value === timeframe);
  if (!tf || tf.days === null) return null;
  return Date.now() - tf.days * 86400000;
}

/** Least-squares slope of value vs. day-offset (units per day). */
function slopePerDay(points: SessionPoint[]): number | null {
  if (points.length < 2) return null;
  const t0 = new Date(points[0].date).getTime();
  const xs = points.map((p) => (new Date(p.date).getTime() - t0) / 86400000);
  const ys = points.map((p) => p.value);
  const n = points.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

function windowChange(full: SessionPoint[], days: number): WindowChange {
  const now = full.length > 0 ? full[full.length - 1].value : 0;
  const cutoff = Date.now() - days * 86400000;
  // The most recent point at or before the window start — the baseline to compare against.
  const baselinePoint = [...full].reverse().find((p) => new Date(p.date).getTime() <= cutoff);
  if (!baselinePoint || full.length < 2) return { days, hasData: false, delta: 0, pct: null };
  const delta = now - baselinePoint.value;
  const pct = baselinePoint.value > 0 ? (delta / baselinePoint.value) * 100 : null;
  return { days, hasData: true, delta: Math.round(delta * 10) / 10, pct: pct === null ? null : Math.round(pct * 10) / 10 };
}

// Rough expected monthly gain on strength (as % of estimated 1RM) by training age.
const EXPECTED_MONTHLY_PCT: Record<ExperienceLevel, number> = { beginner: 3, intermediate: 1.2, advanced: 0.4, elite: 0.15 };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function analyzeProgress(
  sets: SetEntry[],
  exercise: Exercise,
  profile: Profile | null,
  metric: ProgressMetric,
  timeframe: Timeframe
): ProgressAnalysis {
  const bodyweightKg = profile?.bodyweightKg ?? null;
  const full = metricSeries(sets, exercise, bodyweightKg, metric);
  const cutoff = cutoffFor(timeframe);
  const points = (cutoff === null ? full : full.filter((p) => new Date(p.date).getTime() >= cutoff)).map((p) => ({
    date: p.date,
    value: p.value,
  }));

  const base: ProgressAnalysis = {
    metric,
    points,
    status: "stable",
    headline: "",
    pacePerMonth: null,
    pacePctPerMonth: null,
    windows: {
      d30: { days: 30, hasData: false, delta: 0, pct: null },
      d90: { days: 90, hasData: false, delta: 0, pct: null },
      d365: { days: 365, hasData: false, delta: 0, pct: null },
    },
    pr: null,
    latestIsPr: false,
    expected: null,
    recommendations: [],
    sessionCount: full.length,
  };

  if (full.length === 0) {
    return { ...base, headline: `Aún no hay series registradas de ${exercise.name}.`, recommendations: ["Registra algunas sesiones y aquí verás tu evolución al detalle."] };
  }

  // PR is all-time (not limited to the selected timeframe).
  const prPoint = full.reduce((best, p) => (p.value > best.value ? p : best), full[0]);
  const latest = full[full.length - 1];
  const pr = { value: round1(prPoint.value), date: prPoint.date };
  const latestIsPr = latest.value >= prPoint.value;

  const windows = { d30: windowChange(full, 30), d90: windowChange(full, 90), d365: windowChange(full, 365) };

  // Pace + trend from the selected window (fall back to full history if the
  // window is too sparse to fit a line).
  const trendPoints = points.length >= 3 ? full.filter((p) => (cutoff === null ? true : new Date(p.date).getTime() >= cutoff)) : full;
  const slope = slopePerDay(trendPoints);
  const mean = trendPoints.reduce((s, p) => s + p.value, 0) / Math.max(1, trendPoints.length);
  const spanDays = trendPoints.length >= 2 ? (new Date(trendPoints[trendPoints.length - 1].date).getTime() - new Date(trendPoints[0].date).getTime()) / 86400000 : 0;

  let pacePerMonth: number | null = null;
  let pacePctPerMonth: number | null = null;
  if (slope !== null) {
    pacePerMonth = round1(slope * 30);
    pacePctPerMonth = mean > 0 ? round1((slope * 30 * 100) / mean) : null;
  }

  // Status: normalized total change across the window decides the traffic light.
  let status: ProgressStatus = "stable";
  const relChange = slope !== null && mean > 0 ? (slope * spanDays) / mean : 0;
  if (full.length < 3) {
    status = "stable";
  } else if (relChange > 0.03) {
    status = "progressing";
  } else if (relChange < -0.03) {
    status = "declining";
  } else {
    // Flat: a long flat stretch is a plateau; a short one is just "stable".
    status = spanDays >= 42 && trendPoints.length >= 4 ? "plateau" : "stable";
  }

  // Expected vs. actual — only meaningful for strength metrics.
  let expected: ProgressAnalysis["expected"] = null;
  if ((metric === "weight" || metric === "1rm") && profile && pacePctPerMonth !== null && full.length >= 3) {
    const target = EXPECTED_MONTHLY_PCT[profile.experienceLevel];
    if (pacePctPerMonth >= target * 1.15) {
      expected = { verdict: "faster", note: `Progresas más rápido de lo esperado para un nivel ${levelLabel(profile.experienceLevel)} (~${target}%/mes). Excelente.` };
    } else if (pacePctPerMonth <= target * 0.5) {
      expected = { verdict: "slower", note: `Progresas más lento de lo esperado para un nivel ${levelLabel(profile.experienceLevel)} (~${target}%/mes). Hay margen de mejora.` };
    } else {
      expected = { verdict: "onpar", note: `Tu ritmo está en línea con lo esperado para un nivel ${levelLabel(profile.experienceLevel)} (~${target}%/mes).` };
    }
  }

  const headline = buildHeadline(status, exercise, metric, latestIsPr);
  const recommendations = buildRecommendations(status, sets, metric, expected?.verdict ?? null, full.length);

  return { ...base, status, headline, pacePerMonth, pacePctPerMonth, windows, pr, latestIsPr, expected, recommendations };
}

function levelLabel(level: ExperienceLevel): string {
  return { beginner: "principiante", intermediate: "intermedio", advanced: "avanzado", elite: "elite" }[level];
}

function buildHeadline(status: ProgressStatus, exercise: Exercise, metric: ProgressMetric, latestIsPr: boolean): string {
  const name = exercise.name;
  const m = METRIC_LABEL[metric].toLowerCase();
  if (latestIsPr && status !== "declining") return `¡Tu última sesión de ${name} es un récord! Vas en la dirección correcta.`;
  switch (status) {
    case "progressing":
      return `Estás progresando en ${name}: tu ${m} sube de forma constante.`;
    case "declining":
      return `Tu ${m} en ${name} ha bajado últimamente — puede ser fatiga acumulada o una fase de descarga.`;
    case "plateau":
      return `Llevas un tiempo estancado en ${name}: el ${m} apenas se ha movido. Toca cambiar algo.`;
    default:
      return `Tu ${m} en ${name} se mantiene estable. Con unas sesiones más veremos la tendencia clara.`;
  }
}

function buildRecommendations(status: ProgressStatus, sets: SetEntry[], metric: ProgressMetric, expected: "faster" | "onpar" | "slower" | null, count: number): string[] {
  if (count < 3) return ["Necesitas al menos 3 sesiones registradas para un análisis fiable de la tendencia."];

  const recentRir = sets.filter((s) => s.rir !== null).slice(-6);
  const avgRir = recentRir.length > 0 ? recentRir.reduce((sum, s) => sum + (s.rir ?? 0), 0) / recentRir.length : null;
  const recs: string[] = [];

  if (status === "progressing") {
    recs.push("Mantén la progresión actual. Cuando completes el rango alto de repeticiones en todas las series, sube el peso (progresión doble).");
    if (avgRir !== null && avgRir >= 2.5) recs.push(`Tu RIR medio es ${avgRir.toFixed(1)}: aún tienes margen, puedes apretar un poco más.`);
  } else if (status === "declining") {
    recs.push("Programa una semana de descarga (deload): reduce el volumen ~40% manteniendo algo de intensidad para recuperar.");
    recs.push("Revisa sueño, nutrición y estrés — un retroceso suele venir de la recuperación, no del entrenamiento.");
  } else if (status === "plateau") {
    if (avgRir !== null && avgRir <= 0.5) {
      recs.push("Estás entrenando muy cerca del fallo de forma constante. Prueba una semana de descarga para desfatigar y volver más fuerte.");
    } else {
      recs.push("Rompe el estancamiento con progresión doble: sube repeticiones hasta el tope del rango y luego incrementa el peso.");
    }
    recs.push("Cambia una variable: añade una serie, ajusta la frecuencia semanal, o sustituye por una variante durante 3-4 semanas.");
  } else {
    recs.push("Sigue registrando con constancia. Aplica progresión doble: añade reps hasta el tope del rango y luego sube peso.");
  }

  if (expected === "slower" && status !== "declining") {
    recs.push("Tu ritmo va por debajo de lo esperado: asegúrate de llegar cerca del fallo (RIR 1-2) y de comer suficiente proteína.");
  }
  return recs;
}
