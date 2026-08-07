/**
 * Editing one topic, and publishing developments on it.
 *
 * Read on the server so a draft is here for an editor and a 404 for everybody
 * else — the row policy decides, not this file. Everything writable is handed to
 * a client component, because these are forms.
 */

import { notFound } from "next/navigation";

import { TopicEditor } from "@/components/admin/TopicEditor";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Edit ${slug} · Editorial desk` };
}

interface Row {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  place_id: string;
  status: string;
  summary: string;
  about: string;
  tags: string[] | null;
  published_at: string | null;
  archived_at: string | null;
  topic_aspects:
    | {
        id: string;
        label: string;
        prompt: string;
        position: number;
        topic_aspect_options: { id: string; label: string; tone: string; position: number }[];
      }[]
    | null;
  timeline_events:
    | {
        id: string;
        occurred_on: string;
        title: string;
        description: string;
        source_name: string;
        source_url: string | null;
        status: string;
      }[]
    | null;
}

export default async function EditTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("topics")
    .select(
      "id, slug, name, category_id, place_id, status, summary, about, tags, published_at, archived_at, " +
        "topic_aspects(id, label, prompt, position, topic_aspect_options(id, label, tone, position)), " +
        "timeline_events(id, occurred_on, title, description, source_name, source_url, status)",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();
  const row = data as unknown as Row;

  return (
    <TopicEditor
      topic={{
        id: row.id,
        slug: row.slug,
        name: row.name,
        categoryId: row.category_id,
        placeId: row.place_id,
        status: row.status,
        summary: row.summary ?? "",
        about: row.about ?? "",
        tags: row.tags ?? [],
        published: Boolean(row.published_at),
        archived: Boolean(row.archived_at),
      }}
      aspects={[...(row.topic_aspects ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((a) => ({
          id: a.id,
          label: a.label,
          prompt: a.prompt,
          options: [...(a.topic_aspect_options ?? [])]
            .sort((x, y) => x.position - y.position)
            .map((o) => ({ id: o.id, label: o.label, tone: o.tone })),
        }))}
      events={[...(row.timeline_events ?? [])]
        .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
        .map((e) => ({
          id: e.id,
          date: e.occurred_on,
          title: e.title,
          description: e.description ?? "",
          sourceName: e.source_name,
          sourceUrl: e.source_url,
          status: e.status,
        }))}
    />
  );
}
