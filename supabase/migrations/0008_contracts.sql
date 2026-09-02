-- Veltra — el contrato y sus compromisos.
--
-- El arco de 30/60/90 días que el usuario firma al empezar. Un contrato
-- activo por usuario (índice único parcial más abajo); sus compromisos son
-- lo que arma el plan diario de Hoy.
--
-- Migración aditiva: crea dos tablas nuevas y no toca ninguna existente.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push
--
-- Rollback (en este orden, por la clave foránea):
--   drop table if exists commitments;
--   drop table if exists contracts;

create table if not exists contracts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  focus text not null, -- 'body' | 'mind' | 'recovery' | 'routine'
  why text not null default '',
  duration_days integer not null, -- 30 | 60 | 90
  started_on text not null, -- local day key (YYYY-MM-DD)
  ends_on text not null, -- local day key (YYYY-MM-DD)
  status text not null default 'active', -- 'active' | 'completed' | 'abandoned'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un solo contrato activo por usuario. Parcial y no total: los contratos
-- terminados se conservan, son el historial del arco que ve Progreso.
create unique index if not exists idx_contracts_one_active on contracts(user_id) where status = 'active';
create index if not exists idx_contracts_user on contracts(user_id, started_on);

create table if not exists commitments (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contract_id text not null references contracts(id) on delete cascade,
  kind text not null, -- 'workout' | 'sleep' | 'nutrition' | 'meditation' | 'journaling' | 'focus' | 'habit'
  title text not null,
  -- Días de la semana en convención JS (0 = domingo … 6 = sábado). Su
  -- longitud es la frecuencia: "4 veces por semana" son 4 días marcados.
  days integer[] not null default '{}',
  time_slot text not null, -- 'morning' | 'afternoon' | 'evening'
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_commitments_contract on commitments(user_id, contract_id, position);

alter table contracts enable row level security;
drop policy if exists "select own rows" on contracts;
create policy "select own rows" on contracts for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on contracts;
create policy "insert own rows" on contracts for insert with check (user_id = auth.uid());
drop policy if exists "update own rows" on contracts;
create policy "update own rows" on contracts for update using (user_id = auth.uid());
drop policy if exists "delete own rows" on contracts;
create policy "delete own rows" on contracts for delete using (user_id = auth.uid());

alter table commitments enable row level security;
drop policy if exists "select own rows" on commitments;
create policy "select own rows" on commitments for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on commitments;
create policy "insert own rows" on commitments for insert with check (user_id = auth.uid());
drop policy if exists "update own rows" on commitments;
create policy "update own rows" on commitments for update using (user_id = auth.uid());
drop policy if exists "delete own rows" on commitments;
create policy "delete own rows" on commitments for delete using (user_id = auth.uid());
