-- =============================================================================
-- Becoming Pro, before there is anything to pay with.
--
-- The subscription table, `is_pro()` and every policy that reads it have been
-- here since the identity migration. What was missing is the only thing a
-- member could actually do with them: there was no way to *start*. Pro was a
-- boolean in this browser's localStorage, which meant it was per-device, lost
-- on a cache clear, and grantable by anybody who could open a console.
--
-- THE LAUNCH OFFER IS A DATE, NOT A FLAG. `subscriptions.current_period_end`
-- already ends a membership — `is_pro()` reads it — so a free launch period is
-- a subscription whose period ends when the offer does. Nothing has to run on a
-- schedule to switch everybody off; the clock does it. That is the entire
-- reason this shape was chosen over a `free_pro boolean` on the profile, which
-- would need a job to clear and would be wrong the day the job did not run.
--
-- OPT-IN, NEVER DEFAULT. There is no path here that gives somebody Pro because
-- they signed up. `start_pro()` is called when a person asks for it and at no
-- other time, and the audit trail below shows who asked and when.
-- =============================================================================

-- --------------------------------------------------------------- the offer
--
-- One row, enforced by the primary key rather than by everyone remembering.
-- `id boolean primary key check (id)` permits exactly the value `true`, so a
-- second row is a duplicate-key error instead of a silent second opinion about
-- when the free period ends.
create table if not exists public.pro_offer (
  id          boolean primary key default true check (id),
  -- Free Pro for anybody who asks, until this moment. Moving it forward
  -- extends the offer for everybody, including people already on it, because
  -- `start_pro` writes this value onto the subscription — see the note there.
  free_until  timestamptz not null,
  -- What it costs afterwards. Stored so the price on the marketing panel and
  -- the price the payment code will eventually charge cannot drift apart.
  price_inr   integer not null default 99 check (price_inr >= 0),
  updated_at  timestamptz not null default now()
);

comment on table public.pro_offer is
  'The free launch window. One row. `free_until` is copied onto each free subscription as its period end, so expiry needs no scheduled job.';

drop trigger if exists pro_offer_set_updated_at on public.pro_offer;
create trigger pro_offer_set_updated_at
before update on public.pro_offer
for each row execute function public.set_updated_at();

-- Two months from the day this ships. Written as a literal rather than
-- `now() + interval '2 months'` so that reading the migration tells you the
-- date, and so re-running against a database that already has the row cannot
-- quietly extend the offer.
insert into public.pro_offer (id, free_until, price_inr)
values (true, timestamptz '2026-10-13 23:59:59+05:30', 99)
on conflict (id) do nothing;

alter table public.pro_offer enable row level security;

-- World readable. The deadline is on the marketing panel and a signed-out
-- visitor is exactly who it is aimed at.
drop policy if exists "the offer is public" on public.pro_offer;
create policy "the offer is public" on public.pro_offer for select using (true);

drop policy if exists "admins move the deadline" on public.pro_offer;
create policy "admins move the deadline" on public.pro_offer for update
  using (public.is_admin()) with check (public.is_admin());

grant select on public.pro_offer to anon, authenticated;
grant update on public.pro_offer to authenticated;
-- Nobody adds a second offer or deletes the only one.
revoke insert, delete on public.pro_offer from anon, authenticated;

-- --------------------------------------------------- revocation is sticky
--
-- Without this, `revoke_pro` is a suggestion: the account it was used on calls
-- `start_pro()` again and is back inside the minute. `revoked_at` is what makes
-- an admin decision hold, and clearing it is itself an admin action.
alter table public.subscriptions
  add column if not exists revoked_at timestamptz;

comment on column public.subscriptions.revoked_at is
  'Set by revoke_pro. While it is non-null the account cannot start Pro again by itself — only grant_pro clears it.';

-- `is_pro` gains the revocation check. Status alone would be enough today
-- because `revoke_pro` also sets it to canceled, but a membership function that
-- depends on two writes staying in step is one bad UPDATE away from handing
-- back a revoked account's tools.
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
      and s.revoked_at is null
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ------------------------------------------------------------ starting it
create or replace function public.start_pro()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := (select auth.uid());
  offer    public.pro_offer;
  existing public.subscriptions;
  result   public.subscriptions;
begin
  if uid is null then
    raise exception 'Sign in to start Pro.';
  end if;
  if not public.is_active(uid) then
    raise exception 'This account is suspended and cannot start Pro.';
  end if;

  select * into offer from public.pro_offer where id;
  if not found then
    raise exception 'Pro is not open for sign-ups yet.';
  end if;

  select * into existing from public.subscriptions s where s.user_id = uid;
  if existing.revoked_at is not null then
    -- Deliberately not "you were removed". The person on the other end of this
    -- needs to know who to talk to, not to be told off by a database.
    raise exception 'Pro is not available on this account. Write to support@theopinionhq.com.';
  end if;

  if now() >= offer.free_until then
    raise exception 'The free launch period ended on %. Pro is % a month now.',
      to_char(offer.free_until, 'DD Mon YYYY'), offer.price_inr;
  end if;

  -- `on conflict do update` rather than a read-then-insert: two tabs pressing
  -- the button together should produce one membership, not a duplicate-key
  -- error in somebody's face. It also makes restarting after a self-cancel the
  -- same code path as joining.
  --
  -- The period end is taken from the offer every time, so extending the window
  -- extends it for people who joined under the old date as soon as they touch
  -- this — and an admin who shortens it does not silently strand anybody with a
  -- longer end date than the offer they joined under.
  insert into public.subscriptions
    (user_id, status, plan, current_period_end, cancel_at_period_end, provider)
  values
    (uid, 'trialing', 'pro-launch-free', offer.free_until, false, 'launch-offer')
  on conflict (user_id) do update
     set status               = 'trialing',
         plan                 = 'pro-launch-free',
         current_period_end   = offer.free_until,
         cancel_at_period_end = false,
         provider             = 'launch-offer',
         updated_at           = now()
  returning * into result;

  return result;
