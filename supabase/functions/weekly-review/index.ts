// Veltra — Revisión semanal (Fase 4). Supabase Edge Function.
//
// Triggered every Sunday by a pg_cron job (set up manually — see
// WEEKLY_REVIEW_SETUP.md at the repo root, since it needs this function's
// deployed URL, which doesn't exist until after the first deploy).
//
// For every user with an active contract that ran through the just-finished
// week, aggregates the last 7 and 28 days per commitment and asks Anthropic
// for a fixed-structure review: a summary with real numbers, a pattern only
// when the 28-day data actually supports one, and at most one proposal to
// change the plan. If the call fails, or ANTHROPIC_API_KEY isn't set, falls
// back to a deterministic rule-based review — a Sunday can never go mute.
//
// Idempotent by design (unique(user_id, week_start) in the migration): a
// repeat invocation for a week already reviewed inserts nothing, so no
// extra guard is needed against this function being called more than once.
//
// Required secrets:
//   ANTHROPIC_API_KEY, ANTHROPIC_MODEL — shared with ai-coach
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime — no need to set them.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------------------------------------------------------------------
// Day-key helpers (UTC) — the cron runs at a fixed UTC hour; a per-user
// timezone offset isn't worth the extra queries for a weekly aggregate.
// ---------------------------------------------------------------------

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function shiftDayKey(key: string, deltaDays: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return dayKey(d);
}
function lastNDayKeys(n: number, endKey: string): string[] {
  return Array.from({ length: n }, (_, i) => shiftDayKey(endKey, -(n - 1 - i)));
}
function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

// ---------------------------------------------------------------------
// Aggregation — a deliberate, small port of
// src/features/review/aggregate.ts. Deno edge functions can't import
// Next.js src/ directly; keep the two in sync if the rule changes.
// ---------------------------------------------------------------------

interface CommitmentRow {
  id: string;
  kind: string;
  title: string;
  days: number[];
  time_slot: string;
}

interface CommitmentStat {
  commitmentId: string;
  kind: string;
  title: string;
  days: number[];
  timeSlot: string;
  due7d: number;
  done7d: number;
  due28d: number;
  done28d: number;
  measurable: boolean;
}

function isDueOn(days: number[], key: string): boolean {
  return days.includes(weekdayOf(key));
}

function computeAggregate(commitments: CommitmentRow[], doneDaysByKind: Map<string, Set<string>>, window7: string[], window28: string[]): CommitmentStat[] {
  return commitments.map((c) => {
    const doneDays = doneDaysByKind.get(c.kind) ?? new Set<string>();
    const due7 = window7.filter((d) => isDueOn(c.days, d));
    const due28 = window28.filter((d) => isDueOn(c.days, d));
    return {
      commitmentId: c.id,
      kind: c.kind,
      title: c.title,
      days: c.days,
      timeSlot: c.time_slot,
      due7d: due7.length,
      done7d: due7.filter((d) => doneDays.has(d)).length,
      due28d: due28.length,
      done28d: due28.filter((d) => doneDays.has(d)).length,
      measurable: c.kind !== "habit",
    };
  });
}

// ---------------------------------------------------------------------
// Rule-based fallback — a port of src/features/review/rules.ts.
// ---------------------------------------------------------------------

function frequencyLabel(days: number[]): string {
  if (days.length === 7) return "todos los días";
  if (days.length === 0) return "sin días";
  return `${days.length} ${days.length === 1 ? "día" : "días"} por semana`;
}

interface Proposal {
  commitmentId: string;
  title: string;
  currentDays: number[];
  proposedDays: number[];
  proposedTimeSlot: string;
  reason: string;
}

interface ReviewResult {
  summary: string;
  pattern: string | null;
  proposal: Proposal | null;
}

