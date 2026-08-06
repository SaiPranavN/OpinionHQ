-- =============================================================================
-- Topics — the verified, editor-maintained record of a subject under discussion.
--
-- Never mixes with participant-generated content (AGENTS.md §6, brief §5.4).
-- What an editor writes lives here; what a participant writes lives in
-- `opinions` and points at this. The separation is a table boundary rather than
-- a column flag so that "show me the verified facts" is a query against one
-- table and cannot accidentally sweep in somebody's comment.
--
-- ONLY EDITORS PUBLISH. In production, topics are created by OpinionHQ staff.
-- Participants propose through `topic_requests`, which an editor turns into a
-- topic or declines. The prototype's open composer was a prototype affordance:
-- a platform where anyone can mint the subject cannot claim its topics are
-- verified.
-- =============================================================================

create table public.topics (
  id            uuid primary key default gen_random_uuid(),
  -- The routable identifier: /topics/[slug]. Stable across renames, which is why
  -- it is not derived from `name` on every write.
  slug          citext unique not null,
  name          text not null,
  category_id   text not null references public.categories (id) on update cascade,
  -- Required, and `worldwide` is how you say "nowhere in particular".
  place_id      text not null references public.places (id) on update cascade,
  status        public.artifact_status not null default 'Proposed',
  -- One or two lines for the card: what it is and why people are talking.
  summary       text not null default '',
  -- Longer editor-written context shown under the name on the dashboard.
  about         text not null default '',
  tags          text[] not null default '{}',
  -- Which library question set this topic's aspects were seeded from, when they
  -- were. Provenance only — the aspects themselves live in `topic_aspects`.
  facet_set_id  text references public.facet_sets (id) on update cascade,
  created_by    uuid references public.profiles (id) on delete set null,
  -- Null until an editor publishes. An unpublished topic is invisible to
  -- everyone but its editors, which is what makes drafting safe.
  published_at  timestamptz,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint topics_name_present check (length(trim(name)) between 2 and 160),
  constraint topics_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$')
);

create index topics_category_idx on public.topics (category_id) where published_at is not null;
create index topics_place_idx on public.topics (place_id) where published_at is not null;
create index topics_published_idx on public.topics (published_at desc nulls last);
create index topics_tags_idx on public.topics using gin (tags);
create index topics_search_idx on public.topics
  using gin ((name || ' ' || summary) extensions.gin_trgm_ops);

create trigger topics_set_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ aspects
--
-- The sub-opinions under the headline vote. A plain up/neutral/down says very
-- little about a film or an exam, so every topic carries a handful of one-click
-- questions of its own.
--
-- Copied onto the topic even when they came from a library set, so that editing
-- the library later does not silently rewrite the question a thousand people
-- already answered.
create table public.topic_aspects (
  id        uuid primary key default gen_random_uuid(),
  topic_id  uuid not null references public.topics (id) on delete cascade,
  key       text not null,
  label     text not null,
  prompt    text not null,
  position  integer not null default 0,
  unique (topic_id, key)
);

create table public.topic_aspect_options (
  id         uuid primary key default gen_random_uuid(),
  aspect_id  uuid not null references public.topic_aspects (id) on delete cascade,
  key        text not null,
  label      text not null,
  tone       public.sentiment not null,
  position   integer not null default 0,
  unique (aspect_id, key)
);

create index topic_aspects_topic_idx on public.topic_aspects (topic_id, position);
create index topic_aspect_options_aspect_idx on public.topic_aspect_options (aspect_id, position);

