-- =============================================================================
-- "How the split moved", from readings that exist.
--
-- `poll_history` was designed to be filled by a scheduled job and never got
-- one, so the chart above it has had nothing to draw since the day it shipped.
-- It does not need the job: every vote carries the moment it was cast, so the
-- split as it stood at the end of any given day is readable straight off
-- `poll_votes`.
--
-- Returns per-day, per-option counts. The client accumulates them into a
-- running split, for the same reason the topic trend does: the figure a reader
-- sees at the top of the page is the share of everyone who has voted, and a
-- per-day line would swing on a quiet day and disagree with it.
--
-- A day nobody voted has no row. Nothing is interpolated and nothing is padded.
-- =============================================================================

create or replace function public.poll_daily_series(target uuid)
returns table (
  cast_on date,
  slot    public.option_slot,
  votes   integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.created_at::date as cast_on,
    o.slot,
    count(*)::integer
  from public.poll_votes v
  join public.poll_options o on o.id = v.option_id
  join public.polls p on p.id = v.poll_id
  where v.poll_id = target
    and ((p.published_at is not null and p.archived_at is null) or public.is_editor())
  group by 1, 2
  order by 1, 2;
$$;

comment on function public.poll_daily_series is
  'Per-day, per-option vote counts for a poll, from poll_votes.created_at. No scheduled job and no interpolation: a day nobody voted has no row.';

revoke all on function public.poll_daily_series(uuid) from public;
grant execute on function public.poll_daily_series(uuid) to anon, authenticated;
