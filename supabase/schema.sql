-- Glyph: the public daily leaderboard.
-- Paste this whole file into Supabase > SQL Editor and run it once.
--
-- There are no accounts: each browser gets a random player id and the name the player typed in.
-- Anyone can read the board; anyone can add one result per player per daily puzzle.

create table if not exists public.daily_scores (
  id bigint generated always as identity primary key,
  player uuid not null,
  name text not null check (char_length(btrim(name)) between 2 and 20),
  game text not null check (game in ('word', 'link', 'mini')),
  -- Days since launch (9 Oct 2026 is day 0, shown as Daily #1)
  day int not null check (day >= 0),
  -- How long the solve took
  seconds int not null check (seconds between 1 and 7200),
  -- Guesses used (Wordl) or mistakes made (Connect4); empty for MiniCross
  extra int check (extra between 0 and 6),
  created_at timestamptz not null default now(),
  unique (player, game, day)
);

create index if not exists daily_scores_board on public.daily_scores (game, day, seconds);

alter table public.daily_scores enable row level security;

drop policy if exists "the board is public" on public.daily_scores;
create policy "the board is public" on public.daily_scores for select using (true);

-- Results only for today's puzzle (give or take a day for time zones), so old days can't be backfilled
drop policy if exists "post today's result" on public.daily_scores;
create policy "post today's result" on public.daily_scores for insert
  with check (abs(day - (current_date - date '2026-10-09')) <= 1);
