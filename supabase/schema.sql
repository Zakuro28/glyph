-- Glyph: accounts, leaderboards and synced progress.
-- Paste this whole file into Supabase > SQL Editor and run it once.

-- Public profile for each account: just a username
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

-- Make a profile as soon as someone signs up, from the username they picked
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- One row per result. Limits keep obviously fake scores out.
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  game text not null check (game in ('type', 'word', 'link', 'mini')),
  board text not null check (length(board) <= 24),
  score numeric not null,
  created_at timestamptz not null default now(),
  check (
    (game = 'type' and score between 0 and 250)
    or (game = 'word' and score between 1 and 6)
    or (game = 'link' and score between 0 and 3)
    or (game = 'mini' and score between 5 and 3600)
  )
);

-- A daily puzzle counts once per person
create unique index if not exists scores_daily_once on public.scores (user_id, game, board) where board like 'daily-%';
create index if not exists scores_board on public.scores (game, board, score);

-- Everything a player has saved (stats, streaks, puzzle progress), so it follows them between devices
create table if not exists public.progress (
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  key text not null check (length(key) <= 64),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;
alter table public.progress enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "scores are public" on public.scores;
create policy "scores are public" on public.scores for select using (true);
drop policy if exists "add your own scores" on public.scores;
create policy "add your own scores" on public.scores for insert with check (auth.uid() = user_id);

drop policy if exists "your own progress" on public.progress;
create policy "your own progress" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Top results for one board. Typing keeps each person's best (highest);
-- the puzzles rank fewest guesses, fewest mistakes or fastest time, then whoever finished first.
create or replace function public.leaderboard(p_game text, p_board text, p_limit int default 20)
returns table (username text, score numeric, created_at timestamptz)
language sql stable as $$
  select p.username, b.score, b.created_at
  from (
    select distinct on (s.user_id) s.user_id, s.score, s.created_at
    from public.scores s
    where s.game = p_game and s.board = p_board
    order by s.user_id, case when p_game = 'type' then -s.score else s.score end, s.created_at
  ) b
  join public.profiles p on p.id = b.user_id
  order by case when p_game = 'type' then -b.score else b.score end, b.created_at
  limit least(p_limit, 100);
$$;
