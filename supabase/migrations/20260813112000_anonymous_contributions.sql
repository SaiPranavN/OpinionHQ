-- =============================================================================
-- Posting without your name on it.
--
-- WHY THIS FILE IS LONG. Hiding a name is a one-line change and it is not
-- anonymity. The feed ships `author_id` to the browser; anyone signed in could
-- select that column and join it to `profiles`, and every anonymous post on the
-- site would have a name against it inside one request. A feature that promises
-- anonymity and delivers a hidden label is worse than not offering it, because
-- people will say things under it that they would not say under their name.
--
-- So the identity is removed from the wire, not from the markup:
--
--   1. the three tables that carry authored text stop being directly readable
--   2. every read goes through a view that returns your own id and nobody
--      else's when a row is anonymous
--   3. everything that used to reach into those tables — four row policies and
--      eight functions — is re-pointed so it still works
--
-- Step 3 is the bulk of it. Postgres checks column privileges inside RLS policy
-- expressions against the *calling* role, so a policy that says
-- `exists (select 1 from opinions o where o.author_id = auth.uid())` stops
-- working the moment the caller loses `select` on `opinions`. Proven, not
-- assumed: a policy referencing an ungranted column fails with `permission
-- denied for table`, and that is why the helpers below exist.
--
-- WHAT IS AND IS NOT PROMISED. Anonymous means the site does not tell other
-- readers who wrote it. It does not mean the row has no author: `author_id` is
-- still there, still unique per topic, and still visible to the database owner
-- and to anyone with service-role access. It has to be — one account one vote
-- depends on it, and so does letting somebody edit their own post. An anonymous
-- contribution is unattributable to other members, not untraceable, and the
-- product copy says so in those words.
-- =============================================================================

-- ------------------------------------------------------------- the column
alter table public.opinions        add column if not exists anonymous boolean not null default false;
alter table public.opinion_replies add column if not exists anonymous boolean not null default false;
alter table public.poll_reasons    add column if not exists anonymous boolean not null default false;

comment on column public.opinions.anonymous is
  'Pro only. Hides the author from other readers via the opinion_feed view. The author_id column is still populated and still unique per topic.';

-- ============================================================================
-- Helpers, so the policies below stop depending on the caller's grants.
--
-- Each is the exact predicate the policy used to inline, lifted into a definer
-- function. Doing it this way rather than loosening the grants keeps the rule
-- in one place: a change to what "visible" means is one function, not four
-- policies that have to be found first.
-- ============================================================================

create or replace function public.opinion_is_visible(oid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.opinions o
     where o.id = oid
       and (o.hidden_at is null or o.author_id = (select auth.uid()) or public.is_editor())
  );
$$;

create or replace function public.owns_opinion(oid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.opinions o
     where o.id = oid and o.author_id = (select auth.uid())
  );
$$;

create or replace function public.owns_section(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.opinion_sections s
      join public.opinions o on o.id = s.opinion_id
     where s.id = sid and o.author_id = (select auth.uid())
  );
$$;

create or replace function public.owns_block(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.interactive_blocks b
      join public.opinion_sections s on s.id = b.section_id
      join public.opinions o on o.id = s.opinion_id
     where b.id = bid and o.author_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------- the four policies
drop policy if exists "sections follow the opinion" on public.opinion_sections;
create policy "sections follow the opinion" on public.opinion_sections for select
  using (public.opinion_is_visible(opinion_id));

drop policy if exists "author writes sections" on public.opinion_sections;
create policy "author writes sections" on public.opinion_sections for all
  using (public.owns_opinion(opinion_id))
  with check (public.is_pro() and public.owns_opinion(opinion_id));

drop policy if exists "author writes blocks" on public.interactive_blocks;
create policy "author writes blocks" on public.interactive_blocks for all
  using (public.owns_section(section_id))
  with check (public.is_pro() and public.owns_section(section_id));

drop policy if exists "author writes block options" on public.interactive_options;
create policy "author writes block options" on public.interactive_options for all
  using (public.owns_block(block_id))
  with check (public.owns_block(block_id));

-- ------------------------------------------------- only Pro may go dark
--
-- On the write policies rather than in a CHECK constraint, because a constraint
-- cannot call `is_pro()` — it is not immutable, and it must not be: the answer
-- changes when a membership lapses. Put on the policy, it is evaluated per
-- write with the caller's own session, which is where the question belongs.
drop policy if exists "write your own opinion" on public.opinions;
create policy "write your own opinion" on public.opinions for insert
  with check (
    author_id = (select auth.uid())
    and public.is_active()
    and (format = 'standard' or public.is_pro())
    and (anonymous = false or public.is_pro())
    and exists (
      select 1 from public.topics t
      where t.id = topic_id and t.published_at is not null and t.archived_at is null
    )
  );

drop policy if exists "edit your own opinion" on public.opinions;
create policy "edit your own opinion" on public.opinions for update
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and (format = 'standard' or public.is_pro())
    and (anonymous = false or public.is_pro())
  );

