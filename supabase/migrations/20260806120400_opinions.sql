-- =============================================================================
-- Opinions — the one shared model.
--
-- ONE TABLE, ON PURPOSE. A bare vote, a written opinion and a Pro contribution
-- are the same row with more of it filled in. `format` is the only thing that
-- distinguishes a Pro contribution from a standard one. There is no second
-- table, no second feed and no second reply system: Opinions and Discussion are
-- two views over this table, and a Pro post is a row in it.
--
-- ONE ACCOUNT, ONE VOTE. The unique constraint on (topic_id, author_id) is that
-- claim, enforced by the database rather than by whichever handler happened to
-- run. Clearing your text does not clear your vote; deleting the row does.
-- =============================================================================

create table public.opinions (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid not null references public.topics (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  vote          public.sentiment not null,
  -- The standard body. Empty on a bare vote; on a Pro contribution this is the
  -- summary line that sits under the headline.
  body          text not null default '',
  format        public.contribution_format not null default 'standard',
  -- Author's role line, snapshotted at publish. Their headline can change; what
  -- they claimed when they wrote this should not.
  author_line   text,
  -- Independently verified expertise, shown *separately* from the Pro label.
  -- Paying for better tools is not evidence of knowing anything, so the two
  -- claims are never merged into one badge (brief §14).
  verified_label text,

  -- Demographic snapshot, written by trigger from the author's private details
  -- and never by the client. Snapshotted rather than joined because a vote's
  -- age band should not silently move when its author has a birthday.
  age_band      public.age_band,
  occupation    text references public.occupations (label) on update cascade,
  place_id      text references public.places (id) on update cascade,

  helpful_count integer not null default 0 check (helpful_count >= 0),
  reply_count   integer not null default 0 check (reply_count >= 0),
  save_count    integer not null default 0 check (save_count >= 0),
  insightful_count     integer not null default 0 check (insightful_count >= 0),
  useful_count         integer not null default 0 check (useful_count >= 0),
  well_explained_count integer not null default 0 check (well_explained_count >= 0),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  edited_at     timestamptz,
  -- Moderation. Hidden content stays readable to its author and to editors, so
  -- somebody can see what was taken down and why.
  hidden_at     timestamptz,
  hidden_reason text,

  unique (topic_id, author_id),
  constraint opinions_body_length check (length(body) <= 4000)
);

create index opinions_topic_idx on public.opinions (topic_id, created_at desc);
create index opinions_author_idx on public.opinions (author_id, created_at desc);
create index opinions_written_idx on public.opinions (topic_id, helpful_count desc)
  where body <> '';
create index opinions_pro_idx on public.opinions (topic_id, created_at desc)
  where format = 'pro';

create trigger opinions_set_updated_at
before update on public.opinions
for each row execute function public.set_updated_at();

-- Stamps the author's demographics onto the row.
--
-- SECURITY DEFINER because it reads `profile_private`, which the author's own
-- session can read but no aggregate query ever should. This is the only place
-- those columns are consulted: after this trigger, every cross-tab in the
-- product is a group-by over buckets that are already on the vote.
create or replace function public.stamp_opinion_demographics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  select p.dob, p.occupation, p.place_id into d
    from public.profile_private p
   where p.user_id = new.author_id;

  new.age_band   := public.age_band(d.dob);
  new.occupation := d.occupation;
  new.place_id   := d.place_id;
  return new;
end;
$$;

create trigger opinions_stamp_demographics
before insert on public.opinions
for each row execute function public.stamp_opinion_demographics();

-- Belt as well as braces: the trigger overwrites what arrives, and the privilege
-- makes an attempt to set these an error rather than a silent no-op.
--
-- Table privilege revoked first, columns granted back. `revoke insert (col)`
-- against a role that holds table-level INSERT revokes nothing — see the note in
-- the identity migration. The counter triggers are SECURITY DEFINER and run as
-- the owner, so they are unaffected by any of this.
--
-- `hidden_at` is grantable to everyone because the policies decide *which rows*:
-- an author can hide their own, which they could already achieve by deleting it,
-- and only an editor passes the policy for anybody else's.
revoke insert, update on public.opinions from authenticated, anon;
grant insert (topic_id, author_id, vote, body, format, author_line)
  on public.opinions to authenticated;
grant update (vote, body, format, author_line, edited_at, hidden_at, hidden_reason)
  on public.opinions to authenticated;

-- --------------------------------------------------------- topic aggregates
--
-- Incremental. Recomputing a topic's distribution on every vote would make the
-- thousandth vote a thousand times more expensive than the first.
--
-- OLD AND NEW ARE READ INTO LOCALS FIRST, and that is not tidiness. PL/pgSQL
-- raises "record new is not assigned yet" the moment a DELETE trigger so much
-- as mentions `new.anything` — a `case` guard does not help, because the
-- reference is resolved when the statement's parameters are built, not when the
-- branch is taken. Every counter trigger in this schema is written this way.
create or replace function public.apply_opinion_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target    uuid;
  old_vote  public.sentiment;
  new_vote  public.sentiment;
  old_written boolean := false;
  new_written boolean := false;
  head_delta  integer := 0;
begin
  if tg_op <> 'INSERT' then
    old_vote := old.vote;
    old_written := old.body <> '';
  end if;

  if tg_op = 'DELETE' then
    target := old.topic_id;
    head_delta := -1;
  else
    target := new.topic_id;
    new_vote := new.vote;
    new_written := new.body <> '';
    if tg_op = 'INSERT' then head_delta := 1; end if;
  end if;

  update public.topic_stats s set
    positive_count = s.positive_count
      + (new_vote is not distinct from 'Positive')::int
      - (old_vote is not distinct from 'Positive')::int,
    neutral_count = s.neutral_count
      + (new_vote is not distinct from 'Neutral')::int
      - (old_vote is not distinct from 'Neutral')::int,
    negative_count = s.negative_count
      + (new_vote is not distinct from 'Negative')::int
      - (old_vote is not distinct from 'Negative')::int,
    participants = greatest(s.participants + head_delta, 0),
    written_count = greatest(
      s.written_count + new_written::int - old_written::int, 0),
    last_activity_at = now(),
    updated_at = now()
  where s.topic_id = target;

  return null;
end;
$$;

create trigger opinions_topic_stats
after insert or update of vote, body or delete on public.opinions
for each row execute function public.apply_opinion_delta();

-- =============================================================================
-- Pro contributions — the structured format.
-- =============================================================================

create table public.opinion_sections (
  id            uuid primary key default gen_random_uuid(),
  opinion_id    uuid not null references public.opinions (id) on delete cascade,
  type          public.pro_section_type not null,
  position      integer not null default 0,
  -- headline | quick_take | breakdown | final_verdict.
  --
  -- Named `body` rather than `text` on purpose: a column called `text` inside a
  -- check constraint reads as the type of the same name, and while Postgres
  -- resolves it to the column here, it is not a thing to leave for somebody to
  -- discover during an outage.
  body          text,
  -- key_points
  points        text[],
  created_at    timestamptz not null default now(),

  -- A union in the type system has to be a check constraint here, or a renderer
  -- that forgets a kind gets an empty box instead of a compile error.
  constraint opinion_sections_shape check (
    case type
      when 'key_points'  then points is not null and body is null
      when 'interactive' then points is null and body is null
      else body is not null and points is null
    end
  )
);

create index opinion_sections_opinion_idx on public.opinion_sections (opinion_id, position);

-- Only a headline is required to publish, and there is exactly one of it.
create unique index opinion_sections_one_headline
  on public.opinion_sections (opinion_id) where type = 'headline';

-- ------------------------------------------------------- interactive blocks
--
-- ITS RESULTS ARE NOT THE TOPIC'S RESULTS.
--
-- A block belongs to the contribution that carries it and to nothing else. It
-- never touches the topic's sentiment split, its participation count, or any
-- poll in the Polls section. One contributor's embedded question is that
-- contributor's question; folding it into the topic aggregate would let anybody
-- move the headline number by wording a block to get the answer they wanted.
--
-- The enforcement is structural: `interactive_responses` below is the only table
-- that records these, and no trigger on it writes to `topic_stats`. Search this
-- file for `topic_stats` — there is one trigger, and it is on `opinions`.
create table public.interactive_blocks (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null unique references public.opinion_sections (id) on delete cascade,
  kind       public.interactive_kind not null,
  prompt     text not null,
  created_at timestamptz not null default now()
);

create table public.interactive_options (
  id       uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.interactive_blocks (id) on delete cascade,
  label    text not null,
  position integer not null default 0
);

create index interactive_options_block_idx on public.interactive_options (block_id, position);

create table public.interactive_responses (
  block_id   uuid not null references public.interactive_blocks (id) on delete cascade,
  option_id  uuid not null references public.interactive_options (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One response per person per block, so changing your mind replaces rather
  -- than adds.
  primary key (block_id, user_id)
);

create index interactive_responses_option_idx on public.interactive_responses (option_id);

-- =============================================================================
-- Aspects — the sub-opinions under the headline vote.
-- =============================================================================

create table public.facet_responses (
  aspect_id  uuid not null references public.topic_aspects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  option_id  uuid not null references public.topic_aspect_options (id) on delete cascade,
  -- Denormalised so a tally does not have to walk back up to the topic.
  topic_id   uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (aspect_id, user_id)
);

create index facet_responses_option_idx on public.facet_responses (option_id);
create index facet_responses_topic_idx on public.facet_responses (topic_id);

create trigger facet_responses_set_updated_at
before update on public.facet_responses
for each row execute function public.set_updated_at();

-- The chosen option must belong to the aspect being answered. Without this a
-- client could answer "Story & screenplay" with an option from "Music".
create or replace function public.check_facet_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.topic_aspect_options o
     where o.id = new.option_id and o.aspect_id = new.aspect_id
  ) then
    raise exception 'option % does not belong to aspect %', new.option_id, new.aspect_id;
  end if;

  select a.topic_id into new.topic_id
    from public.topic_aspects a where a.id = new.aspect_id;

  return new;
end;
$$;

create trigger facet_responses_check_option
before insert or update on public.facet_responses
for each row execute function public.check_facet_option();

-- =============================================================================
-- Discussion, marks and saves
-- =============================================================================

-- A single-level reply under a written opinion (brief §9).
create table public.opinion_replies (
  id            uuid primary key default gen_random_uuid(),
  opinion_id    uuid not null references public.opinions (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  hidden_at     timestamptz,
  hidden_reason text,
  constraint opinion_replies_body check (length(trim(body)) between 1 and 2000)
);

create index opinion_replies_opinion_idx on public.opinion_replies (opinion_id, created_at);

create trigger opinion_replies_set_updated_at
before update on public.opinion_replies
for each row execute function public.set_updated_at();

create table public.opinion_helpful (
  opinion_id uuid not null references public.opinions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opinion_id, user_id)
);

create table public.opinion_saves (
  opinion_id uuid not null references public.opinions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opinion_id, user_id)
);

