"use client";

/**
 * A vertical index of the page, pinned to the right edge.
 *
 * A subject dashboard is long — the reading, the movement, the cross-tabs, the
 * vote panel and then the whole discussion — and until now the only way to
 * reach the bottom half was to scroll through the top half. The one shortcut
 * that existed was a "Go to discussions" button in the header, which is a
 * shortcut to exactly one place and only from the very top.
 *
 * IT LIVES IN THE PAGE'S OWN GUTTER, and the arithmetic is tight enough to be
 * worth writing down. The content is `max-w-[1320px]` centred with `lg:px-14`,
 * so from `lg` up there are exactly 56px of padding either side. The rail is
 * 42px wide — 32px buttons, 4px padding, 1px border each side — sitting 6px
 * from the edge, so it occupies 6..48px and clears the content by 8px at 1280
 * and by more at every width above it.
 *
 * Built at 50px first, which overlapped the right-hand panel by two pixels at
 * exactly 1280 and nowhere else — the width where `max-w` stops binding and the
 * gutter is at its narrowest. Measured rather than eyeballed for that reason.
 *
 * ── It is on phones now, and it does float over the content ─────────────────
 *
 * It used to be hidden below `lg`, on the argument that a phone has no gutter
 * to live in and a rail over the content is worse than no rail. Half of that
 * was right and the conclusion was not: a phone is where a five-screen
 * dashboard is *most* expensive to scroll through, and hiding the index there
 * meant the people who needed it most were the only ones who never got it.
 *
 * So below `lg` it shrinks instead of disappearing — 26px buttons in a 32px
 * pill, 4px from the edge, over a blurred translucent ground. The page's own
 * padding is 16px, so it sits over the outer ~16px of a card, which is inside
 * that card's own padding at every panel on both dashboards. What it costs is
 * a strip of empty card edge; what it buys is the bottom half of the page.
 *
 * The hover labels stay desktop-only. There is no hover on a touch screen, the
 * flyout would open leftward across the content it is meant to help you read,
 * and `aria-label` already names every button for anybody not looking at it.
 *
 * IT FOLLOWS AS WELL AS LEADS. An index that only jumps is half an index — the
 * useful half is knowing where you already are, which is why the effect below
 * tracks whichever section covers a reading line 40% down the viewport rather
 * than the first one on screen. "First on screen" would mark the discussion
 * active while the reader is still looking at the charts above it, because a
 * tall section enters the viewport long before it is what you are reading.
 */

import { useCallback, useEffect, useState } from "react";

export interface RailSection {
  /** The `id` on the section this jumps to. */
  id: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Set by the effect, read by the click handler.
 *
 * Module-scoped rather than a ref because there is exactly one rail on a page
 * and the alternative is threading a ref through two closures to carry a
 * single number.
 */
let railLock: ((until: number) => void) | null = null;

export function SectionRail({
  sections,
  accent = "var(--color-positive)",
}: {
  sections: RailSection[];
  /** The subject's own colour, so the rail belongs to this page. */
  accent?: string;
}) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    /**
     * Whichever section covers the reading line, 40% down the viewport.
     *
     * A PASSIVE SCROLL LISTENER, NOT AN INTERSECTION OBSERVER, and that is a
     * correction rather than a preference. The observer version was written
     * twice and wrong twice: first with `-45% 0px -55% 0px`, which sums to
     * exactly -100% and collapses the root to a zero-height line that nothing
     * can ever intersect; then with a 5% band, which is correct and still
     * leaves the active section decided by *when the browser chooses to deliver
     * a callback*. Both failures looked identical from the outside — a rail
     * that moved when clicked and never moved when scrolled — because pressing
     * a button sets the state directly.
     *
     * This reads the same five rectangles and answers the same question, with
     * no margin arithmetic to get wrong and nothing to schedule. Five rect
     * reads on a scroll that is already recalculating layout is not a cost
     * worth optimising, and the guard below keeps it to ten a second.
     */
    /**
     * The reading line sits just under the fixed nav, not at 40% of the screen.
     *
     * A PROPORTION IS WRONG FOR A PAGE OF UNEQUAL PANELS. Sections land at
     * `scroll-mt` — 96px, the nav plus a gap — when jumped to, so for the rail
     * to agree with the button that was just pressed, the line has to fall
     * inside a section that *starts* at 96. At 40% of an 812px phone that is
     * 325px, and the verified-updates panel is 177px tall: jumping to it put
     * the line 52px past its bottom edge and lit up the section below. Caught
     * on the deployed page, on the one topic that has a short panel.
     *
     * `navH + 72` is about 150px, which is inside anything taller than a
     * heading, and is also the honest answer to "where am I" — the first thing
     * under the bar is what you are reading.
     */
    const OFFSET = 72;
    let last = 0;
    let locked = 0;

