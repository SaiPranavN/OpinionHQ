"use client";

/**
 * `/dashboard` — everything this account has done, in one place.
 *
 * A record, not a scoreboard. There is no streak, no level, no points and no
 * "you are in the top 3% of contributors" — this product's entire argument is
 * that its numbers mean what they say, and an engagement metric invented to
 * make somebody come back tomorrow is the first number that stops meaning
 * anything.
 *
 * What it does show is what they actually did and where it went, with a link
 * back to every one of them. The most useful thing a page like this can be is
 * a way to find the thing you wrote last week.
 *
 * READS BOTH PROVIDERS AND WRITES NEITHER. Topics, polls and contributions live
 * in `PrototypeProvider`; questions, answers and credentials live in
 * `AskProvider`, deliberately in separate storage. This page is the one place
 * they are shown side by side, and it does that by reading — it does not merge
 * them, and a private question never becomes a public record by appearing on
 * somebody's own dashboard.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { readMyFollowCount } from "@/lib/follows";
import { readMyContributions, type MyContribution } from "@/lib/topics/contributions";

import { InterestSettings } from "@/components/dashboard/InterestSettings";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { relativeTime } from "@/lib/ask/derive";
import { formatNumber, sentimentColor, sentimentIcon } from "@/lib/derive";
import { PRO_PLAN } from "@/lib/entitlements";
import type { DecoratedTopic, Sentiment } from "@/lib/types";

type SectionId = "opinions" | "polls";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "opinions", label: "Opinions" },
  { id: "polls", label: "Polls" },
];

export function DashboardView({ topics }: { topics: DecoratedTopic[] }) {
  const {
    ready,
    signedIn,
    profile,
    displayName,
    votes,
    pollVotes,
    replies,
    created,
    createdPolls,
    pro,
    openUpgrade,
    cancelPro,
    openAuth,
  } = usePrototype();


  /** The real number, read once on mount. */
  const [followCount, setFollowCount] = useState(0);
  useEffect(() => {
    let live = true;
    readMyFollowCount().then((n) => {
      if (live) setFollowCount(n);
    });
    return () => {
      live = false;
    };
  }, []);

  /**
   * Published contributions, from the server.
   *
   * This panel used to read an array in localStorage, so it was empty on every
   * device except the one the contribution was written on — and empty for
   * everybody after a cache clear.
   */
  const [contributions, setContributions] = useState<MyContribution[]>([]);
  useEffect(() => {
    let live = true;
    readMyContributions().then((rows) => {
      if (live) setContributions(rows);
    });
    return () => {
      live = false;
    };
  }, []);

  const [section, setSection] = useState<SectionId>("opinions");

  /**
   * Slug to topic, from the list the server handed down.
   *
   * The votes themselves arrive from Postgres keyed by slug, and this resolves
   * each one to a name and a link. A topic that has since been archived is
   * simply absent — the row then renders its slug, which is honest, rather than
   * disappearing and leaving somebody wondering where their opinion went.
   */
  const bySlug = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );

  const voteRows = useMemo(
    () =>
      Object.entries(votes)
        .map(([topicId, cast]) => ({ topicId, cast, topic: bySlug.get(topicId) }))
        .sort((a, b) => b.cast.updatedAt.localeCompare(a.cast.updatedAt)),
    [votes, bySlug],
  );

  const pollRows = useMemo(
    () =>
      Object.entries(pollVotes)
        .map(([pollId, cast]) => ({ pollId, cast }))
        .sort((a, b) => b.cast.updatedAt.localeCompare(a.cast.updatedAt)),
    [pollVotes],
  );


  if (!ready) return null;

  if (!signedIn) {
    return (
      <Shell>
        <div className="ohq-panel flex flex-col items-center gap-4 px-5 py-[clamp(48px,8vw,90px)] text-center">
          <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.6rem)] tracking-[-0.02em] leading-[1.05] text-cream-bright">
            Sign in to see your <em>activity</em>
          </h1>
          <p className="m-0 max-w-[420px] text-[14px] leading-[1.6] font-light text-muted">
            Everything you vote on, write and ask is kept against your account so you can
            find it again. Nothing here is visible to anybody else.
          </p>
          <button
            type="button"
            onClick={() => openAuth("signin", "/dashboard")}
            className="cursor-pointer rounded-full bg-positive px-6 py-3 text-[14px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61]"
          >
            Sign in
          </button>
        </div>
      </Shell>
    );
  }

  const counts = {
    opinions: voteRows.length + contributions.length + replies.length,
    polls: pollRows.length,
  };

  return (
    <Shell>
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden
            className="grid h-[54px] w-[54px] place-items-center rounded-full bg-avatar text-[17px] font-semibold text-soft"
          >
            {(displayName || "You").slice(0, 2).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 font-display font-bold text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.05] tracking-[-0.022em] text-cream-bright">
              {displayName || "Your account"}
            </h1>
            <span className="text-[13px] text-dim">{profile?.email}</span>
          </span>
        </div>

        {/* Subscription. Stated as a fact with a control beside it, not as an
            upsell banner — somebody looking at their own account should not be
            sold to on arrival. */}
        <section
          aria-label="Subscription"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[16px] border border-veil/10 bg-veil/2 p-4 sm:p-5"
        >
          <span className="flex flex-col gap-1">
            <span className="ohq-eyebrow">Plan</span>
            <span className="text-[15px] font-semibold text-cream-bright">
              {pro ? PRO_PLAN.name : "Free"}
            </span>
          </span>
          <span className="max-w-[440px] text-[12.5px] leading-[1.55] text-dim">
            {pro
              ? "The rich composer for structured contributions. Cancelling leaves everything you published in place."
              : "Reading, voting, replying and writing ordinary opinions are free and always will be."}
          </span>
          <span className="ml-auto">
            {pro ? (
              <button
                type="button"
                onClick={cancelPro}
                className="cursor-pointer rounded-full border border-veil/14 px-4 py-2 text-[12.5px] font-medium text-muted transition-colors hover:border-veil/32 hover:text-cream"
              >
                Cancel Pro
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openUpgrade("ask-question")}
                className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61]"
              >
                See Pro
              </button>
            )}
          </span>
        </section>

        {/* Under the plan, because it is the same kind of thing: a setting
            stated as a fact with one control beside it. */}
        <InterestSettings />
      </header>

      <div
        role="tablist"
        aria-label="Your activity"
        className="ohq-scroll-x mt-8 mb-6 flex gap-[clamp(18px,3vw,34px)] overflow-x-auto border-b border-veil/8"
      >
        {SECTIONS.map((s) => {
          const selected = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSection(s.id)}
              className={`cursor-pointer border-b-2 px-0.5 pb-3.5 text-[14.5px] font-medium whitespace-nowrap transition-[color,border-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                selected
                  ? "border-positive text-cream-bright"
                  : "border-transparent text-dim hover:text-cream"
              }`}
            >
              {s.label}
              <span className="ml-2 font-mono text-[11px] text-dim">{counts[s.id]}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------- opinions */}
      {section === "opinions" ? (
        <div className="flex flex-col gap-[clamp(14px,2vw,20px)]">
          <Panel
            title="Opinions you shared"
            empty="You have not voted on a topic yet."
            count={voteRows.length}
          >
            {voteRows.map(({ topicId, cast, topic }) => (
              <Row
                key={topicId}
                href={`/topics/${topicId}`}
                title={topic?.name ?? topicId}
                meta={`Voted ${cast.vote} · ${relativeTime(cast.updatedAt)}`}
                tone={cast.vote}
                body={cast.note || undefined}
              />
            ))}
          </Panel>

          <Panel
            title="Pro contributions"
            empty={
              pro
                ? "You have not published a rich contribution yet."
                : "Rich contributions are a Pro format."
            }
            count={contributions.length}
          >
            {contributions.map((contribution) => (
              <Row
                key={contribution.id}
                href={`/topics/${contribution.topicSlug}#${contribution.id}`}
                title={contribution.headline}
                meta={`${contribution.topicName} · ${contribution.sections} ${
                  contribution.sections === 1 ? "section" : "sections"
                } · ${formatNumber(contribution.helpful)} helpful`}
                tone={contribution.vote as Sentiment}
                badge={contribution.anonymous ? "Pro · anonymous" : "Pro contribution"}
              />
            ))}
          </Panel>

          <Panel title="Replies you posted" empty="No replies yet." count={replies.length}>
            {replies
              .slice()
              .reverse()
              .map((reply) => (
                <Row
                  key={reply.id}
                  title={reply.text}
                  meta={`Replied ${relativeTime(reply.createdAt)}`}
                />
              ))}
          </Panel>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[clamp(12px,1.6vw,18px)]">
            {/* From Postgres, not `follows` in localStorage — see lib/follows.ts.
                That array counted this browser and nothing else. */}
            <Tally label="Following" value={followCount} />
            <Tally label="Created" value={created.length + createdPolls.length} />
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- polls */}
      {section === "polls" ? (
        <Panel
          title="Polls you took a side in"
          empty="You have not picked a side in a poll yet."
          count={pollRows.length}
        >
          {/* The poll's question is not resolved here. It used to come from a
              catalog held in this browser; the real one is in Postgres and this
              page does not fetch it yet, so the row links by address rather
              than inventing a title. */}
          {pollRows.map(({ pollId, cast }) => (
            <Row
              key={pollId}
              href={`/polls/${pollId}`}
              title={pollId}
              meta={`Picked option ${cast.side.toUpperCase()} · ${relativeTime(cast.updatedAt)}`}
            />
          ))}
        </Panel>
      ) : null}

    </Shell>
  );
}

