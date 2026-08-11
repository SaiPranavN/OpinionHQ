"use client";

/**
 * Publishing and editing polls.
 *
 * The mirror of `lib/admin/topics.ts`, and deliberately so — an editor moving
 * between the two screens should not have to learn two vocabularies for the
 * same four buttons.
 *
 * Everything runs with the editor's own session. The `is_editor()` check inside
 * `author_poll` is what actually refuses; this module living under `/admin` is
 * organisation, not enforcement.
 */

import { supabaseBrowser } from "@/lib/supabase/client";
import type { PlaceId } from "@/lib/places";
import type { CategoryId, StatusId } from "@/lib/types";

export interface PollOptionDraft {
  name: string;
  blurb: string;
}

export interface PollDraft {
  slug: string;
  question: string;
  category: CategoryId;
  place: PlaceId;
  status: StatusId;
  summary: string;
  about: string;
  tags: string[];
  options: PollOptionDraft[];
  /** ISO date, or empty for open-ended. */
  closesAt: string;
  /** False leaves it as a draft, visible to editors and to nobody else. */
  publish: boolean;
}

export type AuthorResult = { ok: true; slug: string } | { ok: false; message: string };
export type EditResult = { ok: true } | { ok: false; message: string };

const REFUSED = "Not permitted — that is an editor power.";

function readable(message: string): string {
  if (message.includes("polls_slug_key") || message.includes("duplicate key")) {
    return "That address is already taken. Try a more specific name.";
  }
  if (message.includes("only editors")) return "Your account cannot publish polls.";
  if (message.includes("at least two options")) {
    return "A poll needs at least two options — otherwise it is not a choice.";
  }
  if (message.includes("at most four options")) {
    return "A poll asks at most four options.";
  }
  if (message.includes("cannot close before it opens")) {
    return "That closing date has already passed.";
  }
  if (message.includes("polls_slug_shape")) {
    return "That question does not produce a usable address. Use letters and numbers.";
  }
  if (message.includes("polls_question_present")) {
    return "The question has to be between 4 and 240 characters.";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Your account cannot edit this.";
  }
  return message;
}

export async function authorPoll(draft: PollDraft): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser().rpc("author_poll", {
    slug: draft.slug,
    question: draft.question,
    category_id: draft.category,
    place_id: draft.place,
    status: draft.status,
    summary: draft.summary,
    about: draft.about,
    tags: draft.tags,
    options: draft.options.map((option) => ({
      name: option.name,
      blurb: option.blurb,
    })),
    // Omitted rather than sent empty — the argument defaults to null in SQL,
    // and "open-ended" is a real state rather than a missing value.
    ...(draft.closesAt ? { closes_at: new Date(draft.closesAt).toISOString() } : {}),
    publish: draft.publish,
  });

  if (error) return { ok: false, message: readable(error.message) };

  const row = data as { slug?: string } | null;
  return row?.slug
    ? { ok: true, slug: row.slug }
    : { ok: false, message: "The poll was not created." };
}

/**
 * Whether an address is free.
 *
 * The same `slug_available` topics use — the two share one address space, so
 * /topics/x and /polls/x cannot both exist.
 */
export async function isSlugFree(slug: string): Promise<boolean> {
  if (!slug) return false;
  const { data, error } = await supabaseBrowser().rpc("slug_available", { candidate: slug });
  return error ? false : Boolean(data);
}

/* ---------------------------------------------------------------- editing */

export interface PollPatch {
  question: string;
  categoryId: string;
  placeId: string;
  status: string;
  summary: string;
  about: string;
  tags: string[];
  /** ISO date, or empty for open-ended. */
  closesAt: string;
}

export async function updatePoll(id: string, patch: PollPatch): Promise<EditResult> {
  const { data, error } = await supabaseBrowser()
    .from("polls")
    .update({
      question: patch.question.trim(),
      category_id: patch.categoryId,
      place_id: patch.placeId,
      status: patch.status as never,
      summary: patch.summary.trim(),
      about: patch.about.trim(),
      tags: patch.tags,
      closes_at: patch.closesAt ? new Date(patch.closesAt).toISOString() : null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: readable(error.message) };
  return data ? { ok: true } : { ok: false, message: REFUSED };
}

/**
 * Rewrites an option's wording. NOT its slot, and NOT the poll it belongs to.
 *
 * Renaming an option after people have voted changes what their vote meant
 * without changing the tally — the same trap as rewording a topic aspect. It is
 * allowed here because a typo in an option name is worth fixing and the vote
 * still attaches to the same slot, but the screen says so plainly rather than
 * presenting it as an ordinary edit.
 */
export async function renameOption(
  id: string,
  patch: { name: string; blurb: string },
): Promise<EditResult> {
  const { data, error } = await supabaseBrowser()
    .from("poll_options")
    .update({ name: patch.name.trim(), blurb: patch.blurb.trim() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: readable(error.message) };
  return data ? { ok: true } : { ok: false, message: REFUSED };
}

/* -------------------------------------------------------------- lifecycle */

export async function publishPoll(id: string): Promise<AuthorResult> {
  // Through the function, because publishing checks the option count. A bare
  // update would happily publish a one-option poll.
  const { data, error } = await supabaseBrowser().rpc("publish_poll", { target: id });
  if (error) return { ok: false, message: readable(error.message) };
  const row = data as { slug?: string } | null;
  return row?.slug ? { ok: true, slug: row.slug } : { ok: false, message: REFUSED };
}

/** Takes it off the site and keeps every vote. The reversible one. */
export async function archivePoll(id: string): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser().rpc("archive_poll", { target: id });
  if (error) return { ok: false, message: readable(error.message) };
  const row = data as { slug?: string } | null;
  return row?.slug ? { ok: true, slug: row.slug } : { ok: false, message: REFUSED };
}

export async function restorePoll(id: string): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser().rpc("restore_poll", { target: id });
  if (error) return { ok: false, message: readable(error.message) };
  const row = data as { slug?: string } | null;
  return row?.slug ? { ok: true, slug: row.slug } : { ok: false, message: REFUSED };
}

/**
 * Destroys the poll and every vote cast in it. Admin only.
 *
 * The count is checked rather than the error: a DELETE that RLS refuses raises
 * nothing at all, it affects zero rows, and a screen reading only the error
 * reports success on a refusal.
 */
export async function deletePoll(id: string): Promise<AuthorResult> {
  const { error, count } = await supabaseBrowser()
    .from("polls")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, message: readable(error.message) };
  if (!count) return { ok: false, message: "Not permitted — deleting a poll is an admin power." };
  return { ok: true, slug: "" };
}
