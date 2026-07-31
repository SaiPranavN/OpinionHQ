import type { Metadata } from "next";

import { CatalogView } from "@/components/catalog/CatalogView";
import { TrendingTicker } from "@/components/catalog/TrendingTicker";
import { Footer } from "@/components/site/Footer";
import { allTopics, topicCountByCategory, hotTopics } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Explore topics",
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
