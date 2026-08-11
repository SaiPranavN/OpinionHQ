/**
 * Every topic an editor can see, drafts included.
 *
 * Read on the server through their own session, so the list is exactly what the
 * policies allow: `"published topics are world readable"` widens to everything
 * for an editor, and a member reaching this URL would get an empty table rather
 * than a filtered one.
 */

import Link from "next/link";

import { TopicRows } from "@/components/admin/TopicRows";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Topics · Editorial desk" };

// Drafts change the moment an editor saves one; a cached list would show a
// topic they just created as missing.
export const dynamic = "force-dynamic";

/**
 * The shape of one row after the embeds.
 *
 * Declared rather than inferred because PostgREST types an embedded select as a
 * union that includes a parse-error shape, and the generated types cannot narrow
 * it at the call site. The reads below are defensive regardless.
 */
interface TopicRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  place_id: string;
  status: string;
  summary: string;
  published_at: string | null;
  archived_at: string | null;
  topic_stats: { participants: number; written_count: number } | { participants: number; written_count: number }[] | null;
  topic_aspects: { id: string }[] | null;
}

/** PostgREST returns a one-to-one embed as an object or a 1-length array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function AdminTopics() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [topicsResult, profileResult] = await Promise.all([
    supabase
      .from("topics")
      .select(
        "id, slug, name, category_id, place_id, status, summary, published_at, archived_at, created_at, " +
          "topic_stats(participants, written_count), topic_aspects(id)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  const topics = (topicsResult.data ?? []) as unknown as TopicRow[];
  const isAdmin = profileResult.data?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
          Topics
          <span className="ml-2.5 font-mono text-[12px] font-normal tracking-normal text-dim">
            {topics.length}
          </span>
        </h2>
        <Link
          href="/admin/topics/new"
          className="rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors duration-300 hover:bg-[#25CC61]"
        >
          New topic
        </Link>
      </div>

      {topics.length === 0 ? (
        <div className="ohq-panel flex flex-col items-start gap-3 p-6">
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-muted">
            No topics yet. The public catalog reads this table directly, so it is
            currently empty for everyone — which is the honest state of a platform
            that has not published one.
          </p>
        </div>
      ) : (
        <TopicRows
          topics={topics.map((t) => {
            const stats = one(t.topic_stats);
            return {
              id: t.id,
              slug: t.slug,
              name: t.name,
              categoryId: t.category_id,
              placeId: t.place_id,
              status: t.status,
              summary: t.summary,
              publishedAt: t.published_at,
              archivedAt: t.archived_at,
              participants: stats?.participants ?? 0,
              written: stats?.written_count ?? 0,
              aspectCount: t.topic_aspects?.length ?? 0,
            };
          })}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
