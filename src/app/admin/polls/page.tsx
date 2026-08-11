/**
 * Every poll an editor can see, drafts included.
 *
 * Read on the server through their own session, so the list is exactly what the
 * policies allow: `"published polls are world readable"` widens to everything
 * for an editor, and a member reaching this URL gets an empty table rather than
 * a filtered one.
 */

import Link from "next/link";

import { PollRows } from "@/components/admin/PollRows";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Polls · Editorial desk" };

// Drafts change the moment an editor saves one; a cached list would show a poll
// they just created as missing.
export const dynamic = "force-dynamic";

/**
 * The shape of one row after the embeds.
 *
 * Declared rather than inferred because PostgREST types an embedded select as a
 * union including a parse-error shape, which the generated types cannot narrow
 * at the call site.
 */
interface PollRow {
  id: string;
  slug: string;
  question: string;
  category_id: string;
  place_id: string;
  status: string;
  summary: string;
  published_at: string | null;
  archived_at: string | null;
  closes_at: string | null;
  poll_stats:
    | { total_votes: number; reason_count: number }
    | { total_votes: number; reason_count: number }[]
    | null;
  poll_options: { id: string }[] | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function AdminPolls() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [pollsResult, profileResult] = await Promise.all([
    supabase
      .from("polls")
      .select(
        "id, slug, question, category_id, place_id, status, summary, published_at, archived_at, " +
          "closes_at, created_at, poll_stats(total_votes, reason_count), poll_options(id)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  const polls = (pollsResult.data ?? []) as unknown as PollRow[];
  const isAdmin = profileResult.data?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
          Polls
          <span className="ml-2.5 font-mono text-[12px] font-normal tracking-normal text-dim">
            {polls.length}
          </span>
        </h2>
        <Link
          href="/admin/polls/new"
          className="rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors duration-300 hover:bg-[#25CC61]"
        >
          New poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="ohq-panel flex flex-col items-start gap-3 p-6">
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-muted">
            No polls yet. The public catalog reads this table directly, so it is
            currently empty for everyone — which is the honest state of a platform
            that has not published one.
          </p>
        </div>
      ) : (
        <PollRows
          polls={polls.map((p) => {
            const stats = one(p.poll_stats);
            return {
              id: p.id,
              slug: p.slug,
              question: p.question,
              categoryId: p.category_id,
              placeId: p.place_id,
              status: p.status,
              summary: p.summary,
              publishedAt: p.published_at,
              archivedAt: p.archived_at,
              closesAt: p.closes_at,
              votes: stats?.total_votes ?? 0,
              reasons: stats?.reason_count ?? 0,
              optionCount: p.poll_options?.length ?? 0,
            };
          })}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
