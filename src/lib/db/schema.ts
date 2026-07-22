/**
 * Local SQLite schema. This is the source of truth on-device — every screen
 * reads/writes here first so the app is instant and fully usable offline.
 * The shape mirrors supabase/migrations/0001_init.sql; the sync engine
 * reconciles the two when a connection is available.
 */
export const SCHEMA_VERSION = 1;

export const CREATE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    sex TEXT NOT NULL DEFAULT 'other',
    birth_date TEXT,
    height_cm REAL,
    bodyweight_kg REAL,
    experience_level TEXT NOT NULL DEFAULT 'beginner',
    goal TEXT NOT NULL DEFAULT 'general_fitness',
    equipment_available TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS injuries (
    id TEXT PRIMARY KEY,
    area TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS body_weight_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    muscle_groups TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL DEFAULT '[]',
    pattern TEXT NOT NULL DEFAULT 'isolation',
    notes TEXT,
    video_url TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_template INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 3,
    target_reps_min INTEGER NOT NULL DEFAULT 8,
    target_reps_max INTEGER NOT NULL DEFAULT 12,
    rest_seconds INTEGER NOT NULL DEFAULT 90
  );`,
  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    routine_id TEXT,
    routine_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TEXT NOT NULL,
    ended_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS set_entries (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    rir REAL,
    rpe REAL,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS personal_records (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    previous_value REAL,
    achieved_at TEXT NOT NULL,
    set_entry_id TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS coach_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS memory_facts (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    row_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_set_entries_session ON set_entries(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_set_entries_exercise ON set_entries(exercise_id);`,
  `CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routine_id);`,
  `CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON personal_records(exercise_id);`,
  `CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation ON coach_messages(conversation_id);`,
  `CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status);`,
];
