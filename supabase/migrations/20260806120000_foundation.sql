-- =============================================================================
-- Foundation: extensions, the closed vocabularies, and the helpers RLS leans on.
--
-- WHAT IS AN ENUM HERE AND WHAT IS A TABLE. Anything whose members are a closed
-- set the application already switches on — a sentiment, a lifecycle status, a
-- proof type — is an enum, so a typo in a query fails loudly instead of matching
-- nothing. Anything that carries display copy or is expected to grow — the
-- categories, the places tree — is a table, because `ALTER TYPE ... ADD VALUE`
-- cannot run inside a transaction and would make every future taxonomy tweak a
-- migration that can half-apply.
--
-- These mirror `src/lib/types.ts` and `src/lib/ask/types.ts` exactly. When one
-- changes the other has to, and the generated types in
-- `src/lib/supabase/database.types.ts` are what makes that break at compile time
-- rather than at 3am.
-- =============================================================================

-- `gen_random_uuid()` is core since Postgres 13, so pgcrypto is not needed for
-- it. pg_trgm is, for the catalog search — and it is referenced as
-- `extensions.gin_trgm_ops` everywhere, because an unqualified operator class
-- resolves against whatever `search_path` happens to be at migration time.
--
-- Deliberately NOT citext. Slugs and usernames are already constrained to
-- lowercase by check constraints, so a case-insensitive type would buy nothing
-- and add an extension whose schema placement has to be reasoned about at every
-- reference.
create extension if not exists "pg_trgm" with schema extensions;

-- =============================================================================
-- Enums
-- =============================================================================

-- The headline vote. Three points, not five: a scale people cannot agree on the
-- middle of produces a distribution that measures the scale, not the opinion.
create type public.sentiment as enum ('Positive', 'Neutral', 'Negative');

create type public.place_level as enum ('world', 'country', 'state', 'city');

-- Lifecycle labels an editor can set on a topic or poll (brief §10).
create type public.artifact_status as enum (
  'Proposed', 'Upcoming', 'Ongoing', 'Live', 'Announced', 'Under Investigation',
  'Disputed', 'Confirmed', 'Resolved', 'Completed', 'Cancelled', 'Delayed', 'Inactive'
);

-- What the 7-day change actually measures. Carried explicitly so a card never
-- shows a bare arrow: "up" on negative sentiment and "up" on participation mean
-- very different things and must not share a colour.
create type public.change_metric as enum (
  'negative-sentiment', 'positive-sentiment', 'participation', 'discussion', 'trending'
);

create type public.change_direction as enum ('up', 'down');

create type public.contribution_format as enum ('standard', 'pro');

create type public.pro_section_type as enum (
  'headline', 'quick_take', 'breakdown', 'key_points', 'interactive', 'final_verdict'
);

create type public.interactive_kind as enum (
  'poll', 'rating', 'rank', 'scenario', 'agree_challenge', 'verdict'
);

create type public.pro_reaction as enum ('insightful', 'useful', 'well_explained');

-- Positional slots, in the order the author wrote the options.
create type public.option_slot as enum ('a', 'b', 'c', 'd');

-- Three areas. Chosen because the proof behind each is checkable.
create type public.ask_category as enum ('career', 'college', 'exam');

create type public.proof_type as enum (
  'employment', 'experience-letter', 'linkedin', 'portfolio',
  'student-id', 'degree', 'alumni',
  'scorecard', 'rank-card', 'admission-letter'
);

-- Production has a review queue where the prototype approved instantly
-- (`src/lib/ask/verification.ts`). `pending` is the state that queue works.
create type public.credential_status as enum ('pending', 'verified', 'rejected', 'revoked');

create type public.thread_status as enum (
  'Awaiting answer', 'Answered', 'In discussion', 'Resolved', 'Closed'
);

create type public.thread_outcome as enum ('Resolved', 'Not useful');

create type public.question_visibility as enum ('public', 'private');

create type public.sender_role as enum ('asker', 'professional');

-- Readers saying an answer or comment was worth reading. Deliberately NOT the
-- same instrument as the asker's private rating — see `ask_ratings`.
create type public.reader_vote as enum ('like', 'dislike');

create type public.account_role as enum ('member', 'editor', 'admin');

create type public.subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'expired'
);

-- Demographic bucket, snapshotted onto each vote. See `public.age_band`.
create type public.age_band as enum (
  'Under 17', '17–20', '21–24', '25–30', '31 and over'
);

create type public.report_subject as enum (
  'topic', 'poll', 'contribution', 'reply', 'poll_reason', 'ask_answer', 'ask_comment', 'profile'
);

-- =============================================================================
-- Generic helpers
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Row-level updated_at stamp. Set by trigger so a client cannot backdate a row.';

-- Monogram for a display name. Derived rather than stored: a stored copy drifts
-- the moment somebody edits their name, and it is not worth a column to cache
-- two characters.
create or replace function public.initials(full_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      upper(
        substr(coalesce(split_part(trim(full_name), ' ', 1), ''), 1, 1) ||
        substr(
          case
            when array_length(string_to_array(trim(full_name), ' '), 1) > 1
              then split_part(trim(full_name), ' ', array_length(string_to_array(trim(full_name), ' '), 1))
            else ''
          end,
          1, 1
        )
      ),
      ''
    ),
    '?'
  );
$$;

-- Which age bucket a date of birth falls in, as of a given moment.
--
-- WHY THIS IS A BUCKET AND NOT AN AGE. The cross-tabs are the only thing that
-- reads it, and they only ever ask "which of four rows". Resolving to a band at
-- write time means a date of birth never has to be readable by the code that
-- draws a chart — the exact date stays in `profiles`, behind RLS, and the
-- aggregate query never joins to it.
-- STABLE, not IMMUTABLE: the default argument is `now()`, so the same date of
-- birth genuinely does return a different band on a different day. Claiming
-- otherwise would let the planner fold a call to it into a cached constant.
create or replace function public.age_band(dob date, at timestamptz default now())
returns public.age_band
language sql
stable
as $$
  select case
    when dob is null then null
    else (
      case
        when extract(year from age(at::date, dob)) < 17 then 'Under 17'
        when extract(year from age(at::date, dob)) <= 20 then '17–20'
        when extract(year from age(at::date, dob)) <= 24 then '21–24'
        when extract(year from age(at::date, dob)) <= 30 then '25–30'
        else '31 and over'
      end
    )::public.age_band
  end;
$$;

comment on function public.age_band is
  'Age bucket for the cross-tabs. Snapshotted onto a vote at write time so an aggregate never reads a date of birth, and so a vote''s band does not silently move when its author has a birthday.';

-- =============================================================================
-- Role helpers for RLS
--
-- SECURITY DEFINER on purpose: these are called from inside policies on
-- `profiles`, and a plain query there would re-enter that table's own policy and
-- recurse. Owned by the migration role, so they run with RLS bypassed.
--
-- `set search_path = ''` on every one of them. A SECURITY DEFINER function with
-- a mutable search_path is the classic Postgres privilege-escalation hole: any
-- role that can create a schema could shadow `profiles` and have the function
-- read their table instead. Every reference below is schema-qualified.
-- =============================================================================

create or replace function public.current_role_is(target public.account_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = target
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_role_is('admin');
$$;

-- Editors publish topics, polls, timeline events and status changes.
-- Admins are editors plus everything else, so this is true for both.
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('editor', 'admin')
  );
$$;

comment on function public.is_editor is
  'True for editors and admins. In production only OpinionHQ staff create topics — the prototype''s public composer is a prototype affordance, not the model.';
