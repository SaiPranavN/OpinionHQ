import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { PollAudience } from "@/components/polls/PollAudience";
import { ApprovalNotice } from "@/components/polls/ApprovalNotice";
import { PollHeader } from "@/components/polls/PollHeader";
import { PollHistory } from "@/components/polls/PollHistory";
import { PollReasons } from "@/components/polls/PollReasons";
import { PollVotePanel } from "@/components/polls/PollVotePanel";
import { Footer } from "@/components/site/Footer";
import { getPollPage } from "@/lib/polls/queries";

/**
 * No `generateStaticParams` any more.
 *
 * It used to enumerate the fixtures at build time — 22 poll pages baked into
 * the bundle as static HTML, which was possible only because the whole catalog
 * was a file. A poll can now be published a minute after a deploy, and its
 * split changes with every vote; a prerendered page would serve a stale
 * result until the next build.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPollPage(slug);
  if (!page) return { title: "Poll" };
  const { poll } = page;
  return {
    title: poll.question,
    description: `${poll.marginLabel}. ${poll.splitLabel}. ${poll.summary}`,
  };
}

export default async function PollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPollPage(slug);

  // A real 404. The old route fell through to a client component because a poll
  // could exist only in the visitor's own browser storage; there is one place a
  // poll can be now, and either it is there or it is not.
  //
  // An unpublished draft lands here for everyone but an editor, whose session
  // the query ran under — the row policy decides that, not this file.
  if (!page) notFound();

  const { poll, reasons } = page;

  return (
    <>
      <RevealOnScroll />
      <div
        className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8 lg:px-14"
        style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
      >
        {/* Named-individual approval polls carry their own warning above the
            fold. See ApprovalNotice for why a badge is not enough here. */}
        {poll.cat === "politicians" ? <ApprovalNotice /> : null}
        <PollHeader poll={poll} reasons={reasons} />
        {/* History before the cross-tabs: "how did we get here" is the question
            a reader has immediately after seeing the split, and it is a worse
            answer once they have been through three breakdowns. */}
        <PollHistory poll={poll} />
        <PollAudience poll={poll} />
        <PollVotePanel poll={poll} />
        <PollReasons poll={poll} reasons={reasons} />
      </div>
      <Footer />
    </>
  );
}
