import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CoachMessage, Conversation, MemoryFact, MessageRole } from "@/types/models";

export async function listConversations(query?: string): Promise<Conversation[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    let q = supabase.from("conversations").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    if (query) q = q.ilike("title", `%${query}%`);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<Conversation>(r));
  }
  const db = await getDb();
  let all = await db.getAll("conversations");
  if (query) all = all.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
  return all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<Conversation>(data);
  }
  const db = await getDb();
  return (await db.get("conversations", id)) ?? null;
}

export async function createConversation(title: string): Promise<Conversation> {
  const id = generateId();
  const now = new Date().toISOString();
  const conversation: Conversation = { id, title, pinned: false, createdAt: now, updatedAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("conversations").insert({ ...toSnakeCase(conversation), user_id: userId });
  } else {
    const db = await getDb();
    await db.put("conversations", conversation);
  }
  return conversation;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("conversations").update({ title, updated_at: now }).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("conversations", id);
  if (existing) await db.put("conversations", { ...existing, title, updatedAt: now });
}

export async function togglePinConversation(id: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data } = await supabase.from("conversations").select("pinned").eq("id", id).single();
    if (data) await supabase.from("conversations").update({ pinned: !data.pinned, updated_at: now }).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("conversations", id);
  if (existing) await db.put("conversations", { ...existing, pinned: !existing.pinned, updatedAt: now });
}

export async function deleteConversation(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("coach_messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  const messages = await db.getAllFromIndex("coachMessages", "conversationId", id);
  for (const m of messages) await db.delete("coachMessages", m.id);
  await db.delete("conversations", id);
}

export async function listMessages(conversationId: string): Promise<CoachMessage[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("coach_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<CoachMessage>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("coachMessages", "conversationId", conversationId);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addMessage(conversationId: string, role: MessageRole, content: string): Promise<CoachMessage> {
  const id = generateId();
  const now = new Date().toISOString();
  const message: CoachMessage = { id, conversationId, role, content, createdAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("coach_messages").insert({ ...toSnakeCase(message), user_id: userId });
    await supabase.from("conversations").update({ updated_at: now }).eq("id", conversationId);
  } else {
    const db = await getDb();
    await db.put("coachMessages", message);
    const conv = await db.get("conversations", conversationId);
    if (conv) await db.put("conversations", { ...conv, updatedAt: now });
  }
  return message;
}

export async function listMemoryFacts(): Promise<MemoryFact[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("memory_facts").select("*").eq("active", true).order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<MemoryFact>(r));
  }
  const db = await getDb();
  const all = await db.getAll("memoryFacts");
  return all.filter((f) => f.active).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addMemoryFact(content: string, category: MemoryFact["category"]): Promise<MemoryFact> {
  const id = generateId();
  const now = new Date().toISOString();
  const fact: MemoryFact = { id, content, category, active: true, createdAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("memory_facts").insert({ ...toSnakeCase(fact), user_id: userId });
  } else {
    const db = await getDb();
    await db.put("memoryFacts", fact);
  }
  return fact;
}
