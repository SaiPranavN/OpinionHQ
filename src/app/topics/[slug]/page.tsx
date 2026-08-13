import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { SubjectGate } from "@/components/auth/SubjectGate";
import { Footer } from "@/components/site/Footer";
import { getTopicPreview } from "@/lib/preview";
import { supabaseServer } from "@/lib/supabase/server";
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
  /**
   * Built from the preview, not the dashboard.
   *
   * Two reasons. It is the cheap query, and metadata is generated on every
   * request including the gated one. And the description used to quote the
   * headline metric — "100% Positive across 2 participants" — which is now a
   * figure the arriving visitor is not shown. A search result should not
   * promise what the page withholds.
   */
  const preview = await getTopicPreview(slug);
  // Not found, and it must not be indexable. Without this the 404 inherits the
  // layout's `index: true` and Google is invited to keep a page that is gone.
  if (!preview) return { title: "Topic", robots: { index: false, follow: false } };
  const topic = { name: preview.title };
  const description = preview.summary || preview.about;
  return {
    title: topic.name,
    description,
    // Its own address, not the site root inherited from the layout.
    alternates: { canonical: `/topics/${slug}` },
    openGraph: {
      type: "article",
      title: topic.name,
      description,
      url: `/topics/${slug}`,
    },
    twitter: { card: "summary_large_image", title: topic.name, description },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /**
   * Signed out gets the subject and not the measurement.
   *
   * The check is here rather than in a modal because a modal is decoration:
   * the numbers would still be in the HTML. Branching before the read means
   * the eight queries behind a dashboard never run for a visitor who cannot
   * see it, so the gate is cheaper than the page as well as being real.
   */
  const {
    data: { user },
  } = await (await supabaseServer()).auth.getUser();

  if (!user) {
    const preview = await getTopicPreview(slug);
    if (!preview) notFound();
    return (
      <>
        <SubjectGate
          preview={preview}
          kind="topic"
          behind={[
            "The sentiment distribution — how positive, neutral and negative split",
            "How that has moved, day by day, since the topic opened",
            "Who took part: region, age, occupation and gender",
            "Every written opinion, and the discussion under it",
            "Your own vote, counted once",
          ]}
        />
        <Footer />
      </>
    );
  }

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
        replies={page.replies}
        myReplyVotes={page.myReplyVotes}
        timeline={page.timeline}
      />
      <Footer />
    </>
  );
}
