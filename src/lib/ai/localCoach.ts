import { listExercises } from "@/src/features/exercises/repo";
import { getProfile } from "@/src/features/profile/repo";
import { getSetsForExercise, listRecentSessions } from "@/src/features/workouts/repo";
import { weightSeries } from "@/src/features/exercises/stats";
import { buildCoachContext, suggestNextWeight } from "./context";
import { formatWeight } from "@/src/lib/format";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

async function findExerciseInText(text: string) {
  const exercises = await listExercises();
  const norm = normalize(text);
  return exercises.find((e) => norm.includes(normalize(e.name)));
}

/**
 * Deterministic, data-grounded responder used when no cloud model is
 * reachable (no Supabase project/API key configured in this environment, or
 * the device is offline). It only ever states numbers pulled from local
 * SQLite — same rule the real edge-function prompt enforces.
 */
export async function generateLocalCoachReply(userText: string): Promise<string> {
  const norm = normalize(userText);
  const ctx = await buildCoachContext();

  if (norm.includes("peso") && (norm.includes("hoy") || norm.includes("deberia") || norm.includes("debería") || norm.includes("usar"))) {
    const exercise = await findExerciseInText(userText);
    if (exercise) {
      const suggestion = await suggestNextWeight(exercise.id);
      if (suggestion) {
        return `Para ${exercise.name} te recomiendo empezar por ${formatWeight(suggestion.weight)}kg × ${suggestion.reps} — ${suggestion.reasoning}. Ajusta la última serie según cómo te encuentres hoy.`;
      }
      return `Todavía no tengo series registradas de ${exercise.name}, así que no puedo basarme en tu historial. Empieza con un peso conservador y anota el RIR para que la próxima vez pueda darte una recomendación real.`;
    }
    return `Dime para qué ejercicio quieres la recomendación de peso — ¿lo probamos con uno de tu rutina de hoy?`;
  }

  if (norm.includes("por que no progreso") || norm.includes("porque no progreso") || norm.includes("estancad")) {
    const exercise = await findExerciseInText(userText);
    if (exercise) {
      const sets = await getSetsForExercise(exercise.id);
      const series = weightSeries(sets);
      if (series.length >= 4) {
        const recent = series.slice(-4);
        const flat = recent[recent.length - 1].value <= recent[0].value * 1.01;
        if (flat) {
          return `Mirando tus últimas sesiones de ${exercise.name}, el peso lleva ${recent.length} sesiones prácticamente plano en torno a ${formatWeight(recent[0].value)}kg. Puede ser fatiga acumulada, sueño o que el rango de repeticiones se ha quedado corto. Prueba a bajar un 10% el peso dos sesiones y vuelve a subir progresivamente, o añade una serie extra las próximas dos semanas.`;
        }
        return `En realidad sí estás progresando en ${exercise.name}: has pasado de ${formatWeight(series[0].value)}kg a ${formatWeight(series[series.length - 1].value)}kg en las últimas sesiones registradas. El ritmo puede sentirse lento, pero la tendencia es positiva.`;
      }
      return `Todavía no tengo suficientes sesiones de ${exercise.name} registradas para analizar una tendencia real — sigue anotando y en un par de semanas podré decírtelo con datos.`;
    }
    return `¿En qué ejercicio notas el estancamiento? Dime el nombre y reviso tu progresión real.`;
  }

  if (norm.includes("atrasad") || norm.includes("musculo") && norm.includes("mas")) {
    return `Según tu frecuencia de entrenamiento reciente, lo que menos estás tocando es: ${ctx.laggingMuscleGroups}. Si tu objetivo lo permite, dale una serie extra la próxima semana.`;
  }

  if (norm.includes("analiza") && (norm.includes("hoy") || norm.includes("entrenamiento") || norm.includes("semana"))) {
    return `Esto es lo que veo en tus sesiones recientes:\n${ctx.recentSessionsSummary}\n\nTus lifts más fuertes ahora mismo: ${ctx.strongestLifts}.`;
  }

  if (norm.includes("record") || norm.includes("récord") || norm.includes("pr ")) {
    return `Tus mejores marcas registradas: ${ctx.strongestLifts}. Sigue así y en unas semanas deberíamos ver alguna actualizada.`;
  }

  if (norm.includes("mejor mes") || norm.includes("mejor semana")) {
    const sessions = await listRecentSessions(30);
    return `Has completado ${sessions.length} sesiones registradas recientemente. En cuanto acumules más historial podré comparar meses completos con precisión — de momento tu constancia reciente es sólida.`;
  }

  if (norm.includes("volumen") && (norm.includes("mucho") || norm.includes("demasiado") || norm.includes("exceso"))) {
    return `Con la frecuencia y series que estás registrando, tu volumen actual parece razonable para tu nivel (${(await getProfile())?.experienceLevel ?? "intermedio"}). Si notas fatiga persistente o el rendimiento cae sesión tras sesión, seria buena señal para meter una semana de descarga.`;
  }

  if (norm.includes("lesion") || norm.includes("lesión") || norm.includes("molestia") || norm.includes("dolor")) {
    return `Gracias por decírmelo, lo tendré en cuenta en tus próximas recomendaciones. ${ctx.injuriesSummary !== "Sin lesiones activas registradas." ? `Ya tengo registrado: ${ctx.injuriesSummary}.` : "Cuéntame en qué zona y evitaré ejercicios que la carguen en exceso."}`;
  }

  return `Con lo que tengo registrado ahora mismo:\n${ctx.recentSessionsSummary}\n\n¿Quieres que analice algún ejercicio en concreto o que te proponga la próxima sesión?`;
}
