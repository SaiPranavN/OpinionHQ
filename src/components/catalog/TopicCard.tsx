import Link from "next/link";

import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PlaceChip } from "@/components/ui/PlaceChip";
import { MetricChange } from "@/components/ui/MetricChange";
import { SentimentBar } from "@/components/ui/SentimentBar";
import { SentimentLegend } from "@/components/ui/SentimentLegend";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/derive";
import type { DecoratedTopic } from "@/lib/types";

/**
 * The whole card is one link, so it is clickable everywhere and reachable by
 * keyboard without any extra handlers. Hierarchy runs: category → status →
 * title → summary → headline metric → distribution → sample size → change.
 */
export function TopicCard({ topic }: { topic: DecoratedTopic }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      aria-label={`${topic.name} — ${topic.headlineMetric} of ${formatNumber(topic.participants)} participants. View dashboard.`}
      data-spotlight
      className="group ohq-panel relative flex cursor-pointer flex-col gap-3.5 p-5 transition-[border-color,box-shadow,transform] duration-300 ease-ohq outline-none hover:-translate-y-0.5 hover:border-veil/18 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9),0_0_0_1px_rgba(29,185,84,0.16)] focus-visible:-translate-y-0.5 focus-visible:border-positive/60 focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    >
      {/* Category + status */}
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-veil/8 bg-veil/4 text-muted transition-colors duration-300 group-hover:border-positive/30 group-hover:text-positive-light"
          >
            <CategoryIcon category={topic.cat} size={15} />
          </span>
          <span className="truncate font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
            {topic.category.short}
          </span>
          <PlaceChip place={topic.place} className="before:mr-1 before:text-veil/25 before:content-['·']" />
        </span>
        <StatusBadge status={topic.status} size="sm" />
      </div>

      {/* Title + summary */}
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-[16.5px] leading-[1.28] font-semibold tracking-[-0.015em] text-pretty text-cream-bright">
          {topic.name}
        </h3>
        <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] font-light text-muted">
          {topic.summary}
        </p>
      </div>

      {/* Headline metric — the strongest element after the title */}
      <div className="mt-auto flex flex-col gap-2.5 pt-1">
        <span
          className="text-[20px] leading-none font-semibold tracking-[-0.02em]"
          style={{ color: topic.dominantVar }}
        >
          {topic.headlineMetric}
        </span>

        <SentimentBar
          pos={topic.pos}
          neu={topic.neu}
          neg={topic.neg}
          label={topic.barsLabel}
        />
        {topic.unrated ? (
          <span className="text-[11px] text-dim">
            {topic.facets.length} aspects waiting for a first answer
          </span>
        ) : (
          <SentimentLegend pos={topic.pos} neu={topic.neu} neg={topic.neg} size="sm" />
        )}

        <div className="flex flex-col gap-1.5 border-t border-veil/6 pt-3">
          {topic.unrated ? (
            <span className="text-[13px] font-semibold text-cream-bright">
              Be the first to vote
            </span>
          ) : (
            <>
              <span className="text-[13px] text-soft">
                <strong className="font-semibold text-cream-bright">
                  {formatNumber(topic.participants)}
                </strong>{" "}
                {topic.participants === 1 ? "participant" : "participants"}
              </span>
              <MetricChange
                change={topic.change}
                color={topic.changeColor}
                label={topic.changeLabel}
                arrow={topic.changeArrow}
                size="sm"
              />
            </>
          )}
        </div>

        <span
          aria-hidden
          className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim transition-colors duration-300 group-hover:text-positive-light group-focus-visible:text-positive-light"
        >
          View dashboard
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
