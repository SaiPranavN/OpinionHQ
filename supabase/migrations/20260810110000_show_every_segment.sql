-- =============================================================================
-- Every segment is reported, however few people are in it.
--
-- The audience functions withheld any group under ten people. That floor was
-- there for one reason: a cross-tab of a very small group can identify the
-- people in it. "Educators in Goa, 1 voter, 100% against", set beside anything
-- else on the page, names somebody's vote.
--
-- Removed at the product owner's direction. The trade is explicit rather than
-- forgotten: breakdowns now appear from the first vote, and a segment holding
-- one person is shown as a segment holding one person.
--
-- TO PUT IT BACK, set `min_segment` below to the number you want and restore
-- the `publishable` join in both functions — the shape is preserved in the
-- history of this file, and `MIN_SEGMENT` in src/lib/demographics.ts is the
-- client-side copy that has to move with it.
--
-- The other protections are untouched and are the ones that matter more: an
-- unpublished topic or poll is still not cross-tabbed at all, the functions
-- still return counts and never rows, and the demographic columns are still
-- stamped snapshots that no client can write.
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
begin
  if not exists (
    select 1 from public.topics t
     where t.id = target
       and ((t.published_at is not null and t.archived_at is null) or public.is_editor())
  ) then
    return;
  end if;

  return query
  select 'age'::text, o.age_band::text, o.vote, count(*)::integer
    from public.opinions o
   where o.topic_id = target and o.age_band is not null and o.hidden_at is null
   group by 1, 2, 3

  union all

  select 'occupation'::text, o.occupation, o.vote, count(*)::integer
    from public.opinions o
    join public.occupations oc on oc.label = o.occupation and oc.counts_in_breakdowns
   where o.topic_id = target and o.hidden_at is null
   group by 1, 2, 3

  union all

  -- Declining to state a gender is still not a gender. That exclusion is about
  -- what an answer means, not about how many people gave it, so it stays.
  select 'gender'::text, o.gender::text, o.vote, count(*)::integer
    from public.opinions o
   where o.topic_id = target and o.hidden_at is null
     and o.gender is not null and o.gender <> 'Prefer not to say'
   group by 1, 2, 3

  union all

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
   group by 1, 2, 3;
end;
$$;

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
begin
  if not exists (
    select 1 from public.polls p
     where p.id = target
       and ((p.published_at is not null and p.archived_at is null) or public.is_editor())
  ) then
    return;
  end if;

  return query
  select 'age'::text, v.age_band::text, o.slot, count(*)::integer
    from public.poll_votes v
    join public.poll_options o on o.id = v.option_id
   where v.poll_id = target and v.age_band is not null
   group by 1, 2, 3

  union all

  select 'occupation'::text, v.occupation, o.slot, count(*)::integer
    from public.poll_votes v
    join public.poll_options o on o.id = v.option_id
    join public.occupations oc on oc.label = v.occupation and oc.counts_in_breakdowns
   where v.poll_id = target
   group by 1, 2, 3

  union all

  select 'gender'::text, v.gender::text, o.slot, count(*)::integer
    from public.poll_votes v
    join public.poll_options o on o.id = v.option_id
   where v.poll_id = target
     and v.gender is not null and v.gender <> 'Prefer not to say'
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
   group by 1, 2, 3;
end;
$$;
