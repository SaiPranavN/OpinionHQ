-- =============================================================================
-- Two more things an admin can be held to.
--
-- ALONE IN ITS OWN FILE ON PURPOSE. `alter type ... add value` may run inside a
-- transaction, but the new label cannot be *used* by anything in that same
-- transaction. Supabase applies one migration per transaction, so an enum value
-- and its first use have to be two files. Putting the functions here would fail
-- on a fresh database and work on this one, which is the worst of both.
-- =============================================================================

alter type public.admin_action add value if not exists 'pro_granted';
alter type public.admin_action add value if not exists 'pro_revoked';
alter type public.admin_action add value if not exists 'suggestion_approved';
alter type public.admin_action add value if not exists 'suggestion_declined';
