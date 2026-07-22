import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toCamelCase, toSnakeCase } from "@/lib/supabase/case";
import { requireUserId } from "@/lib/supabase/currentUser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { BodyWeightLog, Equipment, ExperienceLevel, Goal, Injury, Profile, Sex } from "@/types/models";

const LOCAL_PROFILE_ID = "local";

export interface ProfileInput {
  fullName: string;
  sex: Sex;
  birthDate: string | null;
  heightCm: number | null;
  bodyweightKg: number | null;
  experienceLevel: ExperienceLevel;
  goal: Goal;
  trainingDaysPerWeek: number;
  equipmentAvailable: Equipment[];
}

export async function getProfile(): Promise<Profile | null> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await supabase.from("profile").select("*").eq("id", userData.user.id).maybeSingle();
    if (error || !data) return null;
    return toCamelCase<Profile>(data);
  }

  const db = await getDb();
  return (await db.get("profile", LOCAL_PROFILE_ID)) ?? null;
}

export async function upsertProfile(input: ProfileInput): Promise<Profile> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    const { data: userData } = await supabase.auth.getUser();
    const payload = toSnakeCase({
      id: userId,
      email: userData.user?.email ?? "",
      fullName: input.fullName,
      sex: input.sex,
      birthDate: input.birthDate,
      heightCm: input.heightCm,
      bodyweightKg: input.bodyweightKg,
      experienceLevel: input.experienceLevel,
      goal: input.goal,
      trainingDaysPerWeek: input.trainingDaysPerWeek,
      equipmentAvailable: input.equipmentAvailable,
      onboardingCompleted: true,
      updatedAt: now,
    });
    // Normally the profile row already exists (created by the handle_new_user
    // trigger on sign-up) and this just updates it. upsert() also covers the
    // case where that row is missing for any reason, instead of failing outright.
    const { data, error } = await supabase.from("profile").upsert(payload).select().single();
    if (error) throw error;
    return toCamelCase<Profile>(data);
  }

  const db = await getDb();
  const existing = await db.get("profile", LOCAL_PROFILE_ID);
  const profile: Profile = {
    id: LOCAL_PROFILE_ID,
    fullName: input.fullName,
    email: existing?.email ?? "demo@veltra.app",
    sex: input.sex,
    birthDate: input.birthDate,
    heightCm: input.heightCm,
    bodyweightKg: input.bodyweightKg,
    experienceLevel: input.experienceLevel,
    goal: input.goal,
    trainingDaysPerWeek: input.trainingDaysPerWeek,
    equipmentAvailable: input.equipmentAvailable,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.put("profile", profile);
  return profile;
}

export async function updateBodyweight(kg: number): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const userId = await requireUserId();
    await supabase.from("profile").update({ bodyweight_kg: kg, updated_at: new Date().toISOString() }).eq("id", userId);
    return;
  }
  const db = await getDb();
  const existing = await db.get("profile", LOCAL_PROFILE_ID);
  if (existing) await db.put("profile", { ...existing, bodyweightKg: kg, updatedAt: new Date().toISOString() });
}

export async function listInjuries(): Promise<Injury[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("injuries").select("*").order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<Injury>(r));
  }
  const db = await getDb();
  const all = await db.getAll("injuries");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addInjury(area: string, note: string): Promise<Injury> {
  const id = generateId();
  const now = new Date().toISOString();
  const injury: Injury = { id, area, note, active: true, createdAt: now };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.from("injuries").insert(toSnakeCase(injury));
    if (error) throw error;
    return injury;
  }
  const db = await getDb();
  await db.put("injuries", injury);
  return injury;
}

export async function toggleInjuryActive(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data } = await supabase.from("injuries").select("active").eq("id", id).single();
    if (data) await supabase.from("injuries").update({ active: !data.active }).eq("id", id);
    return;
  }
  const db = await getDb();
  const existing = await db.get("injuries", id);
  if (existing) await db.put("injuries", { ...existing, active: !existing.active });
}

export async function deleteInjury(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    await supabase.from("injuries").delete().eq("id", id);
    return;
  }
  const db = await getDb();
  await db.delete("injuries", id);
}

export async function listBodyWeightLogs(limit = 60): Promise<BodyWeightLog[]> {
  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { data, error } = await supabase.from("body_weight_logs").select("*").order("date", { ascending: true }).limit(limit);
    if (error || !data) return [];
    return data.map((r: any) => toCamelCase<BodyWeightLog>(r));
  }
  const db = await getDb();
  const all = await db.getAllFromIndex("bodyWeightLogs", "date");
  return all.slice(-limit);
}

export async function addBodyWeightLog(weightKg: number, date?: string): Promise<BodyWeightLog> {
  const id = generateId();
  const iso = date ?? new Date().toISOString();
  const log: BodyWeightLog = { id, date: iso, weightKg };

  if (isSupabaseConfigured) {
    const supabase = getSupabaseBrowserClient()!;
    const { error } = await supabase.from("body_weight_logs").insert(toSnakeCase(log));
    if (error) throw error;
  } else {
    const db = await getDb();
    await db.put("bodyWeightLogs", log);
  }
  await updateBodyweight(weightKg);
  return log;
}
