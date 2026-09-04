import { dual, ok, rows } from "@/lib/db/dual";
import { generateId } from "@/lib/id";
import { toSnakeCase } from "@/lib/supabase/case";
import type { FaithCheckIn } from "@/types/models";

export async function listFaithCheckIns(): Promise<FaithCheckIn[]> {
  return dual({
    cloud: async (supabase) => rows<FaithCheckIn>(await supabase.from("faith_checkins").select("*").order("date", { ascending: true })),
    local: (db) => db.getAllFromIndex("faithCheckins", "date"),
  });
}

export async function getFaithCheckInByDate(date: string): Promise<FaithCheckIn | null> {
  const all = await listFaithCheckIns();
  return all.find((c) => c.date === date) ?? null;
}

export type FaithCheckInPatch = Partial<Pick<FaithCheckIn, "mass" | "rosary" | "prayer" | "examen">>;

/** Uno por día: crea la fila si hace falta y funde `patch` sobre lo que ya
 *  hubiera, para poder tocar un solo campo (un toggle) sin pisar el resto. */
export async function upsertFaithCheckIn(date: string, patch: FaithCheckInPatch): Promise<FaithCheckIn> {
  const now = new Date().toISOString();
  const existing = await getFaithCheckInByDate(date);
  const entry: FaithCheckIn = {
    id: existing?.id ?? generateId(),
    date,
    mass: patch.mass ?? existing?.mass ?? false,
    rosary: patch.rosary ?? existing?.rosary ?? false,
    prayer: patch.prayer ?? existing?.prayer ?? false,
    examen: patch.examen ?? existing?.examen ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await dual({
    // onConflict apunta a la clave única real (una entrada por usuario y
    // día), no al id generado en el cliente — mismo motivo que en
    // features/mood/repo.ts y features/sleep/repo.ts.
    cloud: async (supabase, userId) =>
      ok(await supabase.from("faith_checkins").upsert({ ...toSnakeCase(entry), user_id: await userId() }, { onConflict: "user_id,date" })),
    local: async (db) => void (await db.put("faithCheckins", entry)),
  });
  return entry;
}
