-- Amigos — feed de PRs. Extiende la comparación social ligera de la 0014:
-- además de racha y día de arco, un amigo puede ver cuándo rompes un
-- récord personal, incluso en un ejercicio que él no entrena — "Javier ha
-- sacado 80 en banca" es información aunque quien lo lee no haga banca.
--
-- Misma arquitectura que friend_progress: una tabla-espejo estrecha
-- (nombre del ejercicio + tipo + valor, como texto plano) en vez de dar a
-- los amigos acceso de lectura a personal_records/exercises — así no hace
-- falta tocar el RLS de ningún módulo de entrenamiento real.

create table if not exists friend_pr_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  exercise_name text not null,
  pr_type text not null check (pr_type in ('1rm', 'weight', 'reps')),
  value numeric not null,
  achieved_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table friend_pr_events enable row level security;
create policy "select own pr events" on friend_pr_events for select using (user_id = auth.uid());
create policy "select friends pr events" on friend_pr_events for select using (
  exists (select 1 from friendships f where f.viewer_id = auth.uid() and f.target_id = friend_pr_events.user_id)
);
create policy "insert own pr events" on friend_pr_events for insert with check (user_id = auth.uid());

create index if not exists idx_friend_pr_events_user_achieved on friend_pr_events(user_id, achieved_at desc);
