-- =============================================================================
-- Real cross-tabs for polls.
--
-- "68% of 17–20s picked A, 41% of over-31s did" is the most interesting line on
-- a poll page and the easiest one to fake. The prototype derived these from the
-- headline split with a seeded swing, which reconciles perfectly and describes
-- nobody. These functions count the votes that were actually cast.
--
-- SECURITY DEFINER, and it has to be. The policy on `poll_votes` is own-row-only
-- — a client aggregating the table directly would find exactly its own vote and
-- report every segment as 100% whatever it picked. So these run with the
-- owner's rights, which makes their output the whole security surface: they
-- return counts and never rows, they refuse unpublished polls, and they
-- suppress small segments (see MIN_SEGMENT below).
-- =============================================================================

-- A cross-tab of a segment against an option is a re-identification tool when
-- the segment is small enough. "Educators in Goa: 100% option B, 1 voter" plus
-- one person's known job and city names their vote, and a poll can be about
-- something they would not want named. Ten is the floor for publishing a
-- segment at all; the headline split has its own, larger floor in the client.
create or replace function public.poll_audience(target uuid)
returns table (
  dimension text,
  segment   text,
  slot      public.option_slot,
  voters    integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  min_segment constant integer := 10;
begin
  -- An unpublished poll's votes are not aggregated for anybody but an editor.
  -- Without this the function would happily cross-tab a draft.
  if not exists (
    select 1 from public.polls p
     where p.id = target
       and ((p.published_at is not null and p.archived_at is null) or public.is_editor())
  ) then
    return;
  end if;

  return query
  with counted as (
    -- Age. The band is snapshotted onto the vote, so a voter having a birthday
    -- does not silently rewrite a poll's history.
    select 'age'::text as dimension, v.age_band::text as segment, o.slot, count(*)::integer as voters
      from public.poll_votes v
      join public.poll_options o on o.id = v.option_id
     where v.poll_id = target and v.age_band is not null
     group by 1, 2, 3

    union all

    select 'occupation'::text, v.occupation, o.slot, count(*)::integer
      from public.poll_votes v
      join public.poll_options o on o.id = v.option_id
     where v.poll_id = target and v.occupation is not null
     group by 1, 2, 3

    union all

    -- Region. A voter's place is wherever they set it — a city, a state, a
    -- country — so it is rolled up to the state that contains it. `path` is the
    -- materialised chain (innermost first), which is why this is a lookup
    -- rather than a recursive walk per vote.
    --
    -- Voters whose place has no state above it (someone placed at "India", or
    -- worldwide) contribute to no region row. Their absence is why the region
    -- shares can total less than 100, which is the truth about the data.
    select 'region'::text, st.label, o.slot, count(*)::integer
      from public.poll_votes v
      join public.poll_options o on o.id = v.option_id
      join public.places pl on pl.id = v.place_id
      cross join lateral (
        select s.label
          from unnest(pl.path) as anc(id)
          join public.places s on s.id = anc.id and s.level = 'state'
         limit 1
      ) st
     where v.poll_id = target
     group by 1, 2, 3
  ),
  -- Suppression is per segment, not per cell: dropping only the small cells
  -- would leave a row whose percentages no longer sum to its voters, and a
  -- reader would have no way to tell which figure had been withheld.
  publishable as (
    select c.dimension, c.segment
      from counted c
     group by 1, 2
    having sum(c.voters) >= min_segment
  )
  select c.dimension, c.segment, c.slot, c.voters
    from counted c
    join publishable p on p.dimension = c.dimension and p.segment = c.segment;
end;
$$;

comment on function public.poll_audience is
  'Real per-segment vote counts for a poll. Definer rights because poll_votes is '
  'own-row-only; suppresses segments under 10 voters to prevent re-identification.';

revoke all on function public.poll_audience(uuid) from public;
grant execute on function public.poll_audience(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- How many voters supplied any demographics at all.
--
-- The page states this ("percentages describe the participants who chose to
-- share"), and it was previously `54 + (participants % 11)` — a plausible
-- number with nothing behind it. Now it is the count.
create or replace function public.poll_demographic_opt_in(target uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) = 0 then 0
    else round(
      100.0 * count(*) filter (
        where age_band is not null or occupation is not null or place_id is not null
      ) / count(*)
    )::integer
  end
  from public.poll_votes
  where poll_id = target;
$$;

revoke all on function public.poll_demographic_opt_in(uuid) from public;
grant execute on function public.poll_demographic_opt_in(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Written reasons per option.
--
-- `poll_reasons` is world-readable, so this needs no elevated rights — it is a
-- function purely so the count arrives with the poll rather than as a second
-- round trip that a caller could forget to make.
create or replace function public.poll_reason_counts(target uuid)
returns table (slot public.option_slot, reasons integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select o.slot, count(r.id)::integer
    from public.poll_options o
    left join public.poll_reasons r
      on r.option_id = o.id and r.hidden_at is null
   where o.poll_id = target
   group by o.slot;
$$;

grant execute on function public.poll_reason_counts(uuid) to anon, authenticated;
