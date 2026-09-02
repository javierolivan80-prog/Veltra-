import { dual, ok, rows } from "@/lib/db/dual";
import { generateId } from "@/lib/id";
import { toSnakeCase } from "@/lib/supabase/case";
import type { FocusSession } from "@/types/models";

export async function listFocusSessions(): Promise<FocusSession[]> {
  return dual({
    cloud: async (supabase) => rows<FocusSession>(await supabase.from("focus_sessions").select("*").order("completed_at", { ascending: true })),
    local: (db) => db.getAllFromIndex("focusSessions", "completedAt"),
  });
}

export async function addFocusSession(durationMinutes: number): Promise<FocusSession> {
  const now = new Date().toISOString();
  const session: FocusSession = { id: generateId(), durationMinutes, completedAt: now, createdAt: now };
  await dual({
    cloud: async (supabase, userId) => ok(await supabase.from("focus_sessions").insert({ ...toSnakeCase(session), user_id: await userId() })),
    local: async (db) => void (await db.put("focusSessions", session)),
  });
  return session;
}
