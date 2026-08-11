-- =============================================================================
-- Voting in a poll, addressed by slug and option letter.
--
-- The same reasoning as `public.cast_vote` for topics: every component in the
-- app identifies a poll by its slug and an option by its letter, because that
-- is what routes and props carry. Threading two uuids through the catalog, the
-- vote panel and the reasons list purely so a write could name a row would be a
-- refactor of a dozen files in service of a column.
--
-- SECURITY INVOKER throughout. These run as the caller, so the row policies
-- still decide: signed out is refused, a closed poll is refused, an option that
-- belongs to another poll is refused. The functions resolve an address; they
-- grant nothing. Contrast `poll_audience`, which must be definer and is
-- therefore written to be its own security boundary.
-- =============================================================================

create or replace function public.cast_poll_vote(poll_slug text, option_slot public.option_slot)
returns public.poll_votes
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_poll   uuid;
  target_option uuid;
  result        public.poll_votes;
begin
  select p.id into target_poll
    from public.polls p
   where p.slug = lower(trim(poll_slug));
  if target_poll is null then
    raise exception 'no such poll';
  end if;

  -- Resolved against *this* poll, so a caller cannot name an option letter and
  -- have it land on whichever poll happens to own that letter.
  select o.id into target_option
    from public.poll_options o
   where o.poll_id = target_poll and o.slot = cast_poll_vote.option_slot;
  if target_option is null then
    raise exception 'this poll has no option %', option_slot;
  end if;

  insert into public.poll_votes (poll_id, user_id, option_id)
  values (target_poll, auth.uid(), target_option)
  on conflict (poll_id, user_id) do update
    set option_id = excluded.option_id
  returning * into result;

  return result;
end;
$$;

comment on function public.cast_poll_vote is
  'Records or changes the caller''s pick in a poll, addressed by slug and option letter. Runs as the caller: RLS decides.';

create or replace function public.withdraw_poll_vote(poll_slug text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  -- The reason goes with the vote. A written case for an option you no longer
  -- hold, left sitting under that option, misrepresents the person who wrote
  -- it — and the insert policy would not let them re-file it anyway.
  delete from public.poll_reasons r
   using public.polls p
   where p.slug = lower(trim(poll_slug))
     and r.poll_id = p.id
     and r.user_id = auth.uid();

  delete from public.poll_votes v
   using public.polls p
   where p.slug = lower(trim(poll_slug))
     and v.poll_id = p.id
     and v.user_id = auth.uid();

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Explaining a pick.
--
-- The reason is filed against the option the caller actually voted for, read
-- from their vote rather than passed in. The insert policy on `poll_reasons`
-- already refuses a mismatch; taking the option from the vote means an honest
-- client cannot trip that policy by getting the two out of step after a change
-- of mind.
create or replace function public.explain_poll_vote(poll_slug text, reason text)
returns public.poll_reasons
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_poll uuid;
  their_pick  uuid;
  result      public.poll_reasons;
begin
  select p.id into target_poll
    from public.polls p
   where p.slug = lower(trim(poll_slug));
  if target_poll is null then
    raise exception 'no such poll';
  end if;

  select v.option_id into their_pick
    from public.poll_votes v
   where v.poll_id = target_poll and v.user_id = auth.uid();
  if their_pick is null then
    raise exception 'vote before explaining your vote';
  end if;

  insert into public.poll_reasons (poll_id, user_id, option_id, body)
  values (target_poll, auth.uid(), their_pick, trim(reason))
  on conflict (poll_id, user_id) do update
    set body = excluded.body,
        -- Changing your mind moves the reason to the new side with it.
        option_id = excluded.option_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.retract_poll_reason(poll_slug text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.poll_reasons r
   using public.polls p
   where p.slug = lower(trim(poll_slug))
     and r.poll_id = p.id
     and r.user_id = auth.uid();
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marking a reason helpful, and unmarking it.
--
-- One row per (reason, caller) by primary key, so the toggle is idempotent —
-- a double-click cannot count twice, and the counter on `poll_reasons` is
-- maintained by trigger rather than by the client sending an increment.
create or replace function public.toggle_reason_helpful(reason uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.poll_reason_helpful h
   where h.reason_id = reason and h.user_id = auth.uid();
  get diagnostics removed = row_count;

  if removed > 0 then
    return false;
  end if;

  insert into public.poll_reason_helpful (reason_id, user_id)
  values (reason, auth.uid());
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- The caller's own picks, keyed by the slug the app addresses polls by.
--
-- One query instead of one per poll, so a catalog card can show "you picked
-- Beta" without asking again per render.
create or replace function public.my_poll_votes()
returns table (poll_slug text, option_slot public.option_slot, updated_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p.slug, o.slot, v.updated_at
    from public.poll_votes v
    join public.polls p on p.id = v.poll_id
    join public.poll_options o on o.id = v.option_id
   where v.user_id = auth.uid();
$$;
