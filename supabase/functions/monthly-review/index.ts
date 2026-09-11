// Veltra — Revisión mensual (Fase 6). Supabase Edge Function.
//
// Triggered on the 1st of every month by a pg_cron job (set up manually —
// see MONTHLY_REVIEW_SETUP.md at the repo root, since it needs this
// function's deployed URL, which doesn't exist until after the first
// deploy).
//
// For every user with an active contract that ran through the whole
// calendar month that just closed, aggregates that month per commitment and
// asks Anthropic for a fixed-structure review: a summary with real numbers,
// a highlight (the month's strongest commitment) and a lowlight (the one
// that cost the most), each only when the data actually supports it. No
// proposal field here — changing a commitment's frequency is the weekly
// review's job, not this one's. If the call fails, or ANTHROPIC_API_KEY
// isn't set, falls back to a deterministic rule-based review — the 1st of
// the month can never go mute.
//
// Idempotent by design (unique(user_id, month_start) in the migration): a
// repeat invocation for a month already reviewed inserts nothing.
//
// Required secrets:
//   ANTHROPIC_API_KEY, ANTHROPIC_MODEL — shared with ai-coach / weekly-review
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime — no need to set them.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------------------------------------------------------------------
// Day-key helpers (UTC) — the cron runs at a fixed UTC hour; a per-user
// timezone offset isn't worth the extra queries for a monthly aggregate.
// ---------------------------------------------------------------------

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}
/** First day-key of the calendar month before the one containing `key`. */
function previousMonthStart(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return dayKey(d);
}
/** Last day-key of the calendar month that `monthStartKey` opens. */
function monthEndKey(monthStartKey: string): string {
  const [y, m] = monthStartKey.split("-").map(Number);
  return dayKey(new Date(Date.UTC(y, m, 0)));
}
function allDayKeysInMonth(monthStartKey: string): string[] {
  const end = monthEndKey(monthStartKey);
  const keys: string[] = [];
  let cursor = monthStartKey;
  while (cursor <= end) {
    keys.push(cursor);
    const [y, m, d] = cursor.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = dayKey(next);
  }
  return keys;
}

// ---------------------------------------------------------------------
// Aggregation — a deliberate, small port of
// src/features/review/aggregate.ts's monthly half. Deno edge functions
// can't import Next.js src/ directly; keep the two in sync if the rule
// changes.
// ---------------------------------------------------------------------

interface CommitmentRow {
  id: string;
  kind: string;
  title: string;
  days: number[];
  time_slot: string;
}

interface MonthlyCommitmentStat {
  commitmentId: string;
  kind: string;
  title: string;
  dueMonth: number;
  doneMonth: number;
  measurable: boolean;
}

function isDueOn(days: number[], key: string): boolean {
  return days.includes(weekdayOf(key));
}

function computeMonthlyAggregate(commitments: CommitmentRow[], doneDaysByKind: Map<string, Set<string>>, monthDays: string[]): MonthlyCommitmentStat[] {
  return commitments.map((c) => {
    const doneDays = doneDaysByKind.get(c.kind) ?? new Set<string>();
    const due = monthDays.filter((d) => isDueOn(c.days, d));
    return {
      commitmentId: c.id,
      kind: c.kind,
      title: c.title,
      dueMonth: due.length,
      doneMonth: due.filter((d) => doneDays.has(d)).length,
      measurable: c.kind !== "habit",
    };
  });
}

// ---------------------------------------------------------------------
// Rule-based fallback — a port of generateRuleBasedMonthlyReview in
// src/features/review/rules.ts.
// ---------------------------------------------------------------------

interface MonthlyReviewResult {
  summary: string;
  highlight: string | null;
  lowlight: string | null;
}

const MIN_DUE_FOR_SIGNAL = 8;

