-- Veltra — Fe católica, un módulo opcional más.
--
-- Mismo patrón que Recuperación (0009): no forma parte del contrato ni de
-- la navegación principal. Se activa desde Perfil y, si está activa,
-- aparece como bloque en Hoy — un check-in diario (misa, rosario, oración,
-- examen de conciencia) sobre el evangelio del día.
--
-- El examen de conciencia es texto libre y privado — sin categorías fijas
-- de faltas, cada uno lo escribe a su manera. Las políticas de abajo son
-- las mismas de siempre: cada fila solo la lee y la escribe su dueño.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push
--
-- Rollback:
--   drop table if exists faith_checkins;
--   alter table profile drop column if exists faith_enabled;

alter table profile add column if not exists faith_enabled boolean not null default false;

create table if not exists faith_checkins (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null, -- local day key (YYYY-MM-DD)
  mass boolean not null default false,
  rosary boolean not null default false,
  prayer boolean not null default false,
  examen text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_faith_checkins_date on faith_checkins(user_id, date);

alter table faith_checkins enable row level security;
drop policy if exists "select own rows" on faith_checkins;
create policy "select own rows" on faith_checkins for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on faith_checkins;
create policy "insert own rows" on faith_checkins for insert with check (user_id = auth.uid());
drop policy if exists "update own rows" on faith_checkins;
create policy "update own rows" on faith_checkins for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own rows" on faith_checkins;
create policy "delete own rows" on faith_checkins for delete using (user_id = auth.uid());
