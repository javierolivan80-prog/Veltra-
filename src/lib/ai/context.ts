import { listPersonalRecords } from "@/features/exercises/prs";
import { listExercises } from "@/features/exercises/repo";
import { isRankEligible } from "@/features/exercises/ranks";
import { getSetsForExercise, listAllSets, listRecentSessions, getExerciseIdsInSession } from "@/features/workouts/repo";
import { listRoutines } from "@/features/routines/repo";
import { commitmentsForDay } from "@/features/contract/arc";
import { getActiveContract, listCommitments } from "@/features/contract/repo";
import { todayKey } from "@/lib/date";
import { listMemoryFacts } from "@/features/coach/repo";
import { dayKey } from "@/features/food/dates";
import { getDailyNutrition, getNutritionGoals } from "@/features/food/repo";
import { computeInsights } from "@/features/insights/signals";
import { listPhysiqueCheckins } from "@/features/physique/repo";
import { getProfile, listInjuries } from "@/features/profile/repo";
import { weeklyFrequency } from "@/features/exercises/stats";
import type { Exercise, MuscleGroup, SetEntry } from "@/types/models";

export interface CoachContext {
  profileSummary: string;
  injuriesSummary: string;
  memorySummary: string;
  recentSessionsSummary: string;
  strongestLifts: string;
  laggingMuscleGroups: string;
  nutritionSummary: string;
  wellbeingSummary: string;
  routinesSummary: string;
  recentSetsSummary: string;
  weeklyVolumeSummary: string;
  exerciseHistorySummary: string;
  todaySummary: string;
  physiqueSummary: string;
}

/**
 * Qué día es hoy, qué toca según el contrato y qué rutina propondría la app.
 * Sin esto, ante un "¿qué entreno hoy?" el modelo tiene que deducir la fecha
 * de la última sesión registrada — y se equivoca, porque no hay ningún reloj
 * en el resto del contexto.
 */
async function buildTodaySummary(routines: Awaited<ReturnType<typeof listRoutines>>, recentSessions: Awaited<ReturnType<typeof listRecentSessions>>): Promise<string> {
  const today = todayKey();
  const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const parts = [`Hoy es ${fecha} (${today}).`];

  try {
    const contract = await getActiveContract();
    if (contract) {
      const commitments = await listCommitments(contract.id);
      const hoy = commitmentsForDay(commitments, today);
      const entrena = hoy.find((c) => c.kind === "workout");
      parts.push(
        entrena
          ? `Su contrato marca entrenamiento hoy ("${entrena.title}").`
          : hoy.length > 0
            ? `Su contrato NO marca entrenamiento hoy; hoy le tocan: ${hoy.map((c) => c.title).join(", ")}.`
            : "Su contrato no marca ningún compromiso hoy (día de descanso planificado)."
      );
    }
  } catch {
    // El contrato es contexto de apoyo: si falla, el resto del bloque sigue sirviendo.
  }

  // La misma rotación que propone la app en Hoy: la que lleva más tiempo sin hacerse.
  if (routines.length > 0) {
    const lastDoneAt = (routineId: string) => {
      const s = recentSessions.find((x) => x.routineId === routineId);
      return s ? new Date(s.startedAt).getTime() : 0;
    };
    const sugerida = [...routines].sort((a, b) => lastDoneAt(a.id) - lastDoneAt(b.id))[0];
    parts.push(`La app propondría "${sugerida.name}" por rotación (es la que lleva más tiempo sin hacerse), pero tú puedes discrepar si los datos dicen otra cosa.`);
  }

  const ultima = recentSessions[0];
  if (ultima) {
    const dias = Math.floor((Date.now() - new Date(ultima.startedAt).getTime()) / 86400000);
    parts.push(`Última sesión registrada: ${ultima.routineName ?? "sesión libre"} el ${ultima.startedAt.slice(0, 10)} (hace ${dias} ${dias === 1 ? "día" : "días"}).`);
  }

  return parts.join(" ");
}

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebrazos",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", calves: "Gemelos", abs: "Abdomen", traps: "Trapecios",
  cardio: "Cardio", full_body: "Cuerpo completo",
};

/**
 * Las rutinas tal y como están escritas: ejercicio, series objetivo, rango de
 * repeticiones y descanso. Sin esto el coach puede hablar del historial pero
 * no del PLAN — no podría decir "en tu Push Day tienes 4 series de press a
 * 8-12, súbelas a 5" porque literalmente no sabe qué hay dentro de la rutina.
 */
