-- =============================================================================
-- The door shuts.
--
-- This is the second half of `20260813112000_anonymous_contributions`, split
-- out and applied later on purpose. That migration added the `anonymous`
-- columns and the masking views and changed nothing for the running site; this
-- one removes the direct read, and until it lands "anonymous" hides a name in
-- the UI while the account id is still on the wire — which the top of that file
-- calls, correctly, worse than not offering the feature.
--
-- IT COULD NOT GO IN THE SAME BATCH. A live site was reading `opinions`
-- directly. Revoking in the same statement batch that created the views would
-- have taken every topic page down for however long it took to build and deploy
-- the code that uses them. So: additive migration, deploy, then this.
--
-- WHAT HAD TO MOVE FIRST, all of it already shipped:
--   - the feed, the reader's own vote, the replies, the poll reasons and the
--     admin count now select from the three `*_feed` views
--   - four row policies that reached into `opinions` from other tables call
--     definer helpers instead — Postgres checks column privileges inside policy
--     expressions against the *calling* role, so those policies would have
--     started failing with "permission denied for table" the moment this ran
--   - eight functions that read an identity column were elevated, and the two
--     that insert had the policy conditions they were relying on written out by
--     hand rather than silently lost
--
-- Insert, update and delete stay granted. Those are governed by the row
-- policies and a write hands nothing back.
--
-- IF A FUTURE QUERY NEEDS A COLUMN THAT IS NOT ON A FEED VIEW, ADD IT TO THE
-- VIEW. Re-granting select here would quietly undo all of the above, and it
-- would not fail anywhere — it would just start including the author of every
-- anonymous post in the response again.
-- =============================================================================

revoke select on public.opinions        from anon, authenticated;
revoke select on public.opinion_replies from anon, authenticated;
revoke select on public.poll_reasons    from anon, authenticated;

comment on table public.opinions is
  'Not directly readable by clients. Read through public.opinion_feed, which masks the author of an anonymous row.';
comment on table public.opinion_replies is
  'Not directly readable by clients. Read through public.opinion_reply_feed.';
comment on table public.poll_reasons is
  'Not directly readable by clients. Read through public.poll_reason_feed.';
