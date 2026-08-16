"use client";

/**
 * "Inside a result" — the working instrument, on the landing page.
 *
 * WHY THIS EXISTS. The section above it says there are two ways to ask a
 * question in public, and until now that was the whole pitch: you can vote, or
 * you can write. Everything that makes the product worth using happens *after*
 * the vote — the distribution, the trend with the events plotted on it, the
 * cross-tabs that show which group went the other way, and the written
 * contributions kept in the same list as the numbers. None of that survives a
 * bulleted list. It has to be touchable.
 *
 * So this is a live copy of the analytics layer, running on a worked example
 * (see showcase/data.ts) rather than on anything counted. One mode switch, one
 * cross-filter, and every panel re-reads from the same cells — which is what
 * makes the demonstration honest as a demonstration: the numbers reconcile
 * because they come from one model, not because they were written to agree.
 *
 * THE BADGE IS NOT DECORATION. "Illustration" sits in the stage chrome, above
 * the fold of the panel, in the same place a live page carries its status. Any
 * change here that pushes it below a chart is a change that has to be undone —
 * this codebase has twice had to delete synthetic figures that looked exactly
 * like measurements, and the label is the entire difference.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SectionPurpose } from "@/components/landing/SectionPurpose";
import { DemoAspects } from "@/components/landing/showcase/DemoAspects";
import { DemoBreakdown } from "@/components/landing/showcase/DemoBreakdown";
import { DemoDiscussion } from "@/components/landing/showcase/DemoDiscussion";
import { DemoDonut } from "@/components/landing/showcase/DemoDonut";
import { DemoSplit } from "@/components/landing/showcase/DemoSplit";
import { DemoTrend } from "@/components/landing/showcase/DemoTrend";
import {
  DIM_LABEL,
  SUBJECT,
  contrarian,
  filterLabel,
  filterValue,
  read,
  stackFor,
  trend,
  withDim,
  type Dim,
  type Filter,
  type Mode,
} from "@/components/landing/showcase/data";

export function ResultShowcase() {
  const [mode, setMode] = useState<Mode>("topic");
  const [filter, setFilter] = useState<Filter>({});

  const reading = useMemo(() => read(filter), [filter]);
  const points = useMemo(() => trend(filter), [filter]);
  const odd = useMemo(() => contrarian(filter, mode), [filter, mode]);

  const scope = filterLabel(filter);
  const filtered = Object.values(filter).some(Boolean);
  const subject = SUBJECT[mode];

  const pick = (dim: Dim, value: string | undefined) =>
    setFilter((prev) => withDim(prev, dim, value));

  /**
   * `#inside-poll` opens the stage on the poll.
   *
   * The two cards in the section above are where a reader decides which
   * instrument they care about, and they are a sibling component that cannot
   * reach `setMode`. Rather than lift the mode up through the page for two
   * links, they write the hash and this listens — which also means a shared
   * `/#inside-poll` link lands somebody on the right instrument. The same trick
   * the topic page uses for `#discussion`.
   *
   * Runs on mount too, for arriving with the hash already in the URL.
   */
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (hash === "#inside-poll") setMode("poll");
      else if (hash === "#inside-topic") setMode("topic");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section
      id="inside"
      className="relative border-t border-veil/5 px-5 py-[clamp(72px,11vw,140px)] sm:px-10 lg:px-20"
    >
      {/* The same bloom the hero uses, pushed to the top edge so the stage
          below sits in a pool of light rather than on a flat page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-0 h-[560px]"
        style={{
          background:
            "radial-gradient(46% 40% at 50% 0%, color-mix(in oklab, var(--color-positive) 9%, transparent), transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px]">
        <div data-reveal className="ohq-reveal mx-auto max-w-[780px] text-center">
          <span className="ohq-eyebrow">Inside a result</span>
          <h2 className="mt-4 mb-5 font-display text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] font-bold tracking-[-0.025em] text-balance text-cream-bright">
            One number, and then the <em>questions about it.</em>
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] font-light text-pretty text-muted">
            &ldquo;70% positive&rdquo; is where most polls stop. It is where a subject
            page starts: how the reading moved and what moved it, which groups went the
            other way, which parts people actually argue about, and what they wrote.
            Everything below is live — push on it.
          </p>
          <div className="mt-5">
            <SectionPurpose
              problem="A headline percentage tells you nothing about who was asked"
              solution="Filter any result by state, age or occupation and watch it move"
            />
          </div>
        </div>

        {/* Both anchors land in the same place; which one was used decides the
            mode, in the effect above. `scroll-mt` clears the fixed nav. */}
        <span
          id="inside-topic"
          aria-hidden
          className="block scroll-mt-[calc(var(--ohq-nav-h)+24px)]"
        />
        <span
          id="inside-poll"
          aria-hidden
          className="block scroll-mt-[calc(var(--ohq-nav-h)+24px)]"
        />

        {/* -------------------------------------------------------- the stage */}
        <div
          data-reveal
          className="ohq-panel-raised ohq-reveal relative mt-[clamp(34px,5vw,58px)] overflow-hidden delay-[60ms]"
        >
          <StageChrome mode={mode} onMode={setMode} />

          <div className="flex flex-col gap-[clamp(26px,3.4vw,42px)] p-[clamp(16px,2.6vw,34px)]">
            <SubjectLine mode={mode} question={subject.question} prompt={subject.prompt} />

            <ScopeBar filter={filter} onPick={pick} onClear={() => setFilter({})} />

            {/* Act one — the reading, beside how it moved. */}
            <Act n="01" title="The reading, and how it got there">
              <div className="grid grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                <div className="ohq-panel flex flex-col gap-4 p-5">
                  <span className="ohq-eyebrow">
                    {mode === "topic" ? "Sentiment distribution" : "The split"}
                  </span>
                  {mode === "topic" ? (
                    <DemoDonut sentiment={reading.sentiment} scope={scope} />
                  ) : (
                    <DemoSplit shares={reading.poll} scope={scope} />
                  )}
                  <VoteStrip mode={mode} />
                </div>

                <div className="ohq-panel flex flex-col gap-3.5 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="ohq-eyebrow">How it moved</span>
                    <span className="text-[11.5px] text-dim">
                      21 days · 2 events plotted
                    </span>
                  </div>
                  <DemoTrend points={points} mode={mode} scope={scope} />
                </div>
              </div>
            </Act>

            {/* Act two — the cross-tabs, and the group that flips. */}
            <Act n="02" title="Who took part, and where the split flips">
              <div className="ohq-panel flex flex-col gap-[clamp(16px,2vw,22px)] p-5">
                <p className="m-0 max-w-[640px] text-[13px] leading-[1.55] text-dim">
                  Bar length is how much of the sample a group is. The stack inside it is
                  how that group split. The figure on the right is how far that group sits
                  from the reading above, in points, on whichever answer is currently
                  leading — <strong className="font-medium text-soft">click any row</strong>{" "}
                  to re-read every panel as that group.
                </p>
                <DemoBreakdown filter={filter} mode={mode} onPick={pick} />
                {odd ? <AgainstTheGrain contrarian={odd} mode={mode} /> : null}
                <p className="m-0 border-t border-line pt-4 text-[12px] leading-[1.55] text-dim">
                  On a live subject, location, age and occupation are optional and
                  self-declared, and a segment too small to publish without identifying
                  the people in it is withheld rather than shown.
                </p>
              </div>
            </Act>

            {/* Act three — what the argument is actually about. Topic-only:
                a poll has no aspects, it has one forced choice. */}
            {mode === "topic" ? (
              <Act n="03" title="The parts people actually argue about">
                <div className="ohq-panel p-5">
                  <DemoAspects />
                </div>
              </Act>
            ) : (
              <Act n="03" title="Why the margin is stated in words">
                <MarginNote shares={reading.poll} />
              </Act>
            )}

            {/* Act four — the written half. */}
            <Act n="04" title={mode === "topic" ? "What people wrote" : "The case for each side"}>
              <DemoDiscussion mode={mode} />
            </Act>
          </div>

          <StageFooter mode={mode} filtered={filtered} scope={scope} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ chrome */

