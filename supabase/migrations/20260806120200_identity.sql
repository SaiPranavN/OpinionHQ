-- =============================================================================
-- Identity.
--
-- ONE ACCOUNT. There is no separate "contributor" identity and no second kind of
-- user. A professional is an account that has verified proof; a Pro subscriber
-- is an account with a live subscription row. Both are attributes of the same
-- person, which is why neither gets a table of its own that could drift from the
-- account it describes.
--
-- THE TABLE IS SPLIT, AND THAT SPLIT IS THE PRIVACY MODEL. `profiles` is the
-- part other people are allowed to see — a name, a monogram, a role line.
-- `profile_private` is the part nobody but its owner ever reads: date of birth,
-- phone number, where they live. Two tables rather than one table with a
-- carefully-worded view, because a view that exposes a subset is one `select *`
-- away from exposing everything, and the column that leaks is always the one
-- somebody added later without re-reading the view.
--
-- The demographics in `profile_private` are what the cross-tabs are built from,
-- and they are never read by a chart query. They are read once, at the moment a
-- vote is cast, and the resulting *bucket* is written onto the vote — see
-- `public.age_band` and the `topic_votes` table.
-- =============================================================================

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  -- Set when they signed in with a username rather than an address.
  username      citext unique,
  -- Monogram, derived rather than stored twice. A cached copy drifts the moment
  -- somebody edits their name.
  initials      text generated always as (public.initials(display_name)) stored,
  -- Role or qualification, shown under the name on a Pro card or an answer.
  headline      text not null default '',
  -- Matching keywords for Ask: technologies, functions, programmes, exams.
  expertise     text[] not null default '{}',
  -- Monogram tint. No photographs.
  avatar_tone   text not null default 'slate',
  role          public.account_role not null default 'member',
  suspended_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_display_name_present check (length(trim(display_name)) between 1 and 80),
  constraint profiles_username_shape check (username is null or username ~ '^[a-z0-9_.]{3,30}$')
);

create index profiles_expertise_idx on public.profiles using gin (expertise);
create index profiles_name_trgm_idx on public.profiles using gin (display_name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ private
create table public.profile_private (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  -- Required at sign-up. Age, occupation and location are the only inputs to the
  -- cross-tabs; optional fields would produce a chart drawn from whoever felt
  -- like answering, which is worse than no chart because it looks like a
  -- measurement and is a self-selected sample.
  dob         date,
  -- The one field nothing on the product charts. Collected for account recovery.
  mobile      text,
  occupation  text references public.occupations (label) on update cascade,
  country     text,
  state       text,
  city        text,
  -- Resolved from country/state/city onto the places tree where it maps.
  place_id    text references public.places (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Thirteen is the floor most consumer products use. India's DPDP Act pushes
  -- it higher — verifiable parental consent under 18 — which a real deployment
  -- has to solve properly. This states the rule; it does not pretend the check
  -- is verification.
  constraint profile_private_min_age check (
    dob is null or dob <= (current_date - interval '13 years')
  ),
  constraint profile_private_dob_sane check (
    dob is null or dob >= (current_date - interval '120 years')
  )
);

create trigger profile_private_set_updated_at
before update on public.profile_private
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ subscriptions
--
-- Written by the billing webhook under the service role and by nobody else. A
-- client that could write here could grant itself Pro, so `authenticated` has no
-- insert or update privilege at all — not merely no policy permitting it.
create table public.subscriptions (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  status              public.subscription_status not null,
  plan                text not null default 'pro-monthly',
  current_period_end  timestamptz,
  cancel_at_period_end boolean not null default false,
  provider            text,
  provider_ref        text unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Whether this account can build Pro contributions and ask without limit.
--
-- Derived from the subscription record rather than a boolean somebody has to
-- remember to clear. A flag can outlive the payment that justified it.
create or replace function public.is_pro(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- =============================================================================
-- New accounts
--
-- Supabase creates the row in `auth.users`; this creates the matching profile in
-- the same transaction, so an account cannot exist without one. Runs as the
-- definer because `auth.users` triggers execute as the auth admin, which has no
-- business being granted write access to application tables.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name text;
begin
  raw_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    -- Last resort: the local part of the address. Better than a blank card, and
    -- the account can rename itself the moment it lands.
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Member'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(raw_name, 80))
  on conflict (id) do nothing;

  insert into public.profile_private (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.subscriptions   enable row level security;

-- Public identity is public. This is the table every answer, opinion and reply
-- joins to for a name and a monogram, and it holds nothing that is not already
-- printed next to those.
create policy "profiles are world readable"
  on public.profiles for select
  using (true);

create policy "own profile is editable"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "admins manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- A policy cannot restrict a column, so the privilege does. Without this, "own
-- profile is editable" would let any account set its own role to admin.
revoke update (id, role, initials, created_at) on public.profiles from authenticated, anon;

-- Nobody reads somebody else's date of birth. Not another member, not an editor.
-- Admins are included because account recovery and abuse handling need it, and
-- excluding them would only mean the same query gets run with a service key
-- where nothing audits it.
create policy "own private details"
  on public.profile_private for select
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "own private details are editable"
  on public.profile_private for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own private details are insertable"
  on public.profile_private for insert
  with check ((select auth.uid()) = user_id);

-- Read your own subscription so the UI can say what you are paying for.
create policy "own subscription"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id or public.is_admin());

-- No insert, update or delete policy for anyone. Billing writes with the
-- service role, which bypasses RLS; the absence of a policy here is what stops
-- a client granting itself Pro.
revoke insert, update, delete on public.subscriptions from authenticated, anon;
