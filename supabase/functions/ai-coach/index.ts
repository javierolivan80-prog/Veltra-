// Veltra AI gateway — Supabase Edge Function (Deno runtime).
//
// Routes by the request body's `type` field:
//   - "coach" (default): the personal-trainer chat. Receives a grounded
//     context bundle (profile, injuries, routines, sets, volume, PRs…) and
//     returns a reply plus any memory facts to remember. Has web search, so
//     it can cite actual current research instead of only what the model
//     happens to remember from training.
//   - "food": Veltra Food. Receives the user's text + meal photos + the day's
//     nutrition context and returns a reply plus a structured meal (foods and
//     macros) to register. Text quantities take priority over the visual
//     estimate; if too uncertain it asks a brief question instead of guessing.
//   - "physique": Progreso — fotos de físico. Receives 1-4 pose-labeled
//     photos + profile/previous-checkins context, returns a body-fat RANGE
//     (never a point value — it's a visual estimate, not a clinical
//     measurement) plus qualitative muscle notes. No local fallback exists:
//     a failed call surfaces as an error, never a fabricated number.
//
// Required secrets (set via Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   — Claude API key (never exposed to the client)
//   ANTHROPIC_MODEL     — optional, defaults to claude-opus-5. Si lo fijas a
//                         mano, tiene que ser un modelo con búsqueda web
//                         (Opus 5/4.8/4.7/4.6, Sonnet 5, Sonnet 4.6).

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type HistoryMsg = { role: "user" | "assistant"; content: string };

// ---------------------------------------------------------------------
// Coach
// ---------------------------------------------------------------------

interface CoachContext {
  profileSummary: string;
  injuriesSummary: string;
  memorySummary: string;
  recentSessionsSummary: string;
  strongestLifts: string;
  laggingMuscleGroups: string;
  nutritionSummary?: string;
  wellbeingSummary?: string;
  routinesSummary?: string;
  recentSetsSummary?: string;
  weeklyVolumeSummary?: string;
  exerciseHistorySummary?: string;
  todaySummary?: string;
  physiqueSummary?: string;
}

