"use client";

/**
 * Casting a vote, and answering the questions under it.
 *
 * ONE ACCOUNT, ONE VOTE is not enforced here. It is `unique (topic_id,
 * author_id)` in Postgres, and this upserts against that constraint rather than
 * reading first and then writing — a read-then-write races with itself across
 * two tabs and produces either a duplicate-key error or, worse, a lost update.
 *
 * The demographics that make the cross-tabs are not sent. A trigger stamps them
 * from the voter's private profile, and the columns are not even grantable to a
 * signed-in role, so a client that tried would get an error rather than a
 * silently ignored field.
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Sentiment } from "@/lib/types";

export type WriteResult = { ok: true } | { ok: false; message: string };

function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "You need to be signed in to vote on this topic.";
  }
  if (m.includes("is_active") || m.includes("suspended")) {
    return "This account is suspended and cannot post.";
  }
  if (m.includes("opinions_body_length")) return "That is longer than the 4,000 characters allowed.";
  return message;
}

/**
 * Records a vote, with an optional written opinion.
 *
 * `onConflict` names the constraint rather than the columns so a future rename
 * fails loudly here instead of quietly inserting a second vote.
 */
export async function castVote(
  topicUuid: string,
  vote: Sentiment,
  body: string,
): Promise<WriteResult> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in to vote." };

  const { error } = await supabase.from("opinions").upsert(
    {
      topic_id: topicUuid,
      author_id: user.id,
      vote,
      body: body.trim(),
    },
    { onConflict: "topic_id,author_id" },
  );

  return error ? { ok: false, message: readable(error.message) } : { ok: true };
}

/** Withdraws it entirely. Clearing the text alone keeps the vote — see `castVote`. */
export async function withdrawVote(topicUuid: string): Promise<WriteResult> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are not signed in." };

  const { error } = await supabase
    .from("opinions")
    .delete()
    .eq("topic_id", topicUuid)
    .eq("author_id", user.id);

  return error ? { ok: false, message: readable(error.message) } : { ok: true };
}

/**
 * Answers one aspect.
 *
 * `topic_id` is sent because the table denormalises it for the tally query, but
 * a trigger overwrites it from the aspect regardless — so a client cannot file
 * an answer under a topic the question does not belong to.
 */
export async function answerAspect(
  topicUuid: string,
  aspectId: string,
  optionId: string,
): Promise<WriteResult> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You need to be signed in to answer." };

  const { error } = await supabase.from("facet_responses").upsert(
    {
      aspect_id: aspectId,
      user_id: user.id,
      option_id: optionId,
      topic_id: topicUuid,
    },
    { onConflict: "aspect_id,user_id" },
  );

  return error ? { ok: false, message: readable(error.message) } : { ok: true };
}

/* ------------------------------------------------------------------ tallies */

export interface AspectTally {
  aspectId: string;
  optionId: string;
  responses: number;
}

/**
 * The distribution under each question.
 *
 * Through the function rather than a select on `facet_responses`, because the
 * policy there is own-row-only: a client counting rows directly would find
 * exactly its own answer and report every question as 100% whatever it picked.
 */
export async function aspectTallies(topicUuid: string): Promise<AspectTally[]> {
  const { data, error } = await supabaseBrowser().rpc("aspect_tallies", {
    target: topicUuid,
  });
  if (error || !data) return [];
  return (data as { aspect_id: string; option_id: string; responses: number }[]).map((row) => ({
    aspectId: row.aspect_id,
    optionId: row.option_id,
    responses: Number(row.responses),
  }));
}