/**
 * The top bar of the stage: the mode switch on the left, the badge on the
 * right. Modelled on a window chrome so the panel below it reads as a
 * self-contained instrument rather than as more page.
 */
function StageChrome({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line bg-surface-sunken/60 px-[clamp(14px,2.2vw,26px)] py-3">
      {/*
       * A segmented control, on a GRID rather than a flex row.
       *
       * The sliding pill is `50% - 4px` wide, which is only the width of a half
       * if the two halves are actually equal — and under `flex-1` they are not.
       * A flex container that is shrink-to-fit sizes itself from its children's
       * max-content, so `flex: 1 1 0` leaves no free space to distribute and
       * each button keeps its own natural width. "Opinion topic" is half again
       * as wide as "Poll", so the pill sat under neither of them. Two equal
       * `1fr` columns make the geometry true instead of assumed.
       */}
      <div
        role="tablist"
        aria-label="Which instrument to demonstrate"
        className="relative grid grid-cols-2 rounded-full border border-veil/10 bg-veil/4 p-1"
      >
        {/* One pill that travels, rather than a background on the selected
            button — the movement is what says the two are the same control in
            two states. Filled rather than tinted: it is the same figure/ground
            the hero's two buttons use, and a 20% wash of green behind green
            type reads as a highlight artefact. */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)] transition-[transform,background] duration-500 ease-ohq"
          style={{
            transform: mode === "topic" ? "translateX(0)" : "translateX(100%)",
            background: mode === "topic" ? "var(--color-positive)" : "var(--color-poll)",
          }}
        />
        {(["topic", "poll"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => onMode(m)}
            // The selected colour is inline because it depends on which mode is
            // selected; the unselected one stays a class so it keeps its hover.
            className={`relative z-1 cursor-pointer rounded-full px-[clamp(10px,1.6vw,18px)] py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
              mode === m ? "" : "text-dim hover:text-cream"
            }`}
            style={
              mode === m
                ? {
                    color:
                      m === "topic"
                        ? "var(--color-positive-ink)"
                        : "var(--color-poll-ink)",
                  }
                : undefined
            }
          >
            {m === "topic" ? "Opinion topic" : "Poll"}
          </button>
        ))}
      </div>

      {/* The badge is the one thing on this panel that must never wrap into a
          second line of monospace on a phone, so the qualifier goes rather than
          the word. "Illustration" alone still says it. */}
      <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-veil/12 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.14em] whitespace-nowrap uppercase text-dim">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-veil/40" />
        Illustration<span className="hidden sm:inline"> — nothing here is counted</span>
      </span>
    </div>
  );
}

