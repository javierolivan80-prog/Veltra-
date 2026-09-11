-- Cuerpo — Progreso: fotos de físico y su análisis por IA.
--
-- Una foto por fila (pose + fecha, inline como data URL — mismo criterio que
-- food_messages.photos, sin bucket de Storage). El análisis de la IA (rango
-- de grasa corporal estimado, notas de masa muscular) se guarda por FECHA
-- (check-in), combinando todas las fotos subidas ese día: verlas juntas
-- (dorsales + bíceps + tríceps) da una estimación mucho más fiable que cuatro
-- ángulos sueltos analizados por separado.
--
-- Additive migration: solo crea tablas nuevas.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

create table if not exists physique_photos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null, -- local day key (YYYY-MM-DD) al que pertenece la foto
  pose text not null, -- 'baseline' | 'back_lats' | 'front_double_biceps' | 'back_double_biceps' | 'side_triceps'
  data_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists physique_checkins (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  body_fat_pct_low numeric not null,
  body_fat_pct_high numeric not null, -- siempre un RANGO, nunca un número exacto — ver el prompt en supabase/functions/ai-coach
  muscle_notes text not null default '',
  trend_notes text, -- null cuando no hay check-in anterior con el que comparar
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_physique_photos_date on physique_photos(user_id, date);
create index if not exists idx_physique_checkins_date on physique_checkins(user_id, date);

do $$
declare
  t text;
begin
  for t in
    select unnest(array['physique_photos', 'physique_checkins'])
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
