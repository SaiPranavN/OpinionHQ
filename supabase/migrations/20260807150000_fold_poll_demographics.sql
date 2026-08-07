-- =============================================================================
-- One cross-tab function for polls, not two.
--
-- `poll_demographics` shipped in the views migration and was never wired up.
-- `poll_audience` then arrived to serve the same page. Two functions answering
-- the same question differently is a trap: the older one has no suppression
-- floor, no published-poll check, and returns raw place ids, so whichever
-- caller picked it up first would decide whether the product protects its
-- voters. Folding them leaves one answer.
--
-- What the old one did better is kept: occupations flagged
-- `counts_in_breakdowns = false` — "Prefer not to say" — are excluded by the
-- vocabulary's own flag rather than by a string comparison somebody has to
-- remember to write. Somebody declining to state their job is not a job.
-- =============================================================================

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
  if not exists (
    select 1 from public.polls p
     where p.id = target
       and ((p.published_at is not null and p.archived_at is null) or public.is_editor())
  ) then
    return;
  end if;

  return query
  with counted as (
    select 'age'::text as dimension, v.age_band::text as segment, o.slot, count(*)::integer as voters
      from public.poll_votes v
      join public.poll_options o on o.id = v.option_id
     where v.poll_id = target and v.age_band is not null
     group by 1, 2, 3

    union all

    -- The join is the filter: an occupation that does not count in breakdowns
    -- has no row here at all.
    select 'occupation'::text, v.occupation, o.slot, count(*)::integer
      from public.poll_votes v
      join public.poll_options o on o.id = v.option_id
      join public.occupations oc on oc.label = v.occupation and oc.counts_in_breakdowns
     where v.poll_id = target
     group by 1, 2, 3

    union all

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

drop function if exists public.poll_demographics(uuid);
