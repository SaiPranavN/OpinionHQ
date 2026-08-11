-- =============================================================================
-- The account hierarchy, finished.
--
-- TWO AXES, NOT ONE LADDER. This is the thing to hold on to when reading the
-- rest of the file:
--
--   role     member | editor | admin      what you are PERMITTED to do
--   pro      a live subscription row      what you have PAID for
--
-- A Pro subscriber is a member who pays. An admin may or may not be Pro, and it
-- does not matter either way. Folding them into one ladder would mean a declined
-- card could touch somebody's permissions, and an admin would need a subscription
-- granted to them to use a feature they are meant to be administering.
--
--   member  the default. Votes, writes opinions, replies, asks questions, and
--           answers them if they hold verified proof. Never sees an admin screen.
--   editor  everything a member does, plus the editorial job: create and publish
--           topics and polls, write the timeline, set status, moderate content.
--           Archives things. Does NOT delete them.
--   admin   everything an editor does, plus the account job: grant roles, suspend
--           and delete accounts, approve verification proof, destroy topics.
--
-- WHY EDITOR AND ADMIN ARE SEPARATE. A new teammate needs to publish topics on
-- their first day, and there is no version of that job that also requires the
-- power to delete somebody's account. The split costs one enum value and buys
-- the ability to hand out the common half of the work without the dangerous half.
-- =============================================================================

-- =============================================================================
-- Audit
--
-- Every irreversible thing an admin does is written here first, in the same
-- transaction. A deletion that leaves no trace of who ordered it is a deletion
-- nobody can answer for, and "who removed this account?" is a question that only
-- ever gets asked after it is too late to find out.
-- =============================================================================

create type public.admin_action as enum (
  'role_granted', 'account_suspended', 'account_restored', 'account_deleted',
  'topic_deleted', 'poll_deleted', 'credential_reviewed'
);

create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      public.admin_action not null,
  -- Deliberately NOT a foreign key. The whole point of most of these rows is
  -- that the thing they describe no longer exists.
  subject_id  uuid,
  -- Enough to identify the subject after it is gone. Never the account's
  -- private details: an audit log is not a way to keep data you just deleted.
  subject_label text not null default '',
  reason      text not null default '',
  created_at  timestamptz not null default now()
);

create index admin_actions_recent_idx on public.admin_actions (created_at desc);
create index admin_actions_actor_idx on public.admin_actions (actor_id, created_at desc);

alter table public.admin_actions enable row level security;

create policy "admins read the audit log" on public.admin_actions for select
  using (public.is_admin());

-- Written only by the functions below, which are SECURITY DEFINER. Nobody
-- writes their own audit entry, and nobody edits one afterwards.
revoke insert, update, delete on public.admin_actions from authenticated, anon;

