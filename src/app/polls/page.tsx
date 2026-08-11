import type { Metadata } from "next";

import { TrendingTicker } from "@/components/catalog/TrendingTicker";
import { PollsCatalog } from "@/components/polls/PollsCatalog";
import { Footer } from "@/components/site/Footer";
import { trendingPolls } from "@/lib/polls";
import { listPolls, pollTotals } from "@/lib/polls/queries";

export const metadata: Metadata = {
  title: "Polls — pick a side",
  description:
    "Forced-choice polls on OpinionHQ. Two to four options, no middle ground, broken down by region, age and occupation.",
};

/**
 * Read on every request. The catalog is ordered by trend score and its splits
 * move with each vote, so a cached copy would show a stale race.
 */
export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const [polls, totals] = await Promise.all([listPolls(), pollTotals()]);

  // Counted from what came back rather than from a constant over a fixture
  // array. The old TOTAL_POLL_VOTES described a file.
  const counts = new Map<string, number>();
  for (const poll of polls) {
    counts.set(poll.cat, (counts.get(poll.cat) ?? 0) + 1);
  }

  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      {/* Nothing to tick through before anything is published. The strip draws
          nothing rather than an empty rail. */}
      {polls.length > 0 ? (
        <TrendingTicker items={trendingPolls(polls)} accent="poll" />
      ) : null}
      <PollsCatalog polls={polls} counts={counts} totalVotes={totals.votes} />
      <Footer />
    </div>
  );
}
