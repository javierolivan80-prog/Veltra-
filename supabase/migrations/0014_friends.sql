-- Comparación social ligera — Fase 6/14 de la auditoría.
--
-- Modelo mínimo a propósito, según lo que se decidió explícitamente:
--   1. Conexión por código de invitación, no búsqueda por email.
--   2. Solo se comparte racha y día del arco — nada de módulos concretos,
--      ni el "por qué", ni ningún dato del perfil.
--   3. Activo desde el principio, sin interruptor que activar en Perfil.
--
-- Sin aprobación mutua: quien tiene tu código puede añadirte y ver tu
-- progreso — compartir el código ya es el consentimiento, igual que
-- compartir cualquier enlace de invitación. No es automáticamente
-- bidireccional: cada persona ve a quien añadió con SU código.
--
-- friend_progress es una tabla-espejo deliberadamente estrecha (solo
-- nombre + racha + día de arco) en vez de dar a los amigos acceso de
-- lectura a contracts/workout_sessions/sleep_logs/etc. Ampliar el RLS de
-- esas tablas para "que los amigos puedan ver algo" sería exponer todo el
-- historial de cada módulo solo para calcular dos números — aquí en
-- cambio los calcula el propio cliente (Hoy) y sube solo el resultado.

create table if not exists friend_invites (
  code text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table friend_invites enable row level security;

-- Solo tu propia fila por select directo. Resolver el código de OTRA
-- persona no pasa por un select abierto (eso permitiría enumerar la tabla
-- entera de códigos de todo el mundo, no solo el que te han dado) sino por
-- la función de abajo, que solo devuelve el user_id de un código exacto.
create policy "select own invite code" on friend_invites for select using (user_id = auth.uid());
create policy "insert own invite code" on friend_invites for insert with check (user_id = auth.uid());

create or replace function resolve_friend_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select user_id from friend_invites where code = p_code;
$$;

revoke all on function resolve_friend_code(text) from public;
grant execute on function resolve_friend_code(text) to authenticated;

-- "friend_follows", no "friendships": ese nombre ya está ocupado por una
-- tabla previa sin relación (requester_id/addressee_id/status, un sistema
-- de solicitudes de amistad que nunca se llegó a usar). Reutilizarlo aquí
-- habría hecho fallar la migración entera al chocar con sus columnas.
create table if not exists friend_follows (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, target_id),
  constraint friend_follows_no_self check (viewer_id <> target_id)
);

alter table friend_follows enable row level security;
create policy "select own follows" on friend_follows for select using (viewer_id = auth.uid());
create policy "insert own follows" on friend_follows for insert with check (viewer_id = auth.uid());
create policy "delete own follows" on friend_follows for delete using (viewer_id = auth.uid());

create table if not exists friend_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  arc_day integer,
  arc_duration_days integer,
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table friend_progress enable row level security;
-- Dos políticas permisivas de select (se combinan con OR): tu propia fila,
-- y la de cualquiera que te haya dado su código.
create policy "select own progress" on friend_progress for select using (user_id = auth.uid());
create policy "select friends progress" on friend_progress for select using (
  exists (select 1 from friend_follows f where f.viewer_id = auth.uid() and f.target_id = friend_progress.user_id)
);
create policy "insert own progress" on friend_progress for insert with check (user_id = auth.uid());
create policy "update own progress" on friend_progress for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_friend_follows_viewer on friend_follows(viewer_id);
