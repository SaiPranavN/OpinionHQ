"use client";

/**
 * One row per account, with the three powers that act on it.
 *
 * DELETION ASKS FOR A REASON AND WILL NOT PROCEED WITHOUT ONE. Not
 * bureaucracy: the reason is the only part of the audit entry that says *why*,
 * and it is written before the account it describes stops existing. A dialog
 * that accepts an empty box produces a log nobody can read six months later.
 *
 * The destructive path also states what it destroys rather than asking "are you
 * sure?", because the answer to that question is always yes and the person
 * clicking it usually has not thought about the votes.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteAccount, setRole, setSuspended, type AccountRole } from "@/lib/admin/accounts";
import { grantPro, revokePro } from "@/lib/pro";

export interface AdminAccountRow {
  id: string;
  displayName: string;
  initials: string;
  username: string | null;
  headline: string;
  role: AccountRole;
  suspended: boolean;
  /** A live subscription. Not a role — see the account hierarchy migration. */
  pro: boolean;
  createdAt: string;
}

const ROLES: AccountRole[] = ["member", "editor", "admin"];

const ROLE_BLURB: Record<AccountRole, string> = {
  member: "Votes, writes, asks. Never sees this desk.",
  editor: "Publishes and moderates. Cannot touch accounts.",
  admin: "Everything, including deleting accounts.",
};

export function AccountRows({
  accounts,
  selfId,
}: {
  accounts: AdminAccountRow[];
  selfId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const run = async (id: string, action: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(id);
    setError(null);
    const result = await action();
    setBusy(null);
    if (!result.ok) {
      setError(result.message ?? "That did not work.");
      return;
    }
    setDeleting(null);
    setReason("");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p
          role="alert"
          className="m-0 rounded-[12px] border border-negative/30 bg-negative/8 px-4 py-3 text-[13px] text-negative-light"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {accounts.map((account) => {
          const isSelf = account.id === selfId;
          const working = busy === account.id;

          return (
            <article key={account.id} className="ohq-panel flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-avatar font-mono text-[11px] text-soft"
                >
                  {account.initials}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-cream-bright">
                      {account.displayName}
                    </span>
                    {isSelf ? (
                      <span className="rounded-full border border-veil/18 px-2 py-[2px] font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
                        you
                      </span>
                    ) : null}
                    {account.suspended ? (
                      <span className="rounded-full border border-negative/40 bg-negative/10 px-2 py-[2px] font-mono text-[9.5px] tracking-[0.12em] uppercase text-negative-light">
                        suspended
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[12px] text-dim">
                    {account.username ? `@${account.username}` : null}
                    {account.username && account.headline ? " · " : null}
                    {account.headline}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-[11.5px] text-muted">
                    Role
                    <select
                      value={account.role}
                      disabled={working}
                      onChange={(e) =>
                        run(account.id, () => setRole(account.id, e.target.value as AccountRole))
                      }
                      title={ROLE_BLURB[account.role]}
                      className="cursor-pointer rounded-[9px] border border-veil/14 bg-surface-sunken px-2.5 py-1.5 text-[12px] text-cream outline-none transition-colors focus:border-positive/50 disabled:cursor-not-allowed disabled:text-dim"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!isSelf ? (
                    <>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() =>
                          run(account.id, () => setSuspended(account.id, !account.suspended))
                        }
                        className="cursor-pointer rounded-full border border-veil/16 px-3.5 py-1.5 text-[12px] font-medium text-cream transition-colors hover:border-veil/40 disabled:cursor-not-allowed disabled:text-dim"
                      >
                        {account.suspended ? "Restore" : "Suspend"}
                      </button>

                      {/* Pro is not on the role ladder, so it gets its own
                          control rather than a fourth option in that select.
                          Revoking sticks: `revoked_at` is what stops the
                          account simply pressing Start Pro again a minute
                          later, and only Grant clears it. Neither touches
                          anything they published. */}
                      <button
                        type="button"
                        disabled={working}
                        onClick={() =>
                          run(account.id, async () => {
                            try {
                              if (account.pro) {
                                await revokePro(account.id, "revoked from the accounts desk");
                              } else {
                                await grantPro(account.id, "granted from the accounts desk");
                              }
                              return { ok: true };
                            } catch (e) {
                              return {
                                ok: false,
                                message: e instanceof Error ? e.message : "That did not work.",
                              };
                            }
                          })
                        }
                        title={
                          account.pro
                            ? "Ends Pro and blocks self-service restart. Published work is untouched."
                            : "Grants Pro and clears any earlier revocation."
                        }
                        className="cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: account.pro
                            ? "rgba(198,120,221,0.4)"
                            : "color-mix(in oklab, var(--color-veil) 14%, transparent)",
                          color: account.pro ? "#C678DD" : "#A8A49E",
                        }}
                      >
                        {account.pro ? "Revoke Pro" : "Grant Pro"}
                      </button>

                      <button
                        type="button"
                        disabled={working}
                        onClick={() => {
                          setError(null);
                          setReason("");
                          setDeleting(deleting === account.id ? null : account.id);
                        }}
                        className="cursor-pointer rounded-full border border-veil/14 px-3.5 py-1.5 text-[12px] font-medium text-dim transition-colors hover:border-negative/40 hover:text-negative-light disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {deleting === account.id ? (
                <div className="flex flex-col gap-3 rounded-[13px] border border-negative/28 bg-negative/6 p-4">
                  <p className="m-0 text-[13px] leading-[1.6] text-cream">
                    Deleting <strong className="font-semibold">{account.displayName}</strong>{" "}
                    destroys everything they wrote. Their votes leave the aggregates, so published
                    percentages will move. Any answers they gave to other people&rsquo;s questions go
                    with them, and those askers lose the advice. This cannot be undone —{" "}
                    <strong className="font-semibold">suspending is the reversible option.</strong>
                  </p>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-muted">
                      Reason <span className="text-positive-light">*</span>
                      <span className="ml-1.5 text-[10.5px] text-dim">
                        recorded in the audit log, which outlives the account
                      </span>
                    </span>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why this account is being removed"
                      className="w-full rounded-[10px] border border-veil/12 bg-surface-sunken px-3 py-2.5 text-[13px] text-cream outline-none transition-colors focus:border-negative/50"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={working || reason.trim().length < 4}
                      onClick={() => run(account.id, () => deleteAccount(account.id, reason.trim()))}
                      className="cursor-pointer rounded-full border border-negative/50 bg-negative/14 px-4 py-2 text-[12.5px] font-semibold text-negative-light transition-colors hover:bg-negative/22 disabled:cursor-not-allowed disabled:border-veil/12 disabled:bg-transparent disabled:text-dim"
                    >
                      {working ? "Deleting…" : "Delete permanently"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(null)}
                      className="cursor-pointer px-2 text-[12.5px] text-muted transition-colors hover:text-cream"
                    >
                      Cancel
                    </button>
                    {reason.trim().length < 4 ? (
                      <span className="text-[11.5px] text-dim">A reason is required.</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
