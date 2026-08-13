-- =============================================================================
-- `approve_poll_request` wrote to a column that does not exist.
--
-- `poll_options` orders by `slot` — the a/b/c/d enum — and has no `position`.
-- The function was written as though it mirrored `interactive_options`, which
-- does have one.
--
-- Nothing caught this at creation because plpgsql does not resolve column names
-- until the statement runs, so the function was created cleanly and would have
-- failed on the first poll suggestion anybody approved. `npm run db:lint` found
-- it, which is the whole argument for running it on every migration rather than
-- trusting a clean `db push`.
-- =============================================================================

create or replace function public.approve_poll_request(request uuid)
returns public.polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  req    public.poll_requests;
  result public.polls;
  label  text;
  slots  public.option_slot[] := array['a','b','c','d']::public.option_slot[];
  i      integer := 1;
begin
  if not public.is_editor() then
    raise exception 'only editors approve suggestions';
  end if;

  select * into req from public.poll_requests where id = request;
  if not found then
    raise exception 'no such suggestion';
  end if;
  if req.poll_id is not null then
    raise exception 'that suggestion has already been approved';
  end if;

  insert into public.polls
    (slug, question, category_id, place_id, status, summary, about, tags, created_by, suggested_by)
  values (
    public.unique_poll_slug(req.question),
    req.question,
    coalesce(req.category_id, 'society'),
    coalesce(req.place_id, 'india'),
    'Proposed',
    left(req.rationale, 280),
    req.rationale,
    '{}',
    (select auth.uid()),
    req.requested_by
  )
  returning * into result;

  -- Two named options minimum, because a poll with one answer is a statement.
  -- The suggester's own labels where they gave them, a plain Yes/No where they
  -- did not, and never more than the four slots the schema has.
  foreach label in array (
    case when array_length(req.option_labels, 1) >= 2
         then req.option_labels[1:4]
         else array['Yes', 'No'] end
  )
  loop
    insert into public.poll_options (poll_id, slot, name)
    values (result.id, slots[i], label);
    i := i + 1;
  end loop;

  update public.poll_requests
     set poll_id = result.id, reviewed_by = (select auth.uid()), updated_at = now()
   where id = request;

  perform public.record_admin_action(
    'suggestion_approved', result.id, result.question, 'poll suggestion'
  );

  return result;
end;
$$;
