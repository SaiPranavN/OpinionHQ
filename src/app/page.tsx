import Link from "next/link";

import { CategoriesSection } from "@/components/landing/CategoriesSection";
import { Hero } from "@/components/landing/Hero";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TwoModesSection } from "@/components/landing/TwoModesSection";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Footer } from "@/components/site/Footer";
import { topicCountByCategory } from "@/lib/topics";
import { listTopics } from "@/lib/topics/queries";
import { catalogTotals } from "@/lib/topics/totals";
import { listPolls } from "@/lib/polls/queries";

/**
 * Rendered per request, because the figures on it are claims.
 *
 * "N topics, M votes cast" used to be constants over a fixture file. They are
 * counted now, which means the page has to be able to say a small number — or
 * none — rather than a flattering one.
 */
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [totals, topics, polls] = await Promise.all([
    catalogTotals(),
    listTopics(),
    listPolls(),
  ]);

  const pollTotals = {
    count: polls.length,
    votes: polls.reduce((sum, poll) => sum + poll.total, 0),
  };

  const pollCounts = new Map<string, number>();
  for (const poll of polls) {
    pollCounts.set(poll.cat, (pollCounts.get(poll.cat) ?? 0) + 1);
  }

  return (
    <>
      <RevealOnScroll />
      <Hero
        topicCount={totals.topics}
        voteCount={totals.votes}
        pollCount={pollTotals.count}
      />

      {/* What the product is, before how it works. The two public modes first,
          then the private one — the contrast is the explanation. */}
      <TwoModesSection
        topicCount={totals.topics}
        voteCount={totals.votes}
        pollCount={pollTotals.count}
        pollVotes={pollTotals.votes}
      />
      <HowItWorksSection />

      {/* Scope, then out. */}
      <CategoriesSection
        topicCounts={topicCountByCategory(topics)}
        pollCounts={pollCounts}
      />

      <section
        id="catalog-preview"
        className="relative overflow-hidden border-t border-veil/5 px-5 pt-[clamp(90px,14vh,170px)] pb-[clamp(80px,10vh,130px)] text-center sm:px-10 lg:px-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] top-auto -bottom-[60%] h-[120%]"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 100%, rgba(29,185,84,0.14), transparent 70%)",
          }}
        />
        <div
          data-reveal
          className="ohq-reveal relative mx-auto flex max-w-[840px] flex-col items-center gap-7"
        >
          {/* The empty case gets its own sentence rather than "0 topics and 22
              polls are already moving", which is both false and faintly sad.
              A platform with nothing on it yet should say so.

              The one case needed the same care and did not get it: at launch
              this read "1 topics and 1 polls are already moving", which is the
              first sentence a visitor sees at full display size. */}
          <h2 className="m-0 font-display text-[clamp(2.6rem,6vw,5.4rem)] leading-[0.98] font-bold tracking-[-0.028em] text-cream-bright">
            {totals.topics > 0 ? (
              <>
                {totals.topics} {totals.topics === 1 ? "topic" : "topics"} and{" "}
                {pollTotals.count} {pollTotals.count === 1 ? "poll" : "polls"}{" "}
                {totals.topics + pollTotals.count === 1 ? "is" : "are"}{" "}
                <em>already moving.</em>
              </>
            ) : (
              <>
                The first topics are <em>going up now.</em>
              </>
            )}
          </h2>
          <p className="m-0 max-w-[560px] text-[16px] leading-[1.6] font-light text-muted">
            Exams, colleges, policies, films, brands, politics and career paths. No
            account needed to look — only to vote.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/topics"
              className="rounded-full bg-positive px-[34px] py-[16px] text-[16px] font-semibold tracking-[-0.01em] text-positive-ink transition-[background,box-shadow] duration-500 ease-ohq hover:bg-[#25CC61] hover:shadow-[0_12px_44px_-8px_rgba(29,185,84,0.55)]"
            >
              Explore opinions
            </Link>
            <Link
              href="/polls"
              className="rounded-full border border-poll/45 bg-poll/10 px-[30px] py-[16px] text-[16px] font-semibold tracking-[-0.01em] text-poll-soft transition-[background,border-color] duration-500 ease-ohq hover:border-poll/70 hover:bg-poll/18"
            >
              Vote in a poll
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
