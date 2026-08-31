-- Veltra Hábitos, Sueño y Adicciones — the "salud integral" modules.
--
-- Additive migration: it only creates new tables and never touches anything
-- from earlier migrations. Same conventions as the base schema — text primary
-- keys generated client-side, user_id scoped rows, RLS on every table.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

-- --- Hábitos ---

create table if not exists habits (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  notification_time text, -- "HH:MM", local to `timezone`
  timezone text, -- IANA tz captured client-side at creation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id text not null references habits(id) on delete cascade,
  date text not null, -- local day key (YYYY-MM-DD)
  status text not null, -- 'done' | 'not_done' | 'skipped'
  responded_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- --- Sueño ---

create table if not exists sleep_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null, -- local day key of the night this entry covers
  bed_time text not null,
  sleep_time text not null,
  wake_time text not null,
  rise_time text not null,
  quality smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- --- Adicciones ---

create table if not exists addictions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  motivation text,
  start_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists addiction_relapses (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  addiction_id text not null references addictions(id) on delete cascade,
  fallen_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_habit_logs_habit on habit_logs(habit_id);
create index if not exists idx_habit_logs_date on habit_logs(user_id, date);
create index if not exists idx_sleep_logs_date on sleep_logs(user_id, date);
create index if not exists idx_addiction_relapses_addiction on addiction_relapses(addiction_id);

-- ---------------------------------------------------------------------
-- Row Level Security — every row scoped to its owning user.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array['habits', 'habit_logs', 'sleep_logs', 'addictions', 'addiction_relapses'])
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
