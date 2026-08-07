-- =============================================================================
-- Publishing a poll, in one statement.
--
-- The same reasoning as `author_topic`: a poll and its options are one thing,
-- not two tables that happen to be related. Written separately, a failure
-- between the poll insert and the second option leaves a published poll with
-- one choice on it — which is not a poll, and which the split bar renders as a
-- unanimous 100% result. One function, one transaction.
--
-- The two-option minimum is enforced here rather than only in the composer,
-- because a rule that lives in a form is a rule an API call skips.
-- =============================================================================

create or replace function public.author_poll(
  slug        text,
  question    text,
  category_id text,
  place_id    text,
  status      public.artifact_status,
  summary     text,
  about       text,
  tags        text[],
  -- [{ name, blurb }] in the order they are shown. The slot letter is assigned
  -- from the position rather than accepted, so an author cannot leave a gap.
  options     jsonb,
  closes_at   timestamptz default null,
  publish     boolean default false
)
returns public.polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  result   public.polls;
  option   jsonb;
  slot_of  public.option_slot;
  position integer := 0;
  count_of integer;
begin
  if not public.is_editor() then
    raise exception 'only editors publish polls';
  end if;

  count_of := jsonb_array_length(coalesce(options, '[]'::jsonb));
  if count_of < 2 then
    raise exception 'a poll needs at least two options';
  end if;
  if count_of > 4 then
    raise exception 'a poll asks at most four options';
  end if;

  -- A close date in the past would publish a poll that is already shut, which
  -- reads as a bug rather than as a decision.
  if author_poll.closes_at is not null and author_poll.closes_at <= now() then
    raise exception 'a poll cannot close before it opens';
  end if;

  insert into public.polls (
    slug, question, category_id, place_id, status, summary, about, tags,
    closes_at, created_by, published_at
  )
  values (
    lower(trim(author_poll.slug)), trim(author_poll.question), author_poll.category_id,
    author_poll.place_id, author_poll.status, trim(author_poll.summary),
    trim(author_poll.about), coalesce(author_poll.tags, '{}'),
    author_poll.closes_at, (select auth.uid()),
    case when publish then now() else null end
  )
  returning * into result;

  for option in select * from jsonb_array_elements(options) loop
    slot_of := (array['a', 'b', 'c', 'd'])[position + 1]::public.option_slot;
    insert into public.poll_options (poll_id, slot, name, blurb)
    values (result.id, slot_of, trim(option ->> 'name'), coalesce(trim(option ->> 'blurb'), ''));
    position := position + 1;
  end loop;

  return result;
end;
$$;

comment on function public.author_poll is
  'Creates a poll and its options atomically. Editor-only. Publishing is a flag rather than a second call, so a poll is never briefly live with one option on it.';

-- ---------------------------------------------------------------------------
-- Lifecycle, matching what topics already have.
--
-- Archiving is the reversible one and deletion is not. Deleting a poll takes
-- every vote cast in it, which is why the admin screen asks twice.
create or replace function public.archive_poll(target uuid)
returns public.polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.polls;
begin
  if not public.is_editor() then
    raise exception 'only editors archive polls';
  end if;
  update public.polls set archived_at = now() where id = target returning * into result;
  return result;
end;
$$;

create or replace function public.restore_poll(target uuid)
returns public.polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.polls;
begin
  if not public.is_editor() then
    raise exception 'only editors restore polls';
  end if;
  update public.polls set archived_at = null where id = target returning * into result;
  return result;
end;
$$;
