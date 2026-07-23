import { openDB, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION, type VeltraDB } from "./schema";
import { seedExerciseLibrary } from "./seed";

let dbPromise: Promise<IDBPDatabase<VeltraDB>> | null = null;

function assertBrowser() {
  if (typeof indexedDB === "undefined") {
    throw new Error("Local DB can only be used in the browser (client components).");
  }
}

export function getDb(): Promise<IDBPDatabase<VeltraDB>> {
  assertBrowser();
  if (!dbPromise) {
    dbPromise = openDB<VeltraDB>(DB_NAME, DB_VERSION, {
      // Version-guarded so existing installs keep their data when new stores
      // are added — each block only runs when upgrading past that version.
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("profile", { keyPath: "id" });
          db.createObjectStore("injuries", { keyPath: "id" });
          db.createObjectStore("bodyWeightLogs", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("exercises", { keyPath: "id" }).createIndex("name", "name");
          db.createObjectStore("routines", { keyPath: "id" });
          db.createObjectStore("routineExercises", { keyPath: "id" }).createIndex("routineId", "routineId");
          const sessions = db.createObjectStore("workoutSessions", { keyPath: "id" });
          sessions.createIndex("status", "status");
          sessions.createIndex("startedAt", "startedAt");
          const sets = db.createObjectStore("setEntries", { keyPath: "id" });
          sets.createIndex("sessionId", "sessionId");
          sets.createIndex("exerciseId", "exerciseId");
          db.createObjectStore("personalRecords", { keyPath: "id" }).createIndex("exerciseId", "exerciseId");
          db.createObjectStore("conversations", { keyPath: "id" });
          db.createObjectStore("coachMessages", { keyPath: "id" }).createIndex("conversationId", "conversationId");
          db.createObjectStore("memoryFacts", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("foodConversations", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("foodMessages", { keyPath: "id" }).createIndex("conversationId", "conversationId");
          const meals = db.createObjectStore("foodMeals", { keyPath: "id" });
          meals.createIndex("conversationId", "conversationId");
          meals.createIndex("date", "date");
          db.createObjectStore("nutritionGoals", { keyPath: "id" });
        }
      },
    }).then(async (db) => {
      await seedExerciseLibrary(db);
      return db;
    });
  }
  return dbPromise;
}

/** Dev/test escape hatch — wipes all local data and re-seeds the exercise library. */
export async function resetLocalDb(): Promise<void> {
  assertBrowser();
  const db = await getDb();
  db.close();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  dbPromise = null;
  await getDb();
}
