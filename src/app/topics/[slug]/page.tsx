import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";
import { getTopicPreview } from "@/lib/preview";
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
   * NO SIGN-IN GATE. It was here and it has been removed.
   *
   * The dashboard is readable by anybody: the distribution, the cross-tabs,
   * every written opinion and the discussion under it. An account is what you
   * need to *contribute* — vote, write, reply, publish — and each of those is
   * refused by a row policy rather than by this file, so the rule holds for a
   * script as well as for a browser.
   *
   * That is also why the read costs nothing extra: `opinion_feed` and the
   * aggregate functions are readable by `anon`, so a signed-out visitor runs
   * the same queries a member does and gets the same numbers.
   */

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
        myOpinionVotes={page.myOpinionVotes}
        timeline={page.timeline}
      />
      <Footer />
    </>
  );
}
