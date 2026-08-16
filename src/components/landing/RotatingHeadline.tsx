"use client";

/**
 * The hero headline, rotating through four short statements of what the site is
 * for.
 *
 * THE WHOLE LINE TURNS OVER. An earlier version kept text that two consecutive
 * phrases had in common anchored in place and animated only the difference —
 * "opinions" → "opinion" shed a single letter, and "in polls" stood still while
 * the words in front of it were exchanged. That was removed on purpose: the
 * phrase now leaves as one thing and the next arrives as one thing.
 *
 * What went with it is worth naming, because it was the bulk of this file and
 * should not creep back in by accident: words keyed by their slot from the
 * right, character-level stem splitting so a plural could drop its "s" alone,
 * and a FLIP pass that measured every survivor before and after so it could
 * glide to its new position. None of that is needed when nothing survives —
 * there is no "before" to compare against, so there is nothing to reconcile.
 *
 * What is left is two layers in one grid cell: the phrase on its way out and
 * the phrase on its way in, each laying out independently in the same box. That
 * is also why nothing here measures a position — the outgoing layer renders
 * exactly where it already was because it is in the same cell, centred the same
 * way, rather than being pinned to coordinates read off the DOM. Every bug this
 * component has had came from measuring; there is now nothing to measure.
 */

import { useEffect, useState } from "react";

type Tone = "plain" | "opinion" | "poll";

interface Word {
  text: string;
  tone: Tone;
}

/**
 * The subject list every phrase ends on.
 *
 * Shared rather than repeated, because it is the same nine words three times
 * and the one thing that must not drift between them: the phrases differ only
 * in their opening clause, so a typo in one copy would show up as a flicker
 * every nine seconds and nowhere else.
 *
 * "more !!" carries a non-breaking space. The words are laid out as separate
 * inline blocks and a normal space there lets a narrow viewport strand the two
 * exclamation marks alone on the last line.
 */
const SUBJECTS: Word[] = [
  { text: "on", tone: "plain" },
  { text: "movies,", tone: "plain" },
  { text: "sports,", tone: "plain" },
  { text: "politics,", tone: "plain" },
  { text: "tech", tone: "plain" },
  { text: "and", tone: "plain" },
  { text: "many", tone: "plain" },
  { text: "more !!", tone: "plain" },
];

/**
 * "Pick a side" is the poll half now, and it is purple for that reason.
 *
 * The colour language is the product's, not this component's: green is a
 * measured opinion and purple is a forced choice, everywhere on the site. The
 * phrase changed; what it refers to did not.
 */
const PHRASES: Word[][] = [
  [
    { text: "Explore", tone: "plain" },
    { text: "people’s", tone: "plain" },
    { text: "opinions", tone: "opinion" },
    ...SUBJECTS,
  ],
  [
    { text: "Give", tone: "plain" },
    { text: "your", tone: "plain" },
    { text: "opinion", tone: "opinion" },
    ...SUBJECTS,
  ],
  [
    { text: "Pick", tone: "poll" },
    { text: "a", tone: "poll" },
    { text: "side", tone: "poll" },
    ...SUBJECTS,
  ],
];

/** How long a phrase sits still. Inside the 2.5–3.5s the brief asked for. */
const HOLD_MS = 3000;

/**
 * The roll.
 *
 * Arriving takes half as long again as leaving, because it has the settle on
 * the end of it — the departure only has to accelerate away and can be brisk.
 * Leaving starts first so the space is already clearing as the replacement
 * swings up into it.
 */
const EXIT_MS = 460;
const ENTER_MS = 760;
const ENTER_DELAY_MS = 150;

/**
 * Per-word offset, so the line turns over as a wave rather than a slab.
 *
 * The whole phrase goes now, but it does not have to go rigidly. Five words
 * hinging in perfect unison reads as one panel flipping; forty milliseconds
 * apart and the same motion becomes a drum rolling across the headline. Set
 * this to 0 for a single hard flip — it is the only thing between the two.
 */
const STAGGER_MS = 42;
const MAX_STAGGER_MS = 168;

const stagger = (i: number) => Math.min(i * STAGGER_MS, MAX_STAGGER_MS);

