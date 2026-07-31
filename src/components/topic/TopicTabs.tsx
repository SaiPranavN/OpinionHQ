"use client";

import { useMemo, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber, sentimentColor, sentimentIcon } from "@/lib/derive";
import type { Opinion, Sentiment, TimelineEvent } from "@/lib/types";

type TabId = "overview" | "opinions" | "discussion" | "timeline";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "opinions", label: "Opinions" },
  { id: "discussion", label: "Discussion" },
  { id: "timeline", label: "Timeline" },
];

const FILTERS: ("All" | Sentiment)[] = ["All", "Positive", "Neutral", "Negative"];

const MAX_REPLY = 400;

interface TopicTabsProps {
  topicId: string;
  opinions: Opinion[];
  timeline: TimelineEvent[];
}

export function TopicTabs({ topicId, opinions, timeline }: TopicTabsProps) {
  const { votes, displayName, helpful, toggleHelpful, toast } = usePrototype();
  const [tab, setTab] = useState<TabId>("overview");
  const [filter, setFilter] = useState<"All" | Sentiment>("All");

  const myVote = votes[topicId];

  // The participant's own written opinion is shown inline with the rest so the
  // "my contribution is part of the record" loop is visible in review.
  const allOpinions = useMemo<Opinion[]>(() => {
    if (!myVote?.note) return opinions;
    const name = displayName || "You";
    const mine: Opinion = {
      id: `${topicId}-mine`,
      topicId,
      name: `${name} (you)`,
      initials: name.slice(0, 2).toUpperCase(),
      vote: myVote.vote,
      text: myVote.note,
      time: "Just now",
      helpful: 0,
      replies: 0,
    };
    return [mine, ...opinions];
  }, [opinions, myVote, displayName, topicId]);

  const shown = useMemo(
    () => (filter === "All" ? allOpinions : allOpinions.filter((o) => o.vote === filter)),
    [allOpinions, filter],
  );

  const mostHelpful = [...allOpinions].sort((a, b) => b.helpful - a.helpful).slice(0, 2);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Topic sections"
        className="ohq-scroll-x mb-[clamp(20px,3vw,30px)] flex gap-[clamp(18px,3vw,34px)] overflow-x-auto border-b border-white/8"
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

      {tab === "overview" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-[clamp(14px,1.6vw,20px)]">
          <div className="ohq-panel flex flex-col gap-4 p-5 sm:p-7">
            <span className="ohq-eyebrow">Latest verified updates</span>
            {timeline.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="ohq-verified flex flex-col gap-1.5 px-4 py-3.5"
              >
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-[9.5px] tracking-[0.12em] whitespace-nowrap uppercase text-positive-light">
                    <span aria-hidden>✓</span> Verified update
                  </span>
                  <time className="font-mono text-[11px] text-dim">{event.date}</time>
                </span>
                <span className="text-[14.5px] font-semibold text-cream-bright">
                  {event.title}
                </span>
              </div>
            ))}
            {timeline.length === 0 ? (
              <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
                No verified developments have been published for this topic yet. Editors
                add sourced updates as they are confirmed.
              </p>
            ) : null}
          </div>

          <div className="ohq-panel flex flex-col gap-4 p-5 sm:p-7">
            <span className="ohq-eyebrow">Most helpful opinions</span>
            {mostHelpful.map((opinion) => (
              <div
                key={opinion.id}
                className="flex flex-col gap-2 border-b border-white/6 pb-4 last:border-0 last:pb-0"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-[13.5px] font-semibold text-cream">
                    {opinion.name}
                  </span>
                  <span
                    className="inline-flex items-center gap-[5px] text-[11.5px]"
                    style={{ color: sentimentColor(opinion.vote) }}
                  >
                    <span aria-hidden className="text-[8px]">
                      {sentimentIcon(opinion.vote)}
                    </span>
                    {opinion.vote}
                  </span>
                  <span className="ml-auto font-mono text-[10.5px] text-dim">
                    {formatNumber(opinion.helpful)} helpful
                  </span>
                </span>
                <span className="text-[13.5px] leading-[1.6] text-muted">
                  {opinion.text}
                </span>
              </div>
            ))}
            {mostHelpful.length === 0 ? (
              <p className="m-0 text-[13.5px] leading-[1.6] text-dim">
                Votes have been recorded on this topic, but no written explanations have
                been published yet. Add the first one above.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "opinions" ? (
        <div className="flex flex-col gap-[clamp(16px,2.2vw,22px)]">
          <div className="flex flex-wrap items-center gap-2.5">
            {FILTERS.map((f) => {
              const selected = filter === f;
              const count =
                f === "All"
                  ? allOpinions.length
                  : allOpinions.filter((o) => o.vote === f).length;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={selected}
                  className={`cursor-pointer rounded-full border px-[15px] py-2 text-[12.5px] font-medium transition-[color,background,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                    selected
                      ? "border-positive/45 bg-positive/14 text-positive-light"
                      : "border-white/12 text-muted hover:text-cream"
                  }`}
                >
                  {f} · {count}
                </button>
              );
            })}
            <span className="ml-auto font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim">
              {shown.length} shown
            </span>
          </div>

          {shown.map((opinion) => {
            const marked = helpful.includes(opinion.id);
            return (
              <article
                key={opinion.id}
                className="ohq-panel flex flex-col gap-4 p-[18px] sm:p-6"
              >
                <OpinionHeader opinion={opinion} />
                <p className="m-0 text-[14.5px] leading-[1.68] text-pretty text-soft">
                  {opinion.text}
                </p>
                <footer className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-t border-line pt-3.5">
                  <button
                    type="button"
                    onClick={() => toggleHelpful(opinion.id)}
                    aria-pressed={marked}
                    className={`cursor-pointer text-[12.5px] transition-colors duration-300 outline-none hover:text-positive-light focus-visible:ring-2 focus-visible:ring-positive/60 ${
                      marked ? "text-positive-light" : "text-muted"
                    }`}
                  >
                    {marked ? "Marked helpful" : "Helpful"} ·{" "}
                    {formatNumber(opinion.helpful + (marked ? 1 : 0))}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("discussion")}
                    className="cursor-pointer text-[12.5px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
                  >
                    Reply · {opinion.replies}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast("Thanks — this opinion has been flagged for moderator review.")
                    }
                    className="ml-auto cursor-pointer text-[12px] text-dim transition-colors duration-300 outline-none hover:text-negative focus-visible:ring-2 focus-visible:ring-positive/60"
                  >
                    Report
                  </button>
                </footer>
              </article>
            );
          })}

          {shown.length === 0 ? (
            <p className="m-0 rounded-[18px] border border-dashed border-white/10 px-5 py-[clamp(40px,7vw,80px)] text-center text-[14px] text-muted">
              No written opinions in this filter yet.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "discussion" ? (
        <div className="flex flex-col gap-[clamp(16px,2vw,22px)]">
          <p className="m-0 max-w-[620px] text-[13.5px] text-dim">
            Replies sit one level under a written opinion. Everything here is
            participant-generated — verified developments live in the Timeline tab.
          </p>
          {allOpinions.map((opinion) => (
            <Thread key={opinion.id} opinion={opinion} />
          ))}
          {allOpinions.length === 0 ? (
            <p className="m-0 rounded-[18px] border border-dashed border-white/10 px-5 py-[clamp(40px,7vw,80px)] text-center text-[14px] text-muted">
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
              <h3 className="m-0 text-[17px] font-semibold tracking-[-0.015em] text-cream-bright">
                {event.title}
              </h3>
              <p className="m-0 text-[14px] leading-[1.6] text-muted">{event.desc}</p>
              <footer className="flex items-center gap-2.5 border-t border-positive/18 pt-3.5">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-dim">
                  Source
                </span>
                <button
                  type="button"
                  onClick={() => toast("Source links open the publisher in a new tab.")}
                  className="cursor-pointer text-[13px] text-positive-light outline-none focus-visible:ring-2 focus-visible:ring-positive/60"
                >
                  {event.src} ↗
                </button>
              </footer>
            </article>
          ))}
          {timeline.length === 0 ? (
            <p className="m-0 rounded-[18px] border border-dashed border-white/10 px-5 py-[clamp(40px,7vw,80px)] text-center text-[14px] text-muted">
              No verified updates published for this topic yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function OpinionHeader({ opinion }: { opinion: Opinion }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <span
        aria-hidden
        className="grid h-[34px] w-[34px] place-items-center rounded-full bg-avatar text-[12px] font-semibold text-soft"
      >
        {opinion.initials}
      </span>
      <span className="flex flex-col gap-[3px]">
        <span className="text-[14px] font-semibold text-cream">{opinion.name}</span>
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-dim">
          Participant opinion · {opinion.time}
        </span>
      </span>
      <span
        className="ml-auto inline-flex items-center gap-[7px] rounded-full border px-3 py-[5px] text-[11.5px] font-medium"
        style={{
          color: sentimentColor(opinion.vote),
          borderColor: sentimentColor(opinion.vote),
        }}
      >
        <span aria-hidden className="text-[8px]">
          {sentimentIcon(opinion.vote)}
        </span>
        {opinion.vote}
      </span>
    </header>
  );
}

/** One opinion with its replies and an inline composer. */
function Thread({ opinion }: { opinion: Opinion }) {
  const { repliesFor, postReply, signedIn, openAuth } = usePrototype();
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);

  const posted = repliesFor(opinion.id);
  const seeded = opinion.thread ?? [];
  const total = seeded.length + posted.length;

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (postReply(opinion.id, draft)) {
      setDraft("");
      setComposing(false);
    }
  };

  return (
    <article className="ohq-panel flex flex-col gap-3.5 p-[18px] sm:p-6">
      <OpinionHeader opinion={opinion} />
      <p className="m-0 text-[14.5px] leading-[1.68] text-soft">{opinion.text}</p>

      <div className="ml-3 flex flex-col gap-3 border-l border-white/10 pl-3.5 sm:ml-[34px] sm:pl-5">
        {total === 0 ? (
          <p className="m-0 text-[12.5px] text-dim">No replies yet.</p>
        ) : null}

        {seeded.map((reply, i) => (
          <ReplyRow
            key={`seed-${i}`}
            name={reply.name}
            initials={reply.initials}
            time={reply.time}
            text={reply.text}
          />
        ))}

        {posted.map((reply) => (
          <ReplyRow
            key={reply.id}
            name={`${reply.name} (you)`}
            initials={reply.initials}
            time="Just now"
            text={reply.text}
            mine
          />
        ))}

        {composing ? (
          <form onSubmit={send} className="flex flex-col gap-2">
            <label className="sr-only" htmlFor={`reply-${opinion.id}`}>
              Reply to {opinion.name}
            </label>
            <textarea
              id={`reply-${opinion.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_REPLY))}
              rows={3}
              autoFocus
              placeholder="Add something the thread does not already say."
              className="resize-y rounded-[10px] border border-white/10 bg-surface-sunken p-3 text-[13.5px] leading-[1.6] text-cream outline-none transition-colors duration-300 focus:border-positive/50"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!draft.trim()}
                className="cursor-pointer rounded-full bg-positive px-4 py-2 text-[12.5px] font-semibold text-positive-ink transition-opacity duration-300 outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-positive-light"
              >
                Post reply
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposing(false);
                  setDraft("");
                }}
                className="cursor-pointer text-[12.5px] text-muted transition-colors hover:text-cream"
              >
                Cancel
              </button>
              <span className="ml-auto font-mono text-[10.5px] text-dim">
                {draft.length}/{MAX_REPLY}
              </span>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => (signedIn ? setComposing(true) : openAuth("signin"))}
            className="cursor-pointer self-start text-[12.5px] text-positive-light outline-none focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            {signedIn ? "Add a reply" : "Sign in to reply"}
          </button>
        )}
      </div>
    </article>
  );
}

function ReplyRow({
  name,
  initials,
  time,
  text,
  mine,
}: {
  name: string;
  initials: string;
  time: string;
  text: string;
  mine?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden
          className={`grid h-[26px] w-[26px] place-items-center rounded-full text-[10px] font-semibold ${
            mine ? "bg-positive/20 text-positive-light" : "bg-avatar-deep text-muted"
          }`}
        >
          {initials}
        </span>
        <span className="text-[13px] font-semibold text-soft">{name}</span>
        <span className="font-mono text-[10px] text-dim">{time}</span>
      </span>
      <p className="m-0 text-[13.5px] leading-[1.6] text-muted">{text}</p>
    </div>
  );
}