-- Seeds a topic's aspects from a library set. Idempotent: re-running adds
-- nothing, so an editor cannot double a question by clicking twice.
create or replace function public.apply_facet_set(target_topic uuid, set_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  created integer := 0;
begin
  if not public.is_editor() then
    raise exception 'only editors may apply a facet set';
  end if;

  with inserted_aspects as (
    insert into public.topic_aspects (topic_id, key, label, prompt, position)
    select target_topic, f.key, f.label, f.prompt, f.position
      from public.facet_set_facets f
     where f.set_id = apply_facet_set.set_id
    on conflict (topic_id, key) do nothing
    returning id, key
  )
  insert into public.topic_aspect_options (aspect_id, key, label, tone, position)
  select ia.id, o.key, o.label, o.tone, o.position
    from inserted_aspects ia
    join public.facet_set_facets f
      on f.set_id = apply_facet_set.set_id and f.key = ia.key
    join public.facet_set_options o on o.facet_id = f.id
  on conflict (aspect_id, key) do nothing;

  get diagnostics created = row_count;

  update public.topics set facet_set_id = apply_facet_set.set_id
   where id = target_topic and facet_set_id is null;

  return created;
end;
$$;

-- ------------------------------------------------------------------- status
--
-- Editor-written context shown beside the status badge, and the annotations
-- placed onto the sentiment trend. A movement with a reason attached is worth
-- something; a wiggle with no explanation is noise dressed as a finding.
create table public.topic_context (
  topic_id     uuid primary key references public.topics (id) on delete cascade,
  explain      text not null default '',
  updated_note text not null default '',
  updated_at   timestamptz not null default now()
);

create trigger topic_context_set_updated_at
before update on public.topic_context
for each row execute function public.set_updated_at();

create table public.topic_trend_markers (
  id        uuid primary key default gen_random_uuid(),
  topic_id  uuid not null references public.topics (id) on delete cascade,
  label     text not null,
  -- Where on the 30-day axis it sits, 0–1. The renderer assigns the vertical
  -- row so markers never collide.
  offset_ratio numeric(4,3) not null check (offset_ratio between 0 and 1)
);

create index topic_trend_markers_topic_idx on public.topic_trend_markers (topic_id);

-- An editor-published, sourced development (brief §11).
create table public.timeline_events (
  id           uuid primary key default gen_random_uuid(),
  topic_id     uuid not null references public.topics (id) on delete cascade,
  occurred_on  date not null,
  title        text not null,
  description  text not null default '',
  -- Human-readable publisher name, plus the link it came from. A "sourced"
  -- development with no source is an assertion.
  source_name  text not null,
  source_url   text,
  status       public.artifact_status not null,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index timeline_events_topic_idx on public.timeline_events (topic_id, occurred_on desc);

-- --------------------------------------------------------------- aggregates
--
-- Server-computed, and the client cannot write a single column of it (brief
-- §30–31). Maintained incrementally by triggers on the tables it summarises, so
-- a topic with a million opinions costs the same per vote as one with ten.
create table public.topic_stats (
  topic_id          uuid primary key references public.topics (id) on delete cascade,
  positive_count    integer not null default 0 check (positive_count >= 0),
  neutral_count     integer not null default 0 check (neutral_count >= 0),
  negative_count    integer not null default 0 check (negative_count >= 0),
  -- Everyone who cast a vote, written or not.
  participants      integer not null default 0 check (participants >= 0),
  -- Of those, how many wrote something.
  written_count     integer not null default 0 check (written_count >= 0),
  reply_count       integer not null default 0 check (reply_count >= 0),
  follower_count    integer not null default 0 check (follower_count >= 0),
  -- 0–100, recomputed on a schedule with the weighting in brief §31. Not
  -- derivable from the counts alone, which is why it is stored.
  trend_score       numeric(5,2) not null default 0,
  last_activity_at  timestamptz,
  -- The 7-day change, and what it measures. Never a bare arrow.
  change_metric     public.change_metric,
  change_value      numeric(6,2),
  change_direction  public.change_direction,
  updated_at        timestamptz not null default now()
);

create index topic_stats_trend_idx on public.topic_stats (trend_score desc);
create index topic_stats_activity_idx on public.topic_stats (last_activity_at desc nulls last);

-- Every topic has exactly one stats row, from the moment it exists. A missing
-- row would make "no votes yet" and "no such topic" the same empty result.
create or replace function public.ensure_topic_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.topic_stats (topic_id) values (new.id)
  on conflict (topic_id) do nothing;
  return new;
end;
$$;

create trigger topics_ensure_stats
after insert on public.topics
for each row execute function public.ensure_topic_stats();

-- ------------------------------------------------------- daily measurements
--
-- The sentiment trend, one reading per topic per day, written by a scheduled
-- job. Deliberately NOT derived: a past reading cannot be reconstructed from
-- today's counts, and inventing a plausible curve would put a chart of
-- measurements on screen where no measurement was ever taken.
create table public.topic_daily_stats (
  topic_id        uuid not null references public.topics (id) on delete cascade,
  measured_on     date not null,
  positive_count  integer not null default 0,
  neutral_count   integer not null default 0,
  negative_count  integer not null default 0,
  participants    integer not null default 0,
  primary key (topic_id, measured_on)
);

-- ------------------------------------------------------------------ follows
create table public.topic_follows (
  topic_id   uuid not null references public.topics (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

create index topic_follows_user_idx on public.topic_follows (user_id);

create or replace function public.apply_follow_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.topic_stats set follower_count = follower_count + 1, updated_at = now()
     where topic_id = new.topic_id;
  else
    update public.topic_stats set follower_count = greatest(follower_count - 1, 0), updated_at = now()
     where topic_id = old.topic_id;
  end if;
  return null;
end;
$$;

create trigger topic_follows_count
after insert or delete on public.topic_follows
for each row execute function public.apply_follow_delta();

-- ------------------------------------------------------------ topic requests
--
-- The sanctioned way a participant asks for a subject that is not yet covered.
-- An editor turns it into a topic or declines it with a reason; either way the
-- request is a record, so "we asked and nothing happened" is answerable.
create table public.topic_requests (
  id            uuid primary key default gen_random_uuid(),
  requested_by  uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  category_id   text references public.categories (id) on update cascade,
  place_id      text references public.places (id) on update cascade,
  rationale     text not null default '',
  -- Set when an editor accepts and the topic exists.
  topic_id      uuid references public.topics (id) on delete set null,
  declined_at   timestamptz,
  decline_note  text,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index topic_requests_open_idx on public.topic_requests (created_at desc)
  where topic_id is null and declined_at is null;

create trigger topic_requests_set_updated_at
before update on public.topic_requests
for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.topics               enable row level security;
alter table public.topic_aspects        enable row level security;
alter table public.topic_aspect_options enable row level security;
alter table public.topic_context        enable row level security;
alter table public.topic_trend_markers  enable row level security;
alter table public.timeline_events      enable row level security;
alter table public.topic_stats          enable row level security;
alter table public.topic_daily_stats    enable row level security;
alter table public.topic_follows        enable row level security;
alter table public.topic_requests       enable row level security;

-- Reading is never gated. Not by an account, not by a plan.
create policy "published topics are world readable"
  on public.topics for select
  using (published_at is not null and archived_at is null or public.is_editor());

create policy "editors write topics"
  on public.topics for all
  using (public.is_editor())
  with check (public.is_editor());

-- The satellites follow the topic: readable when their topic is.
create policy "aspects follow the topic"
  on public.topic_aspects for select
  using (exists (
    select 1 from public.topics t
    where t.id = topic_id and (t.published_at is not null and t.archived_at is null or public.is_editor())
  ));

create policy "editors write aspects"
  on public.topic_aspects for all
  using (public.is_editor()) with check (public.is_editor());

create policy "aspect options follow the aspect"
  on public.topic_aspect_options for select
  using (exists (
    select 1 from public.topic_aspects a
    join public.topics t on t.id = a.topic_id
    where a.id = aspect_id and (t.published_at is not null and t.archived_at is null or public.is_editor())
  ));

create policy "editors write aspect options"
  on public.topic_aspect_options for all
  using (public.is_editor()) with check (public.is_editor());

create policy "context is world readable" on public.topic_context for select using (true);
create policy "editors write context" on public.topic_context for all
  using (public.is_editor()) with check (public.is_editor());

create policy "markers are world readable" on public.topic_trend_markers for select using (true);
create policy "editors write markers" on public.topic_trend_markers for all
  using (public.is_editor()) with check (public.is_editor());

create policy "timeline is world readable" on public.timeline_events for select using (true);
create policy "editors write timeline" on public.timeline_events for all
  using (public.is_editor()) with check (public.is_editor());

-- Stats are readable by everyone and writable by no one. Triggers run as the
-- definer; the revoke is what stops a client posting its own participant count.
create policy "stats are world readable" on public.topic_stats for select using (true);
create policy "daily stats are world readable" on public.topic_daily_stats for select using (true);
revoke insert, update, delete on public.topic_stats from authenticated, anon;
revoke insert, update, delete on public.topic_daily_stats from authenticated, anon;

-- Who follows what is nobody else's business; the count is public, the list is
-- not.
create policy "own follows" on public.topic_follows for select
  using ((select auth.uid()) = user_id);
create policy "follow for yourself" on public.topic_follows for insert
  with check ((select auth.uid()) = user_id);
create policy "unfollow for yourself" on public.topic_follows for delete
  using ((select auth.uid()) = user_id);

create policy "own requests" on public.topic_requests for select
  using ((select auth.uid()) = requested_by or public.is_editor());
create policy "request a topic" on public.topic_requests for insert
  with check ((select auth.uid()) = requested_by);
create policy "editors review requests" on public.topic_requests for update
  using (public.is_editor()) with check (public.is_editor());
