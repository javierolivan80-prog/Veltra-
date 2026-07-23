-- Veltra Food — nutrition assistant module.
--
-- Additive migration: it only creates new tables and never touches anything
-- from 0001_init.sql. Same conventions as the base schema — text primary
-- keys generated client-side, user_id scoped rows, RLS on every table.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push

-- One chat thread per calendar day. `date` is the local day key (YYYY-MM-DD),
-- unique per user so "today" resolves to exactly one conversation.
create table if not exists food_conversations (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists food_messages (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id text not null references food_conversations(id) on delete cascade,
  role text not null,
  content text not null default '',
  photos jsonb not null default '[]',
  meal_id text,
  created_at timestamptz not null default now()
);

create table if not exists food_meals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id text not null references food_conversations(id) on delete cascade,
  message_id text,
  date text not null,
  note text not null default '',
  foods jsonb not null default '[]',
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  created_at timestamptz not null default now()
);

-- One goals row per user (id = auth.uid()), same shape as the profile table.
create table if not exists nutrition_goals (
  id uuid primary key references auth.users(id) on delete cascade,
  calories numeric not null default 2400,
  protein numeric not null default 180,
  carbs numeric not null default 250,
  fat numeric not null default 70,
  updated_at timestamptz not null default now()
);

create index if not exists idx_food_messages_conversation on food_messages(conversation_id);
create index if not exists idx_food_meals_conversation on food_meals(conversation_id);
create index if not exists idx_food_meals_date on food_meals(user_id, date);
create index if not exists idx_food_conversations_date on food_conversations(user_id, date);

-- ---------------------------------------------------------------------
-- Row Level Security — every row scoped to its owning user.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array['food_conversations', 'food_messages', 'food_meals'])
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

-- nutrition_goals keys off id = auth.uid() directly (like the profile table).
alter table nutrition_goals enable row level security;
drop policy if exists "select own goals" on nutrition_goals;
create policy "select own goals" on nutrition_goals for select using (id = auth.uid());
drop policy if exists "insert own goals" on nutrition_goals;
create policy "insert own goals" on nutrition_goals for insert with check (id = auth.uid());
drop policy if exists "update own goals" on nutrition_goals;
create policy "update own goals" on nutrition_goals for update using (id = auth.uid()) with check (id = auth.uid());