function generateRuleBasedReview(stats: CommitmentStat[]): ReviewResult {
  const withData = stats.filter((c) => c.measurable && c.due7d > 0);
  if (withData.length === 0) {
    return {
      summary: "Esta semana no había compromisos con días marcados que revisar.",
      pattern: null,
      proposal: null,
    };
  }

  const totalDue = withData.reduce((s, c) => s + c.due7d, 0);
  const totalDone = withData.reduce((s, c) => s + c.done7d, 0);
  const perCommitment = withData.map((c) => `${c.title} ${c.done7d}/${c.due7d}`).join(", ");
  const summary = `Esta semana completaste ${totalDone} de ${totalDue} compromisos (${Math.round((totalDone / totalDue) * 100)}%). Por compromiso: ${perCommitment}.`;

  let pattern: string | null = null;
  let worstDeviation = 0;
  for (const c of withData) {
    if (c.due28d < 14) continue;
    const r7 = c.done7d / c.due7d;
    const r28 = c.done28d / c.due28d;
    const deviation = r28 - r7;
    if (deviation >= 0.3 && deviation > worstDeviation) {
      worstDeviation = deviation;
      pattern = `"${c.title}" te costó más esta semana (${Math.round(r7 * 100)}%) que tu media de las últimas 4 (${Math.round(r28 * 100)}%).`;
    }
  }
  if (pattern === null && withData.some((c) => c.due28d >= 14)) {
    pattern = "Sin desviaciones claras esta semana frente a tu media de las últimas 4.";
  }

  let proposal: Proposal | null = null;
  let worstRate = 0.5;
  for (const c of withData) {
    if (c.due7d < 2 || c.days.length <= 1) continue;
    const rate = c.done7d / c.due7d;
    if (rate < worstRate) {
      worstRate = rate;
      const sorted = [...c.days].sort((a, b) => a - b);
      const proposedDays = sorted.slice(0, -1);
      proposal = {
        commitmentId: c.commitmentId,
        title: c.title,
        currentDays: sorted,
        proposedDays,
        proposedTimeSlot: c.timeSlot,
        reason: `Esta semana cumpliste ${Math.round(rate * 100)}% de "${c.title}" — ${frequencyLabel(proposedDays)} en vez de ${frequencyLabel(sorted)} es más fácil de sostener.`,
      };
    }
  }

  return { summary, pattern, proposal };
}

// ---------------------------------------------------------------------
// AI generation
// ---------------------------------------------------------------------

const REVIEW_SYSTEM_PROMPT = `Eres el entrenador dentro de la app Veltra, escribiendo la revisión semanal del usuario. Hablas en español, tono de entrenador: frases cortas, directas, sin exclamaciones, sin emojis, sin ánimo artificial ("¡vamos!", "¡genial!"). Cuando el usuario falla, la respuesta correcta es bajar la exigencia y decirlo con claridad, no subir el volumen.

Recibirás, por compromiso del contrato del usuario, cuántos días tocaba y cuántos cumplió en los últimos 7 días, y lo mismo en los últimos 28. Son los ÚNICOS datos reales que tienes — no inventes cifras, fechas ni compromisos que no estén en la lista.

Responde EXCLUSIVAMENTE con un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"summary": "...", "pattern": "..." o null, "proposal": {"commitmentId": "...", "title": "...", "currentDays": [...], "proposedDays": [...], "proposedTimeSlot": "morning"|"afternoon"|"evening", "reason": "..."} o null}

Reglas:
- "summary": 2-4 frases, con números reales de la semana (cuántos de cuántos, por compromiso).
- "pattern": UNA frase señalando una relación real entre compromisos o una desviación clara frente a la media de 28 días — SOLO si los datos de 28 días la sostienen con claridad. Si no hay datos suficientes o no hay nada claro, usa null. Nunca afirmes un patrón que no puedas apoyar con los números recibidos.
- "proposal": como mucho UNA propuesta de cambio, y solo si un compromiso va claramente mal (menos de la mitad de los días marcados, con al menos 2 días marcados esa semana). El cambio tiene que ser una reducción de frecuencia realista: "proposedDays" es "currentDays" quitando como mucho un día. Si todo va razonablemente bien, usa null — no propongas cambios por proponer.
- "commitmentId" en la propuesta tiene que ser exactamente uno de los ids recibidos.`;

