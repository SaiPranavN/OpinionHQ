/**
 * One poll, as its editor sees it.
 *
 * Read through the editor's own session, so an unpublished draft resolves here
 * and 404s for everybody else — the row policy decides that, not this file.
 */

import { notFound } from "next/navigation";

import { PollEditor } from "@/components/admin/PollEditor";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${slug} · Editorial desk` };
}

interface Row {
  id: string;
  slug: string;
  question: string;
  category_id: string;
  place_id: string;
  status: string;
  summary: string;
  about: string;
  tags: string[] | null;
  closes_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  poll_options: { id: string; slot: string; name: string; blurb: string; vote_count: number }[] | null;
}

export default async function AdminPollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("polls")
    .select(
      "id, slug, question, category_id, place_id, status, summary, about, tags, closes_at, " +
        "published_at, archived_at, poll_options(id, slot, name, blurb, vote_count)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();
  const row = data as unknown as Row;

  return (
    <PollEditor
      poll={{
        id: row.id,
        slug: row.slug,
        question: row.question,
        categoryId: row.category_id,
        placeId: row.place_id,
        status: row.status,
        summary: row.summary ?? "",
        about: row.about ?? "",
        tags: row.tags ?? [],
        closesAt: row.closes_at,
        published: Boolean(row.published_at),
        archived: Boolean(row.archived_at),
      }}
      options={[...(row.poll_options ?? [])]
        .sort((a, b) => a.slot.localeCompare(b.slot))
        .map((o) => ({
          id: o.id,
          slot: o.slot,
          name: o.name,
          blurb: o.blurb,
          votes: o.vote_count,
        }))}
    />
  );
}
