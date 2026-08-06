import type { Metadata } from "next";

import { CatalogView } from "@/components/catalog/CatalogView";
import { TrendingTicker } from "@/components/catalog/TrendingTicker";
import { Footer } from "@/components/site/Footer";
import { allTopics, topicCountByCategory, hotTopics } from "@/lib/topics";

export const metadata: Metadata = {
  // Matches the h1 on the page. A tab reading "Explore topics" over a heading
  // reading "Explore opinions" is the kind of drift nobody notices until it is
  // in a screenshot.
  title: "Explore opinions",
  description:
    "Explore active topics and see how OpinionHQ participants currently feel about them. Percentages describe OpinionHQ participants only.",
};

export default function CatalogPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <TrendingTicker topics={hotTopics()} />
      <CatalogView topics={allTopics()} counts={topicCountByCategory()} />
      <Footer />
    </div>
  );
}
