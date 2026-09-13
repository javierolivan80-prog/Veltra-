import { pickForDay } from "@/lib/dailyPick";

// El examen de conciencia sigue siendo texto libre y privado — esto no
// impone categorías de faltas, solo cambia por dónde empezar cuando la caja
// en blanco no ayuda. Se mueve por los pasos del examen clásico (gratitud,
// repaso del día, contrición, propósito) sin obligar a seguirlos en orden.
const EXAMEN_PROMPTS = [
  "¿En qué has fallado hoy? Escríbelo con confianza.",
  "¿Qué le agradeces hoy a Dios?",
  "¿Dónde has visto a Dios hoy, y dónde le has dado la espalda?",
  "¿A quién has tratado hoy peor de lo que merecía?",
  "¿Qué has hecho hoy por alguien sin esperar nada?",
  "¿Qué te ha alejado hoy de la persona que quieres ser?",
  "¿Por qué pedirías perdón si pudieras volver atrás?",
  "¿Has rezado hoy de verdad, o solo por cumplir?",
  "¿Qué propósito concreto te llevas a mañana?",
] as const;

export function examenPrompt(date: string): string {
  return pickForDay(EXAMEN_PROMPTS, date);
}
