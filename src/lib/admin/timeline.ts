"use client";

/**
 * Editing a topic, and publishing developments on it.
 *
 * A development is the only way the record of a subject changes after it is
 * published — "the paper leak was confirmed", "the release moved to March" —
 * and the whole reason anyone should believe one is the source next to it. So
 * `sourceName` is required and the URL is validated before it is stored: a
 * sourced update with an unusable link is worse than an unsourced one, because
 * it looks checkable and is not.
 */

import { safeExternalUrl } from "@/lib/safe-url";
import { supabaseBrowser } from "@/lib/supabase/client";

export type EditResult = { ok: true } | { ok: false; message: string };

function readable(message: string): string {
  if (message.includes("topics_slug_key") || message.includes("duplicate key")) {
    return "That address is already taken by another topic.";
  }
  if (message.includes("topics_name_present")) {
    return "The name has to be between 2 and 160 characters.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Your account cannot edit this.";
  }
  return message;
}

/**
 * Refusals do not raise — a policy that says no matches no rows and returns
 * quietly. Every write here checks what came back rather than whether an error
 * was thrown.
 */
const REFUSED = "Not permitted — that is an editor power.";

export interface TopicPatch {
  name: string;
  categoryId: string;
  placeId: string;
  status: string;
  summary: string;
  about: string;
  tags: string[];
}

export async function updateTopic(id: string, patch: TopicPatch): Promise<EditResult> {
  const { data, error } = await supabaseBrowser()
    .from("topics")
    .update({
      name: patch.name.trim(),
      category_id: patch.categoryId,
      place_id: patch.placeId,
      status: patch.status as never,
      summary: patch.summary.trim(),
      about: patch.about.trim(),
      tags: patch.tags,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: readable(error.message) };
  return data ? { ok: true } : { ok: false, message: REFUSED };
}

/* --------------------------------------------------------------- timeline */

export interface DevelopmentDraft {
  date: string;
  title: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
  /** The lifecycle the topic is in *as of* this development. */
  status: string;
}

export function validateDevelopment(draft: DevelopmentDraft): string | null {
  if (draft.title.trim().length < 4) return "Give the update a title of at least four characters.";
  if (!draft.date) return "Pick the date this happened.";
  if (Number.isNaN(new Date(draft.date).getTime())) return "That is not a date we can read.";
  if (new Date(draft.date) > new Date()) return "A development cannot be dated in the future.";
  if (!draft.sourceName.trim()) {
    return "Name the source. An update nobody can check is an assertion.";
  }
  // A link is optional — some sources have no stable URL — but a typed one that
  // cannot be linked is a mistake worth catching before it is published.
  if (draft.sourceUrl.trim() && !safeExternalUrl(draft.sourceUrl)) {
    return "That link is not a usable http or https address.";
  }
  return null;
}

export async function addDevelopment(
  topicId: string,
  draft: DevelopmentDraft,
): Promise<EditResult> {
  const problem = validateDevelopment(draft);
  if (problem) return { ok: false, message: problem };

  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("timeline_events")
    .insert({
      topic_id: topicId,
      occurred_on: draft.date,
      title: draft.title.trim(),
      description: draft.description.trim(),
      source_name: draft.sourceName.trim(),
      // Normalised, so "thehindu.com/x" is stored as a real URL rather than
      // something the browser will resolve relative to our own domain.
      source_url: safeExternalUrl(draft.sourceUrl),
      status: draft.status as never,
      created_by: user?.id ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: readable(error.message) };
  return data ? { ok: true } : { ok: false, message: REFUSED };
}

export async function removeDevelopment(id: string): Promise<EditResult> {
  const { error, count } = await supabaseBrowser()
    .from("timeline_events")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { ok: false, message: readable(error.message) };
  return count ? { ok: true } : { ok: false, message: REFUSED };
}

/**
 * Sets the topic's own lifecycle status.
 *
 * Separate from `updateTopic` because it is the one field an editor changes on
 * its own, from a development they just published — and making them open the
 * whole form to move "Ongoing" to "Resolved" is how a status goes stale.
 */
export async function setTopicStatus(id: string, status: string): Promise<EditResult> {
  const { data, error } = await supabaseBrowser()
    .from("topics")
    .update({ status: status as never })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: readable(error.message) };
  return data ? { ok: true } : { ok: false, message: REFUSED };
}
