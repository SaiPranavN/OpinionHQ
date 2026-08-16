-- =============================================================================
-- A vote now needs a reason, and an edited post now says so.
--
-- TWO CHANGES, one file, because they touch the same two write paths.
--
-- 1. THE WRITTEN EXPLANATION IS MANDATORY, on topics and on polls, at the
--    product owner's direction. What it costs is worth writing down rather than
--    discovering: every vote becomes more expensive to cast, and some people who
--    would have clicked Positive and moved on will not vote at all. The split
--    will be measured over a smaller and more deliberate sample.
--
--    Ten characters, because "mandatory" with no length is a rule satisfied by
--    a full stop. `MIN_EXPLANATION` in src/lib/contributions.ts is the client's
--    copy of that number and schema-sync.test.ts holds the two level.
--
--    ENFORCED HERE RATHER THAN IN THE COMPOSER. A disabled button is a
--    convenience; this is the rule, so a hand-rolled request is refused too.
--
--    EXISTING ROWS ARE NOT TOUCHED. This is a check inside the write functions,
--    not a table constraint — a constraint would retroactively invalidate every
--    bare vote already cast, and those were legitimate under the rule that
--    applied when they were cast. They stay, and stay editable.
--
-- 2. AN EDITED CONTRIBUTION CARRIES A STAMP. `opinions.edited_at` has existed
--    since the first migration and was already set by `cast_vote`; poll reasons
--    had nothing. `updated_at` was not usable for this — the trigger behind it
--    fires on any update, including a like landing on the row, so it says
--    "somebody touched this" rather than "the author rewrote this".
--
-- WHY `vote_and_explain` EXISTS. A poll vote and its reason are two rows in two
-- tables, written by two functions, because the reason's policy can only pass
-- once the vote exists. Two calls means the first can succeed and the second
-- fail, which under the old optional rule left a bare vote — acceptable then,
-- and exactly the hole that would make "mandatory" a lie now. This wraps both in
-- one statement so a rejected reason takes the vote down with it.
-- =============================================================================

alter table public.poll_reasons add column if not exists edited_at timestamptz;

comment on column public.poll_reasons.edited_at is
  'Set when the author rewrites the reason. Null on a first post. Distinct from '
  'updated_at, which the set_updated_at trigger also bumps when a like lands.';

-- ------------------------------------------------------------- topic votes

-- Replaced in full rather than patched, and the signature is unchanged, so this
-- is a genuine `create or replace` of the four-argument definer version the
-- anonymity migration installed — not a new overload beside it.
create or replace function public.cast_vote(
  topic_slug text,
  vote public.sentiment,
  body text default '',
  anonymous boolean default false
)
returns public.opinions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  uid    uuid := (select auth.uid());
  result public.opinions;
begin
  -- Written out because this is a definer function. Every line below was
  -- previously enforced by "write your own opinion" and would have vanished
  -- silently the moment the privilege was elevated.
  if uid is null then
    raise exception 'sign in to vote';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended and cannot post';
  end if;
  if cast_vote.anonymous and not public.is_pro(uid) then
    raise exception 'posting anonymously is a Pro feature';
  end if;

  -- The new rule. `body` keeps its empty default so the signature does not
  -- change; what changed is that the default is no longer acceptable.
  if length(trim(coalesce(cast_vote.body, ''))) < 10 then
    raise exception 'a vote needs a short explanation — at least 10 characters';
  end if;

  select t.id into target
    from public.topics t
   where t.slug = lower(trim(topic_slug))
     and t.published_at is not null
     and t.archived_at is null;
  if target is null then
    raise exception 'no such topic';
  end if;

  insert into public.opinions (topic_id, author_id, vote, body, anonymous)
  values (target, uid, cast_vote.vote, trim(cast_vote.body), cast_vote.anonymous)
  on conflict (topic_id, author_id) do update
    set vote      = excluded.vote,
        body      = excluded.body,
        anonymous = excluded.anonymous,
        edited_at = now()
  returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------- poll reasons

drop function if exists public.explain_poll_vote(text, text, boolean);
create function public.explain_poll_vote(
  poll_slug text,
  reason text,
  anonymous boolean default false
)
returns public.poll_reasons
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_poll uuid;
  their_pick  uuid;
  author      uuid := (select auth.uid());
  result      public.poll_reasons;
