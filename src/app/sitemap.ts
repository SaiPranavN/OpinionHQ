import type { MetadataRoute } from "next";

import { absolute } from "@/lib/site";
import { supabasePublic } from "@/lib/supabase/public";

/**
 * Every page worth indexing, generated from the database.
 *
 * NOT A HAND-KEPT LIST, deliberately. A static sitemap is wrong the moment an
 * editor publishes anything, and wrong in the direction that costs the most —
 * the new page is the one nobody can find. This reads the same two views the
 * catalogs read, so publishing a topic is the only step.
 *
 * It selects slugs and timestamps rather than calling `listTopics`/`listPolls`.
 * Those decorate every row into a full card — percentages, colours, arc
 * geometry, cross-tabs — and none of that survives into an XML file. A crawler
 * asking for the sitemap should not cost what rendering the catalog costs.
 *
 * `published_at is not null` matches what the catalogs show. An unpublished or
 * archived topic is not linked from anywhere and must not be advertised here;
 * its row policies would refuse an anonymous reader anyway, so listing it would
 * be pointing Google at a 404.
 */
/**
 * Rebuilt at most once an hour, and served from cache in between.
 *
 * THIS ONLY WORKS BECAUSE THE CLIENT BELOW HAS NO COOKIES. It was written with
 * `supabaseServer()`, which reads `cookies()` — and a route that touches
 * cookies is dynamic, full stop, so this line was ignored. Vercel answered
 * every fetch with `x-vercel-cache: MISS` and a live Postgres query behind it,
 * up to two seconds, for a file whose contents are identical for everybody.
 */
export const revalidate = 3600;

type Row = { slug: string; last_activity_at: string | null; updated_at: string | null };

/** Newest real timestamp on the row, or now. */
function lastModified(row: Row): Date {
  const stamp = row.last_activity_at ?? row.updated_at;
  const date = stamp ? new Date(stamp) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = supabasePublic();

  const [topics, polls] = await Promise.all([
    supabase
      .from("topic_cards")
      .select("slug, last_activity_at, updated_at")
      .not("published_at", "is", null)
      .limit(5000),
    supabase
      .from("poll_cards")
      .select("slug, last_activity_at, updated_at")
      .not("published_at", "is", null)
      .limit(5000),
  ]);

  // A failed read must not take the whole sitemap down with it. Returning the
  // three static entries beats returning a 500: Google retries a thin sitemap
  // and gives up on a broken one.
  const topicRows = (topics.data ?? []) as Row[];
  const pollRows = (polls.data ?? []) as Row[];

  const now = new Date();

  return [
    { url: absolute("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absolute("/topics"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absolute("/polls"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    // Both are indexable and neither moves often. /pro answers "what does this
    // cost", which is a question people put to a search engine before they put
    // it to a site; /contribute was reachable only from the nav.
    { url: absolute("/pro"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    {
      url: absolute("/contribute"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...topicRows.map((row) => ({
      url: absolute(`/topics/${row.slug}`),
      lastModified: lastModified(row),
      // A topic's numbers move with every vote, which is the whole product.
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...pollRows.map((row) => ({
      url: absolute(`/polls/${row.slug}`),
      lastModified: lastModified(row),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
