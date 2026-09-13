import { pickForDay } from "@/lib/dailyPick";

// Las dos preguntas del diario eran fijas: las mismas cada día, para
// siempre. Preguntar exactamente igual 90 días seguidos es lo que acaba
// convirtiendo la entrada en "nada" y "lo de siempre". Rotan, pero siguen
// apuntando a lo mismo — lo que se guarda en `gratitude` sigue siendo
// gratitud, y en `learned` sigue siendo lo aprendido.

const GRATITUDE_PROMPTS = [
  "¿Qué agradeces hoy?",
  "¿Qué te ha salido bien hoy, aunque sea pequeño?",
  "¿Por quién estás agradecido hoy?",
  "¿Qué has tenido hoy que hace un año te habría parecido mucho?",
  "¿Qué momento de hoy repetirías?",
  "¿Quién te ha hecho el día más fácil hoy?",
  "¿Qué cosa tuya agradeces hoy?",
  "¿Qué ha ido mejor de lo que esperabas?",
] as const;

const LEARNED_PROMPTS = [
  "¿Qué aprendiste hoy?",
  "¿Qué harías distinto si repitieras el día?",
  "¿Qué te ha costado más hoy, y por qué?",
  "¿Qué has aprendido de alguien hoy?",
  "¿Qué te ha enseñado hoy sobre ti?",
  "¿Qué evitaste hoy sabiendo que tocaba?",
  "¿Qué llevarías de hoy a mañana?",
  "¿Qué decisión de hoy te ha salido cara?",
] as const;

/** Las dos preguntas del día. Se piden por fecha, no por "hoy", para que al
 *  editar una entrada antigua salgan las preguntas que tocaban ese día. */
export function journalPrompts(date: string): { gratitude: string; learned: string } {
  return {
    gratitude: pickForDay(GRATITUDE_PROMPTS, date),
    // Desfasada: si no, ambas listas avanzarían a la vez y se emparejarían
    // siempre igual.
    learned: pickForDay(LEARNED_PROMPTS, date, 3),
  };
}
