import type { Metadata } from "next";

import { PollsCatalog } from "@/components/polls/PollsCatalog";
import { Footer } from "@/components/site/Footer";
import { allPolls, pollCountByCategory, TOTAL_POLL_VOTES } from "@/lib/polls";

export const metadata: Metadata = {
  title: "Polls — pick a side",
  description:
    "Head-to-head polls on OpinionHQ. Two options, no middle ground, broken down by region, age and occupation.",
};

export default function PollsPage() {
  return (
    <div style={{ paddingTop: "var(--ohq-nav-h)" }}>
      <PollsCatalog
        polls={allPolls()}
        counts={pollCountByCategory()}
        totalVotes={TOTAL_POLL_VOTES}
      />
      <Footer />
    </div>
  );
}
