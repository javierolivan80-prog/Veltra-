import type { IDBPDatabase } from "idb";
import { SEED_EXERCISES, toExercise } from "@/data/seedExercises";
import type { VeltraDB } from "./schema";

/** Always-on: the system exercise library must exist so routines/pickers work, even for a brand-new install. */
export async function seedExerciseLibrary(db: IDBPDatabase<VeltraDB>) {
  const count = await db.count("exercises");
  if (count > 0) return;

  const nowIso = new Date().toISOString();
  const tx = db.transaction("exercises", "readwrite");
  for (const seed of SEED_EXERCISES) {
    await tx.store.put(toExercise(seed, nowIso));
  }
  await tx.done;
}
