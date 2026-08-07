import "server-only";

/**
 * The counts the landing page puts its name to.
 *
 * THEY USED TO BE CONSTANTS OVER A FIXTURE ARRAY, which meant the home page
 * told every visitor how many topics the platform carried and how many votes
 * had been cast, and both numbers described a file. That is the exact thing
 * AGENTS.md §7 forbids — not because the figures were wrong, but because a
 * visitor has no way to tell a real one from an invented one, and once you
 * publish one invented number the real ones stop meaning anything.
 *
 * Counted, and cheaply: `head: true` returns the count in a header with no rows
 * on the wire, and the participant total comes from `topic_stats`, which is
 * trigger-maintained, rather than from counting `opinions`.
 */

import { supabaseServer } from "@/lib/supabase/server";

export interface CatalogTotals {
  topics: number;
  votes: number;
}

export async function catalogTotals(): Promise<CatalogTotals> {
  const supabase = await supabaseServer();

  const [{ count: topics }, { data: stats }] = await Promise.all([
    supabase
      .from("topics")
      .select("*", { count: "exact", head: true })
      .not("published_at", "is", null)
      .is("archived_at", null),
    supabase.from("topic_stats").select("participants"),
  ]);

  return {
    topics: topics ?? 0,
    votes: ((stats as { participants: number }[] | null) ?? []).reduce(
      (sum, row) => sum + (row.participants ?? 0),
      0,
    ),
  };
}
