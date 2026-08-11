-- =============================================================================
-- Real cross-tabs for topics.
--
-- The poll side of this landed in 20260807140000. This is the same job for
-- topics, and the thing being removed is worse: `decorate()` generated the
-- regional, age and occupation panels from a seed derived from the participant
-- count, with NO SMALL-SAMPLE GUARD AT ALL. One vote on a live topic drew a
-- national breakdown claiming Maharashtra 18%, Uttar Pradesh 16%, Delhi NCR 15%
-- — under a footnote reading "Demographics are voluntary", which made the
-- invention read as a methodology note.
--
-- `topic_demographics` already existed and was never wired to anything. It is
-- replaced here rather than extended, because it lacked the three things that
-- make an aggregate publishable: a suppression floor, a published-topic check,
-- and a rollup so a voter's city counts under its state.
--
-- SECURITY DEFINER, and it must be: `opinions` is readable per its own policy
-- but the demographic columns are stamped by trigger and never exposed for
-- aggregation by a client. So this returns counts and never rows, refuses
-- unpublished topics, and withholds any segment under ten people.
-- =============================================================================

create or replace function public.topic_audience(target uuid)
returns table (
  dimension text,
  segment   text,
  vote      public.sentiment,
  responses integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  min_segment constant integer := 10;
begin
  if not exists (
    select 1 from public.topics t
     where t.id = target
       and ((t.published_at is not null and t.archived_at is null) or public.is_editor())
  ) then
    return;
  end if;

  return query
  with counted as (
    select 'age'::text as dimension, o.age_band::text as segment, o.vote, count(*)::integer as responses
      from public.opinions o
     where o.topic_id = target and o.age_band is not null and o.hidden_at is null
     group by 1, 2, 3

    union all

    -- "Prefer not to say" is excluded by the vocabulary's own flag rather than
    -- by a string comparison somebody has to remember. Declining to state a job
    -- is not a job.
    select 'occupation'::text, o.occupation, o.vote, count(*)::integer
      from public.opinions o
      join public.occupations oc on oc.label = o.occupation and oc.counts_in_breakdowns
     where o.topic_id = target and o.hidden_at is null
     group by 1, 2, 3

    union all

    -- Rolled up to the state containing the voter's place. `path` is the
    -- materialised chain, so this is a lookup rather than a recursive walk per
    -- row. Someone placed at a country contributes to no region row, which is
    -- why region shares can total under 100 — that is the truth about the data.
    select 'region'::text, st.label, o.vote, count(*)::integer
      from public.opinions o
      join public.places pl on pl.id = o.place_id
      cross join lateral (
        select s.label
          from unnest(pl.path) as anc(id)
          join public.places s on s.id = anc.id and s.level = 'state'
         limit 1
      ) st
     where o.topic_id = target and o.hidden_at is null
     group by 1, 2, 3
  ),
  -- Suppression is per segment, not per cell. Dropping only small cells would
  -- leave a row whose percentages no longer sum to its people, and a reader
  -- would have no way to tell which figure had been withheld.
  publishable as (
    select c.dimension, c.segment
      from counted c
     group by 1, 2
    having sum(c.responses) >= min_segment
  )
  select c.dimension, c.segment, c.vote, c.responses
    from counted c
    join publishable p on p.dimension = c.dimension and p.segment = c.segment;
end;
$$;

comment on function public.topic_audience is
  'Real per-segment sentiment counts for a topic. Definer because the demographic columns on opinions are not client-aggregatable; suppresses segments under 10 people to prevent re-identification.';

revoke all on function public.topic_audience(uuid) from public;
grant execute on function public.topic_audience(uuid) to anon, authenticated;

-- How many participants supplied any demographics at all. The audience panel
-- states this; it used to be `54 + (participants % 11)`.
create or replace function public.topic_demographic_opt_in(target uuid)
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
  from public.opinions
  where topic_id = target and hidden_at is null;
$$;

revoke all on function public.topic_demographic_opt_in(uuid) from public;
grant execute on function public.topic_demographic_opt_in(uuid) to anon, authenticated;

-- Superseded. Two functions answering the same question differently is how a
-- caller ends up on the one without a suppression floor.
drop function if exists public.topic_demographics(uuid);

-- `block_tallies` and `aspect_tallies` already exist and already count the real
-- rows. Nothing calls either of them — which is the actual bug on those two
-- surfaces: the counts are computed correctly in Postgres and then thrown away
-- while the screen renders a seeded number. Wiring them up is the client's job,
-- not another function's.
