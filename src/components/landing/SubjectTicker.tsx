"use client";

/**
 * Examples of what people actually argue about here, cycling above the hero.
 *
 * WHAT IT REPLACED. This slot held a pill reading "Opinion intelligence" — a
 * category label for the product, above a headline that already says what the
 * product does. Two abstractions stacked on each other, and the first thing a
 * visitor met was the more abstract of the two. A concrete subject does the job
 * the label was trying to do and does it without asking anyone to decode a
 * phrase: "Pickleball vs Tennis" explains the site faster than any noun does.
 *
 * NO FIGURES HERE, EVER. These are subject lines and nothing else — no
 * percentage, no participant count, no verdict. A named subject with a number
 * beside it is a measurement, and an invented one on the landing page is how
 * this site once shipped a fabricated result. A title asserts nothing, and the
 * copy around it does not claim these are live.
 *
 * The colour of the dot is the instrument: green measures an opinion, purple
 * forces a choice. It is the same two-colour language the headline, the CTAs
 * and every chart on the site use, so the dot is teaching it in miniature
 * before the visitor has scrolled anywhere.
 */

import { useEffect, useState } from "react";

interface Subject {
  text: string;
  kind: "opinion" | "poll";
}

/**
 * Products, formats and open questions — never a named private individual.
 * The politicians category exists and carries its own approval notice for
 * exactly this reason; the hero is not the place to put a person's name beside
 * an invitation to judge them.
 */
const SUBJECTS: Subject[] = [
  { text: "Opinion on the iPhone Fold", kind: "opinion" },
  { text: "How good was The Odyssey?", kind: "opinion" },
  { text: "Pickleball vs Tennis", kind: "poll" },
  { text: "Is the four-day week worth it?", kind: "opinion" },
  { text: "Theatre or streaming", kind: "poll" },
  { text: "Was the exam paper fair?", kind: "opinion" },
  { text: "Remote, hybrid or office", kind: "poll" },
  { text: "Android or iPhone", kind: "poll" },
];

/**
 * Faster than the headline, and not a divisor of it.
 *
 * The headline holds for 5500ms. At 2600 the two land together once every
 * couple of minutes instead of every other change — which matters, because two
 * things moving in unison read as one thing jolting.
 */
const HOLD_MS = 2600;
const OUT_MS = 380;
const IN_MS = 520;

const COLOR: Record<Subject["kind"], string> = {
  opinion: "var(--color-positive)",
  poll: "var(--color-poll)",
};

export function SubjectTicker() {
  const [index, setIndex] = useState(0);
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
      setIndex((i) => (i + 1) % SUBJECTS.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), OUT_MS + 40);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const current = SUBJECTS[index]!;

  return (
    <div
      data-reveal
      className="ohq-reveal flex items-center gap-2.5 rounded-full border border-veil/10 bg-veil/2 py-[9px] pr-[18px] pl-[14px]"
    >
      {/* The dot carries the instrument, so it changes colour with the line
          rather than being decoration that happens to be green. */}
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500"
        style={{ background: COLOR[current.kind] }}
      />

      {/*
        One grid cell, every phrase stacked inside it and invisible.

        This is what reserves the width and the height. Sized to content, the
        pill would breathe in and out on every change — a 240px chip becoming a
        180px chip and back, eight times a minute, directly above the headline.
        The ghosts make the box as wide as the longest subject at whatever the
        viewport is, including when one of them wraps and the others do not.
      */}
      <span className="grid">
        {SUBJECTS.map((subject, i) => (
          <span
            key={`ghost-${i}`}
            aria-hidden
            className="pointer-events-none invisible col-start-1 row-start-1 text-[clamp(13px,1.15vw,15.5px)] font-medium tracking-[-0.01em] whitespace-nowrap"
          >
            {subject.text}
          </span>
        ))}

        {leaving !== null && leaving !== index ? (
          <Line key={`out-${leaving}`} subject={SUBJECTS[leaving]!} out reduced={reduced} />
        ) : null}
        <Line key={`in-${index}`} subject={current} reduced={reduced} />
      </span>
    </div>
  );
}

/**
 * One subject, arriving or leaving.
 *
 * `aria-hidden` on both, with the whole set named once on the container below —
 * a line that changes every 2.6 seconds is a line a screen reader would
 * otherwise re-announce eight times a minute, at the top of the page.
 */
function Line({
  subject,
  out = false,
  reduced,
}: {
  subject: Subject;
  out?: boolean;
  reduced: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`col-start-1 row-start-1 self-center text-[clamp(13px,1.15vw,15.5px)] font-medium tracking-[-0.01em] whitespace-nowrap text-cream ${
        out ? "pointer-events-none" : ""
      }`}
      style={{
        animation: reduced
          ? out
            ? "ohq-headline-fade-out 220ms ease both"
            : "ohq-headline-fade 260ms ease both"
          : out
            ? `ohq-subject-out ${OUT_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
            : `ohq-subject-in ${IN_MS}ms cubic-bezier(0.16, 0.84, 0.34, 1) both`,
      }}
    >
      {subject.text}
    </span>
  );
}

/** What the ticker is, said once, for anything that does not watch it cycle. */
export const SUBJECT_TICKER_LABEL = `Examples of what gets asked here: ${SUBJECTS.map(
  (s) => s.text,
).join("; ")}`;
