-- =============================================================================
-- Publishing a topic, in one statement.
--
-- A topic and its aspects are one thing, not three tables that happen to be
-- related. Written separately, a failure between the second insert and the third
-- leaves a published topic asking one question, or none — and "no votes yet" and
-- "nothing to vote on" look identical on the dashboard, so nobody notices until
-- an editor wonders why a topic gets no participation.
--
-- One function, one transaction. Either the whole topic exists or none of it
-- does.
-- =============================================================================

create or replace function public.author_topic(
  slug         text,
  name         text,
  category_id  text,
  place_id     text,
  status       public.artifact_status,
  summary      text,
  about        text,
  tags         text[],
  -- [{ key, label, prompt, options: [{ key, label, tone }] }]
  aspects      jsonb,
  publish      boolean default false
)
returns public.topics
language plpgsql
security definer
set search_path = ''
as $$
declare
  result  public.topics;
  aspect  jsonb;
  option  jsonb;
  aspect_id uuid;
  position  integer := 0;
  option_position integer;
begin
  if not public.is_editor() then
    raise exception 'only editors publish topics';
  end if;

  -- Two aspects minimum, and it is enforced here rather than only in the
  -- composer. A plain up/neutral/down vote says very little about a film or an
  -- exam; the questions are what make the result worth reading, and a rule that
  -- lives only in a form is a rule an API call skips.
  if jsonb_array_length(coalesce(aspects, '[]'::jsonb)) < 2 then
    raise exception 'a topic needs at least two aspects';
  end if;

  insert into public.topics (
    slug, name, category_id, place_id, status, summary, about, tags,
    created_by, published_at
  )
  values (
    lower(trim(author_topic.slug)), trim(author_topic.name), author_topic.category_id,
    author_topic.place_id, author_topic.status, trim(author_topic.summary),
    trim(author_topic.about), coalesce(author_topic.tags, '{}'),
    (select auth.uid()),
    case when publish then now() else null end
  )
  returning * into result;

  for aspect in select * from jsonb_array_elements(aspects) loop
    insert into public.topic_aspects (topic_id, key, label, prompt, position)
    values (
      result.id,
      aspect ->> 'key',
      aspect ->> 'label',
      aspect ->> 'prompt',
      position
    )
    returning id into aspect_id;

    option_position := 0;
    for option in select * from jsonb_array_elements(aspect -> 'options') loop
      insert into public.topic_aspect_options (aspect_id, key, label, tone, position)
      values (
        aspect_id,
        option ->> 'key',
        option ->> 'label',
        (option ->> 'tone')::public.sentiment,
        option_position
      );
      option_position := option_position + 1;
    end loop;

    position := position + 1;
  end loop;

  return result;
end;
$$;

comment on function public.author_topic is
  'Creates a topic and its aspects atomically. Editor-only. Publishing is a flag rather than a second call, so a topic is never briefly live with no questions on it.';

-- Is this address free?
--
-- Needed because the composer checks as you type, and `topics` is only readable
-- to an editor while unpublished — so a plain select would report a draft's slug
-- as available to the very person who has to avoid colliding with it.
create or replace function public.slug_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.topics where slug = lower(trim(candidate))
    union all
    select 1 from public.polls where slug = lower(trim(candidate))
  );
$$;

comment on function public.slug_available is
  'Topics and polls share one address space: /topics/x and /polls/x being different things with the same name is a link nobody can read aloud correctly.';
