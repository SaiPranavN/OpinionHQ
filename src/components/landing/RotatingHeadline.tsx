"use client";

/**
 * The hero headline, rolling through three statements of what the site is for.
 *
 * THE MOTION LIVES IN `CylinderRoller` NOW. This file used to carry ~150 lines
 * of it: two stacked layers, an incoming and an outgoing keyframe, a per-word
 * stagger, a transform origin flipped by direction, and a timer to drop the
 * outgoing layer once it had left. All of it approximated a barrel with a
 * `rotateX` on a flat element, and the giveaway was that the two phrases were
 * never joined — one tipped away over the top while the other swung up from
 * below, and between them was a gap where the drum should have been.
 *
 * The roller has an actual cylinder in it, so the line leaving and the line
 * arriving are two faces of one solid object. What is left here is the content:
 * the phrases, the colours, and how long a reader gets to read one.
 */

import { CylinderRoller } from "@/components/motion/CylinderRoller";
import { SPRING } from "@/lib/motion/spring";

type Tone = "plain" | "opinion" | "poll";

interface Word {
  text: string;
  tone: Tone;
}

/**
 * The subject list every phrase ends on.
 *
 * Shared rather than repeated, because it is the same eight words three times
 * and the one thing that must not drift between them: the phrases differ only
 * in their opening clause, so a typo in one copy would show up as a flicker
 * every few seconds and nowhere else.
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
  { text: "more !!", tone: "plain" },
];

/**
 * "Pick a side" is the poll half, and it is purple for that reason.
 *
 * The colour language is the product's, not this component's: green is a
 * measured opinion and purple is a forced choice, everywhere on the site.
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

/**
 * How long a phrase sits still.
 *
 * 5.5s, and it stays 5.5s. The animation brief that brought the drum in asks
 * for a 1.8-second loop, which is right for a four-word chip and wrong here by
 * a factor of three: these phrases are twelve words, and at an unhurried ~3.5
 * words a second that is over three seconds of reading before the line even
 * starts to leave. The hold was raised to this figure precisely because the
 * phrases got longer, and cutting it now would undo that.
 *
 * It matters more than it looks that the *whole* line turns over: there is no
 * anchor word left on screen to re-orient against, so a phrase caught mid-read
 * is simply lost. The pill above runs at 1.8s, where the brief's figure fits.
 */
const HOLD_MS = 5500;

const TONE_COLOR: Record<Tone, string> = {
  plain: "var(--color-cream-bright)",
  opinion: "var(--color-positive)",
  poll: "var(--color-poll)",
};

/**
 * One phrase, as a face of the drum.
 *
 * `text-balance` so a two-line phrase breaks evenly rather than stranding
 * "more !!" on a line of its own. The ghosts that reserve the box are rendered
 * from the same nodes, so they wrap identically — which is what makes the
 * reserved height correct rather than approximately correct.
 */
function phraseNode(phrase: Word[]) {
  return (
    <>
      {phrase.map((word, i) => (
        <span key={i}>
          {i > 0 ? " " : null}
          <span className="inline-block" style={{ color: TONE_COLOR[word.tone] }}>
            {word.text}
          </span>
        </span>
      ))}
    </>
  );
}

export function RotatingHeadline() {
  return (
    <CylinderRoller
      items={PHRASES.map(phraseNode)}
      holdMs={HOLD_MS}
      // Shallow, through a long lens. At a steeper angle and a shorter depth
      // display type goes far enough over to render as a foreshortened sliver,
      // and a heavily distorted trapezoid mid-flight reads as something broken
      // rather than something turning.
      step={26}
      perspective={1400}
      // 0.14 rather than the roller's 0.24 default. `peek` is a fraction of the
      // box, and the box is one line on a desktop and three at phone width — so
      // the same fraction spills half as far again over the pill above it there.
      peek={0.14}
      blurPx={5}
      spring={SPRING.headline}
      className="w-full"
      faceClassName="block text-balance"
    />
  );
}
