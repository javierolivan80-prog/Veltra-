import { frequencyLabel } from "@/features/contract/catalogue";
import type { ReviewProposal } from "@/types/models";
import type { CommitmentStat, ReviewAggregate } from "./aggregate";

export interface RuleReviewResult {
  summary: string;
  pattern: string | null;
  proposal: ReviewProposal | null;
}

/** El mismo ajuste conservador que aplica la Fase 5 cuando el usuario falla
 *  por su cuenta: quita el último día marcado, sin bajar de uno. Aquí se
 *  propone primero en vez de forzarse. */
function proposeFrequencyReduction(c: CommitmentStat, rate7d: number): ReviewProposal {
  const sorted = [...c.days].sort((a, b) => a - b);
  const proposedDays = sorted.length > 1 ? sorted.slice(0, -1) : sorted;
  return {
    commitmentId: c.commitmentId,
    title: c.title,
    currentDays: sorted,
    proposedDays,
    proposedTimeSlot: c.timeSlot,
    reason: `Esta semana cumpliste ${Math.round(rate7d * 100)}% de "${c.title}" — ${frequencyLabel(proposedDays)} en vez de ${frequencyLabel(sorted)} es más fácil de sostener.`,
  };
}

/** Genera la revisión sin IA, con reglas fijas — el camino que garantiza que
 *  un domingo nunca se quede mudo (falle la llamada a Anthropic, o no haya
 *  backend porque el usuario trabaja solo en local). Nunca inventa un
 *  patrón ni una propuesta que los números no sostengan. */
export function generateRuleBasedReview(aggregate: ReviewAggregate): RuleReviewResult {
  const measurable = aggregate.commitments.filter((c) => c.measurable);
  const withData = measurable.filter((c) => c.due7d > 0);

  if (withData.length === 0) {
    return {
      summary:
        "Esta semana no había compromisos con días marcados que revisar. En cuanto tengas alguno activo, la revisión empezará a contar lo que has hecho de verdad.",
      pattern: null,
      proposal: null,
    };
  }

  const totalDue = withData.reduce((s, c) => s + c.due7d, 0);
  const totalDone = withData.reduce((s, c) => s + c.done7d, 0);
  const perCommitment = withData.map((c) => `${c.title} ${c.done7d}/${c.due7d}`).join(", ");
  const summary = `Esta semana completaste ${totalDone} de ${totalDue} compromisos (${Math.round((totalDone / totalDue) * 100)}%). Por compromiso: ${perCommitment}.`;

  // Patrón: solo lo afirma con 28 días de referencia y una desviación clara
  // esta semana — nunca a partir de una sola semana suelta.
  let pattern: string | null = null;
  let worstDeviation = 0;
  for (const c of withData) {
    if (c.due28d < 14) continue; // menos de 2 semanas de referencia, no basta
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

  // Propuesta: como mucho una, y solo si un compromiso va claramente mal
  // (menos de la mitad de los días marcados) con datos suficientes para no
  // ser ruido de una semana rara (al menos 2 días marcados).
  let proposal: ReviewProposal | null = null;
  let worstRate = 0.5;
  for (const c of withData) {
    if (c.due7d < 2 || c.days.length <= 1) continue;
    const rate = c.done7d / c.due7d;
    if (rate < worstRate) {
      worstRate = rate;
      proposal = proposeFrequencyReduction(c, rate);
    }
  }

  return { summary, pattern, proposal };
}