drop policy if exists "write your own reply" on public.opinion_replies;
create policy "write your own reply" on public.opinion_replies for insert
  with check (
    author_id = (select auth.uid())
    and public.is_active()
    and (anonymous = false or public.is_pro())
  );

drop policy if exists "explain your own pick" on public.poll_reasons;
create policy "explain your own pick" on public.poll_reasons for insert
  with check (
    user_id = (select auth.uid())
    and (anonymous = false or public.is_pro())
    and exists (
      select 1 from public.poll_votes v
      where v.poll_id = poll_reasons.poll_id
        and v.user_id = (select auth.uid())
        and v.option_id = poll_reasons.option_id
    )
  );

-- ============================================================================
-- The masking views.
--
-- SECURITY_INVOKER IS DELIBERATELY OFF HERE, and it is on for `topic_cards`,
-- `poll_cards` and `professionals`. The difference is the point. An invoker
-- view is evaluated with the caller's privileges, so it could not read a table
-- the caller has just been denied — the mask would be unenforceable. These run
-- as the owner, which is exactly why the visibility rule is restated in the
-- WHERE clause below: with the owner's privileges there is no row policy left
-- to fall back on, so the predicate here IS the access control. Read it as
-- such, and change it with that in mind.
--
-- `author_id` comes back for your own rows even when they are anonymous, so the
-- feed can still mark a post as yours and let you edit it. Everyone else gets
-- null, and gets it from the server rather than from a component that remembers
-- to hide it.
-- ============================================================================

drop view if exists public.opinion_feed;
create view public.opinion_feed as
  select
    o.id,
    o.topic_id,
    o.anonymous,
    case when o.anonymous and o.author_id is distinct from (select auth.uid())
         then null else o.author_id end                       as author_id,
    case when o.anonymous then null else p.display_name end   as display_name,
    case when o.anonymous then null else p.initials end       as initials,
    -- An occupation and a verification badge identify a person about as well as
    -- a name does. "Consultant cardiologist, Apollo Chennai" is not a disguise.
    case when o.anonymous then null else o.author_line end    as author_line,
    case when o.anonymous then null else o.verified_label end as verified_label,
    o.vote,
    o.body,
    o.format,
    o.helpful_count,
    o.reply_count,
    o.save_count,
    o.insightful_count,
    o.useful_count,
    o.well_explained_count,
    o.created_at,
    o.updated_at,
    o.edited_at,
    o.hidden_at
  from public.opinions o
  join public.profiles p on p.id = o.author_id
  where o.hidden_at is null
     or o.author_id = (select auth.uid())
     or public.is_editor();

comment on view public.opinion_feed is
  'The only read path to opinions for clients. Owner-rights view: the WHERE clause is the access control, not a convenience.';

drop view if exists public.opinion_reply_feed;
create view public.opinion_reply_feed as
  select
    r.id,
    r.opinion_id,
    r.parent_id,
    r.depth,
    r.anonymous,
    case when r.anonymous and r.author_id is distinct from (select auth.uid())
         then null else r.author_id end                      as author_id,
    case when r.anonymous then null else p.display_name end  as display_name,
    case when r.anonymous then null else p.initials end      as initials,
    r.body,
    r.likes,
    r.dislikes,
    r.created_at,
    r.hidden_at
  from public.opinion_replies r
  join public.profiles p on p.id = r.author_id
  where r.hidden_at is null
     or r.author_id = (select auth.uid())
     or public.is_editor();

drop view if exists public.poll_reason_feed;
create view public.poll_reason_feed as
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
    r.created_at,
    r.hidden_at
  from public.poll_reasons r
  join public.profiles p on p.id = r.user_id
  where r.hidden_at is null
     or r.user_id = (select auth.uid())
     or public.is_editor();

grant select on public.opinion_feed, public.opinion_reply_feed, public.poll_reason_feed
  to anon, authenticated;

-- ============================================================================
-- Re-pointing the functions.
--
-- Each of these read an identity column and would fail once the grant goes. The
-- three that only ever touched the caller's own rows are simply elevated — the
-- `auth.uid()` filter inside them was already doing the work the policy was
-- doing. The two that insert are elevated *and* have the insert policy's
-- conditions written out by hand, because a definer function does not get them
-- for free and silently losing the suspended-account check is precisely the
-- kind of regression this whole file is trying to avoid.
-- ============================================================================

