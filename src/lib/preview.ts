import "server-only";

import { supabasePublic } from "@/lib/supabase/public";

/**
 * What a signed-out visitor is allowed to see of a topic or a poll.
 *
 * THE GATE IS HERE, NOT IN A COMPONENT. A modal drawn over a fully rendered
 * page is a prompt, not a gate: the numbers are still in the HTML and one
 * devtools keystroke away. These queries are narrow on purpose — they select
 * the subject and nothing measured — so the data a visitor has not signed in
 * for never reaches their browser.
 *
 * What stays public is what makes the page worth finding: the name, what the
 * subject is, its category and its tags. That is real content, so Google can
 * still index these pages and the sitemap is not advertising a wall. What
 * costs an account is the measurement — the distribution, the cross-tabs, the
 * trend and what people wrote.
 *
 * Uses the session-less client deliberately. A preview is identical for
 * everybody who is not signed in, and reading cookies here would make the
 * route uncacheable for no benefit.
 */

export interface SubjectPreview {
  slug: string;
  title: string;
  summary: string;
  about: string;
  tags: string[];
  categoryId: string;
  placeId: string;
  status: string;
  /** Poll option names only. No counts — those are the measurement. */
  options?: string[];
}

const COLUMNS = "slug, category_id, place_id, status, summary, about, tags, published_at";

export async function getTopicPreview(slug: string): Promise<SubjectPreview | null> {
  const { data } = await supabasePublic()
    .from("topics")
    .select(`name, ${COLUMNS}`)
    .eq("slug", slug)
    .not("published_at", "is", null)
    .is("archived_at", null)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return {
    slug: row.slug as string,
    title: row.name as string,
    summary: (row.summary as string) ?? "",
    about: (row.about as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    categoryId: row.category_id as string,
    placeId: row.place_id as string,
    status: (row.status as string) ?? "Live",
  };
}

export async function getPollPreview(slug: string): Promise<SubjectPreview | null> {
  const { data } = await supabasePublic()
    .from("polls")
    // Option names come along because they are part of the question — "YES !!
    // or NO WAY!!" is what the poll asks. The vote counts do not.
    .select(`question, ${COLUMNS}, poll_options(name, slot)`)
    .eq("slug", slug)
    .not("published_at", "is", null)
    .is("archived_at", null)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  const options = ((row.poll_options as { name: string; slot: string }[] | null) ?? [])
    .slice()
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((o) => o.name);

  return {
    slug: row.slug as string,
    title: row.question as string,
    summary: (row.summary as string) ?? "",
    about: (row.about as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    categoryId: row.category_id as string,
    placeId: row.place_id as string,
    status: (row.status as string) ?? "Live",
    options,
  };
}
