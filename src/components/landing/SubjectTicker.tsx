"use client";

/**
 * Examples of what people actually argue about here, rolling above the hero.
 *
 * WHAT IT REPLACED. This slot held a pill reading "Opinion intelligence" — a
 * category label for the product, above a headline that already says what the
 * product does. Two abstractions stacked on each other, and the first thing a
 * visitor met was the more abstract of the two. A concrete subject does the job
 * the label was trying to do without asking anyone to decode a phrase:
 * "Pickleball vs Tennis" explains the site faster than any noun does.
 *
 * NO FIGURES HERE, EVER. These are subject lines and nothing else — no
 * percentage, no participant count, no verdict. A named subject with a number
 * beside it is a measurement, and an invented one on the landing page is how
 * this site once shipped a fabricated result. A title asserts nothing, and the
 * copy around it does not claim these are live.
 *
 * THE DOT RIDES THE DRUM. It used to sit outside the roller and cross-fade its
 * colour on a 500ms transition while the line underneath it turned over — so
 * for half a second the pill showed one subject's text beside the next
 * subject's instrument. It is part of the face now: green measures an opinion,
 * purple forces a choice, and the dot arrives with the line it belongs to.
 */

import { CylinderRoller } from "@/components/motion/CylinderRoller";
import { SPRING } from "@/lib/motion/spring";

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
 * 1.8 seconds, from the animation brief, and it fits here.
 *
 * These are four- and five-word lines: read in well under a second, and the
 * pill pauses the moment a pointer touches it. The headline below runs at 5.5s
 * for the opposite reason — see RotatingHeadline. The two are deliberately not
 * divisors of each other, so they land together once in a long while rather
 * than every third change; two things moving in unison read as one thing
 * jolting.
 */
const HOLD_MS = 1800;

const COLOR: Record<Subject["kind"], string> = {
  opinion: "var(--color-positive)",
  poll: "var(--color-poll)",
};

function subjectNode(subject: Subject) {
  return (
    <span className="flex h-full items-center justify-center gap-2.5">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: COLOR[subject.kind] }}
      />
      <span className="whitespace-nowrap">{subject.text}</span>
    </span>
  );
}

export function SubjectTicker() {
  return (
    <div
      data-reveal
      className="ohq-reveal flex items-center rounded-full border border-veil/10 bg-veil/2 px-[15px] py-[9px]"
    >
      <CylinderRoller
        items={SUBJECTS.map(subjectNode)}
        holdMs={HOLD_MS}
        // Tighter than the headline's drum and clipped flush to the line. There
        // is no room inside a pill to show a neighbour curving away, so this one
        // reads as an odometer rather than as a barrel — which is the right
        // register for something this size.
        step={34}
        perspective={520}
        peek={0}
        blurPx={3}
        spring={SPRING.chip}
        // A pill is a small target, so the scroll dead-zone that a real touch
        // gesture costs is small too. The headline cannot afford the same trade.
        drag="always"
        faceClassName="text-[clamp(13px,1.15vw,15.5px)] font-medium tracking-[-0.01em] text-cream"
        label={SUBJECT_TICKER_LABEL}
      />
    </div>
  );
}

/** What the ticker is, said once, for anything that does not watch it cycle. */
export const SUBJECT_TICKER_LABEL = `Examples of what gets asked here: ${SUBJECTS.map(
  (s) => s.text,
).join("; ")}`;
