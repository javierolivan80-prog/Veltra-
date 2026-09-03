import { updateCommitmentSchedule } from "@/features/contract/repo";
import { generateId } from "@/lib/id";
import { getDb } from "@/lib/db/client";
import { dual, ok, rows } from "@/lib/db/dual";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Commitment, Contract, WeeklyReview } from "@/types/models";
import { computeReviewAggregate, currentReviewWeekStart, type DoneDaysByKind } from "./aggregate";
import { generateRuleBasedReview } from "./rules";

export async function listReviews(contractId: string): Promise<WeeklyReview[]> {
  const all = await dual({
    cloud: async (supabase) =>
      rows<WeeklyReview>(await supabase.from("weekly_reviews").select("*").eq("contract_id", contractId).order("week_start", { ascending: false })),
    local: (db) => db.getAllFromIndex("weeklyReviews", "contractId", contractId),
  });
  return [...all].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

async function setProposalStatus(id: string, status: "accepted" | "kept"): Promise<void> {
  await dual({
    cloud: async (supabase) => ok(await supabase.from("weekly_reviews").update({ proposal_status: status }).eq("id", id)),
    local: async (db) => {
      const existing = await db.get("weeklyReviews", id);
      if (existing) await db.put("weeklyReviews", { ...existing, proposalStatus: status });
    },
  });
}

/** Mantener el plan: se registra la decisión y no cambia nada más. */
export async function keepProposal(reviewId: string): Promise<void> {
  await setProposalStatus(reviewId, "kept");
}

/** Aceptar la propuesta aplica el cambio de verdad al compromiso — si no se
 *  aplicara, la funcionalidad no existiría, solo lo parecería. */
export async function acceptProposal(review: WeeklyReview): Promise<void> {
  if (!review.proposal) return;
  await updateCommitmentSchedule(review.proposal.commitmentId, review.proposal.proposedDays, review.proposal.proposedTimeSlot);
  await setProposalStatus(review.id, "accepted");
}

/**
 * Genera la revisión de la semana en curso si hace falta — solo en modo
 * local. En la nube la escribe la función programada `weekly-review`
 * (Anthropic, con fallback a reglas si falla); aquí, sin backend detrás,
 * las reglas fijas son la única revisión posible — no hay forma de llamar a
 * Anthropic sin exponer la clave. Sigue el mismo patrón que el coach y
 * Veltra Food: la función de IA se degrada a un estimador local, nunca se
 * desactiva.
 */
export async function ensureLocalWeeklyReview(
  contract: Pick<Contract, "id" | "startedOn">,
  commitments: Commitment[],
  doneDaysByKind: DoneDaysByKind
): Promise<void> {
  if (isSupabaseConfigured) return;

  const weekStart = currentReviewWeekStart();
  // El arco tiene que llevar activo al menos la semana completa que se revisa.
  if (contract.startedOn > weekStart) return;

  const db = await getDb();
  const existing = await db.getAllFromIndex("weeklyReviews", "contractId", contract.id);
  if (existing.some((r) => r.weekStart === weekStart)) return;

  const aggregate = computeReviewAggregate(commitments, doneDaysByKind);
  const { summary, pattern, proposal } = generateRuleBasedReview(aggregate);
  const review: WeeklyReview = {
    id: generateId(),
    contractId: contract.id,
    weekStart,
    summary,
    pattern,
    proposal,
    proposalStatus: proposal ? "pending" : "none",
    generatedBy: "rules",
    createdAt: new Date().toISOString(),
  };
  await db.put("weeklyReviews", review);
}
