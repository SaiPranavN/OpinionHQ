import { AudiencePanels } from "@/components/topic/AudiencePanels";
import { TopicHeader } from "@/components/topic/TopicHeader";
import { TopicTabs } from "@/components/topic/TopicTabs";
import { FacetPanel } from "@/components/topic/FacetPanel";
import { KpiGrid } from "@/components/topic/KpiGrid";
import { ParticipationChart } from "@/components/topic/ParticipationChart";
import { SentimentDonut } from "@/components/topic/SentimentDonut";
import { SentimentTrend } from "@/components/topic/SentimentTrend";
import { VotePanel } from "@/components/topic/VotePanel";
import { categoryAccent } from "@/lib/taxonomy";
import type {
  OpinionReply,
  DecoratedTopic,
  TopicContext,
  Opinion,
  TimelineEvent,
} from "@/lib/types";

/**
 * The dashboard body, shared by the statically generated fixture route and the
 * client-rendered view for topics a participant created in this browser, so
 * both look identical.
 */
export function TopicDashboard({
  topic,
  context,
  opinions,
  timeline,
  replies,
  myReplyVotes,
}: {
  topic: DecoratedTopic;
  context: TopicContext;
  opinions: Opinion[];
  timeline: TimelineEvent[];
  replies: Record<string, OpinionReply[]>;
  myReplyVotes: Record<string, "like" | "dislike">;
}) {
  // One accent for the whole topic, resolved once and handed down. Richer
  // contributions tint with it so a card reads as belonging to *this* subject
  // rather than to a generic "premium" palette used site-wide.
  const accent = categoryAccent(topic.cat);

  return (
    <div
      className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8 lg:px-14"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
    >
      <TopicHeader topic={topic} context={context} timeline={timeline} />

      {/* 1 — What the numbers say. Everything measured, in one run.
          These wrappers are layout only: each panel inside is already its own
          labelled region, and nesting landmarks would just repeat itself. */}
      <div className="flex flex-col gap-[clamp(14px,1.6vw,20px)]">
        <div className="flex flex-wrap gap-[clamp(14px,1.6vw,20px)]">
          <SentimentDonut topic={topic} />
          <SentimentTrend topic={topic} markers={context.markers} />
          <ParticipationChart topic={topic} />
        </div>
        <KpiGrid topic={topic} />
        <AudiencePanels topic={topic} />
      </div>

      {/* 2 — Where you add yours: the headline vote, then the aspects under it. */}
      <div className="flex flex-col gap-[clamp(14px,1.6vw,20px)]">
        <VotePanel topicId={topic.id} accent={accent} />
        <FacetPanel topic={topic} />
      </div>

      {/* 3 — What everyone else said. */}
      <TopicTabs
        replies={replies}
        myReplyVotes={myReplyVotes}
        topicId={topic.id}
        opinions={opinions}
        timeline={timeline}
        accent={accent}
      />
    </div>
  );
}
