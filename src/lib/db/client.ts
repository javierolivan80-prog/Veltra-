import * as SQLite from "expo-sqlite";
import { CREATE_STATEMENTS, SCHEMA_VERSION } from "./schema";
import { seedIfEmpty } from "./seed";

const DB_NAME = "veltra.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase) {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  )) ?? { user_version: 0 };

  if (user_version >= SCHEMA_VERSION) return;

  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.withTransactionAsync(async () => {
    for (const statement of CREATE_STATEMENTS) {
      await db.execAsync(statement);
    }
  });
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      await seedIfEmpty(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Test-only / dev escape hatch to fully reset local state. */
export async function resetDatabase() {
  const db = await getDb();
  await db.execAsync("PRAGMA writable_schema = 1;");
  await db.execAsync("DELETE FROM sqlite_master WHERE type IN ('table','index','trigger');");
  await db.execAsync("PRAGMA writable_schema = 0;");
  await db.execAsync("VACUUM;");
  dbPromise = null;
  await getDb();
}
