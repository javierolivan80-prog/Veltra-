import type { SQLiteDatabase } from "expo-sqlite";
import { SEED_EXERCISES } from "@/src/data/seedExercises";

/** Always-on: the system exercise library must exist so routines/pickers work, even for a brand-new install. */
export async function seedIfEmpty(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM exercises");
  if (row && row.count > 0) return;

  const nowIso = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const ex of SEED_EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, muscle_groups, equipment, pattern, notes, video_url, is_favorite, is_custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, 0, ?, ?)`,
        [ex.id, ex.name, JSON.stringify(ex.muscleGroups), JSON.stringify(ex.equipment), ex.pattern, nowIso, nowIso]
      );
    }
  });
}
