-- =============================================================================
-- Like, dislike, and a limit on rewriting history.
--
-- WHAT WAS THERE BEFORE WAS NOT REAL. `opinion_helpful` existed, had a counter
-- trigger, and nothing in the app ever wrote to it — `toggleHelpful` pushed the
-- id into localStorage and the card rendered `helpful_count + (marked ? 1 : 0)`.
-- So the number was the database's zero plus this browser's opinion of itself:
-- invisible to everybody else, gone on a cache clear. Same shape as the follow
-- bug and the contributions bug before it.
--
-- All four engagement tables were empty (checked before writing this), so
-- nothing is being migrated and nothing is lost.
--
-- SAVE AND THE THREE PRO REACTIONS GO ENTIRELY. Not just their buttons: the
-- tables, the triggers and the count columns. Keeping empty tables around for a
-- feature that was explicitly dropped is how a schema fills up with things
-- nobody can explain a year later.
-- =============================================================================

-- --------------------------------------------------------- like / dislike
--
-- Deliberately the same shape as `opinion_reply_votes`, which has worked since
-- the threaded-replies migration. One row per person per contribution, the
-- primary key doing the deduplication, and `vote` swapping in place rather than
-- a delete and an insert — so changing your mind is one statement and cannot
-- race with itself.
create table if not exists public.opinion_votes (
  opinion_id uuid not null references public.opinions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       public.reader_vote not null,
  created_at timestamptz not null default now(),
  primary key (opinion_id, user_id)
);

create index if not exists opinion_votes_user_idx on public.opinion_votes (user_id);

alter table public.opinions add column if not exists dislike_count integer not null default 0;

/**
 * Keeps both counters level with the table.
 *
 * `security definer` because the counts live on a row the voter has no
 * privilege to update. A count the browser can write is a count that means
 * whatever the last caller wanted — which is exactly what the old localStorage
 * version amounted to.
 */
create or replace function public.apply_opinion_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- An update swaps a like for a dislike, so both sides move in one statement.
  if tg_op <> 'INSERT' then
    update public.opinions set
      helpful_count = greatest(helpful_count - (old.vote = 'like')::int, 0),
      dislike_count = greatest(dislike_count - (old.vote = 'dislike')::int, 0)
     where id = old.opinion_id;
  end if;

  if tg_op <> 'DELETE' then
    update public.opinions set
      helpful_count = helpful_count + (new.vote = 'like')::int,
      dislike_count = dislike_count + (new.vote = 'dislike')::int
     where id = new.opinion_id;
  end if;

  return null;
end;
$$;

drop trigger if exists opinion_votes_count on public.opinion_votes;
create trigger opinion_votes_count
after insert or update or delete on public.opinion_votes
for each row execute function public.apply_opinion_vote();

alter table public.opinion_votes enable row level security;

-- Your own vote and nobody else's. The totals are public; who voted which way
-- is not, for the same reason the follower list is not.
drop policy if exists "own opinion vote" on public.opinion_votes;
create policy "own opinion vote" on public.opinion_votes for select
  using ((select auth.uid()) = user_id);

drop policy if exists "vote on a contribution" on public.opinion_votes;
create policy "vote on a contribution" on public.opinion_votes for insert
  with check ((select auth.uid()) = user_id and public.is_active());

drop policy if exists "change your contribution vote" on public.opinion_votes;
create policy "change your contribution vote" on public.opinion_votes for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "withdraw your contribution vote" on public.opinion_votes;
create policy "withdraw your contribution vote" on public.opinion_votes for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.opinion_votes to authenticated;

/**
 * Vote, or take it back by pressing the same one again.
 *
 * Mirrors `vote_on_reply`, including the toggle: pressing Like when you already
 * liked it clears the vote rather than doing nothing. Returns what the row says
 * afterwards so the button reports the database's answer and not its own guess.
 */
create or replace function public.vote_on_opinion(opinion uuid, kind public.reader_vote)
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
    raise exception 'sign in to vote on a contribution';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended';
  end if;
  if not public.opinion_is_visible(opinion) then
    raise exception 'no such contribution';
  end if;

  select v.vote into held
    from public.opinion_votes v
   where v.opinion_id = opinion and v.user_id = uid;

  if held = kind then
    delete from public.opinion_votes where opinion_id = opinion and user_id = uid;
    return null;
  end if;

  insert into public.opinion_votes (opinion_id, user_id, vote)
  values (opinion, uid, kind)
  on conflict (opinion_id, user_id) do update set vote = excluded.vote;

  return kind;
