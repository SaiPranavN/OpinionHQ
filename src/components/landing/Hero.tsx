import Link from "next/link";

import { formatNumber } from "@/lib/derive";

export function Hero({
  topicCount,
  voteCount,
  pollCount,
}: {
  topicCount: number;
  voteCount: number;
  pollCount: number;
}) {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-svh flex-col items-center justify-center px-5 pt-35 pb-22 text-center sm:px-10 lg:px-20"
    >
      {/* A single green bloom centred behind the headline — the "slight glow
          around the central hero region", and the only background element the
          hero owns.

          Everything else (mesh, contours, nodes, cursor light) comes from
          AmbientBackground. The hero used to run its own particle field too,
          which meant two independent systems drawing dots on the same screen
          with different densities and no shared reduced-motion or mobile
          budget. One system, one set of rules. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] top-[-20%] bottom-auto z-0 h-[120%] animate-drift"
        style={{
          background:
            "radial-gradient(52% 42% at 50% 32%, color-mix(in oklab, var(--color-positive) 15%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-auto bottom-0 z-1 h-[280px]"
        style={{
          background:
            "linear-gradient(180deg, transparent, color-mix(in oklab, var(--color-ink) 88%, transparent) 78%)",
        }}
      />

      <div className="relative z-2 flex max-w-[1120px] flex-col items-center gap-[clamp(22px,3vw,34px)]">
        <div
          data-reveal
          className="ohq-reveal flex items-center gap-[10px] rounded-full border border-veil/10 bg-veil/2 py-[7px] pr-[14px] pl-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted"
        >
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-positive" />
          Opinion intelligence
        </div>

        <h1
          data-reveal
          className="ohq-reveal m-0 font-display text-[clamp(2.9rem,7.4vw,6.6rem)] leading-[0.96] font-bold tracking-[-0.026em] text-balance text-cream-bright delay-[80ms] duration-[1150ms]"
        >
          What does everyone <em className="text-positive">really</em> think?
        </h1>

        <p
          data-reveal
          className="ohq-reveal m-0 max-w-[640px] text-[clamp(14px,1.05vw,16px)] leading-[1.5] font-light tracking-[-0.01em] text-pretty text-muted delay-[160ms] duration-[1100ms]"
        >
          See what people think about a subject, or force a straight choice
          between competing options — and see how the answer splits.
        </p>

        {/* Two calls to action, centred on their own row and wrapping to a
            vertical stack on narrow screens; the jump link goes underneath so it
            never pulls the group off centre.

            ONE SHAPE, TWO FILLS. Every button here shares `CTA` below — the
            same fixed width, the same height, the same padding, the same icon
            slot, the same centring — so the row is a set of three modes rather
            than three buttons that happen to sit together. Only the colour
            changes, and it changes for a reason: green is public measurement,
            and the other two carry the poll and private-guidance chrome used on
            their own sections, so the row reads as "two public, one private" at
            a glance.

            The width is fixed rather than intrinsic. Sized to content, the
            labels ("Explore opinions" vs "Participate in a poll") produce three
            different pills, and no amount of matching padding fixes that —
            equal padding around unequal text is still unequal buttons. */}
        {/* A grid rather than a wrapping flex row. Wrapping put two buttons on
            one line and orphaned the third underneath them the moment the
            viewport dropped below ~810px, which is the same misalignment in a
            different form. Three columns or one — never two and a stray. */}
        <div
          data-reveal
          className="ohq-reveal mt-1.5 grid w-full max-w-[548px] grid-cols-1 justify-items-center gap-[14px] delay-[240ms] duration-[1100ms] sm:grid-cols-2"
        >
          <CTA
            href="/topics"
            icon={<TopicsIcon />}
            className="bg-positive text-positive-ink transition-[background,box-shadow] hover:bg-[#25CC61] hover:shadow-[0_12px_44px_-8px_rgba(29,185,84,0.55)]"
          >
            Explore opinions
          </CTA>
          <CTA
            href="/polls"
            icon={<PollsIcon />}
            className="border border-poll/45 bg-poll/10 text-poll-soft transition-[background,border-color] hover:border-poll/70 hover:bg-poll/18"
          >
            Participate in a poll
          </CTA>
        </div>

        <p
          data-reveal
          className="ohq-reveal m-0 max-w-[540px] text-[13.5px] leading-[1.6] text-pretty text-dim delay-[270ms] duration-[1100ms]"
        >
          Measure what a crowd thinks, or force a choice between two — on films,
          brands, exams, colleges, policies and{" "}
          <strong className="font-medium text-soft">whatever is being argued about</strong>{" "}
          this week.
        </p>

        <a
          data-reveal
          href="#how"
          className="ohq-reveal inline-flex items-center gap-2 text-[14.5px] text-muted transition-colors delay-[300ms] duration-[1100ms] hover:text-cream"
        >
          How it works
          <span aria-hidden className="font-mono">
            ↓
          </span>
        </a>

        <div
          data-reveal
          className="ohq-reveal mt-[clamp(30px,5vw,62px)] flex flex-wrap justify-center gap-[clamp(20px,4vw,52px)] font-mono text-[11.5px] tracking-[0.1em] uppercase text-dim delay-[340ms] duration-[1100ms]"
        >
          <span>{topicCount} live topics</span>
          <span className="text-[#3A3A3A]">/</span>
          <span>{pollCount} open polls</span>
          <span className="text-[#3A3A3A]">/</span>
          <span>{formatNumber(voteCount)} votes cast</span>
        </div>
      </div>
    </section>
  );
}

/**
 * One hero call to action. Two of these make the row.
 *
 * Everything that decides the shape lives here rather than on each instance,
 * because "give them identical padding" is a promise that only survives if
 * there is one place to change it. Callers pass a destination, a glyph and a
 * fill — never a size, a radius or a padding.
 *
 * The height is explicit and the border is always present (transparent on the
 * filled one), so a variant that adds a visible border cannot make its button
 * 2px taller than its neighbours.
 */
function CTA({
  href,
  icon,
  className,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`ohq-press inline-flex h-[54px] w-full max-w-[252px] items-center justify-center gap-2.5 rounded-full border border-transparent px-6 text-[15.5px] font-semibold tracking-[-0.01em] duration-500 ease-ohq ${className}`}
    >
      <span aria-hidden className="grid shrink-0 place-items-center">
        {icon}
      </span>
      {children}
    </Link>
  );
}

/**
 * Glyphs for the two modes that had none.
 *
 * A row where one button carries an icon and two do not reads as one promoted
 * button and two afterthoughts, whatever the sizes say. Each of these is the
 * thing its section actually shows: measured bars for topics, and the split bar
 * for polls — the product's own signature element rather than a generic tick.
 *
 * House style: 24-unit box, 1.7 stroke,
 * round caps, no fill.
 */
function TopicsIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 20v-5.5M12 20V4.5M18 20v-9" />
    </svg>
  );
}

function PollsIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.8" y="9.2" width="18.4" height="5.6" rx="2.8" />
      <path d="M13.4 9.2v5.6" />
    </svg>
  );
}