-- One reaction per contribution per person, by the shape of the key rather than
-- by a rule somebody has to remember.
create table public.opinion_reactions (
  opinion_id uuid not null references public.opinions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  reaction   public.pro_reaction not null,
  created_at timestamptz not null default now(),
  primary key (opinion_id, user_id)
);

create index opinion_saves_user_idx on public.opinion_saves (user_id, created_at desc);

-- ------------------------------------------------------------ counter upkeep
create or replace function public.apply_opinion_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  step   integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  -- Same rule as `apply_opinion_delta`: resolve the record before touching it.
  -- All four tables this trigger serves key on `opinion_id`.
  if tg_op = 'DELETE' then target := old.opinion_id; else target := new.opinion_id; end if;

  if tg_table_name = 'opinion_replies' then
    update public.opinions set reply_count = greatest(reply_count + step, 0) where id = target;
    update public.topic_stats s set reply_count = greatest(s.reply_count + step, 0),
           last_activity_at = now(), updated_at = now()
      from public.opinions o where o.id = target and s.topic_id = o.topic_id;

  elsif tg_table_name = 'opinion_helpful' then
    update public.opinions set helpful_count = greatest(helpful_count + step, 0) where id = target;

  elsif tg_table_name = 'opinion_saves' then
    update public.opinions set save_count = greatest(save_count + step, 0) where id = target;

  elsif tg_table_name = 'opinion_reactions' then
    -- An update swaps one reaction for another, so both sides move.
    if tg_op <> 'INSERT' then
      update public.opinions set
        insightful_count     = greatest(insightful_count     - (old.reaction = 'insightful')::int, 0),
        useful_count         = greatest(useful_count         - (old.reaction = 'useful')::int, 0),
        well_explained_count = greatest(well_explained_count - (old.reaction = 'well_explained')::int, 0)
      where id = old.opinion_id;
    end if;
    if tg_op <> 'DELETE' then
      update public.opinions set
        insightful_count     = insightful_count     + (new.reaction = 'insightful')::int,
        useful_count         = useful_count         + (new.reaction = 'useful')::int,
        well_explained_count = well_explained_count + (new.reaction = 'well_explained')::int
      where id = new.opinion_id;
    end if;
  end if;

  return null;
