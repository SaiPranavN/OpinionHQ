-- =============================================================================
-- Signing in with a username.
--
-- The sign-in field takes either an address or a username, because somebody
-- signing in knows which of theirs they are typing. Supabase authenticates by
-- address only, so something has to resolve one to the other.
--
-- IT IS AN ENUMERATION ORACLE, AND THAT IS WHY IT IS SHUT. Anything that answers
-- "does this username exist" answers it for an attacker too, and paired with the
-- address it returns it would turn a list of guessed usernames into a list of
-- real accounts. So:
--
--   - execute is revoked from `anon` and `authenticated`. The publishable key
--     cannot call this at all; only the service role can, from the server.
--   - the one caller is the sign-in server action, which returns the same
--     sentence whether the lookup missed or the password was wrong. A caller
--     that reported "no such user" separately would rebuild the oracle above
--     the function that was locked to prevent it.
-- =============================================================================

create or replace function public.email_for_username(handle text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.username = lower(trim(handle))
     and p.suspended_at is null;
$$;

revoke all on function public.email_for_username(text) from public, anon, authenticated;
grant execute on function public.email_for_username(text) to service_role;

comment on function public.email_for_username is
  'Resolves a username to its address for sign-in. Service role only — it is an enumeration oracle, and its single caller returns an identical message on miss and on wrong password.';
