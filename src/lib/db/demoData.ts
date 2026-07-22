import type { SQLiteDatabase } from "expo-sqlite";
import { generateId } from "@/src/lib/id";
import { estimatedOneRepMax } from "@/src/features/exercises/stats";

/** Demo-data equivalent of exercise.equipment for the effective-weight helper (only "ex-pullup" is bodyweight-loaded here). */
const BODYWEIGHT_EXERCISE_IDS = new Set(["ex-pullup"]);
const DEMO_BODYWEIGHT_KG = 78.4;

type Progression = "weight" | "reps";

interface TrackedExercise {
  id: string;
  baseWeight: number;
  baseReps: number;
  increment: number; // per occurrence-group of 3
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

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function oneRm(exerciseId: string, weight: number, reps: number) {
  const isBodyweight = BODYWEIGHT_EXERCISE_IDS.has(exerciseId);
  return estimatedOneRepMax({ equipment: isBodyweight ? ["bodyweight"] : ["barbell"] }, weight, reps, isBodyweight ? DEMO_BODYWEIGHT_KG : null);
}

export async function isDemoDataLoaded(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM workout_sessions");
  return !!row && row.count > 0;
}

export async function seedDemoData(db: SQLiteDatabase) {
  const now = new Date();
  const nowIso = now.toISOString();

  await db.withTransactionAsync(async () => {
    // --- Profile -----------------------------------------------------
    await db.runAsync(
      `INSERT OR REPLACE INTO profile (id, full_name, email, sex, birth_date, height_cm, bodyweight_kg, experience_level, goal, equipment_available, created_at, updated_at)
       VALUES ('local', 'Alex Veltra', 'demo@veltra.app', 'male', '1996-04-12', 178, 78.4, 'intermediate', 'hypertrophy', ?, ?, ?)`,
      [JSON.stringify(["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell"]), nowIso, nowIso]
    );

    // --- Injury (referenced later by the AI memory example) ----------
    await db.runAsync(
      `INSERT INTO injuries (id, area, note, active, created_at) VALUES (?, ?, ?, 1, ?)`,
      [generateId(), "shoulder_right", "Molestias leves en el hombro derecho con presses por encima de la cabeza.", nowIso]
    );

    // --- Body weight log (10 weekly entries, slight upward trend) ----
    let bw = 76.4;
    for (let w = WEEKS - 1; w >= 0; w--) {
      const date = new Date(now);
      date.setDate(date.getDate() - w * 7);
      bw += rand(-0.3, 0.55);
      await db.runAsync(`INSERT INTO body_weight_logs (id, date, weight_kg) VALUES (?, ?, ?)`, [
        generateId(),
        date.toISOString(),
        Math.round(bw * 10) / 10,
      ]);
    }

    // --- Routines (one per day-type) ----------------------------------
    const routineIds: Record<string, string> = {};
    for (const day of DAYS) {
      const routineId = generateId();
      routineIds[day.name] = routineId;
      await db.runAsync(
        `INSERT INTO routines (id, name, description, is_template, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)`,
        [routineId, `${day.name} Day`, `Rutina de empuje/tirón/pierna — día de ${day.name}`, nowIso, nowIso]
      );
      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i];
        await db.runAsync(
          `INSERT INTO routine_exercises (id, routine_id, exercise_id, "order", target_sets, target_reps_min, target_reps_max, rest_seconds)
           VALUES (?, ?, ?, ?, 3, ?, ?, ?)`,
          [generateId(), routineId, ex.id, i, Math.max(4, ex.baseReps - 3), ex.baseReps + 3, ex.restSeconds]
        );
      }
    }

    // --- Session + set history ----------------------------------------
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

      await db.runAsync(
        `INSERT INTO workout_sessions (id, routine_id, routine_name, status, started_at, ended_at)
         VALUES (?, ?, ?, 'completed', ?, ?)`,
        [sessionId, routineIds[day.name], `${day.name} Day`, sessionDate.toISOString(), endedAt.toISOString()]
      );

      for (const ex of day.exercises) {
        const occurrence = occurrenceCount[ex.id] ?? 0;
        occurrenceCount[ex.id] = occurrence + 1;

        const progressSteps = Math.floor(occurrence / 3);
        const isDeload = occurrence > 0 && occurrence % 7 === 6; // occasional deload for realism

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

          await db.runAsync(
            `INSERT INTO set_entries (id, session_id, exercise_id, set_number, weight_kg, reps, rir, rpe, is_warmup, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [setId, sessionId, ex.id, setNum, weight, reps, rir, Math.max(5, 10 - rir), completedAt]
          );

          if (!allSetsByExercise[ex.id]) allSetsByExercise[ex.id] = [];
          allSetsByExercise[ex.id].push({ weight, reps, completedAt, id: setId, sessionId });
        }
      }
    }

    // --- Personal records, derived from the generated history ---------
    for (const [exerciseId, sets] of Object.entries(allSetsByExercise)) {
      const sorted = [...sets].sort((a, b) => a.completedAt.localeCompare(b.completedAt));

      let maxWeight = -Infinity;
      let maxWeightSet = sorted[0];
      let max1rm = -Infinity;
      let max1rmSet = sorted[0];
      let maxReps = -Infinity;
      let maxRepsSet = sorted[0];

      const isBodyweight = BODYWEIGHT_EXERCISE_IDS.has(exerciseId);
      const loadOf = (weight: number) => (isBodyweight ? DEMO_BODYWEIGHT_KG + weight : weight);

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

      const bySession: Record<string, number> = {};
      for (const set of sorted) {
        bySession[set.sessionId] = (bySession[set.sessionId] ?? 0) + loadOf(set.weight) * set.reps;
      }
      const maxVolume = Math.max(...Object.values(bySession));
      const maxVolumeSessionId = Object.entries(bySession).find(([, v]) => v === maxVolume)?.[0];
      const maxVolumeSet = sorted.find((s) => s.sessionId === maxVolumeSessionId) ?? sorted[sorted.length - 1];

      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, type, value, previous_value, achieved_at, set_entry_id) VALUES (?, ?, 'weight', ?, NULL, ?, ?)`,
        [generateId(), exerciseId, maxWeight, maxWeightSet.completedAt, maxWeightSet.id]
      );
      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, type, value, previous_value, achieved_at, set_entry_id) VALUES (?, ?, '1rm', ?, NULL, ?, ?)`,
        [generateId(), exerciseId, Math.round(max1rm * 10) / 10, max1rmSet.completedAt, max1rmSet.id]
      );
      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, type, value, previous_value, achieved_at, set_entry_id) VALUES (?, ?, 'reps', ?, NULL, ?, ?)`,
        [generateId(), exerciseId, maxReps, maxRepsSet.completedAt, maxRepsSet.id]
      );
      await db.runAsync(
        `INSERT INTO personal_records (id, exercise_id, type, value, previous_value, achieved_at, set_entry_id) VALUES (?, ?, 'volume', ?, NULL, ?, ?)`,
        [generateId(), exerciseId, Math.round(maxVolume), maxVolumeSet.completedAt, maxVolumeSet.id]
      );
    }

    // Favorite a couple of exercises so the "favorites" feature has content.
    for (const id of ["ex-bench-press", "ex-squat", "ex-pullup"]) {
      await db.runAsync(`UPDATE exercises SET is_favorite = 1 WHERE id = ?`, [id]);
    }

    // --- AI memory facts -------------------------------------------------
    const memoryFacts = [
      { content: "Tiene molestias leves en el hombro derecho con presses por encima de la cabeza — priorizar variantes con mancuerna o ángulo neutro y vigilar el volumen de press militar.", category: "injury" },
      { content: "Objetivo actual: hipertrofia / fase de volumen.", category: "goal" },
      { content: "Entrena 3 veces por semana en formato Push / Pull / Legs.", category: "preference" },
      { content: "Tiene acceso a barra, mancuernas, máquinas, poleas, kettlebell y peso corporal.", category: "constraint" },
    ];
    for (const fact of memoryFacts) {
      await db.runAsync(`INSERT INTO memory_facts (id, content, category, active, created_at) VALUES (?, ?, ?, 1, ?)`, [
        generateId(),
        fact.content,
        fact.category,
        nowIso,
      ]);
    }

    // --- AI coach conversations ------------------------------------------
    const conversations: { title: string; pinned: boolean; daysAgo: number; messages: { role: "user" | "assistant"; content: string }[] }[] = [
      {
        title: "Lesión hombro",
        pinned: true,
        daysAgo: 52,
        messages: [
          { role: "user", content: "Tengo molestias en el hombro derecho cuando hago press por encima de la cabeza." },
          {
            role: "assistant",
            content:
              "Gracias por decírmelo — lo voy a recordar para todas tus rutinas futuras. Por ahora, en press militar reduce el rango si notas pinchazo y prueba con mancuernas en agarre neutro, suele molestar menos que la barra. Si la molestia persiste más de dos semanas, lo mejor es que lo valore un fisioterapeuta.",
          },
        ],
      },
      {
        title: "Mejorar banca",
        pinned: true,
        daysAgo: 18,
        messages: [
          { role: "user", content: "¿Por qué no progreso en press banca?" },
          {
            role: "assistant",
            content:
              "Mirando tus últimas sesiones, tu press banca ha subido de 60 a 66 kg en 10 semanas, así que sí estás progresando, aunque el ritmo se ha frenado las últimas 3 sesiones. Tu RIR medio ronda 1-2, lo cual está bien, pero el press militar comparte fatiga de hombro y tríceps y lo entrenas el mismo día. Prueba a separar ambos ejercicios en días distintos o a reducir una serie de press militar durante 2 semanas y evaluamos.",
          },
        ],
      },
      {
        title: "Preparación para volumen",
        pinned: false,
        daysAgo: 6,
        messages: [
          { role: "user", content: "Analiza mi entrenamiento de esta semana." },
          {
            role: "assistant",
            content:
              "Esta semana completaste tus 3 sesiones (Push, Pull, Legs) sin fallar ninguna. El volumen total subió un 6% respecto a la semana anterior, sobre todo por sentadilla y remo con barra. Tu peso corporal sigue subiendo de forma controlada, así que la fase de volumen va según lo previsto. Si mantienes este ritmo, en 2-3 semanas deberías ver un nuevo PR en sentadilla.",
          },
        ],
      },
    ];

    for (const conv of conversations) {
      const convId = generateId();
      const createdAt = new Date(now.getTime() - conv.daysAgo * 86400000).toISOString();
      await db.runAsync(
        `INSERT INTO conversations (id, title, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [convId, conv.title, conv.pinned ? 1 : 0, createdAt, createdAt]
      );
      let t = new Date(conv.daysAgo ? now.getTime() - conv.daysAgo * 86400000 : now.getTime());
      for (const msg of conv.messages) {
        await db.runAsync(
          `INSERT INTO coach_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
          [generateId(), convId, msg.role, msg.content, t.toISOString()]
        );
        t = new Date(t.getTime() + 60000);
      }
    }
  });
}

export async function clearDemoData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    for (const table of [
      "set_entries",
      "workout_sessions",
      "routine_exercises",
      "routines",
      "personal_records",
      "coach_messages",
      "conversations",
      "memory_facts",
      "body_weight_logs",
      "injuries",
    ]) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    await db.runAsync(`UPDATE exercises SET is_favorite = 0`);
    await db.runAsync(`DELETE FROM profile`);
  });
}
