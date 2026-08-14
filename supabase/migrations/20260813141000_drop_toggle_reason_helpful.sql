-- =============================================================================
-- `toggle_reason_helpful` outlived the table it wrote to.
--
-- The previous migration replaced `poll_reason_helpful` — like-only, empty —
-- with `poll_reason_votes`, which does likes and dislikes. It missed this
-- function, which still deletes from and inserts into the dropped table and
-- would fail on its first call.
--
-- Nothing in the app called it: the helpful mark was read through a plain
-- select and never written. `vote_on_poll_reason` is its replacement and does
-- the same toggle over both directions.
--
-- Found by `npm run db:lint`, which resolves the statements inside a plpgsql
-- body that Postgres itself does not check until they run. That is the second
-- time in this feature it has caught a table or column name that only a call
-- would have surfaced.
-- =============================================================================

drop function if exists public.toggle_reason_helpful(uuid);
