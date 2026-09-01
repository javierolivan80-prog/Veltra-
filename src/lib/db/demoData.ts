import type { IDBPDatabase } from "idb";
import { generateId } from "@/lib/id";
import { estimatedOneRepMax } from "@/features/exercises/stats";
import type { VeltraDB } from "./schema";
import { STORE_NAMES } from "./schema";

type Progression = "weight" | "reps";

interface TrackedExercise {
  id: string;
  baseWeight: number;
  baseReps: number;
  increment: number;
  progression: Progression;
  restSeconds: number;
}

const PUSH: TrackedExercise[] = [
  { id: "ex-bench-press", baseWeight: 60, baseReps: 8, increment: 1.25, progression: "weight", restSeconds: 120 },
  { id: "ex-overhead-press", baseWeight: 35, baseReps: 8, increment: 1.25, progression: "weight", restSeconds: 120 },
  { id: "ex-triceps-pushdown", baseWeight: 25, baseReps: 12, increment: 1, progression: "weight", restSeconds: 75 },
  { id: "ex-lateral-raise", baseWeight: 10, baseReps: 12, increment: 0.5, progression: "weight", restSeconds: 60 },
];

const PULL: TrackedExercise[] = [
  { id: "ex-pullup", baseWeight: 0, baseReps: 6, increment: 0, progression: "reps", restSeconds: 120 },
  { id: "ex-barbell-row", baseWeight: 50, baseReps: 8, increment: 1.25, progression: "weight", restSeconds: 120 },
  { id: "ex-barbell-curl", baseWeight: 20, baseReps: 10, increment: 1, progression: "weight", restSeconds: 75 },
  { id: "ex-face-pull", baseWeight: 15, baseReps: 15, increment: 1, progression: "weight", restSeconds: 60 },
];

const LEGS: TrackedExercise[] = [
  { id: "ex-squat", baseWeight: 70, baseReps: 6, increment: 2.5, progression: "weight", restSeconds: 150 },
  { id: "ex-romanian-deadlift", baseWeight: 60, baseReps: 8, increment: 2.5, progression: "weight", restSeconds: 120 },
  { id: "ex-leg-press", baseWeight: 100, baseReps: 10, increment: 5, progression: "weight", restSeconds: 100 },
  { id: "ex-calf-raise", baseWeight: 40, baseReps: 15, increment: 2.5, progression: "weight", restSeconds: 60 },
];

const DAYS: { name: string; exercises: TrackedExercise[] }[] = [
  { name: "Push", exercises: PUSH },
  { name: "Pull", exercises: PULL },
  { name: "Legs", exercises: LEGS },
];

const WEEKS = 10;
const SESSIONS_PER_WEEK = 3;
const BODYWEIGHT_EXERCISE_IDS = new Set(["ex-pullup"]);
const DEMO_BODYWEIGHT_KG = 78.4;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function oneRm(exerciseId: string, weight: number, reps: number) {
  const isBodyweight = BODYWEIGHT_EXERCISE_IDS.has(exerciseId);
  return estimatedOneRepMax({ equipment: isBodyweight ? ["bodyweight"] : ["barbell"] }, weight, reps, isBodyweight ? DEMO_BODYWEIGHT_KG : null);
}

export async function isDemoDataLoaded(db: IDBPDatabase<VeltraDB>): Promise<boolean> {
  const count = await db.count("workoutSessions");
  return count > 0;
}