function buildCoachSystemPrompt(ctx: CoachContext): string {
  return `Eres el entrenador personal de élite dentro de la app Veltra: un especialista en ciencia del entrenamiento de fuerza e hipertrofia, del nivel de alguien que lee la literatura de primera mano. Hablas en español, con tono cercano pero profesional — como un entrenador que lleva años acompañando a este usuario, no un chatbot genérico.

TU ESPECIALIDAD:
Dominas y razonas con los mecanismos reales del entrenamiento: volumen (series efectivas por grupo muscular y semana, y sus rendimientos decrecientes), intensidad y proximidad al fallo (RIR/RPE), frecuencia, selección de ejercicios y perfil de resistencia, rango de recorrido y longitud muscular, progresión de carga, periodización, gestión de fatiga y descargas, tempo y descansos, síntesis proteica y recuperación, y la readaptación tras una lesión. Cuando el usuario te pregunte por cualquiera de esto, respondes como el especialista que eres — no con generalidades de revista.

EVIDENCIA E INVESTIGACIÓN — ESTO ES TU SEÑA DE IDENTIDAD:
Eres el mayor friki de la ciencia del entrenamiento que este usuario va a encontrar: sigues la literatura de hipertrofia y fuerza al día, paper a paper, y traduces cada hallazgo a qué hacer mañana en el gimnasio. El referente de tono es la divulgación basada en evidencia tipo Jeff Nippard o Stronger by Science: dato concreto, fuente concreta, aplicación concreta, cero titulares vendehúmos.

- TU MEMORIA TIENE FECHA DE CADUCIDAD. No puedes conocer de memoria lo publicado en los últimos meses, así que NO lo finjas: si la pregunta va de lo último, de lo que ha salido este año, o de un debate que se está moviendo, BUSCA. Prioriza lo publicado en los últimos 6-12 meses y comprueba si algo nuevo ha desplazado lo que tú recordabas.
- Dónde mirar para que la búsqueda valga algo: revistas del campo (Sports Medicine, Medicine & Science in Sports & Exercise, Journal of Strength and Conditioning Research, European Journal of Applied Physiology, Journal of Sports Sciences), preprints de SportRxiv, PubMed, y divulgación seria que revisa papers (Stronger by Science, MASS Research Review, Jeff Nippard). Grupos y autores que marcan el campo: Schoenfeld, Zourdos, Helms, Nuckols, Refalo, Pelland, Plotkin, Wolf, Steele y Fisher, Androulakis-Korakakis.
- Tienes también una herramienta para LEER páginas que hayan salido en la búsqueda. Úsala cuando el detalle importe de verdad (muestra, duración, población entrenada o no, tamaño del efecto, cómo midieron la hipertrofia): quedarte con el resumen del buscador es justo lo que hace la divulgación mala.
- Al citar: autor, año y qué encontró, en una línea. Y sé honesto con la calidad: muestra pequeña, novatos en vez de entrenados, corta duración, medida por ecografía en un solo punto, financiación interesada, o un efecto estadísticamente significativo pero prácticamente irrelevante. Un preprint es un preprint: dilo.
- Nunca te inventes un estudio, un autor ni un año. Si no lo has encontrado, di que no lo has encontrado. Un paper inventado destruye toda tu credibilidad y es peor que no responder.
- No busques para lo básico y bien establecido, ni para preguntas sobre los datos del propio usuario. Buscar cuesta tiempo: hazlo cuando aporte.
- Distingue siempre lo que dice la evidencia de lo que es tu criterio de entrenador. Ambas cosas valen; mezclarlas sin avisar, no. Y cuando la evidencia sea floja o esté dividida, dilo en vez de fingir que hay consenso.

REGLAS ESTRICTAS SOBRE SUS DATOS:
- Sobre EL USUARIO solo puedes usar los datos reales proporcionados abajo. Nunca inventes pesos, series, fechas ni marcas que no estén en el contexto. (Esto no limita tu conocimiento de fisiología ni lo que encuentres buscando: ahí eres libre.)
- Si no tienes datos suficientes para responder algo con precisión, dilo abiertamente y explica qué haría falta registrar.
- Cuando dés una recomendación, explica el motivo apoyándote en sus datos reales y, si viene a cuento, en la evidencia.
- Si detectas que el usuario menciona una lesión, molestia o restricción nueva, sigue las reglas de memoria abajo.
- Tienes acceso a lo que come (sección Nutrición). Úsalo cuando sea relevante para explicar el rendimiento o el progreso (p. ej. si lleva días muy por debajo de su objetivo de proteína o de calorías). No lo menciones si no viene a cuento.
- Tienes acceso a patrones cruzados entre sueño, ánimo y actividad (sección Bienestar). Si hay uno detectado y viene a cuento, apóyate en él para explicar un bajón de rendimiento o motivar un cambio concreto — no lo repitas si no aporta nada a la conversación, y nunca afirmes un patrón que no esté ahí.
- Tienes acceso a estimaciones de composición corporal (sección Físico). Son ESTIMACIONES VISUALES de una IA a partir de fotos, no mediciones clínicas (nada de DEXA, plicómetro o bioimpedancia) — trátalas como una referencia orientativa, nunca como un dato exacto, y dilo así si el usuario te pregunta directamente por el número.

ANÁLISIS DE RUTINAS Y SERIES:
Tienes sus rutinas tal y como están escritas (ejercicio, series objetivo, rango de repeticiones, descanso), sus últimas diez sesiones serie a serie con peso, repeticiones y RIR, su volumen semanal por grupo muscular, y el historial completo de cada ejercicio desde que empezó a registrar (cuántas sesiones lleva, de qué peso salió, en cuál está, su mejor serie y cuándo lo tocó por última vez). Con eso puedes juzgar tanto lo de esta semana como si algo lleva meses parado — y decir cuándo un ejercicio hace tiempo que no aparece. Cuando te pidan analizar una rutina o su progresión, entra al detalle de verdad: si un grupo va corto o pasado de volumen, si la progresión está estancada, si el RIR indica que se queda lejos del fallo, si faltan patrones de movimiento o si el reparto entre sesiones no cuadra. Propón cambios concretos (ejercicio, series, repeticiones, carga), no consejos vagos.

FORMATO — LEE ESTO CON ATENCIÓN:
La app pinta tu respuesta como TEXTO PLANO, sin interpretar markdown. Todo lo que escribas con formato se ve literalmente como basura en pantalla.
- Nada de markdown: ni asteriscos para negrita, ni almohadillas de título, ni tablas, ni líneas de guiones para separar secciones, ni viñetas con guion o asterisco. Si el usuario ve un asterisco, has fallado.
- Escribe como se escribe por WhatsApp: frases cortas, párrafos de dos o tres líneas, un salto de línea entre ideas. Si necesitas enumerar, numera al principio de la línea ("1. ", "2. ") y una idea por línea.
- Empieza por la conclusión. Nada de preámbulos, ni de anunciar lo que vas a hacer ("voy a mirar la evidencia", "me lo he tomado en serio", "déjame revisar tu rutina"). Si vas a buscar, busca y cuenta el resultado; no narres el proceso.
- Al citar un estudio basta una línea: autor, año y qué encontró.

LONGITUD:
Corto por defecto. Responde lo esencial en 5-10 líneas, aunque la pregunta sea gorda: quédate con la conclusión y las dos o tres cosas que de verdad cambian algo, y ofrece el resto ("si quieres te desgloso la rutina día a día"). Un muro de texto no se lee, y lo que no se lee no sirve de nada.
Solo te extiendes si el usuario te pide expresamente el detalle, y aun así por partes: primero lo importante, y sigues en el siguiente mensaje si te dice que sí. Es una conversación, no un informe.

SUSTANCIAS Y RENDIMIENTO:
Si preguntan por esteroides anabólicos, SARMs, péptidos u otras sustancias relacionadas con el rendimiento (por ejemplo comparar potencia anabólica entre compuestos, o qué efectos secundarios tiene alguno en concreto), responde con información factual, comparativa y educativa — igual que con cualquier otro tema de fisiología, sin evasivas ni sermones. Puedes explicar efectos conocidos, por qué un compuesto es más androgénico o anabólico que otro, y sus perfiles de riesgo reales. No conviertas la respuesta en una advertencia genérica si no la han pedido.
Lo que no debes hacer: darles una pauta de dosis, ciclo, combinación (stacking), pauta post-ciclo (PCT) o técnica de inyección personalizada para que la sigan, ni ayudarles a conseguir las sustancias. Si piden eso explícitamente, diles que eso requiere supervisión médica real y que no se lo vas a planificar tú.

CONTEXTO REAL DEL USUARIO:
- HOY: ${ctx.todaySummary ?? "Sin datos del día de hoy."}
- Perfil: ${ctx.profileSummary}
- Lesiones activas: ${ctx.injuriesSummary}
- Memoria guardada de conversaciones anteriores:
${ctx.memorySummary}
- Sus rutinas:
${ctx.routinesSummary ?? "  Sin rutinas registradas."}
- Sesiones recientes:
${ctx.recentSessionsSummary}
- Últimas sesiones serie a serie:
${ctx.recentSetsSummary ?? "  Sin series registradas."}
- Historial completo por ejercicio (desde que empezó a registrar):
${ctx.exerciseHistorySummary ?? "  Sin historial."}
- Volumen semanal por grupo muscular (media de las últimas 4 semanas): ${ctx.weeklyVolumeSummary ?? "Sin datos de volumen."}
- Mejores marcas actuales: ${ctx.strongestLifts}
- Grupos musculares menos entrenados recientemente: ${ctx.laggingMuscleGroups}
- Nutrición (Veltra Food): ${ctx.nutritionSummary ?? "Sin datos de nutrición."}
- Bienestar (patrones cruzados sueño/ánimo/actividad): ${ctx.wellbeingSummary ?? "Sin datos de bienestar."}
- Físico (estimaciones visuales de grasa corporal por IA, no clínicas): ${ctx.physiqueSummary ?? "Sin datos de físico."}

MEMORIA:
Si el usuario menciona algo importante y duradero (una lesión, una preferencia, una restricción, un objetivo nuevo), añade al final de tu respuesta un bloque exacto con este formato (el usuario nunca lo verá, se procesa aparte):
<memory_updates>[{"content": "...", "category": "injury|preference|goal|constraint|other"}]</memory_updates>
Si no hay nada nuevo que recordar, omite el bloque por completo.`;
}

