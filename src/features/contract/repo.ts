import { dual, ok, rows } from "@/lib/db/dual";
import { shiftDayKey, todayKey } from "@/lib/date";
import { generateId } from "@/lib/id";
import { toSnakeCase } from "@/lib/supabase/case";
import type { Commitment, CommitmentKind, Contract, ContractFocus, TimeSlot } from "@/types/models";

export interface CommitmentDraft {
  kind: CommitmentKind;
  title: string;
  days: number[];
  timeSlot: TimeSlot;
}

export interface ContractDraft {
  focus: ContractFocus;
  why: string;
  durationDays: number;
  commitments: CommitmentDraft[];
}

export async function getActiveContract(): Promise<Contract | null> {
  const all = await dual({
    cloud: async (supabase) => rows<Contract>(await supabase.from("contracts").select("*").eq("status", "active")),
    local: (db) => db.getAllFromIndex("contracts", "status", "active"),
  });
  // Newest wins if a stale one ever slips through: the partial unique index
  // keeps Supabase to one, but the local store has no such constraint.
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export async function listContracts(): Promise<Contract[]> {
  const all = await dual({
    cloud: async (supabase) => rows<Contract>(await supabase.from("contracts").select("*").order("started_on", { ascending: false })),
    local: (db) => db.getAll("contracts"),
  });
  return [...all].sort((a, b) => b.startedOn.localeCompare(a.startedOn));
}

export async function listCommitments(contractId: string): Promise<Commitment[]> {
  const all = await dual({
    cloud: async (supabase) =>
      rows<Commitment>(await supabase.from("commitments").select("*").eq("contract_id", contractId).order("position", { ascending: true })),
    local: (db) => db.getAllFromIndex("commitments", "contractId", contractId),
  });
  return [...all].sort((a, b) => a.position - b.position);
}

/** El contrato firmado y sus compromisos, en una sola operación. */
export async function createContract(draft: ContractDraft): Promise<Contract> {
  const now = new Date().toISOString();
  const startedOn = todayKey();
  const contract: Contract = {
    id: generateId(),
    focus: draft.focus,
    why: draft.why,
    durationDays: draft.durationDays,
    startedOn,
    // El día de firma cuenta como día 1, así que un arco de 90 termina 89
    // días después y no 90.
    endsOn: shiftDayKey(startedOn, draft.durationDays - 1),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const commitments: Commitment[] = draft.commitments.map((c, i) => ({
    id: generateId(),
    contractId: contract.id,
    kind: c.kind,
    title: c.title,
    days: c.days,
    timeSlot: c.timeSlot,
    position: i,
    createdAt: now,
    updatedAt: now,
  }));

  await dual({
    cloud: async (supabase, userId) => {
      const uid = await userId();
      ok(await supabase.from("contracts").insert({ ...toSnakeCase(contract), user_id: uid }));
      if (commitments.length > 0) {
        ok(await supabase.from("commitments").insert(commitments.map((c) => ({ ...toSnakeCase(c), user_id: uid }))));
      }
    },
    local: async (db) => {
      await db.put("contracts", contract);
      for (const c of commitments) await db.put("commitments", c);
    },
  });

  return contract;
}

export async function updateContractStatus(id: string, status: Contract["status"]): Promise<void> {
  const updatedAt = new Date().toISOString();
  await dual({
    cloud: async (supabase) => ok(await supabase.from("contracts").update({ status, updated_at: updatedAt }).eq("id", id)),
    local: async (db) => {
      const existing = await db.get("contracts", id);
      if (existing) await db.put("contracts", { ...existing, status, updatedAt });
    },
  });
}

/** Cambia días y franja de un compromiso — lo que aplica la Fase 5 cuando
 *  reduce la frecuencia por su cuenta, y lo que edita el usuario en Perfil. */
export async function updateCommitmentSchedule(id: string, days: number[], timeSlot: TimeSlot): Promise<void> {
  const updatedAt = new Date().toISOString();
  await dual({
    cloud: async (supabase) => ok(await supabase.from("commitments").update({ days, time_slot: timeSlot, updated_at: updatedAt }).eq("id", id)),
    local: async (db) => {
      const existing = await db.get("commitments", id);
      if (existing) await db.put("commitments", { ...existing, days, timeSlot, updatedAt });
    },
  });
}
