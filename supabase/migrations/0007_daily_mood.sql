-- Veltra Mente — daily mood check-in ("¿Cómo estás hoy?").
--
-- Separate from journal_entries.mood (1-10, tied to a written entry): this is
-- a one-tap daily pick with no writing required, one row per user per day.
--
-- Additive migration: creates one new table, touches nothing existing.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

create table if not exists daily_moods (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null, -- local day key (YYYY-MM-DD)
  mood text not null, -- 'low' | 'flat' | 'good' | 'focused'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_moods_date on daily_moods(user_id, date);

alter table daily_moods enable row level security;
drop policy if exists "select own rows" on daily_moods;
create policy "select own rows" on daily_moods for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on daily_moods;
create policy "insert own rows" on daily_moods for insert with check (user_id = auth.uid());
drop policy if exists "update own rows" on daily_moods;
create policy "update own rows" on daily_moods for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own rows" on daily_moods;
create policy "delete own rows" on daily_moods for delete using (user_id = auth.uid());
