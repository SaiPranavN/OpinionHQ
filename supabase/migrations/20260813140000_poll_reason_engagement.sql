-- =============================================================================
-- Poll reasons get the same four actions an opinion has.
--
-- A reason under a poll has been a dead end since it was built: you could read
-- it and mark it helpful, and that was all. An opinion on a topic can be liked,
-- disliked, replied to and shared, and there is no reason a written case for
-- one side of a poll should be a lesser kind of writing than a written case
-- about a topic — it is the same person making the same sort of argument.
--
-- DELIBERATELY THE SAME SHAPE AS THE OPINION SIDE, table for table: votes on
-- the subject, threaded replies with a depth cap, votes on the replies. Two
-- threaded discussions in one product that behave differently is two things for
-- a reader to learn for no reason, and two things for the next change to get
-- subtly out of step.
--
-- `poll_reason_helpful` is dropped rather than migrated. It was like-only, it
-- was empty, and keeping it beside a table that does likes *and* dislikes would
-- leave two places that both claim to own `helpful_count`.
-- =============================================================================

alter table public.poll_reasons
  add column if not exists dislike_count integer not null default 0 check (dislike_count >= 0),
  add column if not exists reply_count integer not null default 0 check (reply_count >= 0);

-- ------------------------------------------------------- votes on a reason
drop trigger if exists poll_reason_helpful_count on public.poll_reason_helpful;
drop table if exists public.poll_reason_helpful;

