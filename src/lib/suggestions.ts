"use client";

/**
 * Suggesting a topic or a poll, and reviewing what was suggested.
 *
 * `topic_requests` has existed since the topics migration and nothing has ever
 * written to it. This is the half that was missing.
 *
 * APPROVAL PRODUCES A DRAFT, NOT A LIVE SUBJECT. A request carries a name, a
 * category, a place and a paragraph of reasoning — enough to create the row and
 * nowhere near enough to publish it, which needs a summary, background, aspects
 * and an editor's judgement about status. So `approve_*` creates the subject
 * unpublished, attaches the credit, and the editor finishes it in the editor
 * that already exists.
 */

import { supabaseBrowser } from "@/lib/supabase/client";

export type SuggestionKind = "topic" | "poll";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  /** The topic name or the poll question. */
  title: string;
  rationale: string;
  categoryId: string | null;
  placeId: string | null;
  /** Poll suggestions only. */
  options: string[];
  requestedBy: string;
  requestedByName: string;
  createdAt: string;
  /** Set once approved — the subject that came out of it. */
  subjectId: string | null;
  declinedAt: string | null;
  declineNote: string | null;
}

/* ------------------------------------------------------------- suggesting */

export async function suggestTopic(input: {
  name: string;
  rationale: string;
  categoryId: string;
  placeId: string;
}): Promise<void> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to suggest a topic.");

  const { error } = await supabase.from("topic_requests").insert({
    requested_by: user.id,
    name: input.name.trim(),
    rationale: input.rationale.trim(),
    category_id: input.categoryId,
    place_id: input.placeId,
  });
  // The Pro check is the row policy's, not this function's. Its refusal comes
  // back as a row-level-security error, which is unreadable, so it is
  // translated here and nowhere else.
  if (error) throw new Error(readable(error.message));
}

export async function suggestPoll(input: {
  question: string;
  options: string[];
  rationale: string;
  categoryId: string;
  placeId: string;
}): Promise<void> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to suggest a poll.");

  const labels = input.options.map((o) => o.trim()).filter(Boolean);
  if (labels.length < 2) throw new Error("A poll needs at least two options.");

  const { error } = await supabase.from("poll_requests").insert({
    requested_by: user.id,
    question: input.question.trim(),
    option_labels: labels.slice(0, 4),
    rationale: input.rationale.trim(),
    category_id: input.categoryId,
    place_id: input.placeId,
  });
  if (error) throw new Error(readable(error.message));
}

function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "Suggesting a subject is a Pro feature. It is free while the launch offer runs.";
  }
  return message;
}

/* -------------------------------------------------------------- reviewing */

/**
 * Everything still waiting, both kinds, newest first.
 *
 * Two queries because they are two tables — a polymorphic `requests(kind, …)`
 * would have made this one, and would have given up the foreign keys that make
 * `topic_id` and `poll_id` mean anything.
 */
export async function readOpenSuggestions(): Promise<Suggestion[]> {
  const supabase = supabaseBrowser();

  const [{ data: topics }, { data: polls }] = await Promise.all([
    supabase
      .from("topic_requests")
      .select(
        "id, name, rationale, category_id, place_id, requested_by, created_at, " +
          "topic_id, declined_at, decline_note, profiles!requested_by(display_name)",
      )
      .is("topic_id", null)
      .is("declined_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("poll_requests")
      .select(
        "id, question, option_labels, rationale, category_id, place_id, requested_by, " +
          "created_at, poll_id, declined_at, decline_note, profiles!requested_by(display_name)",
      )
      .is("poll_id", null)
      .is("declined_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const named = (row: { profiles?: unknown }): string => {
    const p = row.profiles;
    const first = Array.isArray(p) ? p[0] : p;
    return (first as { display_name?: string } | null)?.display_name ?? "A member";
  };

  const fromTopics: Suggestion[] = ((topics ?? []) as never[]).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      kind: "topic" as const,
      title: row.name as string,
      rationale: (row.rationale as string) ?? "",
      categoryId: (row.category_id as string) ?? null,
      placeId: (row.place_id as string) ?? null,
      options: [],
      requestedBy: row.requested_by as string,
      requestedByName: named(row),
      createdAt: row.created_at as string,
      subjectId: (row.topic_id as string) ?? null,
      declinedAt: (row.declined_at as string) ?? null,
      declineNote: (row.decline_note as string) ?? null,
    };
  });

  const fromPolls: Suggestion[] = ((polls ?? []) as never[]).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      kind: "poll" as const,
      title: row.question as string,
      rationale: (row.rationale as string) ?? "",
      categoryId: (row.category_id as string) ?? null,
      placeId: (row.place_id as string) ?? null,
      options: (row.option_labels as string[]) ?? [],
      requestedBy: row.requested_by as string,
      requestedByName: named(row),
      createdAt: row.created_at as string,
      subjectId: (row.poll_id as string) ?? null,
      declinedAt: (row.declined_at as string) ?? null,
      declineNote: (row.decline_note as string) ?? null,
    };
  });

  return [...fromTopics, ...fromPolls].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Approves, and returns the slug of the draft it created. */
export async function approveSuggestion(s: Suggestion): Promise<string> {
  const supabase = supabaseBrowser();
  const { data, error } =
    s.kind === "topic"
      ? await supabase.rpc("approve_topic_request", { request: s.id })
      : await supabase.rpc("approve_poll_request", { request: s.id });

  if (error) throw new Error(error.message);
  return (data as unknown as { slug: string } | null)?.slug ?? "";
}

export async function declineSuggestion(s: Suggestion, note: string): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } =
    s.kind === "topic"
      ? await supabase.rpc("decline_topic_request", { request: s.id, note })
      : await supabase.rpc("decline_poll_request", { request: s.id, note });

  if (error) throw new Error(error.message);
}

/** This account's own suggestions, approved and declined included. */
export async function readMySuggestions(): Promise<Suggestion[]> {
  const all = await readOpenSuggestions();
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return all.filter((s) => s.requestedBy === user.id);
}