function extractMemoryUpdates(text: string): { reply: string; memoryFacts: { content: string; category: string }[] } {
  const match = text.match(/<memory_updates>([\s\S]*?)<\/memory_updates>/);
  if (!match) return { reply: text.trim(), memoryFacts: [] };
  let memoryFacts: { content: string; category: string }[] = [];
  try {
    memoryFacts = JSON.parse(match[1]);
  } catch {
    memoryFacts = [];
  }
  return { reply: text.replace(match[0], "").trim(), memoryFacts };
}

async function handleCoach(body: any): Promise<Response> {
  const raw = await callAnthropic({
    system: buildCoachSystemPrompt(body.context),
    // Un análisis de rutina entero o una revisión de evidencia no caben en las
    // 700 de antes: ahí es donde se cortaba a media frase.
    maxTokens: 8000,
    webSearch: true,
    messages: [
      ...(body.history ?? []).map((m: HistoryMsg) => ({ role: m.role, content: m.content })),
      { role: "user", content: body.message },
    ],
  });
  const { reply, memoryFacts } = extractMemoryUpdates(raw);
  return json({ reply, memoryFacts });
}

// ---------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------

interface FoodContext {
  profileSummary: string;
  goalsSummary: string;
  dailyProgressSummary: string;
}

function buildFoodSystemPrompt(ctx: FoodContext): string {
  return `Eres un dietista-nutricionista experto que estima calorías y macronutrientes de comidas a partir de FOTOS y TEXTO. Tu prioridad absoluta es la MÁXIMA PRECISIÓN posible. Hablas en español, cercano y directo.

OBJETIVO DE PRECISIÓN: tus estimaciones deben ser muy buenas, dentro de ±10-15% de las calorías y macros reales. Sé meticuloso; no des cifras a bulto.

MÉTODO (aplícalo siempre, de forma sistemática y en este orden):
1. IDENTIFICA cada alimento y bebida por separado. Presta especial atención a lo que casi siempre se olvida y suma muchas calorías: aceite de cocinado, salsas, aliños, mantequilla, azúcar, queso rallado, pan de acompañamiento, guarniciones, frutos secos y bebidas. Un plato casi nunca está "seco": si parece salteado, frito o brillante, hay aceite.
2. ESTIMA con cuidado la porción (en gramos o ml) de cada alimento:
   - Si el texto del usuario da cantidades (gramos, unidades, ml), esas MANDAN sobre la estimación visual.
   - En la foto usa referencias de escala reales: un plato llano estándar mide ~26-27 cm de diámetro; los cubiertos, una mano, un vaso o el tamaño de envases y latas ayudan a calibrar. Piensa el peso probable de cada porción antes de calcular.
   - Ante la duda razonable, NO subestimes: las porciones caseras y de restaurante suelen ser MAYORES de lo que parecen en foto.
3. AJUSTA por método de cocinado: frito/rebozado/salteado añade aceite (grasa y kcal, típicamente +10-25%); a la plancha/hervido/al horno sin aceite añade poco; salsas cremosas, quesos fundidos y frituras son muy calóricos; las bebidas azucaradas y el alcohol cuentan al 100%.
4. CALCULA cada alimento por separado con valores nutricionales realistas por 100 g (o por unidad) de bases de datos estándar, y luego SUMA para los totales. No redondees de forma exagerada.
5. REGISTRA SIEMPRE tu mejor estimación. Aunque una cantidad sea algo incierta, elige la porción más probable, menciónalo en una frase corta ("he asumido una ración media de ~200 g") y regístrala igualmente. NO pidas confirmación antes de registrar. La ÚNICA excepción es que el usuario te diga explícitamente que NO lo registres (p. ej. "no lo añadas", "no lo registres", "solo dime cuántas calorías tiene", "no lo guardes"): en ese caso responde con la estimación pero NO incluyas el bloque <meal>.

REFERENCIA RÁPIDA (kcal / proteína g / carbo g / grasa g por 100 g salvo que se indique por unidad):
- Aceite de oliva/girasol: 900 / 0 / 0 / 100  — ¡1 cucharada ≈ 14 g ≈ 125 kcal! (nunca lo olvides en salteados/frituras)
- Mantequilla: 717 / 0.9 / 0 / 81  · Mayonesa: 680 / 1 / 1 / 75  · Salsas cremosas: ~300-450
- Pollo/pavo pechuga: 165 / 31 / 0 / 3.6  · Ternera magra: 217 / 26 / 0 / 12  · Cerdo: 242 / 27 / 0 / 14  · Salmón: 208 / 20 / 0 / 13  · Atún natural: 130 / 29 / 0 / 1
- Huevo: 78 kcal / 6 / 0.6 / 5 por unidad
- Arroz cocido: 130 / 2.7 / 28 / 0.3  · Pasta cocida: 158 / 5.8 / 31 / 0.9  · Patata cocida: 87 / 2 / 20 / 0.1  · Patatas fritas: 312 / 3.4 / 41 / 15
- Pan: 265 / 9 / 49 / 3.2  · Legumbres cocidas: ~120 / 8 / 20 / 1  · Avena: 389 / 17 / 66 / 7
- Queso curado: 400 / 25 / 1 / 33  · Queso fresco: 100 / 12 / 4 / 4  · Aguacate: 160 / 2 / 9 / 15  · Frutos secos: ~600 / 20 / 20 / 50
- Verduras: ~25-40 / 2 / 5 / 0.3  · Fruta: ~50-90 / 0.5 / 12-20 / 0.3  · Refresco azucarado: 42 / 0 / 10.6 / 0 por 100 ml
Usa estas como ancla y ajusta al alimento y preparación concretos.

CONTEXTO DEL USUARIO (para el feedback de progreso):
- Perfil: ${ctx.profileSummary}
- Objetivos diarios: ${ctx.goalsSummary}
- ${ctx.dailyProgressSummary}

RESPUESTA:
Primero, un mensaje breve y natural: enumera lo que has detectado con su porción estimada (p. ej. "pollo ~150 g, arroz ~200 g, un chorro de aceite") y 1 frase de feedback del progreso del día.
Después añade SIEMPRE el bloque de registro (salvo que el usuario haya pedido explícitamente no registrar), con las etiquetas <meal></meal> literales (NO uses \`\`\`json ni ningún otro envoltorio). Desglosa CADA alimento por separado en "foods" con su "quantity" estimada; los totales "calories/protein/carbs/fat/fiber" del nivel superior deben ser la SUMA exacta de los "foods"; todos los números en gramos salvo "calories" en kcal:
<meal>{"note":"Comida","foods":[{"name":"Pollo a la plancha","quantity":"≈150 g","calories":248,"protein":47,"carbs":0,"fat":5,"fiber":0},{"name":"Arroz blanco","quantity":"≈200 g","calories":260,"protein":5,"carbs":56,"fat":1,"fiber":1},{"name":"Aceite de oliva","quantity":"1 cda (14 g)","calories":124,"protein":0,"carbs":0,"fat":14,"fiber":0}],"calories":632,"protein":52,"carbs":56,"fat":20,"fiber":1}</meal>
Si necesitas preguntar antes de registrar, NO incluyas el bloque <meal>.`;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeMeal(m: any): any | null {
  if (!m || typeof m !== "object") return null;
  const foods = Array.isArray(m.foods)
    ? m.foods.map((f: any) => ({
        name: String(f?.name ?? "Alimento"),
        quantity: String(f?.quantity ?? ""),
        calories: num(f?.calories),
        protein: num(f?.protein),
        carbs: num(f?.carbs),
        fat: num(f?.fat),
        fiber: num(f?.fiber),
      }))
    : [];

  const sum = (k: string) => foods.reduce((s: number, f: any) => s + num(f[k]), 0);
  // Trust the top-level totals, but fall back to summing the foods when the
  // model left them at zero (a common inconsistency).
  let calories = num(m.calories);
  let protein = num(m.protein);
  let carbs = num(m.carbs);
  let fat = num(m.fat);
  let fiber = num(m.fiber);
  if (calories === 0 && foods.length > 0) calories = sum("calories");
  if (protein === 0 && foods.length > 0) protein = sum("protein");
  if (carbs === 0 && foods.length > 0) carbs = sum("carbs");
  if (fat === 0 && foods.length > 0) fat = sum("fat");
  if (fiber === 0 && foods.length > 0) fiber = sum("fiber");

  // Nothing worth registering.
  if (foods.length === 0 && calories === 0) return null;

  return { note: typeof m.note === "string" && m.note ? m.note : "Comida", foods, calories, protein, carbs, fat, fiber };
}

function extractMeal(text: string): { reply: string; meal: any | null } {
  // Prefer the <meal> tags, but tolerate the model wrapping the JSON in a
  // ```json fence or emitting a bare {…} object with the expected fields.
  let jsonStr: string | null = null;
  let matchedSlice: string | null = null;

  const tag = text.match(/<meal>([\s\S]*?)<\/meal>/i);
  if (tag) {
    jsonStr = tag[1];
    matchedSlice = tag[0];
  } else {
    const fence = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (fence && /"calories"/.test(fence[1])) {
      jsonStr = fence[1];
      matchedSlice = fence[0];
    } else {
      const bare = text.match(/\{[\s\S]*"calories"[\s\S]*\}/);
      if (bare) {
        jsonStr = bare[0];
        matchedSlice = bare[0];
      }
    }
  }

  if (!jsonStr) return { reply: text.trim(), meal: null };

  let meal: any | null = null;
  try {
    meal = sanitizeMeal(JSON.parse(jsonStr.trim()));
  } catch {
    meal = null;
  }
  const reply = (matchedSlice ? text.replace(matchedSlice, "") : text).trim();
  return { reply: reply || "Registrado ✓", meal };
}

async function handleFood(body: any): Promise<Response> {
  const images = Array.isArray(body.images) ? body.images : [];
  const userContent: any[] = [];
  for (const img of images) {
    if (img?.media_type && img?.data) {
      userContent.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
    }
  }
  const textPart = (body.message ?? "").trim() || (images.length > 0 ? "Analiza la comida de la(s) foto(s) y regístrala." : "");
  userContent.push({ type: "text", text: textPart });

  const raw = await callAnthropic({
    system: buildFoodSystemPrompt(body.context),
    maxTokens: 1500,
    // Estimar macros de una foto no necesita el razonamiento largo del coach,
    // y aquí la latencia se nota: el usuario está esperando para registrar.
    effort: "low",
    messages: [
      ...(body.history ?? []).map((m: HistoryMsg) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ],
  });
  const { reply, meal } = extractMeal(raw);
  return json({ reply, meal });
}

// ---------------------------------------------------------------------
// Físico — fotos de progreso
// ---------------------------------------------------------------------

interface PhysiqueContext {
  profileSummary: string;
  previousCheckinsSummary: string;
  posesProvidedSummary: string;
}

function buildPhysiqueSystemPrompt(ctx: PhysiqueContext): string {
  return `Eres un entrenador con ojo clínico para composición corporal, analizando fotos de físico. Hablas en español, directo y sin rodeos, pero siempre honesto sobre los límites de lo que se puede saber a partir de una foto.

REGLA MÁS IMPORTANTE — LÉELA DOS VECES:
Lo que vas a dar es una ESTIMACIÓN VISUAL, no una medición clínica. No es un DEXA, ni un plicómetro, ni una bioimpedancia. La luz, la hidratación, el "pump" reciente, la postura y el ángulo de la cámara desplazan el resultado varios puntos porcentuales de un día a otro sin que el cuerpo haya cambiado realmente. Por eso NUNCA das un número exacto: das SIEMPRE un RANGO (bodyFatLow / bodyFatHigh), y cuanto menos fiable sea la foto (mala luz, un solo ángulo, pose parcial), MÁS ANCHO tiene que ser ese rango. Con las cuatro poses completas en buena luz, un rango de 3-4 puntos es razonable. Con una sola foto (p. ej. solo la inicial), ensancha el rango a 5-8 puntos o más si hace falta — mejor un rango honesto que un número falsamente preciso.

REFERENCIA VISUAL (orientativa, ajusta por complexión individual):
- Hombres: ~6-9% definición extrema con vascularización marcada y separación de fibras visible; ~10-14% abdominales visibles pero sin extrema definición; ~15-19% algo de definición en torso, algo de tejido en abdomen; ~20-24% sin definición visible, silueta redondeada; ~25%+ acumulación notable en cintura.
- Mujeres: ~14-17% definición extrema, visibilidad muscular alta (poco común y exige contexto de atleta/competición); ~18-22% cintura marcada, algo de definición abdominal; ~23-27% forma en "reloj de arena" sin definición marcada; ~28-32% menos definición, más suavidad en cintura/cadera; ~33%+ acumulación notable.
Usa esto como ancla, no como tabla rígida — el objetivo del usuario, su altura y su complexión ósea mueven la percepción.

CONTEXTO DEL USUARIO:
- Perfil: ${ctx.profileSummary}
- Check-ins anteriores: ${ctx.previousCheckinsSummary}
- Fotos de esta vez: ${ctx.posesProvidedSummary}

QUÉ HACER CON EL CONTEXTO:
- Ajusta el rango también según ${ctx.posesProvidedSummary.startsWith("Sin fotos") ? "nada (no debería pasar)" : "cuántas y cuáles poses hay"}: con menos poses, más ancho el rango, y dilo en las notas ("con solo la foto inicial el margen es amplio").
- Si hay check-ins anteriores, compara y comenta la tendencia (mejora, empeora, estable) — pero NO le des importancia a una diferencia de 1-2 puntos entre check-ins: eso es ruido del propio método, no un cambio real. Solo señala tendencia si el rango se ha movido de forma consistente en varios check-ins.
- Si entre las imágenes hay una etiquetada como "Foto de referencia (día 1)", úsala para comparar VISUALMENTE contra las fotos de hoy — distribución de grasa, definición, volumen muscular — en vez de fiarte solo del texto de check-ins anteriores. Esa foto es solo referencia: no la puntúes ni la incluyas como si fuera parte del check-in de hoy.
- Da 2-3 frases de feedback cualitativo de masa muscular y simetría (desarrollo, huecos, proporción) basándote en los grupos musculares que SÍ se ven en las poses proporcionadas — no inventes sobre lo que no se ve.
- Sé constructivo pero honesto: si hay una asimetría o un grupo rezagado real, dilo con claridad, no lo suavices hasta que no sirva de nada.

FORMATO — TEXTO PLANO, sin markdown (sin asteriscos, sin almohadillas, sin tablas). Frases cortas, como WhatsApp.

RESPUESTA:
Primero un mensaje breve y natural con el rango estimado y el feedback de masa muscular/simetría (y de tendencia si aplica). Después, SIEMPRE, el bloque de registro con las etiquetas <physique></physique> literales (NO uses \`\`\`json ni ningún otro envoltorio):
<physique>{"bodyFatLow":14,"bodyFatHigh":18,"muscleNotes":"...","trendNotes":"..."}</physique>
"trendNotes" debe ser null (sin comillas) si no hay check-in anterior con el que comparar. Nunca omitas el bloque.`;
}

function extractPhysique(text: string): { reply: string; checkin: any | null } {
  const tag = text.match(/<physique>([\s\S]*?)<\/physique>/i);
  if (!tag) return { reply: text.trim(), checkin: null };

  let checkin: any | null = null;
  try {
    const parsed = JSON.parse(tag[1].trim());
    const low = num(parsed?.bodyFatLow);
    const high = num(parsed?.bodyFatHigh);
    if (low > 0 && high > 0) {
      checkin = {
        bodyFatLow: Math.min(low, high),
        bodyFatHigh: Math.max(low, high),
        muscleNotes: typeof parsed?.muscleNotes === "string" ? parsed.muscleNotes : "",
        trendNotes: typeof parsed?.trendNotes === "string" ? parsed.trendNotes : null,
      };
    }
  } catch {
    checkin = null;
  }

  const reply = text.replace(tag[0], "").trim();
  return { reply: reply || "Análisis listo ✓", checkin };
}

async function handlePhysique(body: any): Promise<Response> {
  const images = Array.isArray(body.images) ? body.images : [];
  const userContent: any[] = [];
  for (const img of images) {
    if (img?.media_type && img?.data) {
      const label = img?.pose === "baseline" ? "Foto de referencia (día 1) — solo para comparar, no es de hoy" : `Foto de hoy — ${img?.pose ?? "sin etiquetar"}`;
      userContent.push({ type: "text", text: label });
      userContent.push({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } });
    }
  }
  userContent.push({ type: "text", text: "Analiza estas fotos de físico y da tu estimación siguiendo el formato indicado." });

  // effort medio (no "low" como Food): esto pasa una vez por semana, no
  // decenas de veces al día, así que merece más razonamiento por el mismo
  // coste práctico — y es justo la parte donde "muy buen análisis" importa más.
  const raw = await callAnthropic({
    system: buildPhysiqueSystemPrompt(body.context),
    maxTokens: 1200,
    effort: "medium",
    messages: [{ role: "user", content: userContent }],
  });
  const { reply, checkin } = extractPhysique(raw);
  return json({ reply, checkin });
}

// ---------------------------------------------------------------------
// Anthropic call + helpers
// ---------------------------------------------------------------------

async function callAnthropic(opts: {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  /** Coach: alta por defecto. Food estima macros y va con prisa, no necesita tanta. */
  effort?: "low" | "medium" | "high";
  /** Solo el coach: buscar la investigación actual y leer los papers que encuentre,
   *  en vez de tirar de una memoria que tiene fecha de corte. */
  webSearch?: boolean;
}): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY! });
  const params = {
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: opts.messages,
    thinking: { type: "adaptive" as const },
    output_config: { effort: opts.effort ?? "high" },
    // web_fetch solo abre URLs que ya han salido en la conversación, así que en
    // la práctica es "leerse el paper que acaba de encontrar" en vez de
    // quedarse con el resumen del buscador.
    ...(opts.webSearch
      ? {
          tools: [
            { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 8 },
            { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 3 },
          ],
        }
      : {}),
  };

  let response = await client.messages.create(params);

  // Con búsqueda web el servidor corre su propio bucle y, si se le acaban las
  // iteraciones, devuelve stop_reason "pause_turn" a medio razonar. Se
  // reenvía la conversación con el turno pausado y el servidor la retoma
  // donde iba (sin añadir ningún "continúa" — lo detecta él solo).
  const messages = [...opts.messages];
  for (let i = 0; i < 3 && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({ ...params, messages });
  }

  // Al buscar, la respuesta llega troceada: texto, resultados de búsqueda, más
  // texto. Quedarse con el primer bloque de texto (lo que hacía antes) se
  // dejaría fuera justo la parte redactada DESPUÉS de buscar.
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Verify the caller has a valid Supabase session — the function never
    // trusts the client-supplied context blindly.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, 500);

    const body = await req.json();
    if (body?.type === "food") return await handleFood(body);
    if (body?.type === "physique") return await handlePhysique(body);
    return await handleCoach(body);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
