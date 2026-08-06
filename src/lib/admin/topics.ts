"use client";

/**
 * Publishing a topic, for real.
 *
 * The composer that calls this is the same component `/topics/new` uses — it
 * takes a publisher and does not know or care which one it got. Everything here
 * runs with the editor's own session, so the row policies decide what lands; the
 * `is_editor()` check inside `author_topic` is what actually refuses, not the
 * fact that this module is only imported from `/admin`.
 */

import type { Facet } from "@/lib/types";
import type { PlaceId } from "@/lib/places";
import type { CategoryId, StatusId } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface TopicDraft {
  slug: string;
  name: string;
  category: CategoryId;
  place: PlaceId;
  status: StatusId;
  summary: string;
  about: string;
  tags: string[];
  aspects: Facet[];
  /** False leaves it as a draft, visible to editors and to nobody else. */
  publish: boolean;
}

export type AuthorResult = { ok: true; slug: string } | { ok: false; message: string };

function readable(message: string): string {
  if (message.includes("topics_slug_key") || message.includes("duplicate key")) {
    return "That address is already taken. Try a more specific name.";
  }
  if (message.includes("only editors")) {
    return "Your account cannot publish topics.";
  }
  if (message.includes("at least two aspects")) {
    return "A topic needs at least two complete aspects.";
  }
  if (message.includes("topics_slug_shape")) {
    return "That name does not produce a usable address. Use letters and numbers.";
  }
  return message;
}

export async function authorTopic(draft: TopicDraft): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser().rpc("author_topic", {
    slug: draft.slug,
    name: draft.name,
    category_id: draft.category,
    place_id: draft.place,
    status: draft.status,
    summary: draft.summary,
    about: draft.about,
    tags: draft.tags,
    aspects: draft.aspects.map((facet) => ({
      key: facet.id,
      label: facet.label,
      prompt: facet.prompt,
      options: facet.options.map((option) => ({
        key: option.id,
        label: option.label,
        tone: option.tone,
      })),
    })),
    publish: draft.publish,
  });

  if (error) return { ok: false, message: readable(error.message) };

  const row = data as { slug?: string } | null;
  return row?.slug ? { ok: true, slug: row.slug } : { ok: false, message: "The topic was not created." };
}

/**
 * Whether an address is free.
 *
 * Through the function rather than a select, because an unpublished topic is
 * invisible to its own policy check from the composer's point of view — a plain
 * query would report a colleague's draft slug as available and then fail on
 * insert.
 */
export async function isSlugFree(slug: string): Promise<boolean> {
  if (!slug) return false;
  const { data, error } = await supabaseBrowser().rpc("slug_available", { candidate: slug });
  return error ? false : Boolean(data);
}

/* ------------------------------------------------------------- lifecycle */

export async function publishTopic(id: string): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser()
    .from("topics")
    .update({ published_at: new Date().toISOString(), archived_at: null })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) return { ok: false, message: readable(error.message) };
  // A policy that refuses does not raise; it matches no rows. Checking the
  // returned row is the only way to tell a refusal from a success.
  return data?.slug ? { ok: true, slug: data.slug } : { ok: false, message: "Not permitted." };
}

/** Takes it off the site and keeps every measurement. The editor's tool. */
export async function archiveTopic(id: string): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser()
    .from("topics")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) return { ok: false, message: readable(error.message) };
  return data?.slug ? { ok: true, slug: data.slug } : { ok: false, message: "Not permitted." };
}

export async function restoreTopic(id: string): Promise<AuthorResult> {
  const { data, error } = await supabaseBrowser()
    .from("topics")
    .update({ archived_at: null })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) return { ok: false, message: readable(error.message) };
  return data?.slug ? { ok: true, slug: data.slug } : { ok: false, message: "Not permitted." };
}

/**
 * Destroys the topic and every opinion attached to it. Admin only.
 *
 * The count is checked rather than the error, because a DELETE that RLS refuses
 * raises nothing at all — it silently affects zero rows, and a screen that reads
 * only the error reports success on a refusal.
 */
export async function deleteTopic(id: string): Promise<AuthorResult> {
  const { error, count } = await supabaseBrowser()
    .from("topics")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, message: readable(error.message) };
  if (!count) return { ok: false, message: "Not permitted — deleting a topic is an admin power." };
  return { ok: true, slug: "" };
}
