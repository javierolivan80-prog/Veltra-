-- Veltra — Revisión mensual (Fase 6).
--
-- El día 1 de cada mes, una función programada (pg_cron) recorre los
-- contratos activos y genera una fila por usuario para el mes natural que
-- acaba de cerrarse: un resumen con números reales, el punto fuerte del mes
-- y lo que más costó (cada uno solo si los datos lo sostienen). A
-- diferencia de weekly_reviews, no hay columna de propuesta: cambiar la
-- frecuencia de un compromiso es el trabajo de la revisión semanal, no de
-- esta.
--
-- Misma razón que weekly_reviews para no tener policy de insert/delete:
-- las filas las escribe únicamente la función con la service role key. El
-- usuario solo lee las suyas.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push
--
-- Rollback:
--   drop table if exists monthly_reviews;

create table if not exists monthly_reviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id text not null references contracts(id) on delete cascade,
  -- Day-key (YYYY-MM-DD) del primer día del mes revisado.
  month_start text not null,
  summary text not null,
  highlight text,
  lowlight text,
  generated_by text not null default 'rules', -- 'ai' | 'rules'
  created_at timestamptz not null default now(),
  unique (user_id, month_start)
);

create index if not exists idx_monthly_reviews_user on monthly_reviews(user_id, month_start desc);

alter table monthly_reviews enable row level security;
drop policy if exists "select own rows" on monthly_reviews;
create policy "select own rows" on monthly_reviews for select using (user_id = auth.uid());
