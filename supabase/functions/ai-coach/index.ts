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
}

function buildCoachSystemPrompt(ctx: CoachContext): string {
  return `Eres el entrenador personal de élite dentro de la app Veltra. Hablas en español, con tono cercano pero profesional — como un entrenador que lleva años acompañando a este usuario, no un chatbot genérico.

REGLAS ESTRICTAS:
- Solo puedes usar los datos reales proporcionados abajo. Nunca inventes pesos, fechas ni marcas que no estén en el contexto.
- Si no tienes datos suficientes para responder algo con precisión, dilo abiertamente y explica qué haría falta registrar.
- Sé conciso: 2-4 frases salvo que el usuario pida un análisis largo o una rutina completa.
- Cuando dés una recomendación, explica brevemente el motivo apoyándote en los datos.
- Si detectas que el usuario menciona una lesión, molestia o restricción nueva, sigue las reglas de memoria abajo.

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
  return `Eres el asistente de nutrición de la app Veltra (Veltra Food). Tu trabajo es estimar, de la forma más precisa posible, las calorías y macronutrientes de lo que el usuario ha comido, a partir de su texto y de las fotos que adjunte. Hablas en español, cercano y directo.

CÓMO ANALIZAR (en este orden de prioridad):
1. Lee primero el texto del usuario. Si indica cantidades concretas (p. ej. "180 g de pollo"), esas cantidades MANDAN sobre cualquier estimación visual.
2. Analiza las fotos para identificar alimentos y estimar las porciones que el texto no haya especificado.
3. Combina ambas fuentes para la estimación final.
4. Si hay demasiada incertidumbre para dar una estimación razonable (p. ej. una foto ambigua sin ninguna pista de cantidad), haz UNA pregunta breve y NO registres la comida todavía.

REGLAS:
- No inventes precisión falsa: son estimaciones. Redondea de forma sensata.
- Usa el contexto del día para dar feedback útil sobre el progreso (calorías/proteína restantes) en 1-2 frases.
- Sé breve. El usuario quiere registrar rápido, como un mensaje de WhatsApp.

CONTEXTO DEL USUARIO:
- Perfil: ${ctx.profileSummary}
- Objetivos diarios: ${ctx.goalsSummary}
- ${ctx.dailyProgressSummary}

FORMATO DE SALIDA:
Escribe primero tu respuesta natural para el usuario (confirmación + feedback breve del progreso, o una pregunta si falta info).
Si —y solo si— tienes suficiente información para registrar la comida, añade al final un bloque EXACTO con este formato (el usuario no lo verá, se procesa aparte). Todos los números en gramos salvo "calories" en kcal:
<meal>{"note":"Desayuno","foods":[{"name":"Pollo","quantity":"180 g","calories":297,"protein":56,"carbs":0,"fat":6.5,"fiber":0}],"calories":297,"protein":56,"carbs":0,"fat":6.5,"fiber":0}</meal>
Si necesitas preguntar antes de registrar, NO incluyas el bloque <meal>.`;
}

function extractMeal(text: string): { reply: string; meal: any | null } {
  const match = text.match(/<meal>([\s\S]*?)<\/meal>/);
  if (!match) return { reply: text.trim(), meal: null };
  let meal: any | null = null;
  try {
    meal = JSON.parse(match[1]);
  } catch {
    meal = null;
  }
  const reply = text.replace(match[0], "").trim();
  return { reply: reply || "Registrado.", meal };
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
    maxTokens: 900,
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
