import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Addiction, AddictionRelapse } from "@/types/models";

export interface AddictionInput {
  name: string;
  motivation: string | null;
  startDate: string;
}

// --- Addictions ---

export async function listAddictions(): Promise<Addiction[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("addictions").select("*").order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<Addiction>(r));
  }
  const db = await getDb();
  const all = await db.getAll("addictions");
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAddiction(id: string): Promise<Addiction | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("addictions").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<Addiction>(data);
  }
  const db = await getDb();
  return (await db.get("addictions", id)) ?? null;
}

export async function createAddiction(input: AddictionInput): Promise<Addiction> {
  const now = new Date().toISOString();
  const addiction: Addiction = {
    id: generateId(),
    name: input.name,
    motivation: input.motivation,
    startDate: input.startDate,
    createdAt: now,
    updatedAt: now,
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("addictions").insert({ ...toSnakeCase(addiction), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("addictions", addiction);
  }
  return addiction;
}

export async function updateAddiction(id: string, input: Partial<AddictionInput>): Promise<void> {
  const existing = await getAddiction(id);
  if (!existing) return;
  const updated: Addiction = {
    ...existing,
    name: input.name ?? existing.name,
    motivation: input.motivation !== undefined ? input.motivation : existing.motivation,
    startDate: input.startDate ?? existing.startDate,
    updatedAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.from("addictions").update(toSnakeCase(updated)).eq("id", id);
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("addictions", updated);
  }
}

export async function deleteAddiction(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("addictions").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("addictions", id);
  const tx = db.transaction("addictionRelapses", "readwrite");
  const relapses = await tx.store.index("addictionId").getAll(id);
  await Promise.all(relapses.map((r) => tx.store.delete(r.id)));
  await tx.done;
}

// --- Relapses ---

export async function listRelapses(addictionId: string): Promise<AddictionRelapse[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("addiction_relapses").select("*").eq("addiction_id", addictionId).order("fallen_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<AddictionRelapse>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("addictionRelapses", "addictionId", addictionId);
  return all.sort((a, b) => b.fallenAt.localeCompare(a.fallenAt));
}

export async function registerRelapse(addictionId: string, fallenAt: string, reason: string | null): Promise<AddictionRelapse> {
  const relapse: AddictionRelapse = { id: generateId(), addictionId, fallenAt, reason, createdAt: new Date().toISOString() };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("addiction_relapses").insert({ ...toSnakeCase(relapse), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("addictionRelapses", relapse);
  }
  return relapse;
}

export async function deleteRelapse(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("addiction_relapses").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("addictionRelapses", id);
}
