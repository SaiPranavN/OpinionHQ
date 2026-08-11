"use client";

/**
 * One contribution, in either format, in either view.
 *
 * This is the component that makes "Pro contributions live inside the existing
 * conversation" true rather than claimed. There is one card. A standard
 * opinion and a Pro contribution differ by which body they render and by an
 * accent — not by which list they appear in, which reply system they use, or
 * which engagement counters they write to. Opinions and Discussion are the
 * `view` prop on this component, not two component trees.
 *
 * What that buys, concretely: a reply posted in Discussion appears in the
 * Opinions reply count, because both render the same thread off the same rows.
 * There is nothing to keep in sync, because there is nothing duplicated.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { ReplyThread } from "@/components/topic/ReplyThread";
import { InteractiveBlockView } from "@/components/topic/InteractiveBlockView";
import {
  collapsedSections,
  hasMoreToRead,
  headlineOf,
  isPro,
  orderedSections,
} from "@/lib/contributions";
import { buildThread } from "@/lib/comments/tree";
import { formatNumber, sentimentColor, sentimentIcon } from "@/lib/derive";
import { postReply } from "@/lib/topics/replies";
import type { Opinion, OpinionReply, ProReaction, ProSection } from "@/lib/types";

const MAX_REPLY = 400;

const REACTIONS: { id: ProReaction; label: string }[] = [
  { id: "insightful", label: "Insightful" },
  { id: "useful", label: "Useful" },
  { id: "well_explained", label: "Well explained" },
];

export function ContributionCard({
  contribution,
  view,
  accent,
  replies: replyRows,
  myReplyVotes,
}: {
  contribution: Opinion;
  view: "opinions" | "discussion";
  accent: string;
  /** Flat, from the server. Threaded here so the tree is built once per card. */
  replies: OpinionReply[];
  myReplyVotes: Record<string, "like" | "dislike">;
}) {
  const router = useRouter();
  const {
    helpful,
    toggleHelpful,
    signedIn,
    openAuth,
    toast,
    saved,
    toggleSave,
    react,
    contributionReactions,
  } = usePrototype();

  const pro = isPro(contribution);
  // Discussion is for reading conversations, so it opens with everything
  // already open. Opinions is for scanning, so it does not.
  const [expanded, setExpanded] = useState(view === "discussion");
  const [showReplies, setShowReplies] = useState(view === "discussion");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const marked = helpful.includes(contribution.id);
  const isSaved = saved.includes(contribution.id);
  const myReaction = contributionReactions[contribution.id];

  // Built once per card rather than per render of every node, and from the
  // server's flat list rather than from anything held in this browser — a reply
  // somebody else posted has to appear for everyone, which is the whole reason
  // this moved off localStorage.
  const nodes = useMemo(() => buildThread(replyRows), [replyRows]);
  const replyCount = replyRows.length;

  const sections = orderedSections(contribution);
  const collapsible = pro && hasMoreToRead(sections);
  const { shown, hiddenSections, hiddenPoints } = collapsedSections(sections);
  const bodySections = pro && !expanded && collapsible ? shown : sections;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      openAuth("signin");
      return;
    }
    setSending(true);
    setReplyError(null);
    // No `parent` — the box under the card starts a new top-level thread.
    // Answering one specific reply is the Reply button inside the thread.
    const result = await postReply(contribution.id, draft);
    setSending(false);
    if (!result.ok) {
      setReplyError(result.message);
      return;
    }
    setDraft("");
    setComposing(false);
    setShowReplies(true);
    // Re-reads the page rather than splicing a copy in here, which would drift
    // from what the database now holds the moment two people reply at once.
    router.refresh();
  };

  const share = () => {
    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}${window.location.pathname}#${contribution.id}`;
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => toast("Link copied."),
        () => toast("Copy the page link and add the contribution id."),
      );
      return;
    }
    toast("Link copied.");
  };

  return (
    <article
      id={contribution.id}
      className="ohq-panel flex scroll-mt-24 flex-col overflow-hidden"
      style={
        pro
          ? {
              // The whole distinction, visually: a hairline of the category's
              // colour and the faintest wash behind the header. Enough to read
              // as a different kind of post at a glance, not enough to read as
              // a different product embedded in the page.
              borderColor: `color-mix(in oklab, ${accent} 26%, transparent)`,
              background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 5%, transparent), transparent 220px), var(--color-surface)`,
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-4 p-[18px] sm:p-6">
        <Header contribution={contribution} pro={pro} accent={accent} />

        {pro ? (
          <>
            <h3
              className="m-0 font-display text-[clamp(1.25rem,2.2vw,1.65rem)] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-cream-bright"
            >
              {headlineOf(contribution)}
            </h3>
            {bodySections.map((section) => (
              <SectionView
                key={section.id}
                section={section}
                contributionId={contribution.id}
                accent={accent}
                compact={view === "opinions" && !expanded}
              />
            ))}
            {collapsible && !expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-fit cursor-pointer text-[12.5px] font-medium underline-offset-4 transition-colors duration-300 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-positive/50"
                style={{ color: accent }}
              >
                Read full contribution
                <span className="ml-2 font-mono text-[10.5px] text-dim">
                  {hiddenSections > 0 ? "breakdown" : null}
                  {hiddenSections > 0 && hiddenPoints > 0 ? " · " : null}
                  {hiddenPoints > 0 ? `${hiddenPoints} more points` : null}
                </span>
              </button>
            ) : null}
            {collapsible && expanded && view === "opinions" ? (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="w-fit cursor-pointer text-[12.5px] text-dim transition-colors duration-300 outline-none hover:text-soft"
              >
                Collapse
              </button>
            ) : null}
          </>
        ) : (
          <p className="m-0 text-[14.5px] leading-[1.68] text-pretty text-soft">
            {contribution.text}
          </p>
        )}

        {pro ? (
          <div className="flex flex-wrap items-center gap-2">
            {REACTIONS.map((reaction) => {
              const active = myReaction === reaction.id;
              const base = contribution.reactions?.[reaction.id] ?? 0;
              return (
                <button
                  key={reaction.id}
                  type="button"
                  onClick={() => react(contribution.id, reaction.id)}
                  aria-pressed={active}
                  className="cursor-pointer rounded-full border px-3 py-[5px] text-[11.5px] font-medium transition-[color,background,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/50"
                  style={{
                    borderColor: active
                      ? `color-mix(in oklab, ${accent} 55%, transparent)`
                      : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                    background: active
                      ? `color-mix(in oklab, ${accent} 12%, transparent)`
                      : "transparent",
                    color: active ? accent : "var(--color-muted)",
                  }}
                >
                  {reaction.label}
                  <span className="ml-1.5 font-mono text-[10.5px] tabular-nums">
                    {base + (active ? 1 : 0)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* One action row for both formats. Report and Follow live in the
            menu, because a card whose most visible affordance is "report" is
            a card that invites it. */}
        <footer className="flex flex-wrap items-center gap-x-[18px] gap-y-2 border-t border-line pt-3.5">
          <button
            type="button"
            onClick={() => toggleHelpful(contribution.id)}
            aria-pressed={marked}
            className={`cursor-pointer text-[12.5px] transition-colors duration-300 outline-none hover:text-positive-light focus-visible:ring-2 focus-visible:ring-positive/60 ${
              marked ? "text-positive-light" : "text-muted"
            }`}
          >
            {marked ? "Marked helpful" : "Helpful"} ·{" "}
            {formatNumber(contribution.helpful + (marked ? 1 : 0))}
          </button>

          <button
            type="button"
            onClick={() => setShowReplies((v) => !v)}
            aria-expanded={showReplies}
            className="cursor-pointer text-[12.5px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            {showReplies ? "Hide replies" : "Replies"} · {replyCount}
          </button>

          <button
            type="button"
            onClick={() => toggleSave(contribution.id)}
            aria-pressed={isSaved}
            className={`cursor-pointer text-[12.5px] transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60 ${
              isSaved ? "text-cream" : "text-muted"
            }`}
          >
            {isSaved ? "Saved" : "Save"}
          </button>

          <button
            type="button"
            onClick={share}
            className="cursor-pointer text-[12.5px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Share
          </button>

          <details className="group relative ml-auto">
            <summary
              aria-label="More actions"
              className="cursor-pointer list-none px-1 text-[13px] text-dim transition-colors duration-300 hover:text-soft [&::-webkit-details-marker]:hidden"
            >
              &#8943;
            </summary>
            <div className="absolute right-0 z-10 mt-2 flex w-[190px] flex-col rounded-[12px] border border-veil/12 bg-surface-raised p-1.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)]">
              {pro ? (
                <button
                  type="button"
                  onClick={() =>
                    signedIn
                      ? toast(`Following ${contribution.name}. New contributions will surface in your feed.`)
                      : openAuth("signin")
                  }
                  className="cursor-pointer rounded-[8px] px-2.5 py-2 text-left text-[12.5px] text-muted transition-colors hover:bg-veil/6 hover:text-cream"
                >
                  Follow creator
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  toast("Thanks — this contribution has been flagged for moderator review.")
                }
                className="cursor-pointer rounded-[8px] px-2.5 py-2 text-left text-[12.5px] text-dim transition-colors hover:bg-negative/8 hover:text-negative-light"
              >
                Report
              </button>
            </div>
          </details>
        </footer>
      </div>

      {/* Replies. The same one-level thread every opinion has always had —
          a Pro contribution gets no separate discussion system, because a
          reply that cannot be seen beside the ordinary replies is not part of
          the conversation. */}
      {showReplies ? (
        <div className="flex flex-col gap-3 border-t border-line bg-veil/2 px-[18px] py-4 sm:px-6">
          <ReplyThread
            opinionId={contribution.id}
            opinionAuthorId={contribution.authorId ?? ""}
            nodes={nodes}
            myVotes={myReplyVotes}
            onChanged={() => router.refresh()}
          />

          {replyError ? (
            <p role="alert" className="m-0 text-[12.5px] text-negative-light">
              {replyError}
            </p>
          ) : null}

          {composing ? (
            <form onSubmit={send} className="flex flex-col gap-2">
              <label className="sr-only" htmlFor={`reply-${contribution.id}`}>
                Reply to {contribution.name}
              </label>
              <textarea
                id={`reply-${contribution.id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_REPLY))}
                rows={3}
                autoFocus
                placeholder={
                  pro
                    ? "Ask a question, challenge the reasoning, or add what it misses."
                    : "Add something the thread does not already say."
                }
                className="resize-y rounded-[10px] border border-veil/10 bg-surface-sunken p-3 text-[13.5px] leading-[1.6] text-cream outline-none transition-colors duration-300 focus:border-positive/50"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="cursor-pointer rounded-full bg-positive px-4 py-2 text-[12.5px] font-semibold text-positive-ink transition-opacity duration-300 outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-positive-light"
                >
                  {sending ? "Posting…" : "Post reply"}
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
      ) : null}
    </article>
  );
}

