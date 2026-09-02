import { dual, ok, rows } from "@/lib/db/dual";
import { generateId } from "@/lib/id";
import { toSnakeCase } from "@/lib/supabase/case";
import type { MeditationSession } from "@/types/models";

export async function listMeditationSessions(): Promise<MeditationSession[]> {
  return dual({
    cloud: async (supabase) =>
      rows<MeditationSession>(await supabase.from("meditation_sessions").select("*").order("completed_at", { ascending: true })),
    local: (db) => db.getAllFromIndex("meditationSessions", "completedAt"),
  });
}

export async function addMeditationSession(durationMinutes: number): Promise<MeditationSession> {
  const now = new Date().toISOString();
  const session: MeditationSession = { id: generateId(), durationMinutes, completedAt: now, createdAt: now };
  await dual({
    cloud: async (supabase, userId) => ok(await supabase.from("meditation_sessions").insert({ ...toSnakeCase(session), user_id: await userId() })),
    local: async (db) => void (await db.put("meditationSessions", session)),
  });
  return session;
}

export async function deleteMeditationSession(id: string): Promise<void> {
  await dual({
    // Deletes stay best-effort, as before: the row is already gone from the
    // user's view and a failed delete is not worth blocking them on.
    cloud: async (supabase) => void (await supabase.from("meditation_sessions").delete().eq("id", id)),
    local: (db) => db.delete("meditationSessions", id),
  });
}