function generateRuleBasedMonthlyReview(stats: MonthlyCommitmentStat[]): MonthlyReviewResult {
  const withData = stats.filter((c) => c.measurable && c.dueMonth > 0);
  if (withData.length === 0) {
    return { summary: "Este mes no había compromisos con días marcados que revisar.", highlight: null, lowlight: null };
  }

  const totalDue = withData.reduce((s, c) => s + c.dueMonth, 0);
  const totalDone = withData.reduce((s, c) => s + c.doneMonth, 0);
  const perCommitment = withData.map((c) => `${c.title} ${c.doneMonth}/${c.dueMonth}`).join(", ");
  const summary = `Este mes completaste ${totalDone} de ${totalDue} compromisos (${Math.round((totalDone / totalDue) * 100)}%). Por compromiso: ${perCommitment}.`;

  const withSignal = withData.filter((c) => c.dueMonth >= MIN_DUE_FOR_SIGNAL);

  let highlight: string | null = null;
  let best: MonthlyCommitmentStat | null = null;
  let bestRate = 0;
  for (const c of withSignal) {
    const rate = c.doneMonth / c.dueMonth;
    if (rate > bestRate) {
      bestRate = rate;
      best = c;
    }
  }
  if (best && bestRate >= 0.7) {
    highlight = `Tu punto fuerte del mes: "${best.title}", cumplido ${Math.round(bestRate * 100)}%.`;
  }

  let lowlight: string | null = null;
  let worst: MonthlyCommitmentStat | null = null;
  let worstRate = 1;
  for (const c of withSignal) {
    if (c === best) continue;
    const rate = c.doneMonth / c.dueMonth;
    if (rate < worstRate) {
      worstRate = rate;
      worst = c;
    }
  }
  if (worst && worstRate < 0.5) {
    lowlight = `Lo que más te costó: "${worst.title}", cumplido solo ${Math.round(worstRate * 100)}%.`;
  }

  return { summary, highlight, lowlight };
}

// ---------------------------------------------------------------------
// AI generation
// ---------------------------------------------------------------------

const REVIEW_SYSTEM_PROMPT = `Eres el entrenador dentro de la app Veltra, escribiendo la revisión MENSUAL del usuario — un vistazo más largo que la revisión semanal, no una repetición suya. Hablas en español, tono de entrenador: frases cortas, directas, sin exclamaciones, sin emojis, sin ánimo artificial ("¡vamos!", "¡genial!"). Cuando el usuario falla, la respuesta correcta es bajar la exigencia y decirlo con claridad, no subir el volumen.

Recibirás, por compromiso del contrato del usuario, cuántos días tocaba y cuántos cumplió en el mes natural que acaba de cerrarse. Son los ÚNICOS datos reales que tienes — no inventes cifras, fechas ni compromisos que no estén en la lista.

Responde EXCLUSIVAMENTE con un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"summary": "...", "highlight": "..." o null, "lowlight": "..." o null}

Reglas:
- "summary": 2-4 frases, con números reales del mes (cuántos de cuántos, por compromiso).
- "highlight": UNA frase señalando el compromiso que mejor cumplió este mes — solo si tuvo al menos 8 días marcados y un cumplimiento de al menos 70%. Si nada llega a ese nivel, usa null.
- "lowlight": UNA frase señalando el compromiso que peor cumplió este mes, distinto del highlight — solo si tuvo al menos 8 días marcados y un cumplimiento por debajo del 50%. Si nada baja de ahí, usa null.
- NUNCA propongas cambiar la frecuencia ni la franja de ningún compromiso — eso es trabajo de otra revisión, no de esta. No incluyas ningún campo de propuesta.
- Nunca afirmes un highlight o lowlight que los números no sostengan.`;

