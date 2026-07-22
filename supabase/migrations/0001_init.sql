-- Veltra — initial schema (Next.js + Supabase web app).
--
-- Local "explore with sample data" mode lives entirely in the browser's
-- IndexedDB (src/lib/db) and never touches this database — so every table
-- here belongs to a real authenticated user, and `profile.id` can simply
-- be the Supabase auth user id.
--
-- Apply with the Supabase CLI:
--   supabase link --project-ref <your-project-ref>
--   supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profile — one row per account, created automatically on sign-up
-- ---------------------------------------------------------------------
create table if not exists profile (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  sex text not null default 'other',
  birth_date text,
  height_cm numeric,
  bodyweight_kg numeric,
  experience_level text not null default 'beginner',
  goal text not null default 'general_fitness',
  training_days_per_week integer not null default 3,
  equipment_available jsonb not null default '[]',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists injuries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area text not null,
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists body_weight_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date timestamptz not null,
  weight_kg numeric not null
);

create table if not exists exercises (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  muscle_groups jsonb not null default '[]',
  equipment jsonb not null default '[]',
  pattern text not null default 'isolation',
  notes text,
  video_url text,
  is_favorite boolean not null default false,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routines (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routine_exercises (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id text not null references routines(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  "order" integer not null,
  target_sets integer not null default 3,
  target_reps_min integer not null default 8,
  target_reps_max integer not null default 12,
  rest_seconds integer not null default 90
);

create table if not exists workout_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id text references routines(id) on delete set null,
  routine_name text,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists set_entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id text not null references workout_sessions(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  set_number integer not null,
  weight_kg numeric not null,
  reps integer not null,
  rir numeric,
  rpe numeric,
  is_warmup boolean not null default false,
  completed_at timestamptz not null default now()
);

create table if not exists personal_records (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  type text not null,
  value numeric not null,
  previous_value numeric,
  achieved_at timestamptz not null default now(),
  set_entry_id text
);

create table if not exists conversations (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coach_messages (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id text not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists memory_facts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null,
  category text not null default 'other',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index if not exists idx_set_entries_session on set_entries(session_id);
create index if not exists idx_set_entries_exercise on set_entries(exercise_id);
create index if not exists idx_routine_exercises_routine on routine_exercises(routine_id);
create index if not exists idx_personal_records_exercise on personal_records(exercise_id);
create index if not exists idx_coach_messages_conversation on coach_messages(conversation_id);
create index if not exists idx_workout_sessions_status on workout_sessions(status);
create index if not exists idx_injuries_user on injuries(user_id);
create index if not exists idx_exercises_user on exercises(user_id);

-- ---------------------------------------------------------------------
-- Row Level Security — every table is scoped to the owning user.
-- profile uses id = auth.uid() directly instead of a user_id column.
-- ---------------------------------------------------------------------
alter table profile enable row level security;
create policy "select own profile" on profile for select using (id = auth.uid());
create policy "update own profile" on profile for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'injuries', 'body_weight_logs', 'exercises', 'routines',
      'routine_exercises', 'workout_sessions', 'set_entries', 'personal_records',
      'conversations', 'coach_messages', 'memory_facts'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "select own rows" on %I', t);
    execute format('create policy "select own rows" on %I for select using (user_id = auth.uid())', t);
    execute format('drop policy if exists "insert own rows" on %I', t);
    execute format('create policy "insert own rows" on %I for insert with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "update own rows" on %I', t);
    execute format('create policy "update own rows" on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "delete own rows" on %I', t);
    execute format('create policy "delete own rows" on %I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Auto-create a profile row the moment a user signs up (works for both
-- email/password and Google OAuth sign-ups), seeded from whatever the
-- provider gives us. The onboarding flow then UPDATEs this row.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profile (id, full_name, email, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
