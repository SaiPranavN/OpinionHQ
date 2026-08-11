-- =============================================================================
-- `explain_poll_vote` has to be definer, and here is the whole reason.
--
-- `poll_reasons` grants `update (body, hidden_at, hidden_reason)` to
-- authenticated and deliberately withholds `option_id`. That is right: the
-- insert policy says you may only explain a pick you actually made, and a
-- client that could rewrite `option_id` afterwards would walk straight around
-- it — filing a written case under an option it never voted for, where it would
-- be counted and displayed as that side's argument.
--
-- But changing your mind has to move the reason with the vote, which is an
-- update to exactly that column. As `security invoker` the function inherits
-- the caller's grants and fails with "permission denied for table
-- poll_reasons", which is the restriction working as designed.
--
-- So it runs as definer, and the function becomes the check the policy was:
-- `option_id` is read from the caller's OWN vote row rather than accepted as an
-- argument, so there is no value a caller can pass that files a reason under a
-- side they did not pick. The privilege is elevated; the guarantee is not
-- weakened.
-- =============================================================================

create or replace function public.explain_poll_vote(poll_slug text, reason text)
returns public.poll_reasons
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_poll uuid;
  their_pick  uuid;
  author      uuid := auth.uid();
  result      public.poll_reasons;
begin
  -- Definer functions do not get this for free. An invoker function would have
  -- been refused by the policies above; this one has to say so itself.
  if author is null then
    raise exception 'sign in to explain your vote';
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

  insert into public.poll_reasons (poll_id, user_id, option_id, body)
  values (target_poll, author, their_pick, trim(reason))
  on conflict (poll_id, user_id) do update
    set body = excluded.body,
        option_id = excluded.option_id
  returning * into result;

  return result;
end;
$$;

comment on function public.explain_poll_vote is
  'Files or rewrites the caller''s written reason, always against the option they actually voted for. '
  'Definer because poll_reasons withholds update(option_id) from clients by design; the option is read '
  'from the caller''s own vote, never passed in.';

revoke all on function public.explain_poll_vote(text, text) from public;
grant execute on function public.explain_poll_vote(text, text) to authenticated;
