// Veltra AI gateway — Supabase Edge Function (Deno runtime).
//
// Routes by the request body's `type` field:
//   - "coach" (default): the personal-trainer chat. Receives a grounded
//     context bundle (profile, injuries, sessions, PRs…) and returns a reply
//     plus any memory facts to remember.
//   - "food": Veltra Food. Receives the user's text + meal photos + the day's
//     nutrition context and returns a reply plus a structured meal (foods and
//     macros) to register. Text quantities take priority over the visual
//     estimate; if too uncertain it asks a brief question instead of guessing.
//
// Required secrets (set via Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   — Claude API key (never exposed to the client)
//   ANTHROPIC_MODEL     — optional, defaults to claude-sonnet-5

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
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
}

function buildCoachSystemPrompt(ctx: CoachContext): string {
  return `Eres el entrenador personal de élite dentro de la app Veltra. Hablas en español, con tono cercano pero profesional — como un entrenador que lleva años acompañando a este usuario, no un chatbot genérico.

REGLAS ESTRICTAS:
- Solo puedes usar los datos reales proporcionados abajo. Nunca inventes pesos, fechas ni marcas que no estén en el contexto.
- Si no tienes datos suficientes para responder algo con precisión, dilo abiertamente y explica qué haría falta registrar.
- Sé conciso: 2-4 frases salvo que el usuario pida un análisis largo o una rutina completa.
- Cuando dés una recomendación, explica brevemente el motivo apoyándote en los datos.
- Si detectas que el usuario menciona una lesión, molestia o restricción nueva, sigue las reglas de memoria abajo.
- Tienes acceso a lo que come (sección Nutrición). Úsalo cuando sea relevante para explicar el rendimiento o el progreso (p. ej. si lleva días muy por debajo de su objetivo de proteína o de calorías). No lo menciones si no viene a cuento.
- Tienes acceso a patrones cruzados entre sueño, ánimo y actividad (sección Bienestar). Si hay uno detectado y viene a cuento, apóyate en él para explicar un bajón de rendimiento o motivar un cambio concreto — no lo repitas si no aporta nada a la conversación, y nunca afirmes un patrón que no esté ahí.

SUSTANCIAS Y RENDIMIENTO:
Si preguntan por esteroides anabólicos, SARMs, péptidos u otras sustancias relacionadas con el rendimiento (por ejemplo comparar potencia anabólica entre compuestos, o qué efectos secundarios tiene alguno en concreto), responde con información factual, comparativa y educativa — igual que con cualquier otro tema de fisiología, sin evasivas ni sermones. Puedes explicar efectos conocidos, por qué un compuesto es más androgénico o anabólico que otro, y sus perfiles de riesgo reales. No conviertas la respuesta en una advertencia genérica si no la han pedido.
Lo que no debes hacer: darles una pauta de dosis, ciclo, combinación (stacking), pauta post-ciclo (PCT) o técnica de inyección personalizada para que la sigan, ni ayudarles a conseguir las sustancias. Si piden eso explícitamente, diles que eso requiere supervisión médica real y que no se lo vas a planificar tú.

CONTEXTO REAL DEL USUARIO:
- Perfil: ${ctx.profileSummary}
- Lesiones activas: ${ctx.injuriesSummary}
- Memoria guardada de conversaciones anteriores:
${ctx.memorySummary}
- Sesiones recientes:
${ctx.recentSessionsSummary}
- Mejores marcas actuales: ${ctx.strongestLifts}
- Grupos musculares menos entrenados recientemente: ${ctx.laggingMuscleGroups}
- Nutrición (Veltra Food): ${ctx.nutritionSummary ?? "Sin datos de nutrición."}
- Bienestar (patrones cruzados sueño/ánimo/actividad): ${ctx.wellbeingSummary ?? "Sin datos de bienestar."}

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
    messages: [
      ...(body.history ?? []).map((m: HistoryMsg) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ],
  });
  const { reply, meal } = extractMeal(raw);
  return json({ reply, meal });
}

// ---------------------------------------------------------------------
// Anthropic call + helpers
// ---------------------------------------------------------------------

async function callAnthropic(opts: { system: string; messages: any[]; maxTokens?: number }): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 700,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error: ${errText}`);
  }
  const data = await res.json();
  // Don't assume the text block is content[0] — some models prepend other
  // block types, which would silently make the reply come out empty.
  const textBlock = (data.content ?? []).find((b: { type: string; text?: string }) => b.type === "text");
  return textBlock?.text ?? "";
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
    return await handleCoach(body);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
