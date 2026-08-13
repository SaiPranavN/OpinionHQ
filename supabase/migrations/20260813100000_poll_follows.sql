-- =============================================================================
-- Following a poll.
--
-- Topics have had this since the identity migration — `topic_follows`, a
-- counter on `topic_stats` and a trigger keeping the two agreed. Polls never
-- got it, so the Follow button on a poll had nowhere to write.
--
-- Deliberately the same shape rather than something cleverer. One table per
-- subject beats a polymorphic `follows(kind, subject_id)`: a composite foreign
-- key cannot point at two tables, so the polymorphic version gives up
-- referential integrity and gains nothing but a saved file.
-- =============================================================================

alter table public.poll_stats
  add column if not exists follower_count integer not null default 0
  check (follower_count >= 0);

create table if not exists public.poll_follows (
  poll_id    uuid not null references public.polls (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index if not exists poll_follows_user_idx on public.poll_follows (user_id);

/**
 * Keeps `poll_stats.follower_count` level with the table.
 *
 * `security definer` because the counter lives on a row the follower has no
 * privilege to update — the count is derived, and letting a client write it
 * directly is how a follower count stops meaning anything.
 */
create or replace function public.apply_poll_follow_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.poll_stats set follower_count = follower_count + 1, updated_at = now()
     where poll_id = new.poll_id;
  else
    update public.poll_stats set follower_count = greatest(follower_count - 1, 0), updated_at = now()
     where poll_id = old.poll_id;
  end if;
  return null;
end;
$$;

drop trigger if exists poll_follows_count on public.poll_follows;
create trigger poll_follows_count
after insert or delete on public.poll_follows
for each row execute function public.apply_poll_follow_delta();

alter table public.poll_follows enable row level security;

-- You may read, create and remove your own follows and nobody else's. There is
-- deliberately no policy letting one account see who follows what: a follower
-- count is public, a follower list is not.
drop policy if exists "own poll follows" on public.poll_follows;
create policy "own poll follows" on public.poll_follows for select
  using ((select auth.uid()) = user_id);

drop policy if exists "follow a poll for yourself" on public.poll_follows;
create policy "follow a poll for yourself" on public.poll_follows for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "unfollow a poll for yourself" on public.poll_follows;
create policy "unfollow a poll for yourself" on public.poll_follows for delete
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.poll_follows to authenticated;
grant select on public.poll_follows to anon;
