-- =============================================================================
-- `review_credential` assigned an untyped literal to an enum column.
--
-- `case when approve then 'verified' else 'rejected' end` resolves to `text`,
-- because a CASE takes its type from its branches and both are unknown literals
-- with nothing to resolve against. Assigning that to `credential_status` is a
-- 42804, and — this is why it survived the push — PL/pgSQL does not resolve
-- statement types until the function is first called. So the migration applied
-- cleanly and the failure was waiting for the first admin to approve somebody's
-- proof.
--
-- Found by `npm run db:lint`, which is now a script for exactly this reason:
-- every plpgsql body in this schema is unverified until something calls it, and
-- the linter is the only thing that calls them all.
-- =============================================================================

create or replace function public.review_credential(
  target uuid,
  approve boolean,
  note text default null,
  expires timestamptz default null
)
returns public.credentials
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.credentials;
  kind   public.proof_kinds;
begin
  if not public.is_admin() then
    raise exception 'only admins review proof';
  end if;

  select k.* into kind
    from public.proof_kinds k
    join public.credentials c on c.proof_type = k.id
   where c.id = target;

  if kind is null then
    raise exception 'no such credential';
  end if;

  update public.credentials set
    status            = (case when approve then 'verified' else 'rejected' end)::public.credential_status,
    -- Copied from the vocabulary, never from the submission. An applicant who
    -- could write `public_label` could verify themselves as anything they liked,
    -- and the label is the only thing another user reads.
    public_label      = case when approve then kind.public_label else '' end,
    evidence_category = kind.evidence_category,
    verified_at       = case when approve then now() else null end,
    reviewed_by       = (select auth.uid()),
    review_note       = note,
    expires_at        = expires
  where id = target
  returning * into result;

  return result;
end;
$$;