end;
$$;

comment on function public.start_pro is
  'Opt in to the free launch offer. Refuses after free_until, refuses a revoked account, and is idempotent.';

-- ------------------------------------------------------------ stopping it
--
-- Immediate rather than at period end. On a paid plan you keep what you bought
-- until it runs out; on a free one there is nothing bought, and leaving the
-- tools switched on after somebody has said no is not generosity.
--
-- WHAT THIS DOES NOT DO: touch anything they published. Their contributions,
-- sections, blocks and images stay exactly where they are. Retracting somebody's
-- work because they stopped subscribing would make the archive a function of
-- the billing state, and the reader who found a contribution useful is not a
-- party to that arrangement.
create or replace function public.stop_pro()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := (select auth.uid());
  result public.subscriptions;
begin
  if uid is null then
    raise exception 'Sign in first.';
  end if;

  update public.subscriptions
     set status               = 'canceled',
         cancel_at_period_end = true,
         current_period_end   = now(),
         updated_at           = now()
   where user_id = uid
  returning * into result;

  if not found then
    raise exception 'There is no Pro membership on this account.';
  end if;

  return result;
end;
$$;

-- ------------------------------------------------------- the admin's half
--
-- Both audited, both refusing to work for anyone who is not an admin, and both
-- writing through `record_admin_action` in the same transaction as the change.
-- An account whose Pro was removed with no record of who removed it is a
-- support ticket nobody can answer.
create or replace function public.revoke_pro(target uuid, reason text default '')
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  label  text;
  result public.subscriptions;
begin
  if not public.is_admin() then
    raise exception 'only admins revoke Pro';
  end if;

  select p.display_name into label from public.profiles p where p.id = target;
  if label is null then
    raise exception 'no such account';
  end if;

  -- Inserted when absent, so revoking somebody who never started still leaves a
  -- `revoked_at` and they cannot opt in afterwards. Revoking pre-emptively is a
  -- real thing an admin needs — usually after the account has done something
  -- with the tools that it should not have.
  insert into public.subscriptions
    (user_id, status, plan, current_period_end, provider, revoked_at)
  values
    (target, 'canceled', 'pro-launch-free', now(), 'admin-revoke', now())
  on conflict (user_id) do update
     set status             = 'canceled',
         current_period_end = now(),
         revoked_at         = now(),
         updated_at         = now()
  returning * into result;

  perform public.record_admin_action('pro_revoked', target, label, reason);

  return result;
end;
$$;

comment on function public.revoke_pro is
  'Admin only, audited. Ends Pro and blocks self-service restart until grant_pro clears it. Published work is untouched.';

create or replace function public.grant_pro(target uuid, reason text default '')
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  label  text;
  offer  public.pro_offer;
  result public.subscriptions;
begin
  if not public.is_admin() then
    raise exception 'only admins grant Pro';
  end if;

  select p.display_name into label from public.profiles p where p.id = target;
  if label is null then
    raise exception 'no such account';
  end if;

  select * into offer from public.pro_offer where id;

  -- Clears the revocation. That is most of the point: this is the undo for
  -- `revoke_pro`, and without clearing it the account would still be unable to
  -- start Pro for itself once this grant lapsed.
  insert into public.subscriptions
    (user_id, status, plan, current_period_end, cancel_at_period_end, provider, revoked_at)
  values
    (target, 'trialing', 'pro-granted',
     greatest(coalesce(offer.free_until, now() + interval '2 months'), now() + interval '2 months'),
     false, 'admin-grant', null)
  on conflict (user_id) do update
     set status               = 'trialing',
         plan                 = 'pro-granted',
         current_period_end   = greatest(
           coalesce(offer.free_until, now() + interval '2 months'),
           now() + interval '2 months'
         ),
         cancel_at_period_end = false,
         provider             = 'admin-grant',
         revoked_at           = null,
         updated_at           = now()
  returning * into result;

  perform public.record_admin_action('pro_granted', target, label, reason);

  return result;
end;
$$;

-- --------------------------------------------------------------- reading it
--
-- One round trip for the three things every Pro-aware screen needs: whether
-- this account has it, when it ends, and whether the free window is still open.
-- The alternative is a select on `subscriptions` plus a select on `pro_offer`
-- plus the caller reimplementing `is_pro`'s expiry rule in TypeScript, and the
-- third of those is how a client ends up disagreeing with the row policies
-- about who is Pro.
create or replace function public.my_pro_state()
returns table (
  pro           boolean,
  status        text,
  plan          text,
  period_end    timestamptz,
  revoked       boolean,
  offer_open    boolean,
  free_until    timestamptz,
  price_inr     integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_pro((select auth.uid())),
    coalesce(s.status::text, 'none'),
    coalesce(s.plan, ''),
    s.current_period_end,
    s.revoked_at is not null,
    o.free_until > now(),
    o.free_until,
    o.price_inr
  from public.pro_offer o
  left join public.subscriptions s on s.user_id = (select auth.uid())
  where o.id;
$$;

comment on function public.my_pro_state is
  'Membership and offer in one read. `pro` comes from is_pro() itself, so a screen cannot disagree with the row policies about who is Pro.';
