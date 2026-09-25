-- Aviso de fin de descanso por notificación push real.
--
-- El temporizador en pantalla (RestTimer.tsx) depende de que la pestaña
-- siga ejecutando JS cada 250 ms — en iOS Safari, con la pantalla bloqueada
-- o la app un rato en segundo plano, el navegador congela esa ejecución y
-- el aviso sonoro/visual no llega hasta que se reabre la app. Esta tabla es
-- la cola de avisos pendientes: send-rest-alerts (cron cada minuto, misma
-- infraestructura que send-habit-reminders — ver NOTIFICATIONS_SETUP.md) la
-- revisa y despacha por push real, independiente de si la pestaña está viva.
--
-- Cada fila vive solo mientras el descanso está pendiente: el cliente la
-- borra si se cancela o se sustituye antes de tiempo (workoutSession.store.ts),
-- y la función la borra al despacharla — nunca se acumula.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

create table if not exists rest_alerts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rest_alerts_ends_at on rest_alerts(ends_at);

alter table rest_alerts enable row level security;
drop policy if exists "select own rows" on rest_alerts;
create policy "select own rows" on rest_alerts for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on rest_alerts;
create policy "insert own rows" on rest_alerts for insert with check (user_id = auth.uid());
drop policy if exists "delete own rows" on rest_alerts;
create policy "delete own rows" on rest_alerts for delete using (user_id = auth.uid());
