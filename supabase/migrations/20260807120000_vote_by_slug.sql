-- =============================================================================
-- Voting, addressed by slug.
--
-- Every component in the app identifies a topic by its slug — that is what the
-- routes carry and what `Topic.id` holds. The primary key exists only in the
-- database, and threading it through the dashboard, the vote panel, the facet
-- panel and the composer purely so a write could name a row would have been a
-- refactor of a dozen files in service of a column.
--
-- SECURITY INVOKER, deliberately. These run as the caller, so the row policies
-- on `opinions` still decide: signed out is refused, suspended is refused, an
-- unpublished topic is refused. The function resolves an address; it grants
-- nothing.
-- =============================================================================

create or replace function public.cast_vote(
  topic_slug text,
  vote public.sentiment,
  body text default ''
)
returns public.opinions
language plpgsql
-- No `security definer`. Read the note above before changing this.
security invoker
set search_path = public, pg_temp
as $$
declare
  target uuid;
  result public.opinions;
begin
  select t.id into target from public.topics t where t.slug = lower(trim(topic_slug));
  if target is null then
    raise exception 'no such topic';
  end if;

  -- Upsert against the one-account-one-vote constraint rather than reading and
  -- then writing: two tabs racing a read-then-write either collide on the key or
  -- lose one of the updates.
  insert into public.opinions (topic_id, author_id, vote, body)
  values (target, auth.uid(), cast_vote.vote, coalesce(trim(cast_vote.body), ''))
  on conflict (topic_id, author_id) do update
    set vote = excluded.vote,
        body = excluded.body,
        edited_at = now()
  returning * into result;

  return result;
end;
$$;

comment on function public.cast_vote is
  'Records or updates the caller''s vote on a topic, addressed by slug. Runs as the caller: RLS decides.';

create or replace function public.withdraw_vote(topic_slug text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.opinions o
   using public.topics t
   where t.slug = lower(trim(topic_slug))
     and o.topic_id = t.id
     and o.author_id = auth.uid();

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- Every vote the caller has cast, keyed by the slug the app addresses topics by.
--
-- One query instead of one per topic. The client holds these as a cache so a
-- card can show "you voted Positive" without asking again per render.
create or replace function public.my_votes()
returns table (topic_slug text, vote public.sentiment, body text, updated_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select t.slug, o.vote, o.body, o.updated_at
    from public.opinions o
    join public.topics t on t.id = o.topic_id
   where o.author_id = auth.uid();
$$;

-- The caller's own aspect answers, keyed `aspectId` — the same key the facet
-- panel already uses, because `Facet.id` carries the database id.
create or replace function public.my_facet_answers()
returns table (aspect_id uuid, option_id uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.aspect_id, r.option_id
    from public.facet_responses r
   where r.user_id = auth.uid();
$$;