function SubjectLine({
  mode,
  question,
  prompt,
}: {
  mode: Mode;
  question: string;
  prompt: string;
}) {
  const accent = mode === "topic" ? "text-positive-light" : "text-poll-soft";
  const dot = mode === "topic" ? "bg-positive" : "bg-poll";

  return (
    <header className="flex flex-col gap-2">
      <span className={`flex items-center gap-2.5 font-mono text-[10px] tracking-[0.14em] uppercase ${accent}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {SUBJECT[mode].eyebrow}
      </span>
      <h3 className="font-display m-0 text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1.06] font-bold tracking-[-0.02em] text-balance text-cream-bright">
        {question}
      </h3>
      <p className="m-0 text-[13.5px] leading-[1.55] text-muted">{prompt}</p>
    </header>
  );
}

/** The active cross-filter, as removable chips. */
function ScopeBar({
  filter,
  onPick,
  onClear,
}: {
  filter: Filter;
  onPick: (dim: Dim, value: string | undefined) => void;
  onClear: () => void;
}) {
  const chips = (["state", "age", "work"] as Dim[]).flatMap((dim) => {
    const value = filterValue(filter, dim);
    return value ? [{ dim, value }] : [];
  });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-veil/8 bg-surface-sunken px-3.5 py-2.5">
      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
        Reading
      </span>
      {chips.length === 0 ? (
        <span className="text-[13px] text-soft">
          Everyone
          <span className="ml-2 text-dim">
            — pick a group below to re-read every panel as that group
          </span>
        </span>
      ) : (
        <>
          {chips.map((chip) => (
            <button
              key={chip.dim}
              type="button"
              onClick={() => onPick(chip.dim, undefined)}
              aria-label={`Remove the ${DIM_LABEL[chip.dim]} filter, ${chip.value}`}
              className="ohq-pill cursor-pointer border-positive/35 text-cream transition-colors duration-300 hover:border-positive/60"
            >
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-dim">
                {DIM_LABEL[chip.dim]}
              </span>
              {chip.value}
              <span aria-hidden className="text-dim">
                ✕
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="ml-auto cursor-pointer font-mono text-[9.5px] tracking-[0.1em] uppercase text-dim transition-colors hover:text-cream"
          >
            reset
          </button>
        </>
      )}
    </div>
  );
}

/**
 * A numbered act.
 *
 * The rule to the right of the title draws itself across when the block is
 * released by the scroll observer — the same `[data-shown]` flag `.ohq-reveal`
 * already keys off, so the whole thing is one CSS rule and no second observer.
 */
function Act({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section data-reveal className="ohq-reveal flex flex-col gap-3.5">
      <header className="flex items-center gap-3">
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-positive-light">{n}</span>
        <h3 className="font-display m-0 text-[15px] leading-[1.25] font-semibold tracking-[-0.015em] whitespace-nowrap text-cream-bright sm:text-[16.5px]">
          {title}
        </h3>
        <span aria-hidden className="ohq-rule h-px min-w-0 flex-1 bg-veil/12" />
      </header>
      {children}
    </section>
  );
}

/**
 * The vote control itself, inert.
 *
 * It is here because the control is the product's front door and it is two
 * inches wide — showing the output without the input makes the site look like
 * a dashboard somebody else fills in. Clicking says what would happen and
 * nothing else: no tally moves, because a tally that ticked up by one would be
 * claiming a person had been counted.
 */
function VoteStrip({ mode }: { mode: Mode }) {
  const [picked, setPicked] = useState<number | null>(null);
  const options = stackFor(mode);

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
        {mode === "topic" ? "Cast a sentiment vote" : "Pick one"}
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((option, i) => {
          const active = picked === i;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setPicked(active ? null : i)}
              className="cursor-pointer rounded-[10px] border px-2 py-2 text-[11.5px] leading-tight font-medium transition-[color,background,border-color] duration-300 outline-none hover:border-veil/30 focus-visible:ring-2 focus-visible:ring-positive/60"
              style={{
                borderColor: active
                  ? option.color
                  : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                background: active
                  ? `color-mix(in oklab, ${option.color} 14%, transparent)`
                  : "transparent",
                color: active ? "var(--color-cream-bright)" : "var(--color-muted)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="m-0 text-[11.5px] leading-[1.5] text-dim">
        {picked === null
          ? "One vote per account, changeable until the subject closes. Reading needs no account."
          : "That is the whole interaction. On a live subject it would be counted once — nothing here is recorded."}
      </p>
    </div>
  );
}

/** The finding, stated: the one group that goes the other way. */
function AgainstTheGrain({
  contrarian: odd,
  mode,
}: {
  contrarian: NonNullable<ReturnType<typeof contrarian>>;
  mode: Mode;
}) {
  const stack = stackFor(mode);
  const leader = stack[odd.leaderIndex];

  return (
    <div
      className="flex flex-col gap-1.5 rounded-[14px] border p-4"
      style={{
        borderColor: "color-mix(in oklab, #F0A83C 30%, transparent)",
        background: "color-mix(in oklab, #F0A83C 6%, transparent)",
      }}
    >
      <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#F0A83C]">
        Against the grain
      </span>
      <p className="m-0 text-[13.5px] leading-[1.55] text-soft">
        <strong className="font-semibold text-cream-bright">{odd.label}</strong> is the one{" "}
        {DIM_LABEL[odd.dim].toLowerCase()} that goes another way —{" "}
        <strong className="font-semibold" style={{ color: leader?.text }}>
          {odd.leaderPct}%{" "}
          {mode === "topic" ? leader?.label.toLowerCase() : `picked ${leader?.label}`}
        </strong>
        , against the rest of the sample.
      </p>
    </div>
  );
}

/**
 * Polls state their margin in words as well as in points, because "53–47" and
 * "a narrow lead" are read by different people and only one of them is a
 * sentence.
 */
function MarginNote({ shares }: { shares: [number, number, number] }) {
  const sorted = [...shares].sort((a, b) => b - a);
  const margin = (sorted[0] ?? 0) - (sorted[1] ?? 0);
  const word = margin === 0 ? "a dead heat" : margin < 6 ? "a narrow lead" : margin < 18 ? "a clear lead" : "a wide lead";

  return (
    <div className="ohq-panel flex flex-col gap-3 p-5">
      <p className="m-0 text-[clamp(1.15rem,2.2vw,1.6rem)] leading-[1.3] font-light tracking-[-0.015em] text-cream">
        This is <strong className="font-semibold text-cream-bright">{word}</strong> — {margin}{" "}
        {margin === 1 ? "point" : "points"} between first and second.
      </p>
      <p className="m-0 max-w-[620px] text-[13px] leading-[1.6] text-dim">
        A poll has no neutral option and no fence to sit on, which is exactly why the
        margin is the result rather than a footnote to it. Every poll page states it in
        words as well as in points, and restates it for each group in the cross-tabs
        above — a national lead that disappears in one state is a different finding from
        one that holds everywhere.
      </p>
    </div>
  );
}

/** The disclaimer, and the way out to the real thing. */
function StageFooter({
  mode,
  filtered,
  scope,
}: {
  mode: Mode;
  filtered: boolean;
  scope: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line bg-surface-sunken/60 px-[clamp(14px,2.2vw,26px)] py-4">
      <p className="m-0 max-w-[620px] text-[12px] leading-[1.55] text-dim">
        A worked example, not a measurement. No headcount appears anywhere in it and
        nobody was asked — the model behind it exists so the panels agree with each other
        while you filter{filtered ? `, which is what you are looking at now: ${scope}.` : "."}{" "}
        Every figure on a live subject page is counted from votes.
      </p>
      <Link
        href={mode === "topic" ? "/topics" : "/polls"}
        className={`ohq-press ml-auto inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold duration-500 ease-ohq ${
          mode === "topic"
            ? "bg-positive text-positive-ink hover:bg-[#25CC61]"
            : "bg-poll text-poll-ink hover:bg-[#B9A2FC]"
        }`}
      >
        See a real one
        <span aria-hidden className="font-mono">
          →
        </span>
      </Link>
    </div>
  );
}
