-- =============================================================================
-- Suggesting a subject, and getting the credit for it.
--
-- `topic_requests` has existed since the topics migration and nothing has ever
-- written to it. This gives it a poll-shaped twin, an approval path that
-- actually produces the thing, and the part that makes it worth doing at all:
-- the name of whoever asked stays attached to the subject once it is live.
--
-- CREDIT LIVES ON THE SUBJECT, NOT ON THE REQUEST. `topic_requests.topic_id`
-- already links the two, so `suggested_by` on `topics` is strictly redundant —
-- and it is still the right place for it. The card query on the explore page
-- would otherwise have to join through the request table on every render to
-- print one name, and a request can be deleted by an admin clearing a queue
-- without anybody intending to strip the credit from a live topic.
-- =============================================================================

-- --------------------------------------------------------------- slugs
--
-- Approving has to produce a URL, and asking the admin to type one at the
-- moment of approval turns a one-click action into a form.
create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- Appends -2, -3 … only when it has to. A suffix on the first one would make
-- every URL on the site look like a collision.
create or replace function public.unique_topic_slug(input text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base text := public.slugify(input);
  try  text := base;
  n    integer := 1;
begin
  if base = '' then base := 'topic'; try := base; end if;
  while exists (select 1 from public.topics t where t.slug = try) loop
    n := n + 1;
    try := base || '-' || n;
  end loop;
  return try;
end;
$$;

create or replace function public.unique_poll_slug(input text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base text := public.slugify(input);
  try  text := base;
  n    integer := 1;
begin
  if base = '' then base := 'poll'; try := base; end if;
  while exists (select 1 from public.polls p where p.slug = try) loop
    n := n + 1;
    try := base || '-' || n;
  end loop;
  return try;
end;
$$;

-- ------------------------------------------------------------- the credit
alter table public.topics add column if not exists suggested_by uuid
  references public.profiles (id) on delete set null;
alter table public.polls  add column if not exists suggested_by uuid
  references public.profiles (id) on delete set null;

comment on column public.topics.suggested_by is
  'Whoever suggested this, once an editor approved it. Survives the request row being cleared. Null for editorial topics.';

-- ---------------------------------------------------------- poll requests
create table if not exists public.poll_requests (
  id            uuid primary key default gen_random_uuid(),
  requested_by  uuid not null references public.profiles (id) on delete cascade,
  question      text not null,
  -- The options are half of a poll question. "Should X happen" with no answers
  -- offered is a topic, not a poll, and an approver with no options in front of
  -- them has to invent them and is then guessing at what was meant.
  option_labels text[] not null default '{}',
  category_id   text references public.categories (id) on update cascade,
  place_id      text references public.places (id) on update cascade,
  rationale     text not null default '',
  poll_id       uuid references public.polls (id) on delete set null,
  declined_at   timestamptz,
  decline_note  text,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists poll_requests_open_idx on public.poll_requests (created_at desc)
  where poll_id is null and declined_at is null;

drop trigger if exists poll_requests_set_updated_at on public.poll_requests;
create trigger poll_requests_set_updated_at
before update on public.poll_requests
for each row execute function public.set_updated_at();

alter table public.poll_requests enable row level security;

drop policy if exists "own poll requests" on public.poll_requests;
create policy "own poll requests" on public.poll_requests for select
  using ((select auth.uid()) = requested_by or public.is_editor());

drop policy if exists "pro suggests a poll" on public.poll_requests;
create policy "pro suggests a poll" on public.poll_requests for insert
  with check ((select auth.uid()) = requested_by and public.is_pro() and public.is_active());

drop policy if exists "editors review poll requests" on public.poll_requests;
create policy "editors review poll requests" on public.poll_requests for update
  using (public.is_editor()) with check (public.is_editor());

grant select, insert on public.poll_requests to authenticated;

-- Suggesting a topic becomes Pro too. It was open to every member and nothing
-- had ever been written through it, so nothing is being taken away from anyone.
drop policy if exists "request a topic" on public.topic_requests;
create policy "request a topic" on public.topic_requests for insert
  with check ((select auth.uid()) = requested_by and public.is_pro() and public.is_active());

grant select, insert on public.topic_requests to authenticated;

-- ============================================================================
-- Approving.
--
-- Produces a DRAFT, not a live topic. The request carries a name, a category, a
-- place and a paragraph of reasoning — enough to create the subject and nowhere
-- near enough to publish it, which needs a summary, the background, aspects and
-- an editor's judgement about status. So approval creates the row, hands the
-- credit over, and drops the editor into the existing editor to finish it.
--
-- Approving is therefore reversible right up until publication, which is the
-- correct shape for a queue that anybody can put things into.
-- ============================================================================
create or replace function public.approve_topic_request(request uuid)
returns public.topics
language plpgsql
security definer
set search_path = ''
as $$
declare
  req    public.topic_requests;
  result public.topics;
begin
  if not public.is_editor() then
    raise exception 'only editors approve suggestions';
  end if;

  select * into req from public.topic_requests where id = request;
  if not found then
    raise exception 'no such suggestion';
  end if;
  if req.topic_id is not null then
    raise exception 'that suggestion has already been approved';
  end if;

  insert into public.topics
    (slug, name, category_id, place_id, status, summary, about, tags, created_by, suggested_by)
  values (
    public.unique_topic_slug(req.name),
    req.name,
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

  update public.topic_requests
     set topic_id = result.id, reviewed_by = (select auth.uid()), updated_at = now()
   where id = request;

  perform public.record_admin_action(
    'suggestion_approved', result.id, result.name, 'topic suggestion'
  );

  return result;
end;
$$;

create or replace function public.decline_topic_request(request uuid, note text default '')
returns public.topic_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.topic_requests;
begin
  if not public.is_editor() then
    raise exception 'only editors review suggestions';
  end if;

  update public.topic_requests
     set declined_at = now(), decline_note = note,
         reviewed_by = (select auth.uid()), updated_at = now()
   where id = request and topic_id is null
  returning * into result;

  if not found then
    raise exception 'no such open suggestion';
  end if;

  perform public.record_admin_action('suggestion_declined', request, result.name, note);
  return result;
end;
$$;

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
    insert into public.poll_options (poll_id, slot, name, position)
    values (result.id, slots[i], label, i - 1);
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

create or replace function public.decline_poll_request(request uuid, note text default '')
returns public.poll_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.poll_requests;
begin
  if not public.is_editor() then
    raise exception 'only editors review suggestions';
  end if;

  update public.poll_requests
     set declined_at = now(), decline_note = note,
         reviewed_by = (select auth.uid()), updated_at = now()
   where id = request and poll_id is null
  returning * into result;

  if not found then
    raise exception 'no such open suggestion';
  end if;

  perform public.record_admin_action('suggestion_declined', request, result.question, note);
  return result;
end;
$$;

-- ============================================================================
-- The credit, on the card.
--
-- Added at the end of each view so `create or replace` accepts it — existing
-- columns keep their names, types and order, and every query already written
-- against these views is unaffected.
--
-- `security_invoker` is restated rather than assumed. It is on for both of
-- these today and dropping it here would silently turn two ordinary views into
-- owner-rights views, which is a security change made by omission.
-- ============================================================================
create or replace view public.topic_cards
with (security_invoker = on) as
  select
    t.id, t.slug, t.name, t.category_id, t.place_id,
    pl.path as place_path,
    t.status, t.summary, t.tags, t.published_at, t.updated_at,
    s.positive_count, s.neutral_count, s.negative_count,
    s.participants, s.written_count, s.reply_count, s.follower_count,
    s.trend_score, s.last_activity_at,
    s.change_metric, s.change_value, s.change_direction,
    t.suggested_by,
    sp.display_name as suggested_by_name
  from public.topics t
  join public.topic_stats s on s.topic_id = t.id
  join public.places pl on pl.id = t.place_id
  left join public.profiles sp on sp.id = t.suggested_by;

create or replace view public.poll_cards
with (security_invoker = on) as
  select
    p.id, p.slug, p.question, p.category_id, p.place_id,
    pl.path as place_path,
    p.status, p.summary, p.tags, p.closes_at, p.published_at, p.updated_at,
    s.total_votes, s.reason_count, s.trend_score, s.last_activity_at,
    p.suggested_by,
    sp.display_name as suggested_by_name
  from public.polls p
  join public.poll_stats s on s.poll_id = p.id
  join public.places pl on pl.id = p.place_id
  left join public.profiles sp on sp.id = p.suggested_by;