create or replace function public.my_votes()
returns table (topic_slug text, vote public.sentiment, body text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.slug, o.vote, o.body, o.updated_at
    from public.opinions o
    join public.topics t on t.id = o.topic_id
   where o.author_id = (select auth.uid());
$$;

create or replace function public.my_reply_votes(opinion uuid)
returns table (reply_id uuid, vote public.reader_vote)
language sql
stable
security definer
set search_path = ''
as $$
  select v.reply_id, v.vote
    from public.opinion_reply_votes v
    join public.opinion_replies r on r.id = v.reply_id
   where r.opinion_id = opinion and v.user_id = (select auth.uid());
$$;

-- Counts only. Nothing identifying leaves this one, which is why elevating it
-- costs nothing.
create or replace function public.poll_reason_counts(target uuid)
returns table (slot public.option_slot, reasons integer)
language sql
stable
security definer
set search_path = ''
as $$
  select o.slot, count(r.id)::integer
    from public.poll_options o
    left join public.poll_reasons r on r.option_id = o.id and r.hidden_at is null
   where o.poll_id = target
   group by o.slot;
$$;

create or replace function public.withdraw_vote(topic_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in first';
  end if;

  delete from public.opinions o
   using public.topics t
   where t.slug = lower(trim(topic_slug))
     and o.topic_id = t.id
     and o.author_id = uid;

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

create or replace function public.retract_poll_reason(poll_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in first';
  end if;

  delete from public.poll_reasons r
   using public.polls p
   where p.slug = lower(trim(poll_slug))
     and r.poll_id = p.id
     and r.user_id = uid;

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

create or replace function public.withdraw_poll_vote(poll_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in first';
  end if;

  -- The reason goes with the vote. A written case for an option you no longer
  -- hold, left sitting under that option, misrepresents the person who wrote it.
  delete from public.poll_reasons r
   using public.polls p
   where p.slug = lower(trim(poll_slug)) and r.poll_id = p.id and r.user_id = uid;

  delete from public.poll_votes v
   using public.polls p
   where p.slug = lower(trim(poll_slug)) and v.poll_id = p.id and v.user_id = uid;

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- ------------------------------------------ the two that insert and return
--
-- Dropped and recreated rather than replaced: `create or replace` cannot add a
-- parameter, and creating the wider version alongside the old one would make
-- every existing two-argument call ambiguous rather than defaulted.

drop function if exists public.cast_vote(text, public.sentiment, text);
create function public.cast_vote(
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
  -- Written out because this is a definer function now. Every line below was
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

  select t.id into target
    from public.topics t
   where t.slug = lower(trim(topic_slug))
     and t.published_at is not null
     and t.archived_at is null;
  if target is null then
    raise exception 'no such topic';
  end if;

  insert into public.opinions (topic_id, author_id, vote, body, anonymous)
  values (target, uid, cast_vote.vote, coalesce(trim(cast_vote.body), ''), cast_vote.anonymous)
  on conflict (topic_id, author_id) do update
    set vote      = excluded.vote,
        body      = excluded.body,
        anonymous = excluded.anonymous,
        edited_at = now()
  returning * into result;

  return result;
end;
$$;

drop function if exists public.reply_to_opinion(uuid, text, uuid);
create function public.reply_to_opinion(
  opinion uuid,
  body text,
  parent uuid default null,
  anonymous boolean default false
)
returns public.opinion_replies
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := (select auth.uid());
  result public.opinion_replies;
begin
  if uid is null then
    raise exception 'sign in to reply';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended and cannot post';
  end if;
  if reply_to_opinion.anonymous and not public.is_pro(uid) then
    raise exception 'replying anonymously is a Pro feature';
  end if;
  if length(trim(reply_to_opinion.body)) = 0 then
    raise exception 'an empty reply is not a reply';
  end if;
  if not public.opinion_is_visible(opinion) then
    raise exception 'no such contribution';
  end if;

  insert into public.opinion_replies (opinion_id, parent_id, author_id, body, anonymous)
  values (opinion, parent, uid, trim(reply_to_opinion.body), reply_to_opinion.anonymous)
  returning * into result;

  return result;
end;
$$;

drop function if exists public.explain_poll_vote(text, text);
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

  if length(trim(reason)) = 0 then
    raise exception 'an empty reason is not a reason';
  end if;

  insert into public.poll_reasons (poll_id, user_id, option_id, body, anonymous)
  values (target_poll, author, their_pick, trim(reason), explain_poll_vote.anonymous)
  on conflict (poll_id, user_id) do update
    set body      = excluded.body,
        option_id = excluded.option_id,
        anonymous = excluded.anonymous
  returning * into result;

  return result;
end;
$$;

-- ============================================================================
-- THE REVOKE IS NOT IN THIS FILE. It is in `20260813118000_close_direct_reads`.
--
-- Deliberately, and the ordering matters more than it looks. This migration
-- goes to a database that a live site is reading right now, and that site still
-- selects from `opinions` directly. Revoking in the same statement batch that
-- creates the views would take every topic page down for however long it takes
-- to build and deploy the code that uses them.
--
-- So it is two deployments: this one is additive and changes nothing for the
-- running site, the app moves onto the views, and only then does the door shut.
-- Until that second migration lands, `anonymous` hides a name in the UI but the
-- id is still on the wire — which is worth being blunt about, because that is
-- the exact half-measure the top of this file calls worse than nothing.
-- ============================================================================