/* --------------------------------------------------------------- header */

function Header({
  contribution,
  pro,
  accent,
}: {
  contribution: Opinion;
  pro: boolean;
  accent: string;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <span
        aria-hidden
        className="grid h-[34px] w-[34px] place-items-center rounded-full text-[12px] font-semibold"
        style={
          pro
            ? {
                background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                color: accent,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 40%, transparent)`,
              }
            : { background: "var(--color-avatar)", color: "var(--color-soft)" }
        }
      >
        {contribution.initials}
      </span>

      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-cream">{contribution.name}</span>
          {pro ? (
            <span
              className="rounded-full border px-2 py-[2px] font-mono text-[9px] tracking-[0.12em] uppercase"
              style={{
                borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
                background: `color-mix(in oklab, ${accent} 10%, transparent)`,
                color: accent,
              }}
            >
              Pro contribution
            </span>
          ) : null}
          {/* Verification is a separate claim from the subscription, and the
              two are never merged into one badge: paying for better tools is
              not evidence of knowing anything. */}
          {contribution.verifiedLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-positive/35 bg-positive/8 px-2 py-[2px] font-mono text-[9px] tracking-[0.1em] uppercase text-positive-light">
              <span aria-hidden>✓</span>
              {contribution.verifiedLabel}
            </span>
          ) : null}
        </span>
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-dim">
          {pro ? contribution.authorLine || "Pro contributor" : "Participant opinion"} ·{" "}
          {contribution.time}
        </span>
      </span>

      <span
        className="ml-auto inline-flex items-center gap-[7px] rounded-full border px-3 py-[5px] text-[11.5px] font-medium"
        style={{
          color: sentimentColor(contribution.vote),
          borderColor: sentimentColor(contribution.vote),
        }}
      >
        <span aria-hidden className="text-[8px]">
          {sentimentIcon(contribution.vote)}
        </span>
        {contribution.vote}
      </span>
    </header>
  );
}

/* -------------------------------------------------------------- sections */

function SectionView({
  section,
  contributionId,
  accent,
  compact,
}: {
  section: ProSection;
  contributionId: string;
  accent: string;
  compact: boolean;
}) {
  switch (section.type) {
    // Rendered as the card's heading, above the section list.
    case "headline":
      return null;

    case "quick_take":
      return (
        <p
          className="m-0 border-l-2 pl-3.5 text-[15px] leading-[1.6] text-pretty text-cream"
          style={{ borderColor: `color-mix(in oklab, ${accent} 55%, transparent)` }}
        >
          {section.text}
        </p>
      );

    case "breakdown":
      return (
        <div className="flex flex-col gap-3">
          {section.text.split("\n\n").map((paragraph, i) => (
            <p
              key={i}
              className="m-0 text-[14.5px] leading-[1.68] font-light text-pretty text-soft"
            >
              {paragraph}
            </p>
          ))}
        </div>
      );

    case "key_points":
      return (
        <ul
          className={`m-0 grid list-none gap-2.5 p-0 ${
            !compact && section.points.length > 3 ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {section.points.map((point, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-soft">
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: accent }}
              />
              {point}
            </li>
          ))}
        </ul>
      );

    case "interactive":
      return (
        <InteractiveBlockView
          block={section.block}
          contributionId={contributionId}
          accent={accent}
          compact={compact}
        />
      );

    case "final_verdict":
      return (
        <div
          className="flex flex-col gap-1 rounded-[12px] border px-4 py-3.5"
          style={{
            borderColor: `color-mix(in oklab, ${accent} 30%, transparent)`,
            background: `color-mix(in oklab, ${accent} 7%, transparent)`,
          }}
        >
          <span
            className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
            style={{ color: accent }}
          >
            Final verdict
          </span>
          <span className="text-[14.5px] leading-[1.55] font-medium text-pretty text-cream-bright">
            {section.text}
          </span>
        </div>
      );
  }
}

/* ---------------------------------------------------------------- reply */

