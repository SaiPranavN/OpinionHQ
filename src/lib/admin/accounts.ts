"use client";

/**
 * The account powers, each one an audited function rather than a column write.
 *
 * None of these could be done by updating a row from here even if this file
 * tried: `profiles.role` is not in the columns granted to `authenticated`, and
 * `auth.users` is not reachable from a browser at all. The functions are the
 * only door, they check `is_admin()` inside, and they write to `admin_actions`
 * in the same transaction — so an irreversible action cannot happen without a
 * record of who ordered it.
 */

import { supabaseBrowser } from "@/lib/supabase/client";

export type AccountRole = "member" | "editor" | "admin";
export type ActionResult = { ok: true } | { ok: false; message: string };

function readable(message: string): string {
  if (message.includes("only admins")) return "That is an admin power.";
  if (message.includes("cannot demote themselves")) {
    return "You cannot demote yourself — an organisation with no admin has no way to appoint one.";
  }
  if (message.includes("cannot delete their own")) return "You cannot delete your own account.";
  if (message.includes("cannot suspend themselves")) return "You cannot suspend yourself.";
  if (message.includes("no such account")) return "That account no longer exists.";
  return message;
}

export async function setRole(userId: string, role: AccountRole): Promise<ActionResult> {
  const { error } = await supabaseBrowser().rpc("set_account_role", {
    target: userId,
    new_role: role,
  });
  return error ? { ok: false, message: readable(error.message) } : { ok: true };
}

/** Reversible, and the thing to reach for first. */
export async function setSuspended(
  userId: string,
  suspended: boolean,
  reason = "",
): Promise<ActionResult> {
  const { error } = await supabaseBrowser().rpc("set_account_suspended", {
    target: userId,
    suspended,
    reason,
  });
  return error ? { ok: false, message: readable(error.message) } : { ok: true };
}

/**
 * Irreversible. Destroys the account and everything it wrote.
 *
 * Including answers it gave to other people's questions — a verified
 * professional deleting their account takes the advice with them — and the
 * published percentages on every topic it voted in move to match.
 */
export async function deleteAccount(userId: string, reason: string): Promise<ActionResult> {
  const { error } = await supabaseBrowser().rpc("delete_account", {
    target: userId,
    reason,
  });
  return error ? { ok: false, message: readable(error.message) } : { ok: true };
}