begin
  if author is null then
    raise exception 'sign in to explain your vote';
  end if;
  if explain_poll_vote.anonymous and not public.is_pro(author) then
    raise exception 'posting anonymously is a Pro feature';
  end if;

  select p.id into target_poll
    from public.polls p
   where p.slug = lower(trim(poll_slug))
     and p.published_at is not null
     and p.archived_at is null;
  if target_poll is null then
    raise exception 'no such poll';
  end if;

  -- The pick comes from their own vote. This is the load-bearing line: it is
  -- what makes elevating the privilege safe, because the option is never
  -- something the caller supplies.
  select v.option_id into their_pick
    from public.poll_votes v
   where v.poll_id = target_poll and v.user_id = author;
  if their_pick is null then
    raise exception 'vote before explaining your vote';
  end if;

  if length(trim(coalesce(explain_poll_vote.reason, ''))) < 10 then
    raise exception 'a vote needs a short explanation — at least 10 characters';
  end if;

  insert into public.poll_reasons (poll_id, user_id, option_id, body, anonymous)
  values (target_poll, author, their_pick, trim(reason), explain_poll_vote.anonymous)
  on conflict (poll_id, user_id) do update
    set body      = excluded.body,
        option_id = excluded.option_id,
        anonymous = excluded.anonymous,
        -- Only on the update path, so a first post has a null stamp and the
        -- card can tell "written" from "rewritten".
        edited_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.explain_poll_vote(text, text, boolean) from public;
grant execute on function public.explain_poll_vote(text, text, boolean) to authenticated;

-- ------------------------------------------------- the vote and the reason

create or replace function public.vote_and_explain(
  poll_slug text,
  option_slot public.option_slot,
  reason text,
  anonymous boolean default false
)
returns public.poll_reasons
language plpgsql
-- INVOKER ON PURPOSE. Both halves keep the privileges they already had:
-- `cast_poll_vote` runs as the caller so the insert policy on `poll_votes`
-- still decides (it is what refuses a vote on a closed poll), and
-- `explain_poll_vote` is definer, so calling it from here elevates exactly as
-- much as calling it directly and no more. Re-implementing either check here
-- would be a second copy of the rules to keep in step.
security invoker
set search_path = public, pg_temp
as $$
begin
  if length(trim(coalesce(vote_and_explain.reason, ''))) < 10 then
    raise exception 'a vote needs a short explanation — at least 10 characters';
  end if;

  perform public.cast_poll_vote(vote_and_explain.poll_slug, vote_and_explain.option_slot);

  return public.explain_poll_vote(
    vote_and_explain.poll_slug,
    vote_and_explain.reason,
    vote_and_explain.anonymous
  );
end;
$$;

comment on function public.vote_and_explain is
  'Casts a poll vote and its written reason in one statement. Either both land '
  'or neither does, which is what makes the reason genuinely required.';

revoke all on function public.vote_and_explain(text, public.option_slot, text, boolean) from public;
grant execute on function public.vote_and_explain(text, public.option_slot, text, boolean)
  to authenticated;

-- ------------------------------------------------------- the feed sees it

-- Rebuilt only to carry the new column, and otherwise character-for-character
-- what 20260813142000 installed. Adding a column to a table does not add it to
-- a view over that table, and this view is the only read path clients have —
-- a lesson this schema has already paid for once, when the reasons list went
-- blank in production for exactly this reason.
--
-- `edited_at` is appended, never inserted: `create or replace view` may add
-- columns at the end and may not reorder or rename the ones already there.
-- Masking rules and the owner-rights WHERE clause are untouched; see the
-- anonymous-contributions migration for why they are what they are.
create or replace view public.poll_reason_feed as
  select
    r.id,
    r.poll_id,
    r.option_id,
    r.anonymous,
    case when r.anonymous and r.user_id is distinct from (select auth.uid())
         then null else r.user_id end                        as user_id,
    case when r.anonymous then null else p.display_name end  as display_name,
    case when r.anonymous then null else p.initials end      as initials,
    r.body,
    r.helpful_count,
    r.dislike_count,
    r.reply_count,
    r.created_at,
    r.hidden_at,
    r.edited_at
  from public.poll_reasons r
  join public.profiles p on p.id = r.user_id
  where r.hidden_at is null
     or r.user_id = (select auth.uid())
     or public.is_editor();

grant select on public.poll_reason_feed to anon, authenticated;
