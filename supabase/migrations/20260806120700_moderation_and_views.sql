-- =============================================================================
-- Moderation, and the read models the UI actually queries.
-- =============================================================================

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  subject_type  public.report_subject not null,
  subject_id    uuid not null,
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  reason        text not null,
  detail        text not null default '',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles (id) on delete set null,
  resolution    text,
  -- One report per person per thing. A second one from the same account is not
  -- more evidence, and letting it through turns the queue into a vote.
  unique (subject_type, subject_id, reporter_id)
);

create index reports_open_idx on public.reports (created_at desc) where resolved_at is null;

alter table public.reports enable row level security;

create policy "own reports" on public.reports for select
  using (reporter_id = (select auth.uid()) or public.is_editor());
create policy "report something" on public.reports for insert
  with check (reporter_id = (select auth.uid()));
create policy "editors resolve reports" on public.reports for update
  using (public.is_editor()) with check (public.is_editor());

-- =============================================================================
-- A professional's public record.
--
-- Ratings are private and always will be, so the percentage cannot be a view
-- over them — computing it in a view would mean granting read access to the
-- thing the whole design keeps shut. It is written by a scheduled job under the
-- service role instead, from data no client can reach.
--
-- Withheld below five answers: "100% helpful" off two ratings is noise wearing
-- a statistic's clothes.
-- =============================================================================

create table public.professional_stats (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  answered      integer not null default 0 check (answered >= 0),
  -- Null until there are enough ratings to report one honestly.
  helpful_pct   integer check (helpful_pct between 0 and 100),
  computed_at   timestamptz not null default now()
);

alter table public.professional_stats enable row level security;
create policy "professional stats are public" on public.professional_stats for select using (true);
revoke insert, update, delete on public.professional_stats from authenticated, anon;

-- =============================================================================
-- Read models.
--
-- `security_invoker = on` throughout. A view without it runs as its owner and
-- silently bypasses the row policies of everything it touches, which would undo
-- this entire schema one convenience view at a time. With it on, a view is a
-- saved query and nothing more: the caller's policies still decide every row.
-- =============================================================================

-- A user viewed as somebody who can answer. Derived from the account plus its
-- credentials, per `Professional` in `src/lib/ask/types.ts`.
create view public.professionals
with (security_invoker = on) as
select
  p.id                as user_id,
  p.display_name      as name,
  p.initials,
  p.headline,
  p.avatar_tone       as tone,
  p.expertise,
  coalesce(array_agg(distinct c.category) filter (where c.id is not null), '{}') as areas,
  coalesce(s.answered, 0) as answered,
  s.helpful_pct
from public.profiles p
join public.credentials c
  on c.user_id = p.id
 and c.status = 'verified'
 and (c.expires_at is null or c.expires_at > now())
left join public.professional_stats s on s.user_id = p.id
where p.suspended_at is null
group by p.id, p.display_name, p.initials, p.headline, p.avatar_tone, p.expertise, s.answered, s.helpful_pct;

-- The catalog row. One query per card instead of a topic fetch plus a stats
-- fetch plus a category lookup; the percentages stay in the read model
-- (`src/lib/derive.ts`) because rounding three shares to sum to 100 is a
-- presentation decision, not a stored fact.
create view public.topic_cards
with (security_invoker = on) as
select
  t.id,
  t.slug,
  t.name,
  t.category_id,
  t.place_id,
  pl.path         as place_path,
  t.status,
  t.summary,
  t.tags,
  t.published_at,
  t.updated_at,
  s.positive_count,
  s.neutral_count,
  s.negative_count,
  s.participants,
  s.written_count,
  s.reply_count,
  s.follower_count,
  s.trend_score,
  s.last_activity_at,
  s.change_metric,
  s.change_value,
  s.change_direction
from public.topics t
join public.topic_stats s on s.topic_id = t.id
join public.places pl on pl.id = t.place_id;

create view public.poll_cards
with (security_invoker = on) as
select
  p.id,
  p.slug,
  p.question,
  p.category_id,
  p.place_id,
  pl.path as place_path,
  p.status,
  p.summary,
  p.tags,
  p.closes_at,
  p.published_at,
  p.updated_at,
  s.total_votes,
  s.reason_count,
  s.trend_score,
  s.last_activity_at
from public.polls p
join public.poll_stats s on s.poll_id = p.id
join public.places pl on pl.id = p.place_id;

-- =============================================================================
-- Cross-tabs.
--
-- Group-bys over buckets already stamped onto each vote, so no chart query ever
-- touches `profile_private`. "Prefer not to say" is excluded from the occupation
-- breakdown by the vocabulary's own flag rather than by a string comparison
-- somebody has to remember to write.
-- =============================================================================

create or replace function public.topic_demographics(target uuid)
returns table (
  dimension text,
  label     text,
  responses bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'age', o.age_band::text, count(*)
    from public.opinions o
   where o.topic_id = target and o.age_band is not null
   group by o.age_band
  union all
  select 'occupation', o.occupation, count(*)
    from public.opinions o
    join public.occupations oc on oc.label = o.occupation and oc.counts_in_breakdowns
   where o.topic_id = target
   group by o.occupation
  union all
  select 'place', pl.id, count(*)
    from public.opinions o
    join public.places pl on pl.id = o.place_id
   where o.topic_id = target
   group by pl.id;
$$;

comment on function public.topic_demographics is
  'Cross-tab counts for a topic. Reads only the buckets stamped onto each opinion — a date of birth is never in the query plan.';

create or replace function public.poll_demographics(target uuid)
returns table (
  dimension text,
  label     text,
  option_id uuid,
  responses bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'age', v.age_band::text, v.option_id, count(*)
    from public.poll_votes v
   where v.poll_id = target and v.age_band is not null
   group by v.age_band, v.option_id
  union all
  select 'occupation', v.occupation, v.option_id, count(*)
    from public.poll_votes v
    join public.occupations oc on oc.label = v.occupation and oc.counts_in_breakdowns
   where v.poll_id = target
   group by v.occupation, v.option_id
  union all
  select 'place', pl.id, v.option_id, count(*)
    from public.poll_votes v
    join public.places pl on pl.id = v.place_id
   where v.poll_id = target
   group by pl.id, v.option_id;
$$;

-- Tallies for a topic's aspects. Public, because the whole point of an aspect is
-- that the distribution is the finding; who answered what is not exposed.
create or replace function public.aspect_tallies(target uuid)
returns table (
  aspect_id uuid,
  option_id uuid,
  responses bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.aspect_id, r.option_id, count(*)
    from public.facet_responses r
   where r.topic_id = target
   group by r.aspect_id, r.option_id;
$$;

-- Tallies for one contribution's embedded block.
--
-- SEPARATE FUNCTION, SEPARATE TABLE, AND IT MUST STAY THAT WAY. A block's
-- results belong to the contribution that carries it and to nothing else. If
-- this ever grows a union with `aspect_tallies`, somebody has folded one
-- contributor's private question into the topic's headline number.
create or replace function public.block_tallies(target uuid)
returns table (
  option_id uuid,
  responses bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.option_id, count(*)
    from public.interactive_responses r
   where r.block_id = target
   group by r.option_id;
$$;