/* ------------------------------------------------------------- pieces */

function Panel({
  title,
  count,
  empty,
  note,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ohq-panel flex flex-col gap-4 p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display m-0 text-[15px] font-semibold text-cream-bright">
          {title}
          <span className="ml-2 font-mono text-[11px] text-dim">{count}</span>
        </h2>
        {note ? <span className="ml-auto text-[12px] text-dim">{note}</span> : null}
      </header>
      {count === 0 ? (
        <p className="m-0 text-[13px] leading-[1.6] text-dim">{empty}</p>
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </section>
  );
}

function Row({
  href,
  title,
  meta,
  body,
  tone,
  badge,
  trailing,
}: {
  href?: string;
  title: string;
  meta: string;
  body?: string;
  tone?: Sentiment;
  badge?: string;
  trailing?: React.ReactNode;
}) {
  const inner = (
    <span className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-2">
        {tone ? (
          <span
            aria-hidden
            className="text-[8px]"
            style={{ color: sentimentColor(tone) }}
          >
            {sentimentIcon(tone)}
          </span>
        ) : null}
        <span className="text-[14px] leading-[1.4] font-medium text-pretty text-cream">
          {title}
        </span>
        {badge ? (
          <span className="rounded-full border border-private/40 bg-private/8 px-2 py-[2px] font-mono text-[9px] tracking-[0.1em] uppercase text-private-soft">
            {badge}
          </span>
        ) : null}
        {trailing ? <span className="ml-auto">{trailing}</span> : null}
      </span>
      <span className="font-mono text-[10.5px] tracking-[0.06em] text-dim">{meta}</span>
      {body ? (
        <span className="text-[13px] leading-[1.6] text-pretty text-muted">
          &ldquo;{body}&rdquo;
        </span>
      ) : null}
    </span>
  );

  const shell = "border-b border-veil/6 py-3.5 first:pt-0 last:border-0 last:pb-0";

  return href ? (
    <Link
      href={href}
      className={`${shell} block cursor-pointer transition-opacity duration-300 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-positive/50`}
    >
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div className="ohq-panel flex flex-col gap-1 p-4 sm:p-5">
      <span className="font-display font-semibold text-[26px] tracking-[-0.02em] leading-none text-cream-bright">
        {formatNumber(value)}
      </span>
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-dim">
        {label}
      </span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="mx-auto max-w-[980px] px-4 pb-[clamp(64px,8vw,110px)] sm:px-8"
      style={{ paddingTop: "calc(var(--ohq-nav-h) + 18px)" }}
    >
      <div className="mb-5">
        <Breadcrumb
          trail={[{ label: "Home", href: "/" }, { label: "Your activity" }]}
        />
      </div>
      {children}
    </section>
  );
}
