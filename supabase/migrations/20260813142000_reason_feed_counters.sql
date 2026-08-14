-- =============================================================================
-- `poll_reason_feed` never got the two columns the reasons gained.
--
-- The engagement migration added `dislike_count` and `reply_count` to
-- `poll_reasons`, and the app reads reasons through the view rather than the
-- table — so the select asked for two columns that did not exist there, failed,
-- and the poll page rendered no reasons at all. Not a subtle degradation: the
-- whole discussion section went blank.
--
-- ADDING A COLUMN TO A TABLE DOES NOT ADD IT TO A VIEW OVER THAT TABLE, and
-- since the anonymity work made these views the only read path clients have,
-- every future column on `opinions`, `opinion_replies` or `poll_reasons` that
-- the UI needs has to be added in both places. That is the standing cost of
-- masking the author, and it is worth it — but it is a cost, and this is what
-- forgetting it looks like.
--
-- Masking rules are unchanged; see the anonymous-contributions migration for
-- why `security_invoker` is off and why the WHERE clause is the access control.
-- =============================================================================

drop view if exists public.poll_reason_feed;
create view public.poll_reason_feed as
  select
    r.id,
    r.poll_id,
    r.option_id,
    r.anonymous,
    case when r.anonymous and r.user_id is distinct from (select auth.uid())
         then null else r.user_id end                        as user_id,
    case when r.anonymous then null else p.display_name end  as display_name,
    case when r.anonymous then null else p.initials end      as initials,
    r.body,
    r.helpful_count,
    r.dislike_count,
    r.reply_count,
    r.created_at,
    r.hidden_at
  from public.poll_reasons r
  join public.profiles p on p.id = r.user_id
  where r.hidden_at is null
     or r.user_id = (select auth.uid())
     or public.is_editor();

comment on view public.poll_reason_feed is
  'The only read path to poll reasons for clients. Owner-rights view: the WHERE clause is the access control, not a convenience.';

grant select on public.poll_reason_feed to anon, authenticated;
