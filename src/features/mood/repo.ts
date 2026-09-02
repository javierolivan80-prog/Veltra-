import { dual, ok, rows } from "@/lib/db/dual";
import { generateId } from "@/lib/id";
import { toSnakeCase } from "@/lib/supabase/case";
import type { DailyMood, MoodOption } from "@/types/models";

export async function listDailyMoods(): Promise<DailyMood[]> {
  return dual({
    cloud: async (supabase) => rows<DailyMood>(await supabase.from("daily_moods").select("*").order("date", { ascending: true })),
    local: (db) => db.getAllFromIndex("dailyMoods", "date"),
  });
}

export async function getDailyMoodByDate(date: string): Promise<DailyMood | null> {
  const all = await listDailyMoods();
  return all.find((m) => m.date === date) ?? null;
}

export async function upsertDailyMood(date: string, mood: MoodOption): Promise<DailyMood> {
  const now = new Date().toISOString();
  const existing = await getDailyMoodByDate(date);
  const entry: DailyMood = {
    id: existing?.id ?? generateId(),
    date,
    mood,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await dual({
    // onConflict targets the table's real unique key (one mood per user per
    // day) rather than the client-generated id — see the identical comment
    // in features/sleep/repo.ts's upsertSleepLog for why this matters.
    cloud: async (supabase, userId) =>
      ok(await supabase.from("daily_moods").upsert({ ...toSnakeCase(entry), user_id: await userId() }, { onConflict: "user_id,date" })),
    local: async (db) => void (await db.put("dailyMoods", entry)),
  });
  return entry;
}