create table if not exists public.poll_reason_votes (
  reason_id  uuid not null references public.poll_reasons (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       public.reader_vote not null,
  created_at timestamptz not null default now(),
  primary key (reason_id, user_id)
);

create index if not exists poll_reason_votes_user_idx on public.poll_reason_votes (user_id);

create or replace function public.apply_poll_reason_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An update swaps a like for a dislike, so both sides move in one statement.
  if tg_op <> 'INSERT' then
    update public.poll_reasons set
      helpful_count = greatest(helpful_count - (old.vote = 'like')::int, 0),
      dislike_count = greatest(dislike_count - (old.vote = 'dislike')::int, 0)
     where id = old.reason_id;
  end if;

  if tg_op <> 'DELETE' then
    update public.poll_reasons set
      helpful_count = helpful_count + (new.vote = 'like')::int,
      dislike_count = dislike_count + (new.vote = 'dislike')::int
     where id = new.reason_id;
  end if;

  return null;
end;
$$;

drop trigger if exists poll_reason_votes_count on public.poll_reason_votes;
create trigger poll_reason_votes_count
after insert or update or delete on public.poll_reason_votes
for each row execute function public.apply_poll_reason_vote();

alter table public.poll_reason_votes enable row level security;

-- Your own vote and nobody else's. The totals are public; who voted which way
-- is not, for the same reason the follower list is not.
drop policy if exists "own poll reason vote" on public.poll_reason_votes;
create policy "own poll reason vote" on public.poll_reason_votes for select
  using ((select auth.uid()) = user_id);

drop policy if exists "vote on a reason" on public.poll_reason_votes;
create policy "vote on a reason" on public.poll_reason_votes for insert
  with check ((select auth.uid()) = user_id and public.is_active());

drop policy if exists "change your reason vote" on public.poll_reason_votes;
create policy "change your reason vote" on public.poll_reason_votes for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "withdraw your reason vote" on public.poll_reason_votes;
create policy "withdraw your reason vote" on public.poll_reason_votes for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.poll_reason_votes to authenticated;

-- ------------------------------------------------------ replies to a reason
create table if not exists public.poll_reason_replies (
  id            uuid primary key default gen_random_uuid(),
  reason_id     uuid not null references public.poll_reasons (id) on delete cascade,
  parent_id     uuid references public.poll_reason_replies (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  body          text not null check (length(body) between 1 and 2000),
  -- Clamped at 4 by trigger. Stored so a thread can be rendered without walking
  -- the chain once per row.
  depth         integer not null default 0 check (depth between 0 and 4),
  likes         integer not null default 0 check (likes >= 0),
  dislikes      integer not null default 0 check (dislikes >= 0),
  anonymous     boolean not null default false,
  hidden_at     timestamptz,
  hidden_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists poll_reason_replies_reason_idx
  on public.poll_reason_replies (reason_id, created_at);
create index if not exists poll_reason_replies_parent_idx
  on public.poll_reason_replies (parent_id);

drop trigger if exists poll_reason_replies_set_updated_at on public.poll_reason_replies;
create trigger poll_reason_replies_set_updated_at
before update on public.poll_reason_replies
for each row execute function public.set_updated_at();

create or replace function public.set_poll_reply_depth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_depth  integer;
  parent_reason uuid;
begin
  if new.parent_id is null then
    new.depth := 0;
  else
    select r.depth, r.reason_id into parent_depth, parent_reason
      from public.poll_reason_replies r where r.id = new.parent_id;

    if parent_reason is null then
      raise exception 'no such reply to hang this off';
    end if;
    -- Without this a reply could be filed under a conversation it is not part
    -- of, and would render under somebody else's reason entirely.
    if parent_reason is distinct from new.reason_id then
      raise exception 'a reply must hang off a reply to the same reason';
    end if;

    -- Past four the thread keeps its parentage and stops stepping right.
    new.depth := least(coalesce(parent_depth, 0) + 1, 4);
  end if;

  return new;
end;
$$;

drop trigger if exists poll_reason_replies_depth on public.poll_reason_replies;
create trigger poll_reason_replies_depth
before insert on public.poll_reason_replies
for each row execute function public.set_poll_reply_depth();

create or replace function public.apply_poll_reply_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.reason_id, old.reason_id);
  step   integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  update public.poll_reasons
     set reply_count = greatest(reply_count + step, 0)
   where id = target;
  return null;
end;
$$;

drop trigger if exists poll_reason_replies_count on public.poll_reason_replies;
create trigger poll_reason_replies_count
after insert or delete on public.poll_reason_replies
for each row execute function public.apply_poll_reply_counter();

alter table public.poll_reason_replies enable row level security;

drop policy if exists "reason replies are world readable" on public.poll_reason_replies;
create policy "reason replies are world readable" on public.poll_reason_replies for select
  using (hidden_at is null or author_id = (select auth.uid()) or public.is_editor());

drop policy if exists "write your own reason reply" on public.poll_reason_replies;
create policy "write your own reason reply" on public.poll_reason_replies for insert
  with check (
    author_id = (select auth.uid())
    and public.is_active()
    and (anonymous = false or public.is_pro())
  );

drop policy if exists "edit your own reason reply" on public.poll_reason_replies;
create policy "edit your own reason reply" on public.poll_reason_replies for update
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy if exists "delete your own reason reply" on public.poll_reason_replies;
create policy "delete your own reason reply" on public.poll_reason_replies for delete
  using (author_id = (select auth.uid()));

drop policy if exists "editors moderate reason replies" on public.poll_reason_replies;
create policy "editors moderate reason replies" on public.poll_reason_replies for update
  using (public.is_editor()) with check (public.is_editor());

-- `depth`, `likes` and `dislikes` are never grantable: they are maintained by
-- trigger, and a client that could write them could award itself a hundred
-- likes or claim depth 0 to escape the indent.
revoke insert, update on public.poll_reason_replies from authenticated, anon;
grant insert (reason_id, parent_id, author_id, body, anonymous)
  on public.poll_reason_replies to authenticated;
grant update (body, hidden_at, hidden_reason) on public.poll_reason_replies to authenticated;
grant delete on public.poll_reason_replies to authenticated;

-- ------------------------------------------------- votes on those replies
create table if not exists public.poll_reason_reply_votes (
  reply_id   uuid not null references public.poll_reason_replies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       public.reader_vote not null,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create or replace function public.apply_poll_reply_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    update public.poll_reason_replies set
      likes    = greatest(likes    - (old.vote = 'like')::int, 0),
      dislikes = greatest(dislikes - (old.vote = 'dislike')::int, 0)
     where id = old.reply_id;
  end if;

  if tg_op <> 'DELETE' then
    update public.poll_reason_replies set
      likes    = likes    + (new.vote = 'like')::int,
      dislikes = dislikes + (new.vote = 'dislike')::int
     where id = new.reply_id;
  end if;

  return null;
end;
$$;

drop trigger if exists poll_reason_reply_votes_count on public.poll_reason_reply_votes;
create trigger poll_reason_reply_votes_count
after insert or update or delete on public.poll_reason_reply_votes
for each row execute function public.apply_poll_reply_vote();

alter table public.poll_reason_reply_votes enable row level security;

drop policy if exists "own reason reply vote" on public.poll_reason_reply_votes;
create policy "own reason reply vote" on public.poll_reason_reply_votes for select
  using ((select auth.uid()) = user_id);

drop policy if exists "vote on a reason reply" on public.poll_reason_reply_votes;
create policy "vote on a reason reply" on public.poll_reason_reply_votes for insert
  with check ((select auth.uid()) = user_id and public.is_active());

drop policy if exists "change your reason reply vote" on public.poll_reason_reply_votes;
create policy "change your reason reply vote" on public.poll_reason_reply_votes for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "withdraw your reason reply vote" on public.poll_reason_reply_votes;
create policy "withdraw your reason reply vote" on public.poll_reason_reply_votes for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.poll_reason_reply_votes to authenticated;

-- ============================================================================
-- The masked read path.
--
-- Same rules as `opinion_reply_feed`: owner-rights view, the WHERE clause is
-- the access control rather than a convenience, and an anonymous reply returns
-- your own id and nobody else's. A reply written under anonymous mode has to
-- be as unattributable here as it is on the opinion side, or the feature means
-- different things in two places.
-- ============================================================================
drop view if exists public.poll_reason_reply_feed;
create view public.poll_reason_reply_feed as
  select
    r.id,
    r.reason_id,
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
  from public.poll_reason_replies r
  join public.profiles p on p.id = r.author_id
  where r.hidden_at is null
     or r.author_id = (select auth.uid())
     or public.is_editor();

grant select on public.poll_reason_reply_feed to anon, authenticated;

-- The base table stops being directly readable, for the reason the anonymity
-- migration gives at length: hiding a name while shipping the account id is
-- not anonymity.
revoke select on public.poll_reason_replies from anon, authenticated;

comment on table public.poll_reason_replies is
  'Not directly readable by clients. Read through public.poll_reason_reply_feed, which masks the author of an anonymous reply.';

-- ============================================================================
-- The write paths.
--
-- Definer, so every condition the row policies would have applied is written
-- out. The toggle decision lives in SQL rather than in the button, so two tabs
-- pressing at once cannot land on different answers.
-- ============================================================================
create or replace function public.vote_on_poll_reason(reason uuid, kind public.reader_vote)
returns public.reader_vote
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  held public.reader_vote;
begin
  if uid is null then
    raise exception 'sign in to vote on a reason';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended';
  end if;
  if not public.poll_reason_is_visible(reason) then
    raise exception 'no such reason';
  end if;

  select v.vote into held
    from public.poll_reason_votes v
   where v.reason_id = reason and v.user_id = uid;

  if held = kind then
    delete from public.poll_reason_votes where reason_id = reason and user_id = uid;
    return null;
  end if;

  insert into public.poll_reason_votes (reason_id, user_id, vote)
  values (reason, uid, kind)
  on conflict (reason_id, user_id) do update set vote = excluded.vote;

  return kind;
end;
$$;

create or replace function public.reply_to_poll_reason(
  reason uuid,
  body text,
  parent uuid default null,
  anonymous boolean default false
)
returns public.poll_reason_replies
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := (select auth.uid());
  result public.poll_reason_replies;
begin
  if uid is null then
    raise exception 'sign in to reply';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended and cannot post';
  end if;
  if reply_to_poll_reason.anonymous and not public.is_pro(uid) then
    raise exception 'replying anonymously is a Pro feature';
  end if;
  if length(trim(reply_to_poll_reason.body)) = 0 then
    raise exception 'an empty reply is not a reply';
  end if;
  if not public.poll_reason_is_visible(reason) then
    raise exception 'no such reason';
  end if;

  insert into public.poll_reason_replies (reason_id, parent_id, author_id, body, anonymous)
  values (reason, parent, uid, trim(reply_to_poll_reason.body), reply_to_poll_reason.anonymous)
  returning * into result;

  return result;
end;
$$;

create or replace function public.vote_on_poll_reason_reply(reply uuid, kind public.reader_vote)
returns public.reader_vote
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  held public.reader_vote;
begin
  if uid is null then
    raise exception 'sign in to vote';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended';
  end if;

  select v.vote into held
    from public.poll_reason_reply_votes v
   where v.reply_id = reply and v.user_id = uid;

  if held = kind then
    delete from public.poll_reason_reply_votes where reply_id = reply and user_id = uid;
    return null;
  end if;

  insert into public.poll_reason_reply_votes (reply_id, user_id, vote)
  values (reply, uid, kind)
  on conflict (reply_id, user_id) do update set vote = excluded.vote;

  return kind;
end;
$$;

/** The caller's own votes across one poll's reasons, for first paint. */
create or replace function public.my_poll_reason_votes(target uuid)
returns table (reason_id uuid, vote public.reader_vote)
language sql
stable
security definer
set search_path = ''
as $$
  select v.reason_id, v.vote
    from public.poll_reason_votes v
    join public.poll_reasons r on r.id = v.reason_id
   where r.poll_id = target and v.user_id = (select auth.uid());
$$;

/** And across the replies under them. */
create or replace function public.my_poll_reply_votes(target uuid)
returns table (reply_id uuid, vote public.reader_vote)
language sql
stable
security definer
set search_path = ''
as $$
  select v.reply_id, v.vote
    from public.poll_reason_reply_votes v
    join public.poll_reason_replies rr on rr.id = v.reply_id
    join public.poll_reasons r on r.id = rr.reason_id
   where r.poll_id = target and v.user_id = (select auth.uid());
$$;
