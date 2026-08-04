import type { Metadata } from "next";

import { LocalPollRoute } from "@/components/polls/LocalPollRoute";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { PollAudience } from "@/components/polls/PollAudience";
import { ApprovalNotice } from "@/components/polls/ApprovalNotice";
import { PollHeader } from "@/components/polls/PollHeader";
import { PollHistory } from "@/components/polls/PollHistory";
import { PollReasons } from "@/components/polls/PollReasons";
import { PollVotePanel } from "@/components/polls/PollVotePanel";
import { Footer } from "@/components/site/Footer";
import { allPolls, getPoll } from "@/lib/polls";
import { reasonsFor } from "@/lib/sample-data/poll-reasons";

export function generateStaticParams() {
  return allPolls().map((poll) => ({ slug: poll.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const poll = getPoll(slug);
  if (!poll) return { title: "Poll" };
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
  const poll = getPoll(slug);

  // Unknown slugs are not necessarily missing: the composer publishes polls
  // into browser storage, so hand off to the client before deciding.
  if (!poll) {
    return (
      <>
        <LocalPollRoute slug={slug} />
        <Footer />
      </>
    );
  }

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
        <PollHeader poll={poll} reasons={reasonsFor(poll.id)} />
        {/* History before the cross-tabs: "how did we get here" is the question
            a reader has immediately after seeing the split, and it is a worse
            answer once they have been through three breakdowns. */}
        <PollHistory poll={poll} />
        <PollAudience poll={poll} />
        <PollVotePanel poll={poll} />
        <PollReasons poll={poll} reasons={reasonsFor(poll.id)} />
      </div>
      <Footer />
    </>
  );
}