async function callAnthropic(stats: CommitmentStat[]): Promise<ReviewResult | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const payload = stats
    .filter((c) => c.measurable)
    .map((c) => ({ commitmentId: c.commitmentId, title: c.title, currentDays: c.days, timeSlot: c.timeSlot, due7d: c.due7d, done7d: c.done7d, due28d: c.due28d, done28d: c.done28d }));
  if (payload.length === 0) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
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
    const validIds = new Set(payload.map((p) => p.commitmentId));
    const proposal = parsed.proposal && validIds.has(parsed.proposal.commitmentId) ? parsed.proposal : null;
    return { summary: parsed.summary, pattern: typeof parsed.pattern === "string" ? parsed.pattern : null, proposal };
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
  const yesterday = shiftDayKey(today, -1);
  const window7 = lastNDayKeys(7, yesterday);
  const window28 = lastNDayKeys(28, yesterday);
  const weekStart = window7[0];
  const from28 = window28[0];

  const { data: contracts } = await supabase.from("contracts").select("id, user_id, started_on").eq("status", "active").lte("started_on", weekStart);
  if (!contracts || contracts.length === 0) {
    return new Response(JSON.stringify({ contractsDue: 0 }), { status: 200, headers: { "content-type": "application/json" } });
  }

  const { data: existingReviews } = await supabase.from("weekly_reviews").select("user_id").eq("week_start", weekStart);
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
      supabase.from("workout_sessions").select("started_at").eq("user_id", contract.user_id).eq("status", "completed").gte("started_at", from28),
      supabase.from("sleep_logs").select("date").eq("user_id", contract.user_id).gte("date", from28),
      supabase.from("food_meals").select("date").eq("user_id", contract.user_id).gte("date", from28),
      supabase.from("meditation_sessions").select("completed_at").eq("user_id", contract.user_id).gte("completed_at", from28),
      supabase.from("focus_sessions").select("completed_at").eq("user_id", contract.user_id).gte("completed_at", from28),
      supabase.from("journal_entries").select("date").eq("user_id", contract.user_id).gte("date", from28),
    ]);

    addDates("workout", (workouts.data ?? []).map((r: { started_at: string }) => r.started_at.slice(0, 10)));
    addDates("sleep", (sleeps.data ?? []).map((r: { date: string }) => r.date));
    addDates("nutrition", (meals.data ?? []).map((r: { date: string }) => r.date));
    addDates("meditation", (meditations.data ?? []).map((r: { completed_at: string }) => r.completed_at.slice(0, 10)));
    addDates("focus", (focuses.data ?? []).map((r: { completed_at: string }) => r.completed_at.slice(0, 10)));
    addDates("journaling", (journals.data ?? []).map((r: { date: string }) => r.date));

    const stats = computeAggregate(commitments as CommitmentRow[], doneDaysByKind, window7, window28);

    let result = await callAnthropic(stats);
    let generatedBy = "ai";
    if (result) {
      aiUsed++;
    } else {
      result = generateRuleBasedReview(stats);
      generatedBy = "rules";
    }

    const { error } = await supabase.from("weekly_reviews").insert({
      id: crypto.randomUUID(),
      user_id: contract.user_id,
      contract_id: contract.id,
      week_start: weekStart,
      summary: result.summary,
      pattern: result.pattern,
      proposal: result.proposal,
      proposal_status: result.proposal ? "pending" : "none",
      generated_by: generatedBy,
    });
    // 23505 = unique_violation — a concurrent run already wrote this user's
    // review for this week. Nothing to do, move on.
    if (!error) generated++;
  }

  return new Response(JSON.stringify({ contractsDue: due.length, generated, aiUsed }), { status: 200, headers: { "content-type": "application/json" } });
});
