-- =============================================================================
-- Gender as a fourth cross-tab, and the daily series the charts need.
--
-- Two things that belong in one migration because they touch the same rows:
-- the demographic stamped onto every vote, and the per-day aggregate read back
-- out of those votes.
-- =============================================================================

-- The vocabulary.
--
-- "Prefer not to say" is a real answer and is stored, so somebody who declines
-- is not indistinguishable from somebody who has not filled the form in yet.
-- It is excluded from the breakdowns by name below — declining to state a
-- gender is not a gender, the same rule `counts_in_breakdowns` applies to
-- occupations.
create type public.gender as enum (
  'Woman', 'Man', 'Non-binary', 'Prefer not to say'
);

alter table public.profile_private add column gender public.gender;

-- Stamped onto each vote at the moment it is cast, like the others. A snapshot
-- rather than a join, so a chart query never touches a person's profile — and
-- so somebody updating their profile does not silently rewrite what past
-- results said about the people who voted.
alter table public.opinions   add column gender public.gender;
alter table public.poll_votes add column gender public.gender;

create index opinions_gender_idx   on public.opinions (topic_id, gender) where gender is not null;
create index poll_votes_gender_idx on public.poll_votes (poll_id, gender) where gender is not null;

-- The stamping functions gain the new column. Rewritten whole rather than
-- patched, because both already resolve the profile into a record and adding a
-- field is one line inside a function that has to be replaced anyway.
create or replace function public.stamp_opinion_demographics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  select p.dob, p.occupation, p.place_id, p.gender into d
    from public.profile_private p
   where p.user_id = new.author_id;

  new.age_band   := public.age_band(d.dob);
  new.occupation := d.occupation;
  new.place_id   := d.place_id;
  new.gender     := d.gender;
  return new;
end;
$$;

create or replace function public.stamp_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  if not exists (
    select 1 from public.poll_options o
     where o.id = new.option_id and o.poll_id = new.poll_id
  ) then
    raise exception 'option % does not belong to poll %', new.option_id, new.poll_id;
  end if;

  select p.dob, p.occupation, p.place_id, p.gender into d
    from public.profile_private p where p.user_id = new.user_id;

  new.age_band   := public.age_band(d.dob);
  new.occupation := d.occupation;
  new.place_id   := d.place_id;
  new.gender     := d.gender;
  return new;
end;
$$;

-- The column is trigger-maintained, so a client must not be able to write it.
revoke insert, update on public.opinions   from authenticated, anon;
revoke insert, update on public.poll_votes from authenticated, anon;
grant insert (topic_id, author_id, vote, body, format) on public.opinions to authenticated;
grant update (vote, body, format, edited_at, hidden_at, hidden_reason) on public.opinions to authenticated;
grant insert (poll_id, user_id, option_id) on public.poll_votes to authenticated;
grant update (option_id) on public.poll_votes to authenticated;

-- ---------------------------------------------------------------------------
-- Gender joins the two audience functions.

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

    select 'occupation'::text, o.occupation, o.vote, count(*)::integer
      from public.opinions o
      join public.occupations oc on oc.label = o.occupation and oc.counts_in_breakdowns
     where o.topic_id = target and o.hidden_at is null
     group by 1, 2, 3

    union all

    -- Declining to state a gender is not a gender.
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
     group by 1, 2, 3
  ),
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

-- ---------------------------------------------------------------------------
-- The daily series the sentiment trend and participation charts plot.
--
-- MEASURED, AND FROM A SOURCE THAT ALREADY EXISTS. Every opinion carries the
-- moment it was cast, so "how many people took part on each day" and "what the
-- split looked like as of each day" are both readable straight off the table.
-- No scheduled job, no `topic_daily_stats` rows, and — the point — nothing
-- invented: an empty result means nobody voted, which is exactly what the chart
-- should then say.
--
-- `cast_on` is a date, so a topic that ran for one afternoon returns one row.
-- The client decides whether one reading is worth drawing a line through; it is
-- not, and it says so rather than joining a point to itself.
create or replace function public.topic_daily_series(target uuid)
returns table (
  cast_on   date,
  votes     integer,
  positive  integer,
  neutral   integer,
  negative  integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.created_at::date as cast_on,
    count(*)::integer,
    count(*) filter (where o.vote = 'Positive')::integer,
    count(*) filter (where o.vote = 'Neutral')::integer,
    count(*) filter (where o.vote = 'Negative')::integer
  from public.opinions o
  join public.topics t on t.id = o.topic_id
  where o.topic_id = target
    and o.hidden_at is null
    and ((t.published_at is not null and t.archived_at is null) or public.is_editor())
  group by 1
  order by 1;
$$;

comment on function public.topic_daily_series is
  'Per-day participation and sentiment for a topic, counted from opinions.created_at. No invented points: a day nobody voted has no row.';

revoke all on function public.topic_daily_series(uuid) from public;
grant execute on function public.topic_daily_series(uuid) to anon, authenticated;

-- The same, for the share of participants who gave a gender at all.
create or replace function public.topic_gender_opt_in(target uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) = 0 then 0
    else round(100.0 * count(*) filter (
      where gender is not null and gender <> 'Prefer not to say'
    ) / count(*))::integer
  end
  from public.opinions
  where topic_id = target and hidden_at is null;
$$;

revoke all on function public.topic_gender_opt_in(uuid) from public;
grant execute on function public.topic_gender_opt_in(uuid) to anon, authenticated;
