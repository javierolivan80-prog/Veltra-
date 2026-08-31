-- Web Push subscriptions for Hábitos background reminders.
--
-- Additive migration. The actual cron schedule that calls the
-- send-habit-reminders Edge Function is NOT created here — it depends on the
-- function's deployed URL and a service-role key, neither of which exist yet
-- at migration time. Run it manually after deploying the function; see
-- NOTIFICATIONS_SETUP.md at the repo root for the exact statement.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists push_subscriptions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
drop policy if exists "select own rows" on push_subscriptions;
create policy "select own rows" on push_subscriptions for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on push_subscriptions;
create policy "insert own rows" on push_subscriptions for insert with check (user_id = auth.uid());
drop policy if exists "delete own rows" on push_subscriptions;
create policy "delete own rows" on push_subscriptions for delete using (user_id = auth.uid());
