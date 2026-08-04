import Link from "next/link";

import { SectionPurpose } from "@/components/landing/SectionPurpose";
import { Brand } from "@/components/ui/Brand";
import { formatNumber } from "@/lib/derive";
import { TOTAL_TOPICS, TOTAL_VOTES } from "@/lib/topics";
import { TOTAL_POLL_VOTES, TOTAL_POLLS } from "@/lib/polls";

/**
 * The two *public* modes, side by side.
 *
 * Each card carries a working miniature of its own output — a sentiment
 * distribution on the left, a head-to-head split on the right — because the
 * difference between "how do you feel" and "which one" is much easier to see
 * than to describe.
 *
 * The third mode, Ask Verified, is deliberately not a third column here. It is
 * private, one-to-one and has no aggregate at all; sitting it beside two public
 * measurement modes would imply it is another way of counting people. It gets
 * its own section immediately below.
 */
export function TwoModesSection() {
  return (
    <section
      id="modes"
      className="relative border-t border-veil/5 px-5 py-[clamp(72px,11vw,140px)] sm:px-10 lg:px-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="ohq-reveal mx-auto max-w-[760px] text-center">
          <span className="ohq-eyebrow">Two ways to ask in public</span>
          <h2 className="mt-4 mb-5 font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-[1.02] font-normal tracking-[-0.025em] text-balance text-cream-bright">
            Some questions need a <em className="italic">scale.</em> Others need a{" "}
            <em className="italic">winner.</em>
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] font-light text-pretty text-muted">
            Asking &ldquo;how do you feel about the fee hike?&rdquo; and &ldquo;IIT or
            Ivy League?&rdquo; are different jobs. <Brand /> keeps them apart, because a
            forced choice and a sentiment reading should never be averaged together.
            Both are public — the private one comes next.
          </p>
          <div className="mt-5">
            <SectionPurpose
              problem="Opinion lives in replies and group chats, where nobody can read it"
              solution="Two public instruments: a sentiment scale, and a forced choice"
            />
          </div>
        </div>

        <div className="mt-[clamp(38px,6vw,70px)] grid grid-cols-1 gap-[clamp(16px,2vw,24px)] lg:grid-cols-2">
          {/* Mode one — sentiment. */}
          <article
            data-reveal
            className="ohq-panel-raised ohq-reveal flex flex-col gap-6 p-6 delay-[80ms] sm:p-9"
          >
            <header className="flex flex-col gap-3">
              <span className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.14em] uppercase text-positive-light">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Opinion intelligence
              </span>
              <h3 className="m-0 font-serif text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.06] font-normal tracking-[-0.02em] text-cream-bright">
                How does everyone feel about <em className="italic">this?</em>
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.6] font-light text-muted">
                One subject, measured continuously. A positive / neutral / negative
                reading, plus four or five aspect questions written for that specific
                subject — a film gets asked about its second half, an exam about whether
                it was run cleanly.
              </p>
            </header>

            <SentimentMini />

            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13.5px] text-soft">
              {[
                "Sentiment moves over 30 days, with verified events plotted on it",
                "Aspect breakdowns, so you see what people liked and what they did not",
                "Written opinions with replies, kept separate from sourced facts",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden className="pt-px text-positive">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <footer className="mt-auto flex flex-wrap items-center gap-4 border-t border-line pt-5">
              <Link
                href="/topics"
                className="rounded-full bg-positive px-6 py-3 text-[14.5px] font-semibold text-positive-ink transition-[background,box-shadow] duration-500 ease-ohq hover:bg-[#25CC61] hover:shadow-[0_12px_36px_-10px_rgba(29,185,84,0.5)]"
              >
                Explore {TOTAL_TOPICS} topics
              </Link>
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim">
                {formatNumber(TOTAL_VOTES)} votes
              </span>
            </footer>
          </article>

          {/* Mode two — polling. */}
          <article
            data-reveal
            className="ohq-panel-raised ohq-reveal flex flex-col gap-6 p-6 delay-[160ms] sm:p-9"
          >
            <header className="flex flex-col gap-3">
              <span className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.14em] uppercase text-poll-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-poll" />
                Polling
              </span>
              <h3 className="m-0 font-serif text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.06] font-normal tracking-[-0.02em] text-cream-bright">
                Up to four options. <em className="italic">Pick one.</em>
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.6] font-light text-muted">
                A forced choice on anything — people, products, formats, policies,
                career paths. No neutral option and no fence to sit on, which is
                exactly why the result tells you something a sentiment scale cannot.
              </p>
            </header>

            <PollMini />

            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13.5px] text-soft">
              {[
                "One bar, every option on it, and the margin stated in plain words",
                "Cross-tabs by region, age and occupation — where the split flips",
                "Reasons grouped by pick. No replies, no thread, no pile-on",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden className="pt-px text-poll">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <footer className="mt-auto flex flex-wrap items-center gap-4 border-t border-line pt-5">
              <Link
                href="/polls"
                className="rounded-full bg-poll px-6 py-3 text-[14.5px] font-semibold text-poll-ink transition-[background,box-shadow] duration-500 ease-ohq hover:bg-[#B9A2FC] hover:shadow-[0_12px_36px_-10px_rgba(167,139,250,0.5)]"
              >
                Vote in {TOTAL_POLLS} polls
              </Link>
              <Link
                href="/polls/new"
                className="text-[13px] text-muted underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                or start your own
              </Link>
              <span className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim">
                {formatNumber(TOTAL_POLL_VOTES)} votes
              </span>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}

/** Miniature of a topic result: a distribution across three positions. */
function SentimentMini() {
  const rows = [
    { label: "Positive", pct: 8, color: "#1DB954" },
    { label: "Neutral", pct: 14, color: "#9BA1A6" },
    { label: "Negative", pct: 78, color: "#E5484D" },
  ];
  return (
    <figure
      aria-label="Example topic result: 8 percent positive, 14 percent neutral, 78 percent negative"
      className="m-0 flex flex-col gap-3 rounded-[16px] border border-veil/8 bg-surface-sunken p-5"
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-soft">
          NEET UG 2026 Paper Leak
        </span>
        <span className="text-[15px] font-semibold text-negative">78% Negative</span>
      </figcaption>
      {rows.map((row, i) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-[58px] shrink-0 text-[11.5px] text-dim">{row.label}</span>
          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-veil/6">
            <span
              className="block h-full origin-left animate-grow-x rounded-full"
              style={{
                width: `${row.pct}%`,
                background: row.color,
                animationDelay: `${240 + i * 130}ms`,
              }}
            />
          </span>
          <span className="w-[34px] shrink-0 text-right font-mono text-[11px] text-soft">
            {row.pct}%
          </span>
        </div>
      ))}
      <figcaption className="text-[11px] text-dim">
        of 42,847 participants · sample data
      </figcaption>
    </figure>
  );
}

