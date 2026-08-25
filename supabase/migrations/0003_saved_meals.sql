-- Veltra Food — saved meals ("comidas frecuentes").
--
-- One-tap templates for meals the user eats often. Registering one COPIES its
-- macros into a food_meals row, so editing or deleting a template never
-- rewrites days already logged.
--
-- Additive migration: creates one new table, touches nothing existing.

create table if not exists saved_meals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  foods jsonb not null default '[]',
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_meals_user on saved_meals(user_id, use_count desc);

alter table saved_meals enable row level security;
drop policy if exists "select own rows" on saved_meals;
create policy "select own rows" on saved_meals for select using (user_id = auth.uid());
drop policy if exists "insert own rows" on saved_meals;
create policy "insert own rows" on saved_meals for insert with check (user_id = auth.uid());
drop policy if exists "update own rows" on saved_meals;
create policy "update own rows" on saved_meals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own rows" on saved_meals;
create policy "delete own rows" on saved_meals for delete using (user_id = auth.uid());