function buildRoutinesSummary(routines: Awaited<ReturnType<typeof listRoutines>>, exercises: Exercise[]): string {
  if (routines.length === 0) return "El usuario todavía no tiene ninguna rutina creada.";
  return routines
    .map((routine) => {
      const lines = [...routine.exercises]
        .sort((a, b) => a.order - b.order)
        .map((re) => {
          const name = exercises.find((e) => e.id === re.exerciseId)?.name ?? "Ejercicio desconocido";
          return `    · ${name}: ${re.targetSets}x${re.targetRepsMin}-${re.targetRepsMax}, descanso ${re.restSeconds}s`;
        });
      return `  ${routine.name} (${routine.exercises.length} ejercicios):\n${lines.join("\n")}`;
    })
    .join("\n");
}

/**
 * Serie a serie de las últimas sesiones — peso × reps y RIR. Es el nivel de
 * detalle que hace falta para juzgar progresión real, proximidad al fallo o
 * si alguien lleva semanas moviendo el mismo peso; el resumen por sesión
 * (solo nombres de ejercicios) no da para ninguna de las tres.
 */
function buildRecentSetsSummary(
  sessions: Awaited<ReturnType<typeof listRecentSessions>>,
  exercises: Exercise[],
  allSets: SetEntry[]
): string {
  const blocks: string[] = [];
  for (const session of sessions.slice(0, 10)) {
    const sets = allSets.filter((s) => s.sessionId === session.id && !s.isWarmup);
    if (sets.length === 0) continue;

    const byExercise = new Map<string, SetEntry[]>();
    for (const s of sets) {
      const arr = byExercise.get(s.exerciseId);
      if (arr) arr.push(s);
      else byExercise.set(s.exerciseId, [s]);
    }

    const lines = [...byExercise.entries()].map(([exerciseId, exSets]) => {
      const name = exercises.find((e) => e.id === exerciseId)?.name ?? "Ejercicio desconocido";
      const detail = exSets
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => `${s.weightKg}kg×${s.reps}${s.rir !== null ? ` (RIR ${s.rir})` : ""}`)
        .join(", ");
      return `    · ${name}: ${detail}`;
    });
    blocks.push(`  ${session.startedAt.slice(0, 10)} — ${session.routineName ?? "Sesión libre"}:\n${lines.join("\n")}`);
  }
  return blocks.join("\n") || "Sin series registradas todavía.";
}

/**
 * TODO el historial, comprimido: una línea por ejercicio con cuántas sesiones
 * lleva, de qué peso salió y en cuál está ahora, su mejor serie y cuándo lo
 * tocó por última vez. Mandar cada serie de meses sería inviable, pero sin
 * esto el coach solo ve las últimas sesiones y no puede responder a lo único
 * que importa a medio plazo: si un ejercicio lleva meses parado.
 */
function buildExerciseHistorySummary(allSets: SetEntry[], exercises: Exercise[]): string {
  const working = allSets.filter((s) => !s.isWarmup);
  if (working.length === 0) return "Sin historial de entrenamiento todavía.";

  const byExercise = new Map<string, SetEntry[]>();
  for (const s of working) {
    const arr = byExercise.get(s.exerciseId);
    if (arr) arr.push(s);
    else byExercise.set(s.exerciseId, [s]);
  }

  const lines: { lastMs: number; text: string }[] = [];
  for (const [exerciseId, exSets] of byExercise) {
    const name = exercises.find((e) => e.id === exerciseId)?.name ?? "Ejercicio desconocido";
    const sorted = [...exSets].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const sessions = new Set(sorted.map((s) => s.sessionId)).size;
    const best = sorted.reduce((top, s) => (s.weightKg > top.weightKg ? s : top), sorted[0]);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    lines.push({
      lastMs: new Date(last.completedAt).getTime(),
      text:
        `  · ${name}: ${sessions} ${sessions === 1 ? "sesión" : "sesiones"} y ${sorted.length} series desde ${first.completedAt.slice(0, 10)}. ` +
        `Empezó en ${first.weightKg}kg×${first.reps}, ahora ${last.weightKg}kg×${last.reps} (última vez ${last.completedAt.slice(0, 10)}). ` +
        `Mejor serie: ${best.weightKg}kg×${best.reps}.`,
    });
  }

  // Lo entrenado hace poco primero: es sobre lo que se suele preguntar.
  return lines.sort((a, b) => b.lastMs - a.lastMs).map((l) => l.text).join("\n");
}