export async function seedDemoData(db: IDBPDatabase<VeltraDB>) {
  const now = new Date();
  const nowIso = now.toISOString();

  await db.put("profile", {
    id: "local",
    fullName: "Alex Veltra",
    email: "demo@veltra.app",
    sex: "male",
    birthDate: "1996-04-12",
    heightCm: 178,
    bodyweightKg: 78.4,
    experienceLevel: "intermediate",
    goal: "hypertrophy",
    trainingDaysPerWeek: 3,
    equipmentAvailable: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell"],
    onboardingCompleted: true,
    targetWeightKg: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.put("injuries", {
    id: generateId(),
    area: "shoulder_right",
    note: "Molestias leves en el hombro derecho con presses por encima de la cabeza.",
    active: true,
    createdAt: nowIso,
  });

  let bw = 76.4;
  for (let w = WEEKS - 1; w >= 0; w--) {
    const date = new Date(now);
    date.setDate(date.getDate() - w * 7);
    bw += rand(-0.3, 0.55);
    await db.put("bodyWeightLogs", { id: generateId(), date: date.toISOString(), weightKg: Math.round(bw * 10) / 10 });
  }

  const routineIds: Record<string, string> = {};
  for (const day of DAYS) {
    const routineId = generateId();
    routineIds[day.name] = routineId;
    await db.put("routines", {
      id: routineId,
      name: `${day.name} Day`,
      description: `Rutina de empuje/tirón/pierna — día de ${day.name}`,
      isTemplate: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i];
      await db.put("routineExercises", {
        id: generateId(),
        routineId,
        exerciseId: ex.id,
        order: i,
        targetSets: 3,
        targetRepsMin: Math.max(4, ex.baseReps - 3),
        targetRepsMax: ex.baseReps + 3,
        restSeconds: ex.restSeconds,
      });
    }
  }

  const occurrenceCount: Record<string, number> = {};
  const allSetsByExercise: Record<string, { weight: number; reps: number; completedAt: string; id: string; sessionId: string }[]> = {};

  const totalSessions = WEEKS * SESSIONS_PER_WEEK;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - Math.floor((totalSessions / SESSIONS_PER_WEEK) * 7));

  for (let s = 0; s < totalSessions; s++) {
    const day = DAYS[s % DAYS.length];
    const sessionDate = new Date(startDate);
    sessionDate.setDate(sessionDate.getDate() + Math.floor(s * (7 / SESSIONS_PER_WEEK)));
    sessionDate.setHours(18, rand(0, 45), 0, 0);
    if (sessionDate > now) break;

    const sessionId = generateId();
    const durationMin = Math.round(rand(48, 72));
    const endedAt = new Date(sessionDate.getTime() + durationMin * 60000);

    await db.put("workoutSessions", {
      id: sessionId,
      routineId: routineIds[day.name],
      routineName: `${day.name} Day`,
      status: "completed",
      startedAt: sessionDate.toISOString(),
      endedAt: endedAt.toISOString(),
    });

    for (const ex of day.exercises) {
      const occurrence = occurrenceCount[ex.id] ?? 0;
      occurrenceCount[ex.id] = occurrence + 1;

      const progressSteps = Math.floor(occurrence / 3);
      const isDeload = occurrence > 0 && occurrence % 7 === 6;

      for (let setNum = 1; setNum <= 3; setNum++) {
        let weight = ex.baseWeight;
        let reps = ex.baseReps;

        if (ex.progression === "weight") {
          weight = ex.baseWeight + progressSteps * ex.increment + rand(-0.5, 0.5);
          weight = Math.max(ex.baseWeight, Math.round(weight * 4) / 4);
          if (isDeload) weight *= 0.85;
          reps = Math.max(1, Math.round(ex.baseReps + rand(-1, 1) - (setNum === 3 ? rand(0, 1) : 0)));
        } else {
          reps = Math.round(ex.baseReps + progressSteps * 1.4 + rand(-1, 1));
          reps = Math.min(15, Math.max(ex.baseReps, reps));
          if (isDeload) reps = Math.max(4, reps - 3);
        }

        const rir = Math.round(rand(0, 3));
        const setId = generateId();
        const completedAt = new Date(sessionDate.getTime() + setNum * 4 * 60000).toISOString();

        await db.put("setEntries", {
          id: setId,
          sessionId,
          exerciseId: ex.id,
          setNumber: setNum,
          weightKg: weight,
          reps,
          rir,
          rpe: Math.max(5, 10 - rir),
          isWarmup: false,
          completedAt,
        });

        if (!allSetsByExercise[ex.id]) allSetsByExercise[ex.id] = [];
        allSetsByExercise[ex.id].push({ weight, reps, completedAt, id: setId, sessionId });
      }
    }
  }

  for (const [exerciseId, sets] of Object.entries(allSetsByExercise)) {
    const sorted = [...sets].sort((a, b) => a.completedAt.localeCompare(b.completedAt));

    let maxWeight = -Infinity;
    let maxWeightSet = sorted[0];
    let max1rm = -Infinity;
    let max1rmSet = sorted[0];
    let maxReps = -Infinity;
    let maxRepsSet = sorted[0];

    for (const set of sorted) {
      if (set.weight > maxWeight) {
        maxWeight = set.weight;
        maxWeightSet = set;
      }
      const estimated1Rm = oneRm(exerciseId, set.weight, set.reps);
      if (estimated1Rm > max1rm) {
        max1rm = estimated1Rm;
        max1rmSet = set;
      }
      if (set.reps > maxReps) {
        maxReps = set.reps;
        maxRepsSet = set;
      }
    }

    await db.put("personalRecords", { id: generateId(), exerciseId, type: "weight", value: maxWeight, previousValue: null, achievedAt: maxWeightSet.completedAt, setEntryId: maxWeightSet.id });
    await db.put("personalRecords", { id: generateId(), exerciseId, type: "1rm", value: Math.round(max1rm * 10) / 10, previousValue: null, achievedAt: max1rmSet.completedAt, setEntryId: max1rmSet.id });
    await db.put("personalRecords", { id: generateId(), exerciseId, type: "reps", value: maxReps, previousValue: null, achievedAt: maxRepsSet.completedAt, setEntryId: maxRepsSet.id });
  }

  for (const id of ["ex-bench-press", "ex-squat", "ex-pullup"]) {
    const existing = await db.get("exercises", id);
    if (existing) await db.put("exercises", { ...existing, isFavorite: true });
  }

  const memoryFacts: { content: string; category: "injury" | "goal" | "preference" | "constraint" }[] = [
    { content: "Tiene molestias leves en el hombro derecho con presses por encima de la cabeza — priorizar variantes con mancuerna o ángulo neutro.", category: "injury" },
    { content: "Objetivo actual: hipertrofia / fase de volumen.", category: "goal" },
    { content: "Entrena 3 veces por semana en formato Push / Pull / Legs.", category: "preference" },
    { content: "Tiene acceso a barra, mancuernas, máquinas, poleas, kettlebell y peso corporal.", category: "constraint" },
  ];
  for (const fact of memoryFacts) {
    await db.put("memoryFacts", { id: generateId(), content: fact.content, category: fact.category, active: true, createdAt: nowIso });
  }

  const conversations: { title: string; pinned: boolean; daysAgo: number; messages: { role: "user" | "assistant"; content: string }[] }[] = [
    {
      title: "Lesión hombro",
      pinned: true,
      daysAgo: 52,
      messages: [
        { role: "user", content: "Tengo molestias en el hombro derecho cuando hago press por encima de la cabeza." },
        { role: "assistant", content: "Gracias por decírmelo — lo voy a recordar para todas tus rutinas futuras. Por ahora, en press militar reduce el rango si notas pinchazo y prueba con mancuernas en agarre neutro. Si la molestia persiste más de dos semanas, valórala con un fisioterapeuta." },
      ],
    },
    {
      title: "Mejorar banca",
      pinned: true,
      daysAgo: 18,
      messages: [
        { role: "user", content: "¿Por qué no progreso en press banca?" },
        { role: "assistant", content: "Tu press banca ha subido de 60 a 66 kg en 10 semanas, así que sí progresas, aunque el ritmo se ha frenado. El press militar comparte fatiga de hombro y tríceps y lo entrenas el mismo día — prueba a separarlos o reducir una serie de press militar 2 semanas." },
      ],
    },
    {
      title: "Preparación para volumen",
      pinned: false,
      daysAgo: 6,
      messages: [
        { role: "user", content: "Analiza mi entrenamiento de esta semana." },
        { role: "assistant", content: "Completaste tus 3 sesiones (Push, Pull, Legs) sin fallar ninguna. El volumen total subió un 6% respecto a la semana anterior, sobre todo por sentadilla y remo con barra. Tu peso corporal sigue subiendo de forma controlada." },
      ],
    },
  ];

  for (const conv of conversations) {
    const convId = generateId();
    const createdAt = new Date(now.getTime() - conv.daysAgo * 86400000).toISOString();
    await db.put("conversations", { id: convId, title: conv.title, pinned: conv.pinned, createdAt, updatedAt: createdAt });
    let t = new Date(createdAt);
    for (const msg of conv.messages) {
      await db.put("coachMessages", { id: generateId(), conversationId: convId, role: msg.role, content: msg.content, createdAt: t.toISOString() });
      t = new Date(t.getTime() + 60000);
    }
  }
}

export async function clearDemoData(db: IDBPDatabase<VeltraDB>) {
  for (const store of STORE_NAMES) {
    if (store === "exercises") continue;
    await db.clear(store);
  }
  const tx = db.transaction("exercises", "readwrite");
  let cursor = await tx.store.openCursor();
  while (cursor) {
    await cursor.update({ ...cursor.value, isFavorite: false });
    cursor = await cursor.continue();
  }
  await tx.done;
}
