-- =============================================================================
-- Replies under an opinion become a conversation.
--
-- `opinion_replies` was single-level: a flat list under a written opinion, with
-- no parent, no depth and no way to answer one reply rather than the opinion.
-- That is fine for "I agree" and useless for the thing discussion is actually
-- for — somebody disputes a specific claim, two people go back and forth about
-- that claim, and everyone else needs to see which claim they are on.
--
-- The model is `ask_comments`, deliberately, down to the depth cap and the
-- mutually-exclusive vote. Two threaded discussions in one product that behave
-- differently is two things for a reader to learn for no reason.
-- =============================================================================

alter table public.opinion_replies
  add column parent_id uuid references public.opinion_replies (id) on delete cascade,
  -- Clamped at 4 by trigger. Stored so a thread can be rendered without walking
  -- the chain once per row.
  add column depth integer not null default 0 check (depth between 0 and 4),
  add column likes integer not null default 0 check (likes >= 0),
  add column dislikes integer not null default 0 check (dislikes >= 0);

create index opinion_replies_parent_idx on public.opinion_replies (parent_id);

-- The writable columns, restated because the table gained some.
--
-- A column-only revoke is a no-op while the role still holds the table-level
-- grant Supabase hands out by default, so the table privilege goes first and
-- the specific columns come back after. `depth`, `likes` and `dislikes` are
-- never in that list: they are maintained by trigger, and a client that could
-- write them could award itself a hundred likes or claim depth 0 to escape the
-- indent.
revoke insert, update on public.opinion_replies from authenticated, anon;
grant insert (opinion_id, parent_id, author_id, body) on public.opinion_replies to authenticated;
grant update (body, hidden_at, hidden_reason) on public.opinion_replies to authenticated;

create or replace function public.set_reply_depth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_depth   integer;
  parent_opinion uuid;
begin
  if new.parent_id is null then
    new.depth := 0;
  else
    select r.depth, r.opinion_id into parent_depth, parent_opinion
      from public.opinion_replies r where r.id = new.parent_id;

    if parent_opinion is null then
      raise exception 'no such reply to hang this off';
    end if;
    -- Without this a reply could be filed under a conversation it is not part
    -- of, and would render under somebody else's opinion entirely.
    if parent_opinion is distinct from new.opinion_id then
      raise exception 'a reply must hang off a reply to the same opinion';
    end if;

    -- Past four the thread keeps its parentage and stops stepping right. See
    -- MAX_COMMENT_DEPTH in the client for why the cap is where it is.
    new.depth := least(coalesce(parent_depth, 0) + 1, 4);
  end if;

  return new;
end;
$$;

create trigger opinion_replies_depth
before insert on public.opinion_replies
for each row execute function public.set_reply_depth();

-- ------------------------------------------------------------- reader votes
--
-- One row per (reply, reader), so like and dislike are mutually exclusive by
-- the shape of the data rather than by a rule somebody has to remember.
create table public.opinion_reply_votes (
  reply_id   uuid not null references public.opinion_replies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       public.reader_vote not null,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create or replace function public.apply_reply_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  -- `new` is unassigned on DELETE and PL/pgSQL resolves every record reference
  -- when it builds the statement's parameters, so both branches are resolved
  -- into locals first. See `apply_opinion_delta` for the same note.
  if tg_op = 'DELETE' then
    target := old.reply_id;
  else
    target := new.reply_id;
  end if;

  update public.opinion_replies set
    likes = (
      select count(*) from public.opinion_reply_votes v
       where v.reply_id = target and v.vote = 'like'
    ),
    dislikes = (
      select count(*) from public.opinion_reply_votes v
       where v.reply_id = target and v.vote = 'dislike'
    )
  where id = target;

  return null;
end;
$$;

-- Recounted rather than incremented. A counter that is stepped up and down
-- drifts the moment one statement is missed; a count cannot disagree with the
-- rows it is counting.
create trigger opinion_reply_votes_count
after insert or update or delete on public.opinion_reply_votes
for each row execute function public.apply_reply_vote();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.opinion_reply_votes enable row level security;

create policy "own reply votes" on public.opinion_reply_votes for select
  using (user_id = (select auth.uid()));
create policy "vote on a reply" on public.opinion_reply_votes for insert
  with check (user_id = (select auth.uid()));
create policy "change a reply vote" on public.opinion_reply_votes for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "withdraw a reply vote" on public.opinion_reply_votes for delete
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Posting and voting, addressed the way the client already addresses things.

create or replace function public.reply_to_opinion(
  opinion uuid,
  body text,
  parent uuid default null
)
returns public.opinion_replies
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  result public.opinion_replies;
begin
  if length(trim(reply_to_opinion.body)) = 0 then
    raise exception 'an empty reply is not a reply';
  end if;

  insert into public.opinion_replies (opinion_id, parent_id, author_id, body)
  values (opinion, parent, auth.uid(), trim(reply_to_opinion.body))
  returning * into result;

  return result;
end;
$$;

comment on function public.reply_to_opinion is
  'Posts a reply, optionally under another reply. Security invoker: the row policies on opinion_replies decide whether it lands.';

/**
 * Like, dislike, or take it back.
 *
 * Pressing the side already held withdraws the vote; pressing the other side
 * moves it. Nobody holds both, and nobody is stuck with a vote they can only
 * change and never withdraw. Returns what the caller now holds, or null.
 */
create or replace function public.vote_on_reply(reply uuid, kind public.reader_vote)
returns public.reader_vote
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  held public.reader_vote;
begin
  select v.vote into held
    from public.opinion_reply_votes v
   where v.reply_id = reply and v.user_id = auth.uid();

  if held = kind then
    delete from public.opinion_reply_votes
     where reply_id = reply and user_id = auth.uid();
    return null;
  end if;

  insert into public.opinion_reply_votes (reply_id, user_id, vote)
  values (reply, auth.uid(), kind)
  on conflict (reply_id, user_id) do update set vote = excluded.vote;

  return kind;
end;
$$;

/** The caller's own votes on one opinion's replies, for rendering their state. */
create or replace function public.my_reply_votes(opinion uuid)
returns table (reply_id uuid, vote public.reader_vote)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select v.reply_id, v.vote
    from public.opinion_reply_votes v
    join public.opinion_replies r on r.id = v.reply_id
   where r.opinion_id = opinion and v.user_id = auth.uid();
$$;
