-- =============================================================================
-- Reference tables — the editorial vocabularies.
--
-- These are facts about the product, not about people: the category list, the
-- places tree, the question sets, the kinds of proof that can be checked. They
-- are world-readable, never writable by a participant, and their rows are the
-- FK targets that stop a topic being filed under a category that does not exist.
--
-- THEIR CONTENTS ARE GENERATED, NOT HAND-WRITTEN. `npm run db:gen-reference`
-- emits a migration from `src/lib/places.ts`, `src/lib/taxonomy.ts`,
-- `src/lib/facets.ts` and friends, so the TypeScript stays the single source of
-- truth and nobody has to keep two lists in step by remembering to.
-- =============================================================================

-- ------------------------------------------------------------------- places
--
-- A containment tree, not a tag (see `src/lib/places.ts` for why). `path` is the
-- materialised chain from this place up to the root, and it is what makes
-- "everything in Karnataka" one indexed array containment test rather than a
-- recursive CTE on every catalog query.
create table public.places (
  id          text primary key,
  label       text        not null,
  short       text        not null,
  level       public.place_level not null,
  parent_id   text        references public.places (id) on delete restrict,
  -- Innermost first: Bengaluru → Karnataka → India → worldwide. Maintained by
  -- trigger; never written by hand.
  path        text[]      not null default '{}',
  sort_order  integer     not null default 0,

  -- Exactly one root, and it is `worldwide`. An artifact with no place is an
  -- artifact somebody forgot to place; an artifact placed `worldwide` is a
  -- deliberate statement that geography does not bear on it.
  constraint places_root_is_world check (
    (parent_id is null and level = 'world') or (parent_id is not null and level <> 'world')
  )
);

create index places_parent_idx on public.places (parent_id);
create index places_path_idx on public.places using gin (path);

-- Rebuilds `path` for a row and everything under it.
create or replace function public.refresh_place_paths()
returns trigger
language plpgsql
as $$
begin
  with recursive chain as (
    select p.id, array[p.id] as path, p.parent_id
    from public.places p
    where p.parent_id is null
    union all
    select c.id, c.id || chain.path, c.parent_id
    from public.places c
    join chain on c.parent_id = chain.id
  )
  update public.places p
     set path = chain.path
    from chain
   where p.id = chain.id
     and p.path is distinct from chain.path;
  return null;
end;
$$;

-- Statement-level: one rebuild per statement, not one per row, so seeding the
-- whole tree in a single insert does the walk once.
create trigger places_refresh_paths
after insert or update of parent_id or delete on public.places
for each statement execute function public.refresh_place_paths();

-- Does an artifact placed at `place` fall inside `filter`?
--
-- One direction only. Karnataka covers Bengaluru; Bengaluru does not cover
-- Karnataka. And filtering to India does NOT return `worldwide` artifacts — a
-- place filter that quietly widens itself is a filter you stop trusting.
create or replace function public.place_covers(filter_id text, place_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select filter_id is null
      or exists (
        select 1 from public.places p
        where p.id = place_id and filter_id = any (p.path)
      );
$$;

-- --------------------------------------------------------------- categories
create table public.categories (
  id          text primary key,
  label       text    not null,
  short       text    not null,
  blurb       text    not null,
  -- The catch-all. No editor-published topic lives here; it is only reachable by
  -- someone creating a topic or poll that genuinely fits nothing else.
  reserved    boolean not null default false,
  sort_order  integer not null default 0
);

-- ------------------------------------------------------------ ask categories
create table public.ask_categories (
  id          public.ask_category primary key,
  label       text    not null,
  short       text    not null,
  blurb       text    not null,
  examples    text[]  not null default '{}',
  sort_order  integer not null default 0
);

-- --------------------------------------------------------------- proof kinds
--
-- Every entry pairs what the applicant offers to show, the class of that
-- evidence, and the outcome sentence another user sees. `not_verified` travels
-- with every claim because a badge that only says what it proves invites the
-- reader to assume it proves more.
create table public.proof_kinds (
  id                public.proof_type primary key,
  category          public.ask_category not null,
  evidence_label    text not null,
  evidence_category text not null,
  public_label      text not null,
  not_verified      text not null,
  -- Strongest claim first, so a reader who stops after one line reads that one.
  weight            integer not null default 0
);

create index proof_kinds_category_idx on public.proof_kinds (category);

-- --------------------------------------------------------------- occupations
--
-- `counts_in_breakdowns` is how "Prefer not to say" is handled: somebody
-- choosing it has answered, and their row is simply not counted into an
-- occupation breakdown. Refusing to let them proceed would be demanding an
-- answer to the one question people most reasonably decline.
create table public.occupations (
  label                text primary key,
  counts_in_breakdowns boolean not null default true,
  sort_order           integer not null default 0
);

-- ------------------------------------------------------------- facet library
--
-- The category-level fallback question sets. A topic either carries aspects an
-- editor wrote for it specifically, or gets a copy of one of these — see
-- `public.apply_facet_set`. Either way the responses point at one table, so
-- there is exactly one aggregate path and no branch to get wrong.
create table public.facet_sets (
  id     text primary key,
  label  text not null
);

create table public.facet_set_facets (
  id       uuid primary key default gen_random_uuid(),
  set_id   text    not null references public.facet_sets (id) on delete cascade,
  key      text    not null,
  label    text    not null,
  prompt   text    not null,
  position integer not null,
  unique (set_id, key)
);

create table public.facet_set_options (
  id       uuid primary key default gen_random_uuid(),
  facet_id uuid    not null references public.facet_set_facets (id) on delete cascade,
  key      text    not null,
  label    text    not null,
  -- How this answer rolls into the overall sentiment aggregate.
  tone     public.sentiment not null,
  position integer not null,
  unique (facet_id, key)
);

create index facet_set_facets_set_idx on public.facet_set_facets (set_id, position);
create index facet_set_options_facet_idx on public.facet_set_options (facet_id, position);

-- =============================================================================
-- RLS — read by anyone, written by nobody but an editor.
--
-- Enabled on every table with no exception. A table with RLS off is a table
-- where the `anon` key reads everything, and the whole reason for choosing
-- Postgres policies over application checks is that the database refuses rather
-- than trusting the caller to have asked nicely.
-- =============================================================================

alter table public.places            enable row level security;
alter table public.categories        enable row level security;
alter table public.ask_categories    enable row level security;
alter table public.proof_kinds       enable row level security;
alter table public.occupations       enable row level security;
alter table public.facet_sets        enable row level security;
alter table public.facet_set_facets  enable row level security;
alter table public.facet_set_options enable row level security;

create policy "reference is world readable" on public.places            for select using (true);
create policy "reference is world readable" on public.categories        for select using (true);
create policy "reference is world readable" on public.ask_categories    for select using (true);
create policy "reference is world readable" on public.proof_kinds       for select using (true);
create policy "reference is world readable" on public.occupations       for select using (true);
create policy "reference is world readable" on public.facet_sets        for select using (true);
create policy "reference is world readable" on public.facet_set_facets  for select using (true);
create policy "reference is world readable" on public.facet_set_options for select using (true);

create policy "editors maintain reference" on public.places            for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.categories        for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.ask_categories    for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.proof_kinds       for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.occupations       for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.facet_sets        for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.facet_set_facets  for all using (public.is_editor()) with check (public.is_editor());
create policy "editors maintain reference" on public.facet_set_options for all using (public.is_editor()) with check (public.is_editor());
