"use client";

import { useEffect, useMemo, useState } from "react";

import { useSession } from "@/components/auth/SessionProvider";
import { ContributionCard } from "@/components/topic/ContributionCard";
import { SortPicker } from "@/components/ui/SortPicker";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { safeExternalUrl } from "@/lib/safe-url";
import {
  FILTERS,
  filterContributions,
  filterLabel,
  sortContributions,
  type ContributionFilter,
  type ContributionSort,
} from "@/lib/contributions";
import type { Opinion, OpinionReply, TimelineEvent } from "@/lib/types";

/**
 * THERE IS NO OVERVIEW TAB.
 *
 * It held one panel, "Most liked opinions", which was the Opinions tab sorted
 * by likes and truncated to two — the same rows, the same text, one click
 * away, presented as a different section. A tab whose content is a subset of
 * the next tab's teaches a reader that the tabs are decoration.
 *
 * What it had that was genuinely its own was "Latest verified updates", and
 * that left some time ago: a sourced fact outranks a measurement of feeling and
 * now leads the page. See components/topic/VerifiedUpdates.tsx. Removing the
 * tab is finishing that move rather than starting a new one.
 *
 * Opinions is the landing tab in its place.
 */
type TabId = "opinions" | "discussion" | "timeline";

const TABS: { id: TabId; label: string }[] = [
  { id: "opinions", label: "Opinions" },
  { id: "discussion", label: "Discussion" },
  { id: "timeline", label: "Timeline" },
];

interface TopicTabsProps {
  opinions: Opinion[];
  replies: Record<string, OpinionReply[]>;
  myReplyVotes: Record<string, "like" | "dislike">;
  myOpinionVotes: Record<string, "like" | "dislike">;
  timeline: TimelineEvent[];
  accent: string;
}

