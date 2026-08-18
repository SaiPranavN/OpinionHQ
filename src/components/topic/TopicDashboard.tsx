import { AudiencePanels } from "@/components/topic/AudiencePanels";
import { TopicHeader } from "@/components/topic/TopicHeader";
import { VerifiedUpdates } from "@/components/topic/VerifiedUpdates";
import { TopicTabs } from "@/components/topic/TopicTabs";
import { FacetPanel } from "@/components/topic/FacetPanel";
import { KpiGrid } from "@/components/topic/KpiGrid";
import { ParticipationChart } from "@/components/topic/ParticipationChart";
import { SentimentDonut } from "@/components/topic/SentimentDonut";
import { SentimentTrend } from "@/components/topic/SentimentTrend";
import { VotePanel } from "@/components/topic/VotePanel";
import type { AudienceCell } from "@/lib/audience/cells";
import {
  AudienceIcon,
  DiscussionIcon,
  ResultIcon,
  SectionRail,
  VerifiedIcon,
  VoteIcon,
  type RailSection,
} from "@/components/ui/SectionRail";
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
  myOpinionVotes,
  audienceCells,
}: {
  topic: DecoratedTopic;
  context: TopicContext;
  opinions: Opinion[];
  timeline: TimelineEvent[];
  replies: Record<string, OpinionReply[]>;
  myReplyVotes: Record<string, "like" | "dislike">;
  myOpinionVotes: Record<string, "like" | "dislike">;
  /** The joint cross-tab the audience panel filters on. */
  audienceCells: AudienceCell[];
}) {
  // One accent for the whole topic, resolved once and handed down. Richer
  // contributions tint with it so a card reads as belonging to *this* subject
  // rather than to a generic "premium" palette used site-wide.
  const accent = categoryAccent(topic.cat);

  /**
   * What the rail indexes.
   *
   * Verified updates is conditional because the panel itself renders nothing
   * when a topic has no sourced developments — an index entry pointing at an
   * element that is not on the page is a button that does nothing, and the
   * reader has no way to know why.
   */
  const sections: RailSection[] = [
    ...(timeline.length > 0
      ? [{ id: "verified", label: "Verified updates", icon: <VerifiedIcon /> }]
      : []),
    { id: "result", label: "The reading", icon: <ResultIcon /> },
    { id: "audience", label: "Who took part", icon: <AudienceIcon /> },
    { id: "vote", label: "Add your opinion", icon: <VoteIcon /> },
    { id: "discussion", label: "Discussion", icon: <DiscussionIcon /> },
  ];

  return (
    <div
      className="mx-auto flex max-w-[1320px] flex-col gap-[clamp(26px,3.4vw,44px)] px-4 pb-[clamp(70px,9vw,120px)] sm:px-8 lg:px-14"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
    >
      <TopicHeader topic={topic} context={context} timeline={timeline} />

      {/* The sourced record before any measurement of opinion. It was at the
          bottom of the Overview tab; see VerifiedUpdates for why that was the
          wrong order. */}
      <div id="verified" className="scroll-mt-[calc(var(--ohq-nav-h)+18px)]">
        <VerifiedUpdates timeline={timeline} />
      </div>

      {/* 1 — What the numbers say. Everything measured, in one run.
          These wrappers are layout only: each panel inside is already its own
          labelled region, and nesting landmarks would just repeat itself. */}
      <div className="flex flex-col gap-[clamp(14px,1.6vw,20px)]">
        <div id="result" className="scroll-mt-[calc(var(--ohq-nav-h)+18px)] flex flex-wrap gap-[clamp(14px,1.6vw,20px)]">
          <SentimentDonut topic={topic} />
          <SentimentTrend topic={topic} />
          <ParticipationChart topic={topic} />
        </div>
        <KpiGrid topic={topic} />
        <div id="audience" className="scroll-mt-[calc(var(--ohq-nav-h)+18px)]">
          <AudiencePanels topic={topic} cells={audienceCells} />
        </div>
      </div>

      {/* 2 — Where you add yours: the headline vote, then the aspects under it. */}
      <div id="vote" className="scroll-mt-[calc(var(--ohq-nav-h)+18px)] flex flex-col gap-[clamp(14px,1.6vw,20px)]">
        <VotePanel topicId={topic.id} accent={accent} />
        <FacetPanel topic={topic} />
      </div>

      {/* 3 — What everyone else said. */}
      <TopicTabs
        replies={replies}
        myReplyVotes={myReplyVotes}
        myOpinionVotes={myOpinionVotes}
        opinions={opinions}
        timeline={timeline}
        accent={accent}
      />

      <SectionRail sections={sections} accent={accent} />
    </div>
  );
}
