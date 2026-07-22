// Veltra AI Coach — Supabase Edge Function (Deno runtime).
//
// Receives the conversation + a context bundle assembled client-side
// (src/lib/ai/context.ts — profile, injuries, recent sessions, PRs, lagging
// muscle groups, memory facts) and calls the Claude API to produce a
// grounded reply. The prompt is explicit that the model must never invent a
// number that wasn't handed to it.
//
// Deploy:
//   supabase functions deploy ai-coach
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Required secrets (set via `supabase secrets set`):
//   ANTHROPIC_API_KEY   — Claude API key (never exposed to the client)
//   ANTHROPIC_MODEL     — optional, defaults to claude-sonnet-5

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CoachContext {
  profileSummary: string;
  injuriesSummary: string;
  memorySummary: string;
  recentSessionsSummary: string;
  strongestLifts: string;
  laggingMuscleGroups: string;
}

interface RequestBody {
  conversationId: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  context: CoachContext;
}

function buildSystemPrompt(ctx: CoachContext): string {
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
  const reply = text.replace(match[0], "").trim();
  return { reply, memoryFacts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: CORS_HEADERS });
    }

    // Verify the caller has a valid Supabase session — the edge function
    // never trusts the client-supplied context blindly.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server" }), { status: 500, headers: CORS_HEADERS });
    }

    const body: RequestBody = await req.json();

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 700,
        system: buildSystemPrompt(body.context),
        messages: [
          ...body.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: body.message },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: `Anthropic API error: ${errText}` }), { status: 502, headers: CORS_HEADERS });
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData.content?.[0]?.text ?? "";
    const { reply, memoryFacts } = extractMemoryUpdates(rawText);

    return new Response(JSON.stringify({ reply, memoryFacts }), {
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS });
  }
});
