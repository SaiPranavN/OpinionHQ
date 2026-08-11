import type { Metadata } from "next";

import { CatalogView } from "@/components/catalog/CatalogView";
import { TrendingTicker } from "@/components/catalog/TrendingTicker";
import { Footer } from "@/components/site/Footer";
import { topicCountByCategory, trendingTopics } from "@/lib/topics";
import { listTopics } from "@/lib/topics/queries";

export const metadata: Metadata = {
  // Matches the h1 on the page. A tab reading "Explore topics" over a heading
  // reading "Explore opinions" is the kind of drift nobody notices until it is
  // in a screenshot.
  title: "Explore opinions",
  description:
    "Explore active topics and see how OpinionHQ participants currently feel about them. Percentages describe OpinionHQ participants only.",
};

/**
 * Rendered per request, not built once.
 *
 * A vote changes the numbers on every card that shows the topic, and a cached
 * catalog would keep serving a distribution that has already moved — which on a
 * product whose whole claim is measurement is worse than being slow.
 */
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const topics = await listTopics();

  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      {/* Nothing to tick through before anything is published. The strip draws
          nothing rather than an empty rail. */}
      {topics.length > 0 ? (
        <TrendingTicker items={trendingTopics(topics)} />
      ) : null}
      <CatalogView topics={topics} counts={topicCountByCategory(topics)} />
      <Footer />
    </div>
  );
}
