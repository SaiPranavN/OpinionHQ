-- =============================================================================
-- Polls — the second product mode.
--
-- A topic asks "how do you feel about this?" and answers on a sentiment scale.
-- A poll asks "which of these two?" and forces a choice. THE TWO NEVER SHARE AN
-- AGGREGATE: a head-to-head split is not a sentiment distribution, and the
-- separate tables here are what stop one being rendered as the other.
-- =============================================================================

create table public.polls (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  -- The choice itself, phrased as a question.
  question     text not null,
  category_id  text not null references public.categories (id) on update cascade,
  -- Part of the duplicate signature: the same choice put to two different
  -- electorates is two different polls.
  place_id     text not null references public.places (id) on update cascade,
  status       public.artifact_status not null default 'Proposed',
  summary      text not null default '',
  about        text not null default '',
  tags         text[] not null default '{}',
  -- Editor-set close date. Null is open-ended, said plainly rather than by a
  -- date far in the future that nobody remembers to explain.
  closes_at    timestamptz,
  -- How far individual segments swing from the headline split, in percentage
  -- points. Some questions divide the country; others get the same answer from
  -- everyone.
  spread       numeric(5,2),
  created_by   uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint polls_question_present check (length(trim(question)) between 4 and 240),
  constraint polls_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$')
);

create index polls_category_idx on public.polls (category_id) where published_at is not null;
create index polls_place_idx on public.polls (place_id) where published_at is not null;
create index polls_published_idx on public.polls (published_at desc nulls last);
create index polls_tags_idx on public.polls using gin (tags);
create index polls_search_idx on public.polls
  using gin ((question || ' ' || summary) extensions.gin_trgm_ops);

create trigger polls_set_updated_at
before update on public.polls
for each row execute function public.set_updated_at();

-- A poll asks between two and four options — never one, never five.
create table public.poll_options (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  slot       public.option_slot not null,
  name       text not null,
  -- One line on what this option actually is, or the case for it.
  blurb      text not null default '',
  vote_count integer not null default 0 check (vote_count >= 0),
  unique (poll_id, slot)
);

create index poll_options_poll_idx on public.poll_options (poll_id, slot);

-- Table privilege revoked, then the writable columns granted back. A column-only
-- revoke would be a no-op against Supabase's default table-level grant.
revoke insert, update on public.poll_options from authenticated, anon;
grant insert (poll_id, slot, name, blurb) on public.poll_options to authenticated;
grant update (slot, name, blurb) on public.poll_options to authenticated;

-- The upper bound, enforced as rows arrive. The lower bound is checked at
-- publish, because a poll under construction legitimately has one option for as
-- long as it takes to type the second.
create or replace function public.check_poll_option_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.poll_options where poll_id = new.poll_id) > 4 then
    raise exception 'a poll asks between two and four options';
  end if;
  return null;
end;
$$;

create trigger poll_options_bound
after insert on public.poll_options
for each row execute function public.check_poll_option_count();

create or replace function public.publish_poll(target uuid)
returns public.polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.polls;
  options integer;
begin
  if not public.is_editor() then
    raise exception 'only editors publish polls';
  end if;

  select count(*) into options from public.poll_options where poll_id = target;
  if options < 2 then
    raise exception 'a poll needs at least two options before it can be published';
  end if;

  update public.polls set published_at = coalesce(published_at, now())
   where id = target returning * into result;

  return result;
end;
$$;

-- ------------------------------------------------------------------- voting
create table public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  option_id  uuid not null references public.poll_options (id) on delete cascade,
  -- Snapshot, written by trigger. See `stamp_opinion_demographics` for why.
  age_band   public.age_band,
  occupation text references public.occupations (label) on update cascade,
  place_id   text references public.places (id) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index poll_votes_option_idx on public.poll_votes (option_id);

create trigger poll_votes_set_updated_at
before update on public.poll_votes
for each row execute function public.set_updated_at();

revoke insert, update on public.poll_votes from authenticated, anon;
grant insert (poll_id, user_id, option_id) on public.poll_votes to authenticated;
-- Changing your mind means changing the option, and nothing else about the row.
grant update (option_id) on public.poll_votes to authenticated;