/**
 * Series semanales por grupo muscular en las últimas 4 semanas — la métrica
 * con la que la literatura de hipertrofia habla de volumen, así que es la que
 * el coach necesita para opinar sobre si un grupo va corto o pasado.
 * Un ejercicio cuenta para todos sus grupos, como se cuenta habitualmente.
 */
function buildWeeklyVolumeSummary(allSets: SetEntry[], exercises: Exercise[]): string {
  const cutoff = Date.now() - 28 * 86400000;
  const recent = allSets.filter((s) => !s.isWarmup && new Date(s.completedAt).getTime() >= cutoff);
  if (recent.length === 0) return "Sin series registradas en las últimas 4 semanas.";

  const setsByGroup = new Map<MuscleGroup, number>();
  for (const set of recent) {
    const exercise = exercises.find((e) => e.id === set.exerciseId);
    for (const group of exercise?.muscleGroups ?? []) {
      setsByGroup.set(group, (setsByGroup.get(group) ?? 0) + 1);
    }
  }

  return (
    [...setsByGroup.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([group, count]) => `${MUSCLE_LABEL[group] ?? group} ${Math.round((count / 4) * 10) / 10} series/semana`)
      .join(", ") || "Sin series registradas en las últimas 4 semanas."
  );
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
 * Últimos check-ins de físico (grasa corporal estimada por IA) — para que el
 * coach pueda hablar de composición corporal sin que el usuario tenga que
 * repetir números que ya subió en Progreso. Nunca rompe el resto del
 * contexto si el histórico falla al leerse.
 */
async function buildPhysiqueSummary(): Promise<string> {
  try {
    const checkins = await listPhysiqueCheckins();
    if (checkins.length === 0) return "Sin check-ins de físico todavía.";
    return checkins.slice(-5).map((c) => `${c.date}: ${c.bodyFatPctLow}-${c.bodyFatPctHigh}% (estimación visual por IA)`).join(" | ");
  } catch {
    return "Sin datos de físico disponibles.";
  }
}

/**
 * Assembles the same grounded context both the edge-function prompt and the
 * offline fallback coach use — the single place that decides what the AI is
 * "allowed to know" about the user, so it never has to invent anything.
 */
export async function buildCoachContext(): Promise<CoachContext> {
  const [profile, injuries, memory, recentSessions, exercises, routines, allSets, nutritionSummary, wellbeingSummary, physiqueSummary] = await Promise.all([
    getProfile(),
    listInjuries(),
    listMemoryFacts(),
    listRecentSessions(20),
    listExercises(),
    listRoutines(),
    listAllSets(),
    buildNutritionSummary(),
    buildWellbeingSummary(),
    buildPhysiqueSummary(),
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

  // Sin tope de 8: si tiene marcas en veinte ejercicios, las veinte importan
  // — cada línea es corta y es justo lo que se le pregunta.
  const prSummaries: string[] = [];
  for (const ex of rankable) {
    const prs = await listPersonalRecords(ex.id);
    const oneRm = prs.find((p) => p.type === "1rm");
    if (oneRm) prSummaries.push(`${ex.name}: ${oneRm.value}kg 1RM est.`);
  }
  const strongestLifts = prSummaries.join(" | ") || "Sin PRs todavía.";

  const routinesSummary = buildRoutinesSummary(routines, exercises);
  const recentSetsSummary = buildRecentSetsSummary(recentSessions, exercises, allSets);
  const weeklyVolumeSummary = buildWeeklyVolumeSummary(allSets, exercises);
  const exerciseHistorySummary = buildExerciseHistorySummary(allSets, exercises);
  const todaySummary = await buildTodaySummary(routines, recentSessions);

  return {
    profileSummary,
    injuriesSummary,
    memorySummary,
    recentSessionsSummary,
    strongestLifts,
    laggingMuscleGroups,
    nutritionSummary,
    wellbeingSummary,
    routinesSummary,
    recentSetsSummary,
    weeklyVolumeSummary,
    exerciseHistorySummary,
    todaySummary,
    physiqueSummary,
  };
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

