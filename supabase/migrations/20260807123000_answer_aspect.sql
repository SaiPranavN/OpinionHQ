-- =============================================================================
-- Answering an aspect.
--
-- `facet_responses.topic_id` is denormalised so a tally never has to walk back
-- up to the topic, and a trigger fills it from the aspect — so the value is
-- never the client's to supply. But the column is `not null`, which means a
-- direct insert has to name it anyway, and the only thing the browser holds is
-- the slug.
--
-- Rather than send a value that is about to be overwritten (or widen the column
-- to nullable and lose the guarantee), the write goes through here. Security
-- invoker: the policies on `facet_responses` still decide.
-- =============================================================================

create or replace function public.answer_aspect(aspect uuid, choice uuid)
returns public.facet_responses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  result public.facet_responses;
begin
  insert into public.facet_responses (aspect_id, user_id, option_id, topic_id)
  values (
    answer_aspect.aspect,
    auth.uid(),
    answer_aspect.choice,
    -- Overwritten by `check_facet_option` before the row lands; supplied only
    -- because the column is not null. The trigger is what makes it correct.
    (select a.topic_id from public.topic_aspects a where a.id = answer_aspect.aspect)
  )
  on conflict (aspect_id, user_id) do update
    set option_id = excluded.option_id,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

-- `my_facet_answers` gains the topic's slug.
--
-- The facet panel keys its answers `topicSlug:aspectId` — it renders one topic
-- and builds the key from what it is rendering. The first version of this
-- function returned only the aspect, so the client had no way to build that key
-- and would have silently shown every question as unanswered. Dropped rather
-- than replaced because the return type changes.
drop function if exists public.my_facet_answers();

create or replace function public.my_facet_answers()
returns table (topic_slug text, aspect_id uuid, option_id uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select t.slug, r.aspect_id, r.option_id
    from public.facet_responses r
    join public.topics t on t.id = r.topic_id
   where r.user_id = auth.uid();
$$;

create or replace function public.clear_aspect(aspect uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.facet_responses
   where aspect_id = clear_aspect.aspect and user_id = auth.uid();
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;
