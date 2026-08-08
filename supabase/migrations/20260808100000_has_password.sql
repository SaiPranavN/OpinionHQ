-- =============================================================================
-- Does the caller have a password?
--
-- Needed because sign-up has a step that can be skipped without anyone noticing.
-- The code email offers "or open this link instead", and that link goes to
-- /auth/callback, which exchanges it for a session and sends the visitor onward
-- — past the screen where a password is set. The account works, stays signed in,
-- and has no password at all. The next sign-in has nothing to sign in *with*,
-- so the only way back is the reset flow, every single time.
--
-- The app cannot work this out for itself. `auth.users.encrypted_password` is
-- not exposed to PostgREST, and nothing in the user object distinguishes an
-- account that set a password from one created by a one-time code — both report
-- provider "email". Guessing from user metadata would work until somebody edits
-- their own metadata, since that column is writable by its owner.
--
-- So: definer rights, reading the auth schema, returning one boolean about the
-- caller and nobody else. It cannot be asked about another account, because it
-- takes no argument.
-- =============================================================================

create or replace function public.has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
     where u.id = auth.uid()
       and u.encrypted_password is not null
       and u.encrypted_password <> ''
  );
$$;

comment on function public.has_password is
  'Whether the calling account has a password set. Definer because auth.users is not readable by clients; takes no argument so it can only ever answer about the caller.';

revoke all on function public.has_password() from public, anon;
grant execute on function public.has_password() to authenticated;
