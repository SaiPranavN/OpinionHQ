-- =============================================================================
-- Joint audience cells, so a cross-tab can actually be cross-filtered.
--
-- `topic_audience` and `poll_audience` return four INDEPENDENT marginals: how
-- the state column split, how the age column split, and so on. Four marginals
-- can be drawn side by side and can never be read against each other — there is
-- no arithmetic that recovers "how did Karnataka's 21-24s split" from "how did
-- Karnataka split" and "how did 21-24 split". Clicking a row to re-read the
-- other three charts is therefore not a rendering problem; the number simply is
-- not in the payload.
--
-- These return the joint distribution instead: one row per distinct
-- (state, age band, occupation, gender, answer) combination with its count.
-- Every marginal the old functions returned is a GROUP BY away from this, which
-- is what `crossTab()` in src/lib/audience/cells.ts does, and what the parity
-- test in cells.test.ts pins.
--
-- NULL IS A VALUE HERE, AND IT CARRIES THE WHOLE THING. A voter who gave an age
-- but no location must still be counted in the age breakdown, so the columns
-- are nullable and each dimension's marginal skips its own nulls. That
-- reproduces the old per-dimension filters exactly:
--   * region   null when the voter set no place, or a place with no state above
--   * age      null when they did not give one
--   * occupation null when they did not give one, or gave a label that does not
--              count in breakdowns ("Prefer not to say")
--   * gender   null when they did not give one, or said "Prefer not to say" —
--              declining to state a gender is still not a gender
--
-- ON RE-IDENTIFICATION, PLAINLY. A joint cell is more identifying than the four
-- marginals it decomposes into: "Educator, 41+, Woman, Goa, negative — 1" names
-- somebody in a way that four separate columns do not. This is the same trade
-- 20260810110000_show_every_segment.sql made when it removed the ten-person
-- floor at the product owner's direction, sharpened by one turn, and it is
-- inherent to the feature rather than incidental to it — interactive
-- cross-filtering IS cross-tabulation, and there is no version of it that
-- reveals less than the cells it filters on.
--
-- TO PUT A FLOOR BACK, add `having count(*) >= n` to both queries. The client
-- tolerates it: a suppressed cell is simply a cell nobody is in, and the
-- breakdowns already report percentages of what they were given rather than of
-- a total they assume.
--
-- The other protections are untouched: an unpublished or archived subject is
-- not cross-tabbed at all, no row identifies an account, and the demographic
-- columns remain stamped snapshots that no client can write.
--
-- SIZE. The row count is bounded by the product of the vocabularies — about
-- 21,000 for a topic whose voters cover every combination — and in practice by
-- the number of distinct voter profiles, which for anything short of tens of
-- thousands of participants is far smaller. If a subject ever grows past that,
-- the replacement is an RPC that takes the filter and returns marginals within
-- it, at the cost of a round-trip per click.
-- =============================================================================

create or replace function public.topic_audience_cells(target uuid)
returns table (
  region     text,
  age        text,
  occupation text,
  gender     text,
  vote       public.sentiment,
  responses  integer
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
  select st.label,
         o.age_band::text,
         -- Left-joined rather than filtered, so somebody whose occupation does
         -- not count in breakdowns still contributes to the other three.
         case when oc.label is not null then o.occupation end,
         case
           when o.gender is not null and o.gender <> 'Prefer not to say'
           then o.gender::text
         end,
         o.vote,
         count(*)::integer
    from public.opinions o
    left join public.occupations oc
           on oc.label = o.occupation
          and oc.counts_in_breakdowns
    left join lateral (
      select s.label
        from public.places pl
        cross join lateral unnest(pl.path) as anc(id)
        join public.places s on s.id = anc.id and s.level = 'state'
       where pl.id = o.place_id
       limit 1
    ) st on true
   where o.topic_id = target
     and o.hidden_at is null
   group by 1, 2, 3, 4, 5;
end;
$$;

create or replace function public.poll_audience_cells(target uuid)
returns table (
  region     text,
  age        text,
  occupation text,
  gender     text,
  slot       public.option_slot,
  voters     integer
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
  select st.label,
         v.age_band::text,
         case when oc.label is not null then v.occupation end,
         case
           when v.gender is not null and v.gender <> 'Prefer not to say'
           then v.gender::text
         end,
         o.slot,
         count(*)::integer
    from public.poll_votes v
    join public.poll_options o on o.id = v.option_id
    left join public.occupations oc
           on oc.label = v.occupation
          and oc.counts_in_breakdowns
    left join lateral (
      select s.label
        from public.places pl
        cross join lateral unnest(pl.path) as anc(id)
        join public.places s on s.id = anc.id and s.level = 'state'
       where pl.id = v.place_id
       limit 1
    ) st on true
   where v.poll_id = target
   group by 1, 2, 3, 4, 5;
end;
$$;

comment on function public.topic_audience_cells is
  'Joint demographic cross-tab for a topic: one row per distinct '
  '(state, age band, occupation, gender, vote) with its count. Nullable per '
  'dimension so a voter missing one field still counts in the others. Every '
  'marginal public.topic_audience returns is a GROUP BY over this.';

comment on function public.poll_audience_cells is
  'Joint demographic cross-tab for a poll, the counterpart to '
  'public.topic_audience_cells. Counts voters per option slot.';

revoke all on function public.topic_audience_cells(uuid) from public;
revoke all on function public.poll_audience_cells(uuid) from public;
grant execute on function public.topic_audience_cells(uuid) to anon, authenticated;
grant execute on function public.poll_audience_cells(uuid) to anon, authenticated;
