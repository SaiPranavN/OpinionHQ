"use client";

import { ExportButton } from "@/components/topic/ExportButton";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { MetricChange } from "@/components/ui/MetricChange";
import { formatNumber } from "@/lib/derive";
import { PrototypeDataBadge } from "@/components/ui/PrototypeDataBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DecoratedTopic, TopicContext, TimelineEvent } from "@/lib/types";

interface TopicHeaderProps {
  topic: DecoratedTopic;
  context: TopicContext;
  timeline: TimelineEvent[];
}

export function TopicHeader({ topic, context, timeline }: TopicHeaderProps) {
  const { follows, toggleFollow, toast } = usePrototype();
  const following = follows.includes(topic.id);

  const share = async () => {
    const summary = `${topic.name} — ${topic.headlineMetric} ${topic.sampleLabel}.`;
    try {
      await navigator.clipboard.writeText(`${summary} ${window.location.href}`);
      toast(`${summary} Result card link copied.`);
    } catch {
      toast(summary);
    }
  };

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Explore", href: "/topics" },
            { label: topic.category.short },
          ]}
        />
        <PrototypeDataBadge />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-dim">
          <CategoryIcon category={topic.cat} size={14} />
          {topic.category.label}
        </span>
        <StatusBadge status={topic.status} />
        <span className="font-mono text-[11px] text-dim">{context.updated}</span>
      </div>

      <h1 className="m-0 max-w-[20ch] font-serif text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.03] font-normal tracking-[-0.025em] text-balance text-cream-bright">
        {topic.name}
      </h1>

      {/* What this topic is about, before any numbers. */}
      <div className="flex max-w-[720px] flex-col gap-2">
        <p className="m-0 text-[15.5px] leading-[1.55] font-light text-pretty text-soft">
          {topic.summary}
        </p>
        <p className="m-0 text-[13.5px] leading-[1.65] font-light text-pretty text-muted">
          {topic.about}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 pt-1">
          {topic.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-white/8 px-2.5 py-[3px] text-[11px] text-dim"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>

      <div className="ohq-verified flex max-w-[720px] items-start gap-[11px] px-4 py-3.5">
        <span className="pt-0.5 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase text-positive-light">
          <span aria-hidden>✓</span> Status
        </span>
        <span className="text-[13.5px] leading-[1.55] text-soft">{context.explain}</span>
      </div>

      {/* Sample size is the credibility of everything below it, so it is the
          largest thing on the page after the topic name. */}
      <div className="flex flex-wrap items-end gap-x-[clamp(24px,4vw,52px)] gap-y-4 pt-2">
        {topic.unrated ? (
          <span className="flex flex-col gap-1">
            <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-cream-bright">
              Be the first to vote
            </span>
            <span className="text-[12.5px] text-dim">{topic.changeLabel}</span>
          </span>
        ) : (
          <>
            <Stat
              value={formatNumber(topic.participants)}
              label={topic.participants === 1 ? "participant" : "participants"}
              accent
            />
            <Stat
              value={formatNumber(topic.writtenCount)}
              label={topic.writtenCount === 1 ? "written opinion" : "written opinions"}
            />
            <span className="mb-1">
              <MetricChange
                change={topic.change}
                color={topic.changeColor}
                label={topic.changeLabel}
                arrow={topic.changeArrow}
              />
            </span>
          </>
        )}
        <span className="ml-auto flex flex-wrap gap-2.5">
          <ExportButton topic={topic} context={context} timeline={timeline} />
          <button
            type="button"
            onClick={() => toggleFollow(topic.id)}
            aria-pressed={following}
            className="cursor-pointer rounded-full border px-[18px] py-[9px] text-[13px] font-medium transition-[color,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60"
            style={{
              color: following ? "#4ED27C" : "#D6D3CD",
              borderColor: following ? "rgba(29,185,84,0.45)" : "rgba(255,255,255,0.16)",
            }}
          >
            {following ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            onClick={share}
            className="cursor-pointer rounded-full border border-white/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-[color,border-color] duration-300 outline-none hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Share
          </button>
        </span>
      </div>
    </header>
  );
}

/** A headline count: big number, small label beneath. */
function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <span className="flex flex-col gap-0.5">
      <strong
        className={`text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1] font-semibold tracking-[-0.03em] ${
          accent ? "text-positive" : "text-cream-bright"
        }`}
      >
        {value}
      </strong>
      <span className="text-[12.5px] tracking-[-0.01em] text-muted">{label}</span>
    </span>
  );
}
