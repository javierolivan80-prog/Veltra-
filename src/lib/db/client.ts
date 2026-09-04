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
        if (oldVersion < 3) {
          db.createObjectStore("savedMeals", { keyPath: "id" });
        }
        if (oldVersion < 4) {
          db.createObjectStore("habits", { keyPath: "id" });
          db.createObjectStore("habitLogs", { keyPath: "id" }).createIndex("habitId", "habitId");
          db.createObjectStore("sleepLogs", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("addictions", { keyPath: "id" });
          db.createObjectStore("addictionRelapses", { keyPath: "id" }).createIndex("addictionId", "addictionId");
        }
        if (oldVersion < 5) {
          db.createObjectStore("waterLogs", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("mealChecks", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("meditationSessions", { keyPath: "id" }).createIndex("completedAt", "completedAt");
          db.createObjectStore("journalEntries", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("focusSessions", { keyPath: "id" }).createIndex("completedAt", "completedAt");
          db.createObjectStore("screenTimeLogs", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("expenses", { keyPath: "id" }).createIndex("date", "date");
          db.createObjectStore("financeGoals", { keyPath: "id" });
          // "goals"/"goalCheckpoints" se creaban aquí; Metas se archivó en la
          // Fase 1 y la v10 los borra, así que ya no se crean de cero.
        }
        if (oldVersion < 6) {
          db.createObjectStore("dailyMoods", { keyPath: "id" }).createIndex("date", "date");
        }
        if (oldVersion < 7) {
          db.createObjectStore("contracts", { keyPath: "id" }).createIndex("status", "status");
          db.createObjectStore("commitments", { keyPath: "id" }).createIndex("contractId", "contractId");
          // Created in v4 and never read or written since: push subscriptions
          // live server-side in Supabase, registered from the API route.
          if (db.objectStoreNames.contains("pushSubscriptions" as never)) {
            db.deleteObjectStore("pushSubscriptions" as never);
          }
        }
        if (oldVersion < 8) {
          db.createObjectStore("weeklyReviews", { keyPath: "id" }).createIndex("contractId", "contractId");
        }
        if (oldVersion < 9) {
          db.createObjectStore("faithCheckins", { keyPath: "id" }).createIndex("date", "date");
        }
        if (oldVersion < 10) {
          // Metas se archivó en la Fase 1 (el colapso a Hoy/Progreso/Perfil) y
          // su UI se borró entonces; estos stores llevan desde entonces sin
          // nadie que los lea ni los escriba. Mismo caso que pushSubscriptions
          // en la v7.
          for (const dead of ["goals", "goalCheckpoints"] as const) {
            if (db.objectStoreNames.contains(dead as never)) db.deleteObjectStore(dead as never);
          }
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
