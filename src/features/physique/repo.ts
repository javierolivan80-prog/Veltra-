import { dual, ok, rows } from "@/lib/db/dual";
import { generateId } from "@/lib/id";
import { toSnakeCase } from "@/lib/supabase/case";
import type { PhysiqueCheckin, PhysiquePhoto, PhysiquePose } from "@/types/models";

export async function listPhysiquePhotos(): Promise<PhysiquePhoto[]> {
  return dual({
    cloud: async (supabase) => rows<PhysiquePhoto>(await supabase.from("physique_photos").select("*").order("date", { ascending: true })),
    local: (db) => db.getAllFromIndex("physiquePhotos", "date"),
  });
}

/** Consulta directa por fecha en vez de filtrar listPhysiquePhotos(): las
 *  fotos llevan el data URL entero (unos cientos de KB cada una), así que
 *  pedir "las de un día" no debe tirar de todo el historial de fotos. */
export async function listPhysiquePhotosForDate(date: string): Promise<PhysiquePhoto[]> {
  return dual({
    cloud: async (supabase) => rows<PhysiquePhoto>(await supabase.from("physique_photos").select("*").eq("date", date)),
    local: (db) => db.getAllFromIndex("physiquePhotos", "date", date),
  });
}

export async function addPhysiquePhoto(date: string, pose: PhysiquePose, dataUrl: string): Promise<PhysiquePhoto> {
  const photo: PhysiquePhoto = { id: generateId(), date, pose, dataUrl, createdAt: new Date().toISOString() };
  await dual({
    cloud: async (supabase, userId) => ok(await supabase.from("physique_photos").insert({ ...toSnakeCase(photo), user_id: await userId() })),
    local: async (db) => void (await db.put("physiquePhotos", photo)),
  });
  return photo;
}

export async function deletePhysiquePhoto(id: string): Promise<void> {
  await dual({
    cloud: async (supabase) => ok(await supabase.from("physique_photos").delete().eq("id", id)),
    local: async (db) => void (await db.delete("physiquePhotos", id)),
  });
}

export async function listPhysiqueCheckins(): Promise<PhysiqueCheckin[]> {
  return dual({
    cloud: async (supabase) => rows<PhysiqueCheckin>(await supabase.from("physique_checkins").select("*").order("date", { ascending: true })),
    local: (db) => db.getAllFromIndex("physiqueCheckins", "date"),
  });
}

export async function getPhysiqueCheckinByDate(date: string): Promise<PhysiqueCheckin | null> {
  const all = await listPhysiqueCheckins();
  return all.find((c) => c.date === date) ?? null;
}

export interface PhysiqueCheckinInput {
  date: string;
  bodyFatPctLow: number;
  bodyFatPctHigh: number;
  muscleNotes: string;
  trendNotes: string | null;
  summary: string;
}

export async function upsertPhysiqueCheckin(input: PhysiqueCheckinInput): Promise<PhysiqueCheckin> {
  const now = new Date().toISOString();
  const existing = await getPhysiqueCheckinByDate(input.date);
  const checkin: PhysiqueCheckin = {
    id: existing?.id ?? generateId(),
    date: input.date,
    bodyFatPctLow: input.bodyFatPctLow,
    bodyFatPctHigh: input.bodyFatPctHigh,
    muscleNotes: input.muscleNotes,
    trendNotes: input.trendNotes,
    summary: input.summary,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await dual({
    // onConflict apunta a la clave única real (un check-in por usuario y
    // fecha) en vez del id — ver el mismo comentario en features/mood/repo.ts.
    cloud: async (supabase, userId) =>
      ok(await supabase.from("physique_checkins").upsert({ ...toSnakeCase(checkin), user_id: await userId() }, { onConflict: "user_id,date" })),
    local: async (db) => void (await db.put("physiqueCheckins", checkin)),
  });
  return checkin;
}