end;
$$;

create trigger opinion_replies_count after insert or delete on public.opinion_replies
for each row execute function public.apply_opinion_counter();

create trigger opinion_helpful_count after insert or delete on public.opinion_helpful
for each row execute function public.apply_opinion_counter();

create trigger opinion_saves_count after insert or delete on public.opinion_saves
for each row execute function public.apply_opinion_counter();

create trigger opinion_reactions_count after insert or update or delete on public.opinion_reactions
for each row execute function public.apply_opinion_counter();

-- =============================================================================
-- RLS
--
-- Reading is never gated, and neither is supplying. What costs money is asking
-- past a point and publishing in the richer format — see `entitlements.ts`. The
-- Pro gate below is the second of those, and it is the only paywall in this file.
-- =============================================================================

alter table public.opinions              enable row level security;
alter table public.opinion_sections      enable row level security;
alter table public.interactive_blocks    enable row level security;
alter table public.interactive_options   enable row level security;
alter table public.interactive_responses enable row level security;
alter table public.facet_responses       enable row level security;
alter table public.opinion_replies       enable row level security;
alter table public.opinion_helpful       enable row level security;
alter table public.opinion_saves         enable row level security;
alter table public.opinion_reactions     enable row level security;

create policy "opinions are world readable"
  on public.opinions for select
  using (hidden_at is null or author_id = (select auth.uid()) or public.is_editor());

