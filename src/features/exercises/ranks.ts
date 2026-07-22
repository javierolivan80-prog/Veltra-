import type { Exercise, ExperienceLevel, RankTier, Sex, StrengthPattern } from "@/src/types/models";

/**
 * Rank is only meaningful for compound movements that have established
 * strength standards. Isolation/core/cardio/carry work doesn't get ranked —
 * there's no honest population baseline to compare a lateral raise against.
 */
const RANKED_PATTERNS: StrengthPattern[] = ["squat", "hinge", "horizontal_press", "vertical_press", "horizontal_pull", "vertical_pull"];

export function isRankEligible(exercise: Pick<Exercise, "pattern">): boolean {
  return RANKED_PATTERNS.includes(exercise.pattern);
}

export const RANK_TIERS: RankTier[] = ["bronze", "silver", "gold", "platinum", "diamond", "elite"];

export const RANK_META: Record<RankTier, { label: string; emoji: string }> = {
  bronze: { label: "Bronce", emoji: "🥉" },
  silver: { label: "Plata", emoji: "🥈" },
  gold: { label: "Oro", emoji: "🥇" },
  platinum: { label: "Platino", emoji: "💎" },
  diamond: { label: "Diamante", emoji: "👑" },
  elite: { label: "Elite", emoji: "🚀" },
};

// Bodyweight-multiple thresholds to *enter* each tier (index 0 = Bronze).
// Approximate published strength-standard ratios (1RM / bodyweight) for adult lifters.
const THRESHOLDS: Record<Sex, Partial<Record<StrengthPattern, number[]>>> = {
  male: {
    squat: [0.5, 0.75, 1.25, 1.75, 2.25, 2.75],
    hinge: [0.6, 1.0, 1.5, 2.0, 2.5, 3.0],
    horizontal_press: [0.4, 0.6, 1.0, 1.35, 1.7, 2.0],
    vertical_press: [0.25, 0.4, 0.6, 0.85, 1.1, 1.3],
    horizontal_pull: [0.4, 0.6, 0.9, 1.2, 1.5, 1.8],
    vertical_pull: [0.7, 1.0, 1.3, 1.6, 2.0, 2.4],
  },
  female: {
    squat: [0.4, 0.6, 1.0, 1.4, 1.8, 2.2],
    hinge: [0.5, 0.8, 1.25, 1.65, 2.05, 2.5],
    horizontal_press: [0.25, 0.4, 0.65, 0.9, 1.15, 1.4],
    vertical_press: [0.15, 0.25, 0.4, 0.55, 0.7, 0.85],
    horizontal_pull: [0.25, 0.4, 0.6, 0.8, 1.0, 1.2],
    vertical_pull: [0.5, 0.7, 0.9, 1.15, 1.4, 1.7],
  },
  // No robust population baseline for a third option — fall back to a male/female blend.
  other: {
    squat: [0.45, 0.68, 1.13, 1.58, 2.03, 2.48],
    hinge: [0.55, 0.9, 1.38, 1.83, 2.28, 2.75],
    horizontal_press: [0.33, 0.5, 0.83, 1.13, 1.43, 1.7],
    vertical_press: [0.2, 0.33, 0.5, 0.7, 0.9, 1.08],
    horizontal_pull: [0.33, 0.5, 0.75, 1.0, 1.25, 1.5],
    vertical_pull: [0.6, 0.85, 1.1, 1.38, 1.7, 2.05],
  },
};

function ageFactor(birthDate: string | null): number {
  if (!birthDate) return 1;
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400000));
  if (age < 18) return 0.85;
  if (age <= 25) return 0.95;
  if (age <= 35) return 1.0;
  if (age <= 45) return 0.95;
  if (age <= 55) return 0.88;
  if (age <= 65) return 0.8;
  return 0.7;
}

// A total beginner's estimated 1RM is usually noisy/undersold (unfamiliar with the lift) —
// nudge the achieved score up slightly so rank reflects trajectory, not just testing inexperience.
function experienceNudge(level: ExperienceLevel): number {
  switch (level) {
    case "beginner":
      return 1.05;
    case "advanced":
      return 0.99;
    case "elite":
      return 0.97;
    default:
      return 1.0;
  }
}

// Standard normal CDF via the Abramowitz-Stegun approximation.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return 1 - p;
}

export interface RankInput {
  exercise: Pick<Exercise, "pattern">;
  oneRmKg: number;
  bodyweightKg: number;
  sex: Sex;
  birthDate: string | null;
  experienceLevel: ExperienceLevel;
}

export interface RankResult {
  tier: RankTier;
  percentile: number;
  score: number;
  nextTier: RankTier | null;
  progressToNext: number;
  amountToNextKg: number | null;
}

export function computeRank(input: RankInput): RankResult | null {
  const pattern = input.exercise.pattern as StrengthPattern;
  if (!RANKED_PATTERNS.includes(pattern) || input.bodyweightKg <= 0) return null;

  const table = THRESHOLDS[input.sex]?.[pattern];
  if (!table) return null;

  const factor = ageFactor(input.birthDate) * experienceNudge(input.experienceLevel);
  const adjustedThresholds = table.map((t) => t * factor);
  const ratio = input.oneRmKg / input.bodyweightKg;

  let tierIndex = -1;
  for (let i = 0; i < adjustedThresholds.length; i++) {
    if (ratio >= adjustedThresholds[i]) tierIndex = i;
  }
  const tier = tierIndex === -1 ? "bronze" : RANK_TIERS[tierIndex];
  const nextTier = tierIndex + 1 < RANK_TIERS.length ? RANK_TIERS[tierIndex + 1] : null;

  const floor = tierIndex === -1 ? 0 : adjustedThresholds[tierIndex];
  const ceiling = nextTier ? adjustedThresholds[tierIndex + 1] : floor * 1.15;
  const progressToNext = ceiling > floor ? Math.min(1, Math.max(0, (ratio - floor) / (ceiling - floor))) : 1;
  const amountToNextKg = nextTier ? Math.max(0, Math.round((ceiling * input.bodyweightKg - input.oneRmKg) * 10) / 10) : null;

  // Percentile: model the population around the Gold threshold (index 2) as the mean,
  // with the Bronze→Elite spread standing in for ~4 standard deviations.
  const mean = adjustedThresholds[2];
  const sd = (adjustedThresholds[5] - adjustedThresholds[0]) / 4;
  const z = sd > 0 ? (ratio - mean) / sd : 0;
  const percentile = Math.round(normalCdf(z) * 1000) / 10;

  return {
    tier,
    percentile: Math.min(99.9, Math.max(0.1, percentile)),
    score: Math.round(ratio * 100) / 100,
    nextTier,
    progressToNext,
    amountToNextKg,
  };
}