end;
$$;

/** The caller's own votes across one topic's contributions, for first paint. */
create or replace function public.my_opinion_votes(topic uuid)
returns table (opinion_id uuid, vote public.reader_vote)
language sql
stable
security definer
set search_path = ''
as $$
  select v.opinion_id, v.vote
    from public.opinion_votes v
    join public.opinions o on o.id = v.opinion_id
   where o.topic_id = topic and v.user_id = (select auth.uid());
$$;

-- ------------------------------------------------- save and reactions go
--
-- Empty, unwired, and explicitly not wanted. The triggers are dropped before
-- the tables so the shared counter function stops referencing them.
drop trigger if exists opinion_saves_count on public.opinion_saves;
drop trigger if exists opinion_reactions_count on public.opinion_reactions;
drop trigger if exists opinion_helpful_count on public.opinion_helpful;

drop table if exists public.opinion_saves;
drop table if exists public.opinion_reactions;
drop table if exists public.opinion_helpful;

-- The view is rebuilt below without them, so the columns can go with the
-- tables that fed them.
drop view if exists public.opinion_feed;

alter table public.opinions
  drop column if exists save_count,
  drop column if exists insightful_count,
  drop column if exists useful_count,
  drop column if exists well_explained_count;

/**
 * The shared counter, minus the three branches whose tables no longer exist.
 *
 * Left in place for `opinion_replies`, which still uses it.
 */
create or replace function public.apply_opinion_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.opinion_id, old.opinion_id);
  step   integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if tg_table_name = 'opinion_replies' then
    update public.opinions set reply_count = greatest(reply_count + step, 0) where id = target;
    update public.topic_stats s
       set reply_count = greatest(s.reply_count + step, 0),
           last_activity_at = now(), updated_at = now()
      from public.opinions o where o.id = target and s.topic_id = o.topic_id;
  end if;
  return null;
end;
$$;

-- ------------------------------------------------- three edits, then no more
--
-- WHY A LIMIT AT ALL. A contribution that can be rewritten without end is a
-- contribution whose replies can be made to answer something that was never
-- said. Three is enough to fix a typo, then a fact, then a sentence that read
-- badly — and few enough that the version people replied to is still broadly
-- the version on the page.
--
-- Withdrawing is NOT limited. Taking your own words down is always allowed.
alter table public.opinions add column if not exists edit_count integer not null default 0;

comment on column public.opinions.edit_count is
  'Republishes of a rich contribution. Capped at 3 by publish_contribution. Withdrawing is unlimited.';