/** Long enough for the last word on the line to have finished leaving. */
const CLEAR_MS = EXIT_MS + MAX_STAGGER_MS + 60;

const TONE_COLOR: Record<Tone, string> = {
  plain: "var(--color-cream-bright)",
  opinion: "var(--color-positive)",
  poll: "var(--color-poll)",
};

export function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  /** The phrase on its way out, or null when nothing is leaving. */
  const [leaving, setLeaving] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLeaving(index);
      setIndex((i) => (i + 1) % PHRASES.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  /** Drop the outgoing layer once it has finished leaving. */
  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return (
    <span className="relative grid w-full">
      {/*
        Every phrase, stacked in the same grid cell and invisible.

        This is what reserves the space. The cell takes the width of the widest
        phrase and the height of the tallest — at whatever the viewport happens
        to be, including when one phrase wraps to two lines and another does
        not. A hardcoded min-height would be a guess that is wrong at some
        breakpoint, and reserving nothing would make the section below jump
        every three seconds.
      */}
      {PHRASES.map((phrase, i) => (
        <span
          key={`ghost-${i}`}
          aria-hidden
          className="pointer-events-none invisible col-start-1 row-start-1 block text-balance"
        >
          {phrase.map((word, j) => (
            <span key={j}>
              {j > 0 ? " " : null}
              {word.text}
            </span>
          ))}
        </span>
      ))}

      {/*
        Outgoing and incoming, in that same cell.

        Both are grid items in cell 1/1, so they stack and each lays out in the
        full box independently — which is what lets the leaving phrase render
        exactly where it was without anything measuring it.

        `key` carries the phrase index so React remounts on every change and the
        animations restart. Without it the element would be reused and the
        keyframes would never replay.
      */}
      {leaving !== null && leaving !== index ? (
        <Line key={`out-${leaving}`} phrase={PHRASES[leaving]!} mode="out" reduced={reduced} />
      ) : null}

      <Line key={`in-${index}`} phrase={PHRASES[index]!} mode="in" reduced={reduced} />
    </span>
  );
}

/**
 * One phrase, rolling in or out.
 *
 * Centred in the reserved box on both axes. The box is as tall as the tallest
 * phrase, which is two lines; the shorter phrases are one. Sitting them at the
 * top would leave a line of dead space underneath and read as a mistake —
 * centred, the reservation is invisible.
 *
 * `text-balance` so a two-line phrase breaks as "Know who's winning / in polls"
 * rather than stranding "polls" on a line of its own. The ghosts carry it too:
 * they decide the reserved height, so they have to wrap the same way.
 */
function Line({
  phrase,
  mode,
  reduced,
}: {
  phrase: Word[];
  mode: "in" | "out";
  reduced: boolean;
}) {
  const out = mode === "out";

  return (
    <span
      aria-hidden
      className={`col-start-1 row-start-1 block self-center text-balance ${
        out ? "pointer-events-none" : ""
      }`}
    >
      {phrase.map((word, i) => (
        <span key={i}>
          {i > 0 ? " " : null}
          <span
            className="inline-block [backface-visibility:hidden] [will-change:transform,opacity]"
            style={{
              color: TONE_COLOR[word.tone],
              // Leaving hinges on its bottom edge and tips away over the top;
              // arriving hinges on its top edge and swings up from below. Same
              // drum, same direction of spin. See globals.css.
              transformOrigin: out ? "50% 100%" : "50% 0%",
              animation: reduced
                ? out
                  ? "ohq-headline-fade-out 300ms ease both"
                  : "ohq-headline-fade 380ms ease both"
                : out
                  ? // Ease-in: it is being pulled around the drum, so it leaves
                    // faster than it started.
                    `ohq-headline-out ${EXIT_MS}ms cubic-bezier(0.5, 0, 0.85, 0.35) ${stagger(i)}ms both`
                  : // Linear, because the easing is already in the keyframes —
                    // the overshoot and settle are positions in time, and a
                    // curve on top of them would fight it.
                    `ohq-headline-in ${ENTER_MS}ms linear ${ENTER_DELAY_MS + stagger(i)}ms both`,
            }}
          >
            {word.text}
          </span>
        </span>
      ))}
    </span>
  );
}
