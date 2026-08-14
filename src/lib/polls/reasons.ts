"use client";

/**
 * The four things you can do to a reason under a poll.
 *
 * Like, dislike, reply, share — the same set an opinion carries, because a
 * written case for one side of a poll is the same sort of writing as a written
 * case about a topic, and there was no reason for one to be a dead end.
 *
 * Every write goes through a `SECURITY DEFINER` function rather than a table
 * insert, and the toggle decision lives in SQL: pressing Like when you already
 * liked it clears the vote, and two tabs pressing at once cannot land on
 * different answers because only one of them wins the row.
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Vote } from "@/lib/comments/tree";

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; message: string };

/**
 * Row-level-security refusals are unreadable, so they are translated once here
 * rather than at four call sites.
 */
function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "You need to be signed in to do that.";
  }
  if (m.includes("suspended")) return "This account is suspended and cannot post.";
  if (m.includes("poll_reason_replies_body_check") || m.includes("length(body)")) {
    return "That is longer than the 2,000 characters allowed.";
  }
  return message;
}

/** Like or dislike a reason. Pressing the same one again clears it. */
export async function voteOnReason(
  reasonId: string,
  kind: Vote,
): Promise<Result<{ vote: Vote | null }>> {
  const { data, error } = await supabaseBrowser().rpc("vote_on_poll_reason", {
    reason: reasonId,
    kind,
  });
  if (error) return { ok: false, message: readable(error.message) };
  return { ok: true, vote: (data as Vote | null) ?? null };
}

/**
 * Reply to a reason, or to a reply under it.
 *
 * The signature matches `postReply` on the opinion side exactly, so both can be
 * handed to the same `ReplyThread` as its `writes` — which is what stops the
 * two conversations drifting apart in behaviour.
 */
export async function replyToReason(
  reasonId: string,
  body: string,
  parentId?: string,
): Promise<Result> {
  const { error } = await supabaseBrowser().rpc("reply_to_poll_reason", {
    reason: reasonId,
    body,
    parent: parentId ?? undefined,
  });
  if (error) return { ok: false, message: readable(error.message) };
  return { ok: true };
}

export async function voteOnReasonReply(
  replyId: string,
  kind: Vote,
): Promise<Result<{ vote: Vote | null }>> {
  const { data, error } = await supabaseBrowser().rpc("vote_on_poll_reason_reply", {
    reply: replyId,
    kind,
  });
  if (error) return { ok: false, message: readable(error.message) };
  return { ok: true, vote: (data as Vote | null) ?? null };
}

/** The pair `ReplyThread` needs, in the shape it expects. */
export const REASON_WRITES = { reply: replyToReason, vote: voteOnReasonReply };
