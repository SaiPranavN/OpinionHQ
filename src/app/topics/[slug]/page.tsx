import type { Metadata } from "next";

import { TopicDashboard } from "@/components/topic/TopicDashboard";
import { LocalTopicRoute } from "@/components/topic/LocalTopicRoute";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";
import { allTopics, getTopic } from "@/lib/topics";
import { opinionsFor } from "@/lib/sample-data/opinions";
import { contextFor, timelineFor } from "@/lib/sample-data/timeline";

export function generateStaticParams() {
  return allTopics().map((topic) => ({ slug: topic.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Topic" };
  return {
    title: topic.name,
    description: `${topic.headlineMetric} ${topic.sampleLabel}. ${topic.summary}`,
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);

  // Unknown slugs are not necessarily missing: the composer publishes topics
  // into browser storage, so hand off to the client before deciding.
  if (!topic) {
    return (
      <>
        <LocalTopicRoute slug={slug} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <RevealOnScroll />
      <TopicDashboard
        topic={topic}
        context={contextFor(topic.id)}
        opinions={opinionsFor(topic.id)}
        timeline={timelineFor(topic.id)}
      />
      <Footer />
    </>
  );
}
