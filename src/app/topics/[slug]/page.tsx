import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";
import { TopicDashboard } from "@/components/topic/TopicDashboard";
import { getTopicPage } from "@/lib/topics/queries";

/**
 * No `generateStaticParams` any more.
 *
 * It used to enumerate the fixtures at build time, which was possible only
 * because the whole catalog was a file. A topic can now be published a minute
 * after a deploy, and a build-time list would 404 it until the next one.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getTopicPage(slug);
  if (!page) return { title: "Topic" };
  const { topic } = page;
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
  const page = await getTopicPage(slug);

  // A real 404 now. The old route fell through to a client component because a
  // topic could exist only in the visitor's own browser storage; there is one
  // place a topic can be, and either it is there or it is not.
  //
  // An unpublished draft lands here for everyone but an editor, whose session
  // the query ran under — which is the row policy doing the deciding, not this
  // file.
  if (!page) notFound();

  return (
    <>
      <RevealOnScroll />
      <TopicDashboard
        topic={page.topic}
        context={page.context}
        opinions={page.opinions}
        timeline={page.timeline}
      />
      <Footer />
    </>
  );
}