create or replace function public.stamp_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  -- The option has to belong to the poll being voted in.
  if not exists (
    select 1 from public.poll_options o
     where o.id = new.option_id and o.poll_id = new.poll_id
  ) then
    raise exception 'option % does not belong to poll %', new.option_id, new.poll_id;
  end if;

  select p.dob, p.occupation, p.place_id into d
    from public.profile_private p where p.user_id = new.user_id;

  new.age_band   := public.age_band(d.dob);
  new.occupation := d.occupation;
  new.place_id   := d.place_id;
  return new;
end;
$$;

create trigger poll_votes_stamp
before insert or update of option_id on public.poll_votes
for each row execute function public.stamp_poll_vote();

-- --------------------------------------------------------------- aggregates
create table public.poll_stats (
  poll_id          uuid primary key references public.polls (id) on delete cascade,
  total_votes      integer not null default 0 check (total_votes >= 0),
  reason_count     integer not null default 0 check (reason_count >= 0),
  trend_score      numeric(5,2) not null default 0,
  last_activity_at timestamptz,
  updated_at       timestamptz not null default now()
);

create index poll_stats_trend_idx on public.poll_stats (trend_score desc);

create or replace function public.ensure_poll_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.poll_stats (poll_id) values (new.id) on conflict (poll_id) do nothing;
  return new;
end;
$$;

create trigger polls_ensure_stats
after insert on public.polls
for each row execute function public.ensure_poll_stats();

create or replace function public.apply_poll_vote_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  step   integer := 0;
begin
  -- `new` is unassigned on DELETE, so it is resolved once, up front. See the
  -- note on `public.apply_opinion_delta`.
  if tg_op = 'DELETE' then
    target := old.poll_id;
    step := -1;
  else
    target := new.poll_id;
    if tg_op = 'INSERT' then step := 1; end if;
  end if;

  if tg_op <> 'INSERT' then
    update public.poll_options set vote_count = greatest(vote_count - 1, 0)
     where id = old.option_id;
  end if;
  if tg_op <> 'DELETE' then
    update public.poll_options set vote_count = vote_count + 1
     where id = new.option_id;
  end if;

  update public.poll_stats set
    total_votes = greatest(total_votes + step, 0),
    last_activity_at = now(),
    updated_at = now()
  where poll_id = target;

  return null;
end;
$$;

create trigger poll_votes_counts
after insert or update of option_id or delete on public.poll_votes
for each row execute function public.apply_poll_vote_delta();

-- --------------------------------------------------------------- the record
--
-- How the split moved over time, oldest first. Written by a scheduled job and
-- deliberately NOT derived. Every other aggregate here can be computed from the
-- current counts; a past reading cannot. Inventing a plausible curve from
-- today's numbers would put a chart of measurements on screen where no
-- measurement was ever taken — a poll with no recorded history says so and
-- draws nothing.
create table public.poll_history (
  poll_id     uuid not null references public.polls (id) on delete cascade,
  recorded_on date not null,
  -- Aligned with the options by slot, and summing to 100.
  pcts        numeric(5,2)[] not null,
  total_votes integer not null default 0,
  -- What happened around this reading, when something did.
  event       text,
  primary key (poll_id, recorded_on)
);

-- Pins a named region's split where the geography is common knowledge. Derived
-- swings are fine when nobody knows the real pattern, but a South Indian reader
-- seeing an invented "Tamil Nadu: 94% chai" would rightly stop trusting every
-- other number on the page.
create table public.poll_region_overrides (
  poll_id   uuid not null references public.polls (id) on delete cascade,
  place_id  text not null references public.places (id) on update cascade,
  pcts      numeric(5,2)[] not null,
  note      text,
  primary key (poll_id, place_id)
);