create or replace function public.record_admin_action(
  action public.admin_action,
  subject_id uuid,
  subject_label text default '',
  reason text default ''
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_actions (actor_id, action, subject_id, subject_label, reason)
  values ((select auth.uid()), action, subject_id, subject_label, reason);
$$;

-- =============================================================================
-- Deleting a topic or a poll is an admin power.
--
-- The existing `for all` policies handed editors DELETE along with everything
-- else, and deleting a published topic destroys every opinion attached to it —
-- the cascade is doing exactly what it should, which is why the button needs to
-- be further away. Editors archive; `archived_at` takes a topic off the site and
-- keeps the measurements.
-- =============================================================================

drop policy "editors write topics" on public.topics;

create policy "editors write topics" on public.topics for insert
  with check (public.is_editor());
create policy "editors update topics" on public.topics for update
  using (public.is_editor()) with check (public.is_editor());
create policy "admins delete topics" on public.topics for delete
  using (public.is_admin());

drop policy "editors write polls" on public.polls;

create policy "editors write polls" on public.polls for insert
  with check (public.is_editor());
create policy "editors update polls" on public.polls for update
  using (public.is_editor()) with check (public.is_editor());
create policy "admins delete polls" on public.polls for delete
  using (public.is_admin());

-- =============================================================================
-- Suspension — reversible, and the thing to reach for first.
-- =============================================================================

create or replace function public.set_account_suspended(
  target uuid,
  suspended boolean,
  reason text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins suspend accounts';
  end if;
  if target = (select auth.uid()) then
    raise exception 'an admin cannot suspend themselves';
  end if;

  update public.profiles
     set suspended_at = case when suspended then now() else null end
   where id = target
  returning * into result;

  if result is null then
    raise exception 'no such account';
  end if;

  perform public.record_admin_action(
    (case when suspended then 'account_suspended' else 'account_restored' end)::public.admin_action,
    target,
    result.display_name,
    reason
  );

  return result;
end;
$$;

-- A suspended account keeps its rows and can no longer add to them. Enforced on
-- the write path rather than by hiding the UI, because the UI is not what stops
-- a script.
create or replace function public.is_active(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.suspended_at is null
  );
$$;

-- =============================================================================
-- Deletion — irreversible, and it takes the measurements with it.
--
-- WHAT THIS ACTUALLY DESTROYS, stated plainly because the cascade makes it easy
-- to under-estimate. Deleting one account removes:
--
--   - their votes and written opinions, and the topic's participant count and
--     sentiment split move to match. A percentage published yesterday can read
--     differently today, and a PDF exported before the deletion will no longer
--     agree with the live page.
--   - their poll votes and reasons, likewise.
--   - questions they asked, with every answer and thread underneath.
--   - ANSWERS THEY WROTE TO OTHER PEOPLE'S QUESTIONS. If a verified
--     professional deletes their account, the askers they helped lose the
--     advice. There is no version of a hard delete where this does not happen;
--     the alternative was anonymising, which was considered and not chosen.
--   - their verified credentials and any evidence still under review.
--
-- What survives: topics and polls they created as an editor (`created_by` goes
-- null, the topic stays), and the audit row recording that this happened.
--
-- `topic_daily_stats` is NOT rewritten. Those are historical readings, taken on
-- the day. A trend chart will therefore show a step where the deletion landed —
-- which is honest. Silently editing past measurements to match a present-day
-- deletion would be the worse of the two.
-- =============================================================================

create or replace function public.delete_account(target uuid, reason text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  label text;
begin
  if not public.is_admin() then
    raise exception 'only admins delete accounts';
  end if;
  if target = (select auth.uid()) then
    -- Not squeamishness: an admin deleting themselves can leave a deployment
    -- with no admin and no way to appoint one.
    raise exception 'an admin cannot delete their own account';
  end if;

  select p.display_name into label from public.profiles p where p.id = target;
  if label is null then
    raise exception 'no such account';
  end if;

  -- Recorded before the deletion, in the same transaction. Afterwards there is
  -- nothing left to read the name from.
  perform public.record_admin_action('account_deleted', target, label, reason);

  -- One statement. `public.profiles` cascades from here, and everything else
  -- cascades from that; the counter triggers fire as the opinions go, so the
  -- aggregates settle on their own.
  delete from auth.users where id = target;
end;
$$;

comment on function public.delete_account is
  'Hard delete. Destroys the account and everything it wrote, including answers given to other people. Aggregates move to match. Irreversible.';

-- =============================================================================
-- The first admin.
--
-- There is a chicken and egg here that cannot be solved in SQL: every function
-- above requires an admin to already exist, and a fresh database has none. A
-- self-service "claim admin if there are none" call would close it, and would
-- also mean that whoever signs up first — including somebody who found the site
-- before you did — becomes the administrator.
--
-- So it is done by hand, exactly once, in the Supabase SQL editor, after signing
-- up through the app:
--
--   update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');
--
-- After that, every further grant goes through `set_account_role`, which is
-- audited. This is the only privileged change in the system that is not.
-- =============================================================================

-- Grant a role, with the audit entry the bare column write did not leave.
create or replace function public.set_account_role(target uuid, new_role public.account_role)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins change roles';
  end if;
  if target = (select auth.uid()) and new_role <> 'admin' then
    -- Demoting yourself is how an organisation ends up with no admin at all.
    raise exception 'an admin cannot demote themselves';
  end if;

  update public.profiles set role = new_role where id = target returning * into result;

  if result is null then
    raise exception 'no such account';
  end if;

  perform public.record_admin_action(
    'role_granted', target, result.display_name, new_role::text
  );

  return result;
end;
$$;

-- =============================================================================
-- Suspended accounts cannot write.
--
-- Added to the insert policies rather than to a middleware check, so it holds
-- for anything holding a valid token — including a session issued before the
-- suspension landed.
-- =============================================================================

drop policy "write your own opinion" on public.opinions;
create policy "write your own opinion" on public.opinions for insert
  with check (
    author_id = (select auth.uid())
    and public.is_active()
    and (format = 'standard' or public.is_pro())
    and exists (
      select 1 from public.topics t
      where t.id = topic_id and t.published_at is not null and t.archived_at is null
    )
  );

drop policy "write your own reply" on public.opinion_replies;
create policy "write your own reply" on public.opinion_replies for insert
  with check (author_id = (select auth.uid()) and public.is_active());

drop policy "ask within your allowance" on public.ask_questions;
create policy "ask within your allowance" on public.ask_questions for insert
  with check (asker_id = (select auth.uid()) and public.is_active() and public.can_ask());

drop policy "comment on a public answer" on public.ask_comments;
create policy "comment on a public answer" on public.ask_comments for insert
  with check (
    author_id = (select auth.uid())
    and public.is_active()
    and exists (
      select 1 from public.ask_answers a
      join public.ask_questions q on q.id = a.question_id
      where a.id = answer_id and q.visibility = 'public'
    )
  );
