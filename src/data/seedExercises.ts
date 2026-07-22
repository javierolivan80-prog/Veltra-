import type { Equipment, Exercise, MuscleGroup, StrengthPattern } from "@/types/models";

type SeedExercise = {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  pattern: StrengthPattern;
};

/**
 * Default exercise library. Kept intentionally curated (not exhaustive) —
 * Veltra surfaces exercises only when they're actually needed, never as a
 * browsable wall.
 */
export const SEED_EXERCISES: SeedExercise[] = [
  { id: "ex-bench-press", name: "Press banca", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["barbell"], pattern: "horizontal_press" },
  { id: "ex-incline-db-press", name: "Press inclinado con mancuernas", muscleGroups: ["chest", "shoulders"], equipment: ["dumbbell"], pattern: "horizontal_press" },
  { id: "ex-overhead-press", name: "Press militar", muscleGroups: ["shoulders", "triceps"], equipment: ["barbell"], pattern: "vertical_press" },
  { id: "ex-db-shoulder-press", name: "Press de hombro con mancuernas", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbell"], pattern: "vertical_press" },
  { id: "ex-dips", name: "Fondos en paralelas", muscleGroups: ["chest", "triceps"], equipment: ["bodyweight"], pattern: "horizontal_press" },
  { id: "ex-pushup", name: "Flexiones", muscleGroups: ["chest", "triceps"], equipment: ["bodyweight"], pattern: "horizontal_press" },
  { id: "ex-cable-fly", name: "Aperturas en polea", muscleGroups: ["chest"], equipment: ["cable"], pattern: "isolation" },
  { id: "ex-squat", name: "Sentadilla", muscleGroups: ["quads", "glutes"], equipment: ["barbell"], pattern: "squat" },
  { id: "ex-front-squat", name: "Sentadilla frontal", muscleGroups: ["quads", "glutes"], equipment: ["barbell"], pattern: "squat" },
  { id: "ex-leg-press", name: "Prensa de piernas", muscleGroups: ["quads", "glutes"], equipment: ["machine"], pattern: "squat" },
  { id: "ex-bulgarian-split-squat", name: "Zancada búlgara", muscleGroups: ["quads", "glutes"], equipment: ["dumbbell"], pattern: "squat" },
  { id: "ex-leg-extension", name: "Extensión de cuádriceps", muscleGroups: ["quads"], equipment: ["machine"], pattern: "isolation" },
  { id: "ex-deadlift", name: "Peso muerto", muscleGroups: ["back", "hamstrings", "glutes"], equipment: ["barbell"], pattern: "hinge" },
  { id: "ex-romanian-deadlift", name: "Peso muerto rumano", muscleGroups: ["hamstrings", "glutes"], equipment: ["barbell"], pattern: "hinge" },
  { id: "ex-leg-curl", name: "Curl femoral", muscleGroups: ["hamstrings"], equipment: ["machine"], pattern: "isolation" },
  { id: "ex-hip-thrust", name: "Hip thrust", muscleGroups: ["glutes"], equipment: ["barbell"], pattern: "hinge" },
  { id: "ex-calf-raise", name: "Elevación de talones", muscleGroups: ["calves"], equipment: ["machine"], pattern: "isolation" },
  { id: "ex-pullup", name: "Dominadas", muscleGroups: ["back", "biceps"], equipment: ["bodyweight"], pattern: "vertical_pull" },
  { id: "ex-lat-pulldown", name: "Jalón al pecho", muscleGroups: ["back", "biceps"], equipment: ["cable"], pattern: "vertical_pull" },
  { id: "ex-barbell-row", name: "Remo con barra", muscleGroups: ["back", "biceps"], equipment: ["barbell"], pattern: "horizontal_pull" },
  { id: "ex-seated-cable-row", name: "Remo en polea baja", muscleGroups: ["back"], equipment: ["cable"], pattern: "horizontal_pull" },
  { id: "ex-db-row", name: "Remo a una mano con mancuerna", muscleGroups: ["back"], equipment: ["dumbbell"], pattern: "horizontal_pull" },
  { id: "ex-face-pull", name: "Face pull", muscleGroups: ["shoulders", "back"], equipment: ["cable"], pattern: "isolation" },
  { id: "ex-lateral-raise", name: "Elevaciones laterales", muscleGroups: ["shoulders"], equipment: ["dumbbell"], pattern: "isolation" },
  { id: "ex-barbell-curl", name: "Curl de bíceps con barra", muscleGroups: ["biceps"], equipment: ["barbell"], pattern: "isolation" },
  { id: "ex-db-curl", name: "Curl de bíceps con mancuernas", muscleGroups: ["biceps"], equipment: ["dumbbell"], pattern: "isolation" },
  { id: "ex-hammer-curl", name: "Curl martillo", muscleGroups: ["biceps", "forearms"], equipment: ["dumbbell"], pattern: "isolation" },
  { id: "ex-triceps-pushdown", name: "Extensión de tríceps en polea", muscleGroups: ["triceps"], equipment: ["cable"], pattern: "isolation" },
  { id: "ex-skull-crusher", name: "Press francés", muscleGroups: ["triceps"], equipment: ["barbell"], pattern: "isolation" },
  { id: "ex-plank", name: "Plancha", muscleGroups: ["abs"], equipment: ["bodyweight"], pattern: "core" },
  { id: "ex-hanging-leg-raise", name: "Elevación de piernas colgado", muscleGroups: ["abs"], equipment: ["bodyweight"], pattern: "core" },
  { id: "ex-cable-crunch", name: "Crunch en polea", muscleGroups: ["abs"], equipment: ["cable"], pattern: "core" },
  { id: "ex-farmers-carry", name: "Farmer's walk", muscleGroups: ["forearms", "traps", "full_body"], equipment: ["dumbbell"], pattern: "carry" },
  { id: "ex-shrug", name: "Encogimientos", muscleGroups: ["traps"], equipment: ["barbell"], pattern: "isolation" },
  { id: "ex-kettlebell-swing", name: "Swing con kettlebell", muscleGroups: ["glutes", "hamstrings", "full_body"], equipment: ["kettlebell"], pattern: "hinge" },
  { id: "ex-goblet-squat", name: "Sentadilla goblet", muscleGroups: ["quads", "glutes"], equipment: ["kettlebell"], pattern: "squat" },
  { id: "ex-running", name: "Carrera continua", muscleGroups: ["cardio"], equipment: ["other"], pattern: "core" },
  { id: "ex-rowing-machine", name: "Remo (máquina de cardio)", muscleGroups: ["cardio", "back"], equipment: ["machine"], pattern: "core" },
];

export function toExercise(seed: SeedExercise, nowIso: string): Exercise {
  return {
    id: seed.id,
    name: seed.name,
    muscleGroups: seed.muscleGroups,
    equipment: seed.equipment,
    pattern: seed.pattern,
    notes: null,
    videoUrl: null,
    isFavorite: false,
    isCustom: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