-- Writing an opinion requires an account and nothing else. The Pro check gates
-- the *format*, not the act of contributing: gating the supply side would
-- starve the section it was meant to fund.
create policy "write your own opinion"
  on public.opinions for insert
  with check (
    author_id = (select auth.uid())
    and (format = 'standard' or public.is_pro())
    and exists (
      select 1 from public.topics t
      where t.id = topic_id and t.published_at is not null and t.archived_at is null
    )
  );

create policy "edit your own opinion"
  on public.opinions for update
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and (format = 'standard' or public.is_pro()));

create policy "delete your own opinion"
  on public.opinions for delete
  using (author_id = (select auth.uid()));

create policy "editors moderate opinions"
  on public.opinions for update
  using (public.is_editor()) with check (public.is_editor());

-- Sections and blocks follow their opinion.
create policy "sections follow the opinion"
  on public.opinion_sections for select
  using (exists (
    select 1 from public.opinions o
    where o.id = opinion_id and (o.hidden_at is null or o.author_id = (select auth.uid()) or public.is_editor())
  ));

create policy "author writes sections"
  on public.opinion_sections for all
  using (exists (select 1 from public.opinions o where o.id = opinion_id and o.author_id = (select auth.uid())))
  with check (
    public.is_pro()
    and exists (select 1 from public.opinions o where o.id = opinion_id and o.author_id = (select auth.uid()))
  );

