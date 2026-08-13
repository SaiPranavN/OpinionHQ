"use client";

/**
 * Posting and voting on replies under an opinion.
 *
 * Every write goes through an RPC rather than a table call, for the same reason
 * voting does: `depth` is set by trigger and the vote counters are recounted by
 * trigger, so a client that could reach those columns could award itself likes
 * or claim depth 0 to escape the indent. The grants withhold them; these
 * functions are the whole writable surface.
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Vote } from "@/lib/comments/tree";

export type ReplyResult = { ok: true; id: string } | { ok: false; message: string };

function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "You need to be signed in to reply.";
  }
  if (m.includes("opinion_replies_body")) {
    return "A reply is between 1 and 2,000 characters.";
  }
  if (m.includes("same opinion")) {
    return "That reply belongs to a different discussion.";
  }
  if (m.includes("empty reply")) return "Write something first.";
  return message;
}

export async function postReply(
  opinionId: string,
  body: string,
  parentId?: string,
): Promise<ReplyResult> {
  const { data, error } = await supabaseBrowser().rpc("reply_to_opinion", {
    opinion: opinionId,
    body,
    ...(parentId ? { parent: parentId } : {}),
  });

  if (error) return { ok: false, message: readable(error.message) };
  const row = data as { id?: string } | null;
  return row?.id
    ? { ok: true, id: row.id }
    : { ok: false, message: "That reply was not posted." };
}

/**
 * Toggles a like or dislike, returning what the caller now holds.
 *
 * The decision of what a second press means lives in the database rather than
 * here, so two tabs pressing at once cannot land on different answers.
 */
export async function voteOnReply(
  replyId: string,
  kind: Vote,
): Promise<{ ok: true; vote: Vote | null } | { ok: false; message: string }> {
  const { data, error } = await supabaseBrowser().rpc("vote_on_reply", {
    reply: replyId,
    kind,
  });
  if (error) return { ok: false, message: readable(error.message) };
  return { ok: true, vote: (data as Vote | null) ?? null };
}

export async function deleteReply(id: string): Promise<{ ok: boolean; message?: string }> {
  const { error, count } = await supabaseBrowser()
    .from("opinion_replies")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, message: readable(error.message) };
  // A refusal matches no rows rather than raising.
  return count ? { ok: true } : { ok: false, message: "That is not yours to delete." };
}

/* ------------------------------------------- voting on a contribution */

/**
 * Like or dislike a contribution. Pressing the same one again clears it.
 *
 * IT USED TO BE "HELPFUL", AND IT USED TO BE FICTION. `toggleHelpful` pushed
 * the id into this browser's localStorage and the card rendered the database's
 * count plus one — so the number was invisible to everyone else and gone on a
 * cache clear, exactly like the follow counter and the contributions before it.
 * `opinion_helpful` existed in Postgres the whole time with nothing writing to
 * it.
 *
 * The toggle decision lives in `vote_on_opinion` rather than here, so two tabs
 * pressing at once cannot land on different answers.
 */
export async function voteOnOpinion(
  opinionId: string,
  kind: Vote,
): Promise<{ ok: true; vote: Vote | null } | { ok: false; message: string }> {
  const { data, error } = await supabaseBrowser().rpc("vote_on_opinion", {
    opinion: opinionId,
    kind,
  });
  if (error) return { ok: false, message: readable(error.message) };
  return { ok: true, vote: (data as Vote | null) ?? null };
}

/** This account's likes and dislikes across one topic, for first paint. */
export async function myOpinionVotes(topicUuid: string): Promise<Record<string, Vote>> {
  const { data, error } = await supabaseBrowser().rpc("my_opinion_votes", {
    topic: topicUuid,
  });
  if (error || !data) return {};
  const out: Record<string, Vote> = {};
  for (const row of data as { opinion_id: string; vote: Vote }[]) {
    out[row.opinion_id] = row.vote;
  }
  return out;
}
