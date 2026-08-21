-- =============================================================================
-- What an account says it wants to read.
--
-- The last step of sign-up asks which of the fifteen categories somebody cares
-- about, and the catalogs open on those rather than on everything. It is a
-- reading preference and nothing else: it never touches a vote, never enters a
-- cross-tab, and changing it re-sorts a page rather than changing a number.
--
-- IT LIVES IN `profile_private`, WHICH IS THE POINT. What a person chooses to
-- read is not something other accounts get to see — "shows me who follows
-- politicians" is exactly the inference this table exists to prevent. The
-- owner's own session reads it to filter their catalog; nobody else can select
-- the row at all.
--
-- AN ARRAY, NOT A JOIN TABLE. A foreign key per interest would give real
-- referential integrity against `categories`, and it would cost a second embed
-- on the one query that runs on every page load — for a list that is at most
-- fifteen short strings and whose failure mode is benign. An id that is not a
-- real category matches no topic and no poll, so a stale value shows an empty
-- filter rather than corrupting anything. The cardinality check is there to
-- stop the column being used as storage, not to police its contents.
-- =============================================================================

alter table public.profile_private
  add column interests text[] not null default '{}';

alter table public.profile_private
  add constraint profile_private_interests_bounded
  check (cardinality(interests) <= 40);

comment on column public.profile_private.interests is
  'Category ids this account chose at sign-up. A reading preference: it filters '
  'their own catalog and is never read by a chart query.';

-- No grant to write. `profile_private` never had its table-level UPDATE revoked
-- — unlike `profiles`, where the role column made that necessary — so the
-- owner's existing privilege already covers the new column, and the "own
-- private details are editable" policy already confines it to their own row.