export function TopicTabs({
  opinions,
  timeline,
  accent,
  replies,
  myReplyVotes,
  myOpinionVotes,
}: TopicTabsProps) {
  const { user } = useSession();
  const [tab, setTab] = useState<TabId>("opinions");
  const [filter, setFilter] = useState<ContributionFilter>("All");
  const [sort, setSort] = useState<ContributionSort>("relevant");
  /**
   * The discussion tab keeps its own ordering.
   *
   * Separate state rather than shared, because the two tabs are asking
   * different questions: Opinions is "what should I read", Discussion is
   * "what is being argued about". Sharing one control would mean picking
   * "Oldest" to find the start of a thread and then finding the Opinions tab
   * reordered underneath you.
   */
  const [threadSort, setThreadSort] = useState<ContributionSort>("discussed");

  /**
   * The one list, and now it is just the server's.
   *
   * IT USED TO MERGE THREE SOURCES: the server's opinions, this browser's Pro
   * contributions, and a hand-built card for the visitor's own written note.
   * The second is gone because contributions are in Postgres and come back with
   * everything else. The third is gone because it was a duplicate — the server
   * feed already contains the visitor's own opinion, so anyone signed in who
   * had written one saw it twice, once from the database and once synthesised
   * here from the local vote cache.
   *
   * Marking a card as the reader's own is now a comparison against the author
   * id the feed already carries, which works for anonymous posts too: the view
   * returns your own id and nobody else's.
   */
  const allContributions = useMemo<Opinion[]>(
    () =>
      opinions.map((o) =>
        user && o.authorId === user.id ? { ...o, name: `${o.name} (you)` } : o,
      ),
    [opinions, user],
  );

  const shown = useMemo(
    () => sortContributions(filterContributions(allContributions, filter), sort),
    [allContributions, filter, sort],
  );

  /** Discussion opens on the threads that are actually moving, then obeys. */
  const discussionOrder = useMemo(
    () => sortContributions(allContributions, threadSort),
    [allContributions, threadSort],
  );

  /**
   * `#discussion` opens the discussion tab.
   *
   * The "Go to discussions" button in the header is a sibling of this component
   * and cannot reach `setTab`. Rather than lift the tab state up through the
   * dashboard for one button, the button writes the hash and this listens —
   * which also means a shared `/topics/x#discussion` link lands somebody on the
   * thread rather than on the overview.
   *
   * Runs on mount too, for arriving with the hash already in the URL.
   */
  useEffect(() => {
    const open = () => {
      if (window.location.hash === "#discussion") setTab("discussion");
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  return (
    // `scroll-mt` clears the fixed nav, which would otherwise cover the tab row
    // that the jump is meant to land on.
    <div id="discussion" className="scroll-mt-[calc(var(--ohq-nav-h)+16px)]">
      <div
        role="tablist"
        aria-label="Topic sections"
        className="ohq-scroll-x mb-[clamp(20px,3vw,30px)] flex gap-[clamp(18px,3vw,34px)] overflow-x-auto border-b border-veil/8"
      >
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={`cursor-pointer border-b-2 px-0.5 pb-3.5 text-[14.5px] font-medium tracking-[-0.01em] whitespace-nowrap transition-[color,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                selected
                  ? "border-positive text-cream-bright"
                  : "border-transparent text-dim hover:text-cream"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "opinions" ? (
        <div className="flex flex-col gap-[clamp(16px,2.2vw,22px)]">
          <div className="flex flex-wrap items-center gap-2.5">
            {FILTERS.map((f) => {
              const selected = filter === f;
              const count = filterContributions(allContributions, f).length;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={selected}
                  className={`cursor-pointer rounded-full border px-[15px] py-2 text-[12.5px] font-medium transition-[color,background,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                    selected
                      ? "border-positive/45 bg-positive/14 text-positive-light"
                      : "border-veil/12 text-muted hover:text-cream"
                  }`}
                >
                  {filterLabel(f)} · {count}
                </button>
              );
            })}

            {/* Sorting, not a second tab. Every option below orders the one
                list; none of them separates it. */}
            <SortPicker value={sort} onChange={setSort} className="ml-auto" />
          </div>

          {shown.map((contribution) => (
            <ContributionCard
              key={contribution.id}
              contribution={contribution}
              replies={replies[contribution.id] ?? []}
              myReplyVotes={myReplyVotes}
              myVote={myOpinionVotes[contribution.id] ?? null}
              view="opinions"
              accent={accent}
            />
          ))}

          {shown.length === 0 ? (
            <p className="m-0 rounded-[18px] border border-dashed border-veil/10 px-5 py-[clamp(40px,7vw,80px)] text-center text-[14px] text-muted">
              {filter === "Rich"
                ? "No rich contributions on this topic yet."
                : "No written opinions in this filter yet."}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "discussion" ? (
        <div className="flex flex-col gap-[clamp(16px,2vw,22px)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <p className="m-0 max-w-[620px] text-[13.5px] text-dim">
              The same contributions as the Opinions tab, opened out for reading
              and led by what is being argued about. Replies sit one level under a
              contribution — verified developments live in the Timeline tab.
            </p>
            <SortPicker value={threadSort} onChange={setThreadSort} className="ml-auto" />
          </div>
          {discussionOrder.map((contribution) => (
            <ContributionCard
              key={contribution.id}
              contribution={contribution}
              replies={replies[contribution.id] ?? []}
              myReplyVotes={myReplyVotes}
              myVote={myOpinionVotes[contribution.id] ?? null}
              view="discussion"
              accent={accent}
            />
          ))}
          {discussionOrder.length === 0 ? (
            <p className="m-0 rounded-[18px] border border-dashed border-veil/10 px-5 py-[clamp(40px,7vw,80px)] text-center text-[14px] text-muted">
              No discussion on this topic yet.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "timeline" ? (
        <div className="flex flex-col gap-[clamp(14px,1.8vw,18px)]">
          <p className="m-0 max-w-[620px] text-[13.5px] text-dim">
            Editor-published developments with sources. These are factual records —
            participant allegations do not appear here.
          </p>
          {timeline.map((event) => (
            <article
              key={event.id}
              className="ohq-verified flex flex-col gap-3 p-[18px] sm:p-6"
            >
              <header className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-[7px] rounded-[4px] bg-positive/14 px-[11px] py-[5px] font-mono text-[10px] tracking-[0.12em] uppercase text-positive-light">
                  <span aria-hidden>✓</span>Verified update
                </span>
                <time className="font-mono text-[11.5px] text-muted">{event.date}</time>
                <span className="ml-auto">
                  <StatusBadge status={event.status} size="sm" />
                </span>
              </header>
              <h3 className="font-display m-0 text-[17px] font-semibold tracking-[-0.015em] text-cream-bright">
                {event.title}
              </h3>
              <p className="m-0 text-[14px] leading-[1.6] text-muted">{event.desc}</p>
              <footer className="flex items-center gap-2.5 border-t border-positive/18 pt-3.5">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-dim">
                  Source
                </span>
                {/* A real link when there is one, and plain text when there is
                    not. The URL is validated rather than trusted: it is typed by
                    an editor and rendered as an href for every reader, which is
                    exactly the shape of a stored-XSS hole. See `safeExternalUrl`.

                    `noreferrer` as well as `noopener` — the publisher has no
                    business being told which topic page sent the reader. */}
                {safeExternalUrl(event.srcUrl) ? (
                  <a
                    href={safeExternalUrl(event.srcUrl) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-positive-light underline decoration-positive/30 underline-offset-4 outline-none transition-colors hover:decoration-positive/70 focus-visible:ring-2 focus-visible:ring-positive/60"
                  >
                    {event.src} ↗
                  </a>
                ) : (
                  <span className="text-[13px] text-positive-light">{event.src}</span>
                )}
              </footer>
            </article>
          ))}
          {timeline.length === 0 ? (
            <p className="m-0 rounded-[18px] border border-dashed border-veil/10 px-5 py-[clamp(40px,7vw,80px)] text-center text-[14px] text-muted">
              No verified updates published for this topic yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