create or replace function public.publish_contribution(
  topic_slug text,
  vote public.sentiment,
  sections jsonb,
  anonymous boolean default false,
  media jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := (select auth.uid());
  target    uuid;
  headline  text;
  op_id     uuid;
  existing  public.opinions;
  section   jsonb;
  item      jsonb;
  new_sec   uuid;
  new_block uuid;
  opt       jsonb;
  i         integer;
begin
  if uid is null then
    raise exception 'sign in to publish';
  end if;
  if not public.is_active(uid) then
    raise exception 'this account is suspended and cannot post';
  end if;
  if not public.is_pro(uid) then
    raise exception 'rich contributions are a Pro format';
  end if;

  select t.id into target
    from public.topics t
   where t.slug = lower(trim(topic_slug))
     and t.published_at is not null
     and t.archived_at is null;
  if target is null then
    raise exception 'no such topic';
  end if;

  -- The headline doubles as the opinion's body. Not decoration: the feed query
  -- lists rows with a non-empty body, and `written_count` counts them, so a
  -- contribution with an empty body would publish successfully and then be
  -- invisible in the discussion it was written for.
  select s->>'text' into headline
    from jsonb_array_elements(sections) s
   where s->>'type' = 'headline'
   limit 1;

  if headline is null or length(trim(headline)) < 8 then
    raise exception 'a contribution needs a headline of at least 8 characters';
  end if;

  -- Checked before the write, and only for a row that is already a rich
  -- contribution: turning a plain opinion into one is a first publish, not an
  -- edit of something that was never a contribution.
  select * into existing
    from public.opinions o
   where o.topic_id = target and o.author_id = uid;

  if found and existing.format = 'pro' and existing.edit_count >= 3 then
    raise exception 'This contribution has been updated 3 times, which is the limit. You can still withdraw it.';
  end if;

  insert into public.opinions (topic_id, author_id, vote, body, format, anonymous, edit_count)
  values (target, uid, publish_contribution.vote, trim(headline), 'pro', publish_contribution.anonymous, 0)
  on conflict (topic_id, author_id) do update
    set vote       = excluded.vote,
        body       = excluded.body,
        format     = 'pro',
        anonymous  = excluded.anonymous,
        edit_count = case
                       when public.opinions.format = 'pro'
                       then public.opinions.edit_count + 1
                       else 0
                     end,
        edited_at  = now()
  returning id into op_id;

  -- Republishing replaces. The sections are the contribution, so merging an
  -- edit into whatever was there before would leave orphaned paragraphs from a
  -- draft the author had already deleted. Blocks and options cascade from here.
  delete from public.opinion_sections where opinion_id = op_id;
  delete from public.contribution_media where contribution_media.opinion_id = op_id;

  i := 0;
  for section in select * from jsonb_array_elements(sections)
  loop
    insert into public.opinion_sections (opinion_id, type, position, body, points)
    values (
      op_id,
      (section->>'type')::public.pro_section_type,
      i,
      nullif(section->>'text', ''),
      case
        when section ? 'points'
        then (select array_agg(p) from jsonb_array_elements_text(section->'points') p where trim(p) <> '')
        else null
      end
    )
    returning id into new_sec;

    if (section->>'type') = 'interactive' and section ? 'block' then
      insert into public.interactive_blocks (section_id, kind, prompt)
      values (
        new_sec,
        coalesce(section->'block'->>'kind', 'poll')::public.interactive_kind,
        coalesce(section->'block'->>'prompt', '')
      )
      returning id into new_block;

      for opt in select * from jsonb_array_elements(coalesce(section->'block'->'options', '[]'::jsonb))
      loop
        insert into public.interactive_options (block_id, label, position)
        values (
          new_block,
          coalesce(opt->>'label', trim(both '"' from opt::text)),
          coalesce((opt->>'position')::integer, 0)
        );
      end loop;
    end if;

    i := i + 1;
  end loop;

  i := 0;
  for item in select * from jsonb_array_elements(coalesce(media, '[]'::jsonb))
  loop
    insert into public.contribution_media
      (opinion_id, storage_path, kind, alt, width, height, position)
    values (
      op_id,
      item->>'path',
      coalesce(item->>'kind', 'image')::public.media_kind,
      coalesce(item->>'alt', ''),
      (item->>'width')::integer,
      (item->>'height')::integer,
      i
    );
    i := i + 1;
  end loop;

  return op_id;
end;
$$;

/**
 * Takes it down entirely — the contribution, its sections, its pictures, and
 * the vote that carried it.
 *
 * NOT the same as `unpublish_contribution`, which demotes to a standard opinion
 * and keeps the vote. Both exist because they answer different questions:
 * "I want this essay gone" and "I want my vote back". This one is what the
 * Withdraw button calls, and it is never rate limited.
 */
create or replace function public.withdraw_contribution(topic_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := (select auth.uid());
  removed integer;
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

-- --------------------------------------------------------- the view, again
--
-- Same masking rules as before — see the anonymous-contributions migration for
-- why `security_invoker` is off here and why the WHERE clause is the access
-- control rather than a convenience. Only the columns have changed.
create view public.opinion_feed as
  select
    o.id,
    o.topic_id,
    o.anonymous,
    case when o.anonymous and o.author_id is distinct from (select auth.uid())
         then null else o.author_id end                       as author_id,
    case when o.anonymous then null else p.display_name end   as display_name,
    case when o.anonymous then null else p.initials end       as initials,
    case when o.anonymous then null else o.author_line end    as author_line,
    case when o.anonymous then null else o.verified_label end as verified_label,
    o.vote,
    o.body,
    o.format,
    o.helpful_count,
    o.dislike_count,
    o.reply_count,
    o.edit_count,
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

grant select on public.opinion_feed to anon, authenticated;