/** Miniature of a poll result: one bar, two sides, a stated margin. */
function PollMini() {
  return (
    <figure
      aria-label="Example poll result: NEET UG 47 percent, JEE Advanced 53 percent"
      className="m-0 flex flex-col gap-3 rounded-[16px] border border-veil/8 bg-surface-sunken p-5"
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-soft">
          Which exam is genuinely harder?
        </span>
        <span className="text-[15px] font-semibold text-poll-soft">53% JEE</span>
      </figcaption>
      <div className="flex h-9 gap-[3px]">
        <span
          className="flex origin-left animate-grow-x items-center justify-start rounded-[4px] pl-2.5 text-[13px] font-semibold text-[#07240f]"
          style={{ width: "47%", background: "#1DB954", animationDelay: "260ms" }}
        >
          47%
        </span>
        <span
          className="flex origin-right animate-grow-x items-center justify-end rounded-[4px] pr-2.5 text-[13px] font-semibold text-poll-ink"
          style={{ width: "53%", background: "var(--color-poll)", animationDelay: "260ms" }}
        >
          53%
        </span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11.5px]">
        <span className="text-dim">NEET UG</span>
        <span className="text-dim">JEE Advanced</span>
      </div>
      <figcaption className="border-t border-line pt-3 text-[11px] leading-[1.5] text-dim">
        Narrow lead · 63,010 votes. Among 17–20s it flips: NEET leads by 9.
      </figcaption>
    </figure>
  );
}
