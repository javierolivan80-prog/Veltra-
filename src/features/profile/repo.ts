import { getDb } from "@/src/lib/db/client";
import { generateId } from "@/src/lib/id";
import { enqueueMutation } from "@/src/lib/sync/queue";
import type { BodyWeightLog, Equipment, ExperienceLevel, Goal, Injury, Profile, Sex } from "@/src/types/models";

const LOCAL_PROFILE_ID = "local";

function mapProfile(r: any): Profile {
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    sex: r.sex,
    birthDate: r.birth_date,
    heightCm: r.height_cm,
    bodyweightKg: r.bodyweight_kg,
    experienceLevel: r.experience_level,
    goal: r.goal,
    equipmentAvailable: JSON.parse(r.equipment_available ?? "[]"),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getProfile(): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM profile LIMIT 1`);
  return row ? mapProfile(row) : null;
}

export interface ProfileInput {
  fullName: string;
  email: string;
  sex: Sex;
  birthDate: string | null;
  heightCm: number | null;
  bodyweightKg: number | null;
  experienceLevel: ExperienceLevel;
  goal: Goal;
  equipmentAvailable: Equipment[];
}

export async function upsertProfile(input: ProfileInput): Promise<Profile> {
  const db = await getDb();
  const existing = await getProfile();
  const now = new Date().toISOString();
  const id = existing?.id ?? LOCAL_PROFILE_ID;

  await db.runAsync(
    `INSERT INTO profile (id, full_name, email, sex, birth_date, height_cm, bodyweight_kg, experience_level, goal, equipment_available, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, email=excluded.email, sex=excluded.sex, birth_date=excluded.birth_date,
       height_cm=excluded.height_cm, bodyweight_kg=excluded.bodyweight_kg, experience_level=excluded.experience_level, goal=excluded.goal,
       equipment_available=excluded.equipment_available, updated_at=excluded.updated_at`,
    [
      id,
      input.fullName,
      input.email,
      input.sex,
      input.birthDate,
      input.heightCm,
      input.bodyweightKg,
      input.experienceLevel,
      input.goal,
      JSON.stringify(input.equipmentAvailable),
      existing?.createdAt ?? now,
      now,
    ]
  );
  await enqueueMutation("profile", id, "upsert");
  return (await getProfile())!;
}

export async function updateBodyweight(kg: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE profile SET bodyweight_kg = ?, updated_at = ? WHERE id = ?`, [kg, new Date().toISOString(), LOCAL_PROFILE_ID]);
  await enqueueMutation("profile", LOCAL_PROFILE_ID, "upsert");
}

function mapInjury(r: any): Injury {
  return { id: r.id, area: r.area, note: r.note, active: !!r.active, createdAt: r.created_at };
}

export async function listInjuries(): Promise<Injury[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM injuries ORDER BY created_at DESC`);
  return rows.map(mapInjury);
}

export async function addInjury(area: string, note: string): Promise<Injury> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO injuries (id, area, note, active, created_at) VALUES (?, ?, ?, 1, ?)`, [id, area, note, now]);
  await enqueueMutation("injuries", id, "upsert");
  return { id, area, note, active: true, createdAt: now };
}

export async function toggleInjuryActive(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE injuries SET active = NOT active WHERE id = ?`, [id]);
  await enqueueMutation("injuries", id, "upsert");
}

export async function deleteInjury(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM injuries WHERE id = ?`, [id]);
  await enqueueMutation("injuries", id, "delete");
}

export async function listBodyWeightLogs(limit = 60): Promise<BodyWeightLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM body_weight_logs ORDER BY date ASC LIMIT ?`, [limit]);
  return rows.map((r) => ({ id: r.id, date: r.date, weightKg: r.weight_kg }));
}

export async function addBodyWeightLog(weightKg: number, date?: string): Promise<BodyWeightLog> {
  const db = await getDb();
  const id = generateId();
  const iso = date ?? new Date().toISOString();
  await db.runAsync(`INSERT INTO body_weight_logs (id, date, weight_kg) VALUES (?, ?, ?)`, [id, iso, weightKg]);
  await enqueueMutation("body_weight_logs", id, "upsert");
  await updateBodyweight(weightKg);
  return { id, date: iso, weightKg };
}