-- ------------------------------------------------------------------ reasons
--
-- A participant's written reason for their pick. Polls have no threads: the
-- question is a choice, and a choice does not need a comment section to be
-- answered.
create table public.poll_reasons (
  id            uuid primary key default gen_random_uuid(),
  poll_id       uuid not null references public.polls (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  option_id     uuid not null references public.poll_options (id) on delete cascade,
  body          text not null,
  helpful_count integer not null default 0 check (helpful_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  hidden_at     timestamptz,
  hidden_reason text,
  unique (poll_id, user_id),
  constraint poll_reasons_body check (length(trim(body)) between 1 and 2000)
);

create index poll_reasons_poll_idx on public.poll_reasons (poll_id, helpful_count desc);

create trigger poll_reasons_set_updated_at
before update on public.poll_reasons
for each row execute function public.set_updated_at();

revoke insert, update on public.poll_reasons from authenticated, anon;
grant insert (poll_id, user_id, option_id, body) on public.poll_reasons to authenticated;
grant update (body, hidden_at, hidden_reason) on public.poll_reasons to authenticated;

create table public.poll_reason_helpful (
  reason_id  uuid not null references public.poll_reasons (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reason_id, user_id)
);

create or replace function public.apply_poll_reason_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  step   integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid;
begin
  -- The branch has to be a PL/pgSQL `if`, not a SQL `case`. A `case` inside the
  -- statement still *mentions* `new.…`, and PL/pgSQL resolves every record
  -- reference when it builds the statement's parameters — so a DELETE would
  -- raise before the branch it never takes could protect it.
  if tg_table_name = 'poll_reasons' then
    if tg_op = 'DELETE' then target := old.poll_id; else target := new.poll_id; end if;
    update public.poll_stats set reason_count = greatest(reason_count + step, 0),
           last_activity_at = now(), updated_at = now()
     where poll_id = target;
  else
    if tg_op = 'DELETE' then target := old.reason_id; else target := new.reason_id; end if;
    update public.poll_reasons set helpful_count = greatest(helpful_count + step, 0)
     where id = target;
  end if;
  return null;
end;
$$;

create trigger poll_reasons_count after insert or delete on public.poll_reasons
for each row execute function public.apply_poll_reason_counter();

create trigger poll_reason_helpful_count after insert or delete on public.poll_reason_helpful
for each row execute function public.apply_poll_reason_counter();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.polls                 enable row level security;
alter table public.poll_options          enable row level security;
alter table public.poll_votes            enable row level security;
alter table public.poll_stats            enable row level security;
alter table public.poll_history          enable row level security;
alter table public.poll_region_overrides enable row level security;
alter table public.poll_reasons          enable row level security;
alter table public.poll_reason_helpful   enable row level security;

create policy "published polls are world readable" on public.polls for select
  using (published_at is not null and archived_at is null or public.is_editor());
create policy "editors write polls" on public.polls for all
  using (public.is_editor()) with check (public.is_editor());

create policy "options follow the poll" on public.poll_options for select
  using (exists (
    select 1 from public.polls p
    where p.id = poll_id and (p.published_at is not null and p.archived_at is null or public.is_editor())
  ));
create policy "editors write options" on public.poll_options for all
  using (public.is_editor()) with check (public.is_editor());

create policy "own poll vote" on public.poll_votes for select
  using (user_id = (select auth.uid()));
create policy "vote in an open poll" on public.poll_votes for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls p
      where p.id = poll_id
        and p.published_at is not null
        and p.archived_at is null
        and (p.closes_at is null or p.closes_at > now())
    )
  );
create policy "change your poll vote" on public.poll_votes for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw your poll vote" on public.poll_votes for delete
  using (user_id = (select auth.uid()));

create policy "poll stats are world readable" on public.poll_stats for select using (true);
create policy "poll history is world readable" on public.poll_history for select using (true);
create policy "region overrides are world readable" on public.poll_region_overrides for select using (true);
revoke insert, update, delete on public.poll_stats from authenticated, anon;
revoke insert, update, delete on public.poll_history from authenticated, anon;
create policy "editors write region overrides" on public.poll_region_overrides for all
  using (public.is_editor()) with check (public.is_editor());

create policy "reasons are world readable" on public.poll_reasons for select
  using (hidden_at is null or user_id = (select auth.uid()) or public.is_editor());
-- You may only explain a pick you actually made.
create policy "explain your own pick" on public.poll_reasons for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.poll_votes v
      where v.poll_id = poll_reasons.poll_id
        and v.user_id = (select auth.uid())
        and v.option_id = poll_reasons.option_id
    )
  );
create policy "edit your own reason" on public.poll_reasons for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete your own reason" on public.poll_reasons for delete
  using (user_id = (select auth.uid()));
create policy "editors moderate reasons" on public.poll_reasons for update
  using (public.is_editor()) with check (public.is_editor());

create policy "own reason marks" on public.poll_reason_helpful for select
  using (user_id = (select auth.uid()));
create policy "mark a reason helpful" on public.poll_reason_helpful for insert
  with check (user_id = (select auth.uid()));
create policy "unmark a reason" on public.poll_reason_helpful for delete
  using (user_id = (select auth.uid()));
