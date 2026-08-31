import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { JournalEntry } from "@/types/models";

export interface JournalEntryInput {
  date: string;
  gratitude: string;
  learned: string;
  mood: number | null;
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("journal_entries").select("*").order("date", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: any) => toCamelCase<JournalEntry>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("journalEntries", "date");
  return all;
}

export async function getJournalEntryByDate(date: string): Promise<JournalEntry | null> {
  const all = await listJournalEntries();
  return all.find((e) => e.date === date) ?? null;
}

export async function upsertJournalEntry(input: JournalEntryInput): Promise<JournalEntry> {
  const now = new Date().toISOString();
  const existing = await getJournalEntryByDate(input.date);
  const entry: JournalEntry = {
    id: existing?.id ?? generateId(),
    date: input.date,
    gratitude: input.gratitude,
    learned: input.learned,
    mood: input.mood,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { error } = await supabase.from("journal_entries").upsert({ ...toSnakeCase(entry), user_id: userId });
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("journalEntries", entry);
  }
  return entry;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("journal_entries").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("journalEntries", id);
}