    const measure = () => {
      // A click sets the active section directly and then scrolls. Without
      // this the scroll it triggers immediately overrules the press, which on
      // a short section means the rail lights up a different entry than the
      // one you pressed.
      if (Date.now() < locked) return;
      const navH =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--ohq-nav-h"),
        ) || 0;
      const line = navH + OFFSET;
      let best = "";
      let bestDistance = Infinity;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        // Zero when the line falls inside the section; otherwise how far it
        // is from the nearer edge, so a gap between two panels resolves to
        // whichever one the reader is closer to rather than to neither.
        const distance =
          rect.top > line
            ? rect.top - line
            : rect.bottom < line
              ? line - rect.bottom
              : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = node.id;
        }
      }
      if (best) setActive(best);
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - last < 100) return;
      last = now;
      measure();
    };

    measure();
    // Exposed so the click handler can hold the rail on the section the reader
    // actually chose until the scroll has settled.
    railLock = (until: number) => {
      locked = until;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  const go = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Held for the length of the scroll, so the measurements taken on the way
    // there cannot overrule the section that was actually pressed.
    railLock?.(Date.now() + (reduce ? 120 : 900));
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Set immediately rather than waiting to arrive. A smooth scroll takes most
    // of a second, and a rail that only lights up at the end reads as a button
    // that did not register the press.
    setActive(id);
  }, []);

  return (
    <nav
      aria-label="Sections on this page"
      className="fixed top-1/2 right-1 z-40 -translate-y-1/2 lg:right-1.5"
    >
      <ul className="m-0 flex list-none flex-col items-center gap-0.5 rounded-full border border-veil/10 bg-surface/80 p-[3px] backdrop-blur-[10px] lg:gap-1 lg:p-1">
        {sections.map((section) => {
          const on = active === section.id;
          return (
            <li key={section.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => go(section.id)}
                aria-current={on ? "true" : undefined}
                aria-label={`Jump to ${section.label}`}
                className="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-full transition-[background,color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 lg:h-8 lg:w-8"
                style={{
                  color: on ? accent : "var(--color-dim)",
                  background: on
                    ? `color-mix(in oklab, ${accent} 14%, transparent)`
                    : "transparent",
                }}
              >
                {section.icon}
              </button>

              {/* The name, on hover or keyboard focus. The icons carry the
                  meaning once you know the page; the label is what makes them
                  learnable the first time, and `aria-label` above covers
                  anybody who never sees it. */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-[calc(100%+10px)] hidden rounded-full border border-veil/10 bg-surface-raised px-2.5 py-1 text-[11.5px] whitespace-nowrap text-soft opacity-0 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 lg:block"
              >
                {section.label}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------- icons */
/* 18px, 1.6 stroke, drawn on the same 24-box as the rest of the product's
   glyphs so they sit at the same visual weight as the nav and card icons. */

const box = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ResultIcon() {
  return (
    <svg {...box} aria-hidden>
      <path d="M12 3a9 9 0 1 1-9 9" />
      <path d="M12 3v9h9" />
    </svg>
  );
}

export function VerifiedIcon() {
  return (
    <svg {...box} aria-hidden>
      <path d="m9 12 2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function AudienceIcon() {
  return (
    <svg {...box} aria-hidden>
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M21 19v-1a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function VoteIcon() {
  return (
    <svg {...box} aria-hidden>
      <path d="M8 11.5 11 14.5 17 8.5" />
      <path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4z" />
    </svg>
  );
}

export function DiscussionIcon() {
  return (
    <svg {...box} aria-hidden>
      <path d="M20 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
    </svg>
  );
}
