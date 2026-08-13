-- =============================================================================
-- Images and GIFs on a contribution, and one call that publishes the lot.
--
-- TWO THINGS THAT LOOK UNRELATED AND ARE NOT. A rich contribution is an opinion
-- row, plus its sections, plus a block, plus that block's options, plus now
-- some media. Written from the browser that is five round trips with no
-- transaction around them, and the failure mode is not theoretical: lose the
-- connection after the third and the site has a published contribution with
-- half its argument missing and no way for the author to tell. So the write is
-- one function, and either all of it lands or none of it does.
--
-- ONE CONTRIBUTION PER TOPIC PER PERSON. `opinions` is unique on
-- `(topic_id, author_id)` — that constraint is what makes one account one vote
-- true — so publishing again replaces what was there rather than adding a
-- second. The localStorage version allowed a stack of them per topic. It was
-- the localStorage version that was wrong.
-- =============================================================================

do $$ begin
  create type public.media_kind as enum ('image', 'gif');
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------ the bucket
--
-- Public read, because these are attachments on public contributions and
-- signing every one of them on every page render buys nothing.
--
-- THE PATH CARRIES NO USER ID, which is the opposite of the usual Supabase
-- convention of `<uid>/<file>` and is deliberate: a URL is markup, it is public,
-- and `…/contributions/3bb8af83-…/cat.gif` under an anonymous post hands over
-- exactly the identifier the previous migration went to such lengths to remove.
-- Ownership is enforced through `storage.objects.owner`, which Supabase fills
-- in on upload and which no client can set.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contributions', 'contributions', true,
  5 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upload is Pro, and it is checked here rather than only in the composer,
-- because the composer is not what stops a script.
drop policy if exists "pro uploads a contribution image" on storage.objects;
create policy "pro uploads a contribution image" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contributions'
    and public.is_pro()
    and public.is_active()
  );

drop policy if exists "remove your own upload" on storage.objects;
create policy "remove your own upload" on storage.objects for delete
  to authenticated
  using (bucket_id = 'contributions' and owner = (select auth.uid()));

-- NOTE THE ABSENT SELECT POLICY. Downloads on a public bucket do not read this
-- table, so leaving it unreadable costs nothing and stops a client listing
-- objects — a list would expose `owner`, and an owner column beside a file
-- attached to an anonymous post is the same leak by a longer route.

-- -------------------------------------------------------------- the rows
create table if not exists public.contribution_media (
  id             uuid primary key default gen_random_uuid(),
  -- Exactly one of these. A single `subject_id uuid` with a `kind` beside it
  -- would be shorter and would give up the foreign keys, and with them the
  -- guarantee that deleting a contribution takes its pictures with it.
  opinion_id     uuid references public.opinions (id) on delete cascade,
  poll_reason_id uuid references public.poll_reasons (id) on delete cascade,
  storage_path   text not null,
  kind           public.media_kind not null default 'image',
  -- Not optional in spirit even though it is nullable in practice: an image
  -- with no description is invisible to anybody using a screen reader, and the
  -- composer asks for one.
  alt            text not null default '',
  width          integer,
  height         integer,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint media_has_one_subject
    check (num_nonnulls(opinion_id, poll_reason_id) = 1)
);

create index if not exists contribution_media_opinion_idx
  on public.contribution_media (opinion_id, position);
create index if not exists contribution_media_reason_idx
  on public.contribution_media (poll_reason_id, position);

alter table public.contribution_media enable row level security;

-- Helpers for the poll side, matching the ones the previous migration added for
-- opinions. Definer for the same reason: the policies below must not depend on
-- the caller holding `select` on `poll_reasons`, because they do not.
create or replace function public.owns_poll_reason(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.poll_reasons r
     where r.id = rid and r.user_id = (select auth.uid())
  );
$$;

create or replace function public.poll_reason_is_visible(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.poll_reasons r
     where r.id = rid
       and (r.hidden_at is null or r.user_id = (select auth.uid()) or public.is_editor())
  );
$$;

drop policy if exists "media follows its subject" on public.contribution_media;
create policy "media follows its subject" on public.contribution_media for select
  using (
    (opinion_id is not null and public.opinion_is_visible(opinion_id))
    or (poll_reason_id is not null and public.poll_reason_is_visible(poll_reason_id))
  );

drop policy if exists "pro attaches media to its own post" on public.contribution_media;
create policy "pro attaches media to its own post" on public.contribution_media for insert
  with check (
    public.is_pro()
    and (
      (opinion_id is not null and public.owns_opinion(opinion_id))
      or (poll_reason_id is not null and public.owns_poll_reason(poll_reason_id))
    )
  );

drop policy if exists "remove media from your own post" on public.contribution_media;
create policy "remove media from your own post" on public.contribution_media for delete
  using (
    (opinion_id is not null and public.owns_opinion(opinion_id))
    or (poll_reason_id is not null and public.owns_poll_reason(poll_reason_id))
  );

grant select, insert, delete on public.contribution_media to authenticated;
grant select on public.contribution_media to anon;

-- ============================================================================
-- Publishing, in one transaction.
--
-- `sections` arrives as the composer's own array:
--
--   [{"type":"headline","position":0,"text":"…"},
--    {"type":"key_points","position":2,"points":["…"]},
--    {"type":"interactive","position":3,
--     "block":{"kind":"poll","prompt":"…","options":["…","…"]}}]
--
-- and `media` as [{"path":"…","kind":"image","alt":"…","width":0,"height":0}].
--
-- Definer, so the guards are written out. Every one of them corresponds to a
-- row policy that would otherwise have caught it.
-- ============================================================================
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

  insert into public.opinions (topic_id, author_id, vote, body, format, anonymous)
  values (target, uid, publish_contribution.vote, trim(headline), 'pro', publish_contribution.anonymous)
  on conflict (topic_id, author_id) do update
    set vote      = excluded.vote,
        body      = excluded.body,
        format    = 'pro',
        anonymous = excluded.anonymous,
        edited_at = now()
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

comment on function public.publish_contribution is
  'Publishes a rich contribution — opinion, sections, block, options and media — in one transaction. Replaces the author''s existing contribution on that topic.';

-- Withdrawing back to nothing. Separate from `withdraw_vote` because a
-- contributor who wants their essay gone usually does not want their vote gone
-- with it, and conflating the two loses a measurement nobody asked to remove.
create or replace function public.unpublish_contribution(topic_slug text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := (select auth.uid());
  op_id uuid;
begin
  if uid is null then
    raise exception 'sign in first';
  end if;

  select o.id into op_id
    from public.opinions o
    join public.topics t on t.id = o.topic_id
   where t.slug = lower(trim(topic_slug)) and o.author_id = uid;

  if op_id is null then
    return false;
  end if;

  delete from public.opinion_sections where opinion_id = op_id;
  delete from public.contribution_media where contribution_media.opinion_id = op_id;

  -- Back to a standard opinion with the headline as its text, rather than a
  -- deletion: the vote stays, and so does whatever they had said.
  update public.opinions set format = 'standard', edited_at = now() where id = op_id;
  return true;
end;
$$;
