-- Veltra — Revisión semanal (Fase 4).
--
-- Cada domingo, una función programada (pg_cron) recorre los contratos
-- activos y genera una fila por usuario: un resumen de la semana, un patrón
-- si hay datos suficientes para afirmarlo, y como mucho una propuesta de
-- cambio al plan. El usuario la acepta o la mantiene desde Progreso.
--
-- Las filas las escribe únicamente la función con la service role key — por
-- eso no hay política de insert/delete para usuarios autenticados: intentan
-- leer y aceptar/mantener su propia revisión (select + update), nunca
-- crear una a mano. Ver supabase/functions/weekly-review y
-- WEEKLY_REVIEW_SETUP.md para el cron que la dispara.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push
--
-- Rollback:
--   drop table if exists weekly_reviews;

create table if not exists weekly_reviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id text not null references contracts(id) on delete cascade,
  -- Day-key (YYYY-MM-DD) del primer día de la semana revisada — una revisión
  -- por usuario y semana, de ahí el índice único de abajo.
  week_start text not null,
  summary text not null,
  pattern text,
  -- { commitmentId, title, field: 'days'|'timeSlot', currentDays, proposedDays, proposedTimeSlot, reason } o null si esta semana no hay propuesta.
  proposal jsonb,
  proposal_status text not null default 'pending', -- 'pending' | 'accepted' | 'kept' | 'none' (sin propuesta esa semana)
  generated_by text not null default 'rules', -- 'ai' | 'rules'
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists idx_weekly_reviews_user on weekly_reviews(user_id, week_start desc);

alter table weekly_reviews enable row level security;
drop policy if exists "select own rows" on weekly_reviews;
create policy "select own rows" on weekly_reviews for select using (user_id = auth.uid());
-- Solo puede tocar proposal_status: aceptar o mantener la propuesta que ya
-- generó el servidor. No existe policy de insert ni de delete a propósito.
drop policy if exists "update own status" on weekly_reviews;
create policy "update own status" on weekly_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