async function callAnthropic(stats: MonthlyCommitmentStat[]): Promise<MonthlyReviewResult | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const payload = stats.filter((c) => c.measurable).map((c) => ({ commitmentId: c.commitmentId, title: c.title, dueMonth: c.dueMonth, doneMonth: c.doneMonth }));
  if (payload.length === 0) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        system: REVIEW_SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const textBlock = (data.content ?? []).find((b: { type: string; text?: string }) => b.type === "text");
    const text: string = textBlock?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    if (typeof parsed.summary !== "string") return null;
    return {
      summary: parsed.summary,
      highlight: typeof parsed.highlight === "string" ? parsed.highlight : null,
      lowlight: typeof parsed.lowlight === "string" ? parsed.lowlight : null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const today = dayKey(new Date());
  const monthStart = previousMonthStart(today);
  const monthDays = allDayKeysInMonth(monthStart);
  const from = monthStart;

  const { data: contracts } = await supabase.from("contracts").select("id, user_id, started_on").eq("status", "active").lte("started_on", monthStart);
  if (!contracts || contracts.length === 0) {
    return new Response(JSON.stringify({ contractsDue: 0 }), { status: 200, headers: { "content-type": "application/json" } });
  }

  const { data: existingReviews } = await supabase.from("monthly_reviews").select("user_id").eq("month_start", monthStart);
  const alreadyDone = new Set((existingReviews ?? []).map((r: { user_id: string }) => r.user_id));
  const due = (contracts as { id: string; user_id: string; started_on: string }[]).filter((c) => !alreadyDone.has(c.user_id));

  let generated = 0;
  let aiUsed = 0;

  for (const contract of due) {
    const { data: commitments } = await supabase.from("commitments").select("id, kind, title, days, time_slot").eq("contract_id", contract.id);
    if (!commitments || commitments.length === 0) continue;

    const doneDaysByKind = new Map<string, Set<string>>();
    const addDates = (kind: string, dates: string[]) => {
      const set = doneDaysByKind.get(kind) ?? new Set<string>();
      for (const d of dates) set.add(d);
      doneDaysByKind.set(kind, set);
    };

    const [workouts, sleeps, meals, meditations, focuses, journals] = await Promise.all([
      supabase.from("workout_sessions").select("started_at").eq("user_id", contract.user_id).eq("status", "completed").gte("started_at", from),
      supabase.from("sleep_logs").select("date").eq("user_id", contract.user_id).gte("date", from),
      supabase.from("food_meals").select("date").eq("user_id", contract.user_id).gte("date", from),
      supabase.from("meditation_sessions").select("completed_at").eq("user_id", contract.user_id).gte("completed_at", from),
      supabase.from("focus_sessions").select("completed_at").eq("user_id", contract.user_id).gte("completed_at", from),
      supabase.from("journal_entries").select("date").eq("user_id", contract.user_id).gte("date", from),
    ]);

    addDates("workout", (workouts.data ?? []).map((r: { started_at: string }) => r.started_at.slice(0, 10)));
    addDates("sleep", (sleeps.data ?? []).map((r: { date: string }) => r.date));
    addDates("nutrition", (meals.data ?? []).map((r: { date: string }) => r.date));
    addDates("meditation", (meditations.data ?? []).map((r: { completed_at: string }) => r.completed_at.slice(0, 10)));
    addDates("focus", (focuses.data ?? []).map((r: { completed_at: string }) => r.completed_at.slice(0, 10)));
    addDates("journaling", (journals.data ?? []).map((r: { date: string }) => r.date));

    const stats = computeMonthlyAggregate(commitments as CommitmentRow[], doneDaysByKind, monthDays);

    let result = await callAnthropic(stats);
    let generatedBy = "ai";
    if (result) {
      aiUsed++;
    } else {
      result = generateRuleBasedMonthlyReview(stats);
      generatedBy = "rules";
    }

    const { error } = await supabase.from("monthly_reviews").insert({
      id: crypto.randomUUID(),
      user_id: contract.user_id,
      contract_id: contract.id,
      month_start: monthStart,
      summary: result.summary,
      highlight: result.highlight,
      lowlight: result.lowlight,
      generated_by: generatedBy,
    });
    // 23505 = unique_violation — a concurrent run already wrote this user's
    // review for this month. Nothing to do, move on.
    if (!error) generated++;
  }

  return new Response(JSON.stringify({ contractsDue: due.length, generated, aiUsed }), { status: 200, headers: { "content-type": "application/json" } });
});