create policy "blocks follow the section"
  on public.interactive_blocks for select using (true);
create policy "author writes blocks"
  on public.interactive_blocks for all
  using (exists (
    select 1 from public.opinion_sections s
    join public.opinions o on o.id = s.opinion_id
    where s.id = section_id and o.author_id = (select auth.uid())
  ))
  with check (
    public.is_pro() and exists (
      select 1 from public.opinion_sections s
      join public.opinions o on o.id = s.opinion_id
      where s.id = section_id and o.author_id = (select auth.uid())
    )
  );

create policy "block options are world readable"
  on public.interactive_options for select using (true);
create policy "author writes block options"
  on public.interactive_options for all
  using (exists (
    select 1 from public.interactive_blocks b
    join public.opinion_sections s on s.id = b.section_id
    join public.opinions o on o.id = s.opinion_id
    where b.id = block_id and o.author_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.interactive_blocks b
    join public.opinion_sections s on s.id = b.section_id
    join public.opinions o on o.id = s.opinion_id
    where b.id = block_id and o.author_id = (select auth.uid())
  ));

-- Responses are readable in aggregate by everyone; who answered what is not
-- exposed beyond the person who answered.
create policy "own block response" on public.interactive_responses for select
  using (user_id = (select auth.uid()));
create policy "respond to a block" on public.interactive_responses for insert
  with check (user_id = (select auth.uid()));
create policy "change your block response" on public.interactive_responses for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw your block response" on public.interactive_responses for delete
  using (user_id = (select auth.uid()));

create policy "own facet responses" on public.facet_responses for select
  using (user_id = (select auth.uid()));
create policy "answer an aspect" on public.facet_responses for insert
  with check (user_id = (select auth.uid()));
create policy "change your aspect answer" on public.facet_responses for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw your aspect answer" on public.facet_responses for delete
  using (user_id = (select auth.uid()));

create policy "replies are world readable" on public.opinion_replies for select
  using (hidden_at is null or author_id = (select auth.uid()) or public.is_editor());
create policy "write your own reply" on public.opinion_replies for insert
  with check (author_id = (select auth.uid()));
create policy "edit your own reply" on public.opinion_replies for update
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "delete your own reply" on public.opinion_replies for delete
  using (author_id = (select auth.uid()));
create policy "editors moderate replies" on public.opinion_replies for update
  using (public.is_editor()) with check (public.is_editor());

create policy "own helpful marks" on public.opinion_helpful for select
  using (user_id = (select auth.uid()));
create policy "mark helpful" on public.opinion_helpful for insert
  with check (user_id = (select auth.uid()));
create policy "unmark helpful" on public.opinion_helpful for delete
  using (user_id = (select auth.uid()));

create policy "own saves" on public.opinion_saves for select
  using (user_id = (select auth.uid()));
create policy "save a contribution" on public.opinion_saves for insert
  with check (user_id = (select auth.uid()));
create policy "unsave a contribution" on public.opinion_saves for delete
  using (user_id = (select auth.uid()));

create policy "own reactions" on public.opinion_reactions for select
  using (user_id = (select auth.uid()));
create policy "react" on public.opinion_reactions for insert
  with check (user_id = (select auth.uid()));
create policy "change your reaction" on public.opinion_reactions for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw your reaction" on public.opinion_reactions for delete
  using (user_id = (select auth.uid()));
