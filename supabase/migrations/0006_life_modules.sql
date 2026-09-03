-- Veltra 2.0 — new "Cuerpo / Mente / Recuperación / Vida" life modules:
-- water + meal-check (Food), body-weight goal, meditation, journaling, focus
-- (Pomodoro), screen time, finances and long-term goals.
--
-- Additive migration: only creates new tables / adds one nullable column,
-- never touches existing rows. Same conventions as 0004 — text primary
-- keys generated client-side, user_id scoped rows, RLS on every table.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

-- --- Cuerpo: Nutrición (agua + check de comidas, dentro de Food) ---

create table if not exists water_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null, -- local day key (YYYY-MM-DD)
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists meal_checks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  status text not null, -- 'good' | 'ok' | 'bad'
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- --- Cuerpo: Peso — meta opcional sobre el perfil ya existente ---

alter table profile add column if not exists target_weight_kg numeric;

-- --- Mente: Meditación ---

create table if not exists meditation_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  duration_minutes numeric not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- --- Mente: Journaling ---

create table if not exists journal_entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  gratitude text not null default '',
  learned text not null default '',
  mood smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- --- Mente: Foco (Pomodoro) ---

create table if not exists focus_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  duration_minutes numeric not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- --- Recuperación: Screen Time ---

create table if not exists screen_time_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  hours numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- --- Vida: Finanzas ---

create table if not exists expenses (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric not null,
  category text,
  date text not null,
  note text,
  is_essential boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists finance_goals (
  id uuid primary key references auth.users(id) on delete cascade,
  monthly_savings_goal numeric,
  updated_at timestamptz not null default now()
);

-- --- Vida: Metas a largo plazo ---

-- Algunos proyectos ya tenían una tabla `goals` creada a mano (con `id
-- uuid`, la convención por defecto de Supabase) antes de que este archivo
-- fijara la de ids de texto que usa el resto de la app — eso rompía la
-- clave foránea de `goal_checkpoints` de abajo con "incompatible types:
-- text and uuid". Goals está archivado (Fase 1) y no lo usa ninguna
-- feature activa: si la tabla existe con el tipo antiguo y está vacía, se
-- recrea con el tipo correcto. Si tuviera filas, no se toca — nunca se
-- borran datos reales.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'goals' and column_name = 'id' and data_type = 'uuid'
  ) then
    if not exists (select 1 from public.goals limit 1) then
      drop table if exists public.goal_checkpoints;
      drop table if exists public.goals;
    end if;
  end if;
end $$;

create table if not exists goals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_date text, -- ISO date (YYYY-MM-DD)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goal_checkpoints (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id text not null references goals(id) on delete cascade,
  name text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_water_logs_date on water_logs(user_id, date);
create index if not exists idx_meal_checks_date on meal_checks(user_id, date);
create index if not exists idx_meditation_sessions_completed on meditation_sessions(user_id, completed_at);
create index if not exists idx_journal_entries_date on journal_entries(user_id, date);
create index if not exists idx_focus_sessions_completed on focus_sessions(user_id, completed_at);
create index if not exists idx_screen_time_logs_date on screen_time_logs(user_id, date);
create index if not exists idx_expenses_date on expenses(user_id, date);
create index if not exists idx_goal_checkpoints_goal on goal_checkpoints(goal_id);

-- ---------------------------------------------------------------------
-- Row Level Security — every row scoped to its owning user.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'water_logs', 'meal_checks', 'meditation_sessions', 'journal_entries',
      'focus_sessions', 'screen_time_logs', 'expenses', 'goals', 'goal_checkpoints'
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

-- finance_goals keys off id = auth.uid() directly (like profile and nutrition_goals).
alter table finance_goals enable row level security;
drop policy if exists "select own finance goals" on finance_goals;
create policy "select own finance goals" on finance_goals for select using (id = auth.uid());
drop policy if exists "insert own finance goals" on finance_goals;
create policy "insert own finance goals" on finance_goals for insert with check (id = auth.uid());
drop policy if exists "update own finance goals" on finance_goals;
create policy "update own finance goals" on finance_goals for update using (id = auth.uid()) with check (id = auth.uid());
