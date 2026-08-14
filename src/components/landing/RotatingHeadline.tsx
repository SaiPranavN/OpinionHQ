"use client";

/**
 * The hero headline, rotating through four short statements of what the site is
 * for.
 *
 * THE POINT IS WHAT DOES *NOT* MOVE. A headline that swaps wholesale every three
 * seconds is a slideshow, and the eye treats it as an advertisement to wait out.
 * This keeps the text that is common to two phrases exactly where it is and
 * animates only the difference, so "…opinions" → "…opinion" drops a single
 * letter and "Know who's winning in polls" → "Participate in polls" leaves
 * "in polls" standing while three words are exchanged for one.
 *
 * HOW THE SHARED TEXT IS FOUND, since it is the whole trick:
 *
 *   1. Words are keyed by their position *from the right*, not the left. That is
 *      what makes `in polls` line up across two phrases of different lengths —
 *      keyed from the left, `in` would be word 4 in one phrase and word 2 in the
 *      other and would have nothing to anchor to.
 *
 *   2. A word that gains or loses a suffix against either neighbouring phrase is
 *      pre-split at that point, in *both* phrases. So "opinions" is rendered as
 *      "opinion" + "s" before the transition begins, and the transition then has
 *      an "s" it can drop on its own rather than a word it has to rebuild.
 *
 *   3. React keys are `slot + text`. Identical text at the same slot is the same
 *      element and simply persists; anything else unmounts and remounts. There
 *      is no diffing at animation time — the reconciler does it.
 *
 * The line re-centres as phrases change length, so text that persists still has
 * to travel. It does that with FLIP — measure before, measure after, apply the
 * inverse transform, release it — which is why unchanged words glide to their
 * new position instead of jumping while the changed ones roll.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Tone = "plain" | "opinion" | "poll";

interface Word {
  text: string;
  tone: Tone;
}

/**
 * Four statements, in the order they cycle.
 *
 * Ordered so that consecutive pairs actually share something: 1→2 shares the
 * stem "opinion", 3→4 shares "in polls". A rotation whose neighbours have
 * nothing in common would animate everything every time and none of the above
 * would be visible.
 */
const PHRASES: Word[][] = [
  [
    { text: "Explore", tone: "plain" },
    { text: "people’s", tone: "plain" },
    { text: "opinions", tone: "opinion" },
  ],
  [
    { text: "Give", tone: "plain" },
    { text: "your", tone: "plain" },
    { text: "opinion", tone: "opinion" },
  ],
  [
    { text: "Know", tone: "plain" },
    { text: "who’s", tone: "plain" },
    { text: "winning", tone: "plain" },
    { text: "in", tone: "plain" },
    { text: "polls", tone: "poll" },
  ],
  [
    { text: "Participate", tone: "plain" },
    { text: "in", tone: "plain" },
    { text: "polls", tone: "poll" },
  ],
];

/** How long a phrase sits still. Inside the 2.5–3.5s the brief asked for. */
const HOLD_MS = 3000;
const EXIT_MS = 420;
const ENTER_MS = 480;
const ENTER_DELAY_MS = 110;
/**
 * How long a surviving word takes to glide to its new position.
 *
 * Deliberately shorter than the roll, and deliberately not the sum of the two
 * phases — it was that at first, and a word taking a full second to slide
 * across the headline reads as lag rather than as motion.
 */
const GLIDE_MS = 460;

const TONE_COLOR: Record<Tone, string> = {
  plain: "var(--color-cream-bright)",
  opinion: "var(--color-positive)",
  poll: "var(--color-poll)",
};

/* ------------------------------------------------------------ the split */

function sharedPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

/**
 * Where two words stop agreeing, when they agree enough to be worth it.
 *
 * "opinions"/"opinion" share seven characters out of seven and are obviously
 * the same word. "who’s"/"winning" share a "w", which is a coincidence — and
 * anchoring on it would leave a lone letter hanging in the air while the rest
 * of both words swapped around it. Hence the floor: most of the shorter word,
 * and at least four characters.
 */
function stemCut(a: string, b: string): number | null {
  const n = sharedPrefix(a, b);
  if (n < 4 || n < Math.min(a.length, b.length) * 0.6) return null;
  return n;
}

interface Atom {
  /** Stable across phrases: slot from the right, plus which part of the word. */
  key: string;
  text: string;
  tone: Tone;
  /** First part of a word, so the renderer knows where the spaces go. */
  startsWord: boolean;
}

/**
 * One phrase, cut into the pieces its neighbours need it to be cut into.
 *
 * Both neighbours are consulted, not just the next one, because a phrase has to
 * arrive in the shape its predecessor left it in *and* leave in the shape its
 * successor expects. Splitting only forwards would make "opinions" a single
 * word on the way in and two on the way out, and the reconciler would see that
 * as the whole word being replaced.
 */
function atomsFor(index: number): Atom[] {
  const words = PHRASES[index]!;
  const prev = PHRASES[(index - 1 + PHRASES.length) % PHRASES.length]!;
  const next = PHRASES[(index + 1) % PHRASES.length]!;
  const out: Atom[] = [];

  words.forEach((word, i) => {
    // Counted from the right. See the note at the top of the file.
    const slot = words.length - 1 - i;
    const sameSlot = (list: Word[]) => list[list.length - 1 - slot];

    const cuts = new Set<number>();
    for (const neighbour of [sameSlot(prev), sameSlot(next)]) {
      if (!neighbour) continue;
      const cut = stemCut(word.text, neighbour.text);
      if (cut !== null && cut > 0 && cut < word.text.length) cuts.add(cut);
    }

    let from = 0;
    [...cuts, word.text.length]
      .sort((a, b) => a - b)
      .forEach((to, part) => {
        out.push({
          key: `s${slot}p${part}`,
          text: word.text.slice(from, to),
          tone: word.tone,
          startsWord: part === 0,
        });
        from = to;
      });
  });

  return out;
}

const ATOMS = PHRASES.map((_, i) => atomsFor(i));

/** What React reconciles on: same slot *and* same text is the same element. */
const idOf = (atom: Atom) => `${atom.key}:${atom.text}`;

/* ----------------------------------------------------------- the render */

interface Exiting {
  id: string;
  text: string;
  tone: Tone;
  left: number;
  top: number;
}

export function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState<Exiting[]>([]);
  const [reduced, setReduced] = useState(false);

  const rowRef = useRef<HTMLSpanElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const rects = useRef(new Map<string, DOMRect>());
  /** Ids that arrived in this render and have not been let go yet. */
  const entering = useRef(new Set<string>());

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /**
   * Advance, and hand the outgoing pieces their last known position first.
   *
   * They are measured here, while they are still in flow and still on screen.
   * A moment later they are absolutely positioned at those coordinates, which
   * takes them out of the layout — so the incoming phrase lays out as though
   * they were already gone and nothing has to shuffle around a corpse.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextIndex = (index + 1) % PHRASES.length;
      const staying = new Set(ATOMS[nextIndex]!.map(idOf));
      const row = rowRef.current?.getBoundingClientRect();

      const leaving: Exiting[] = [];
      if (row) {
        for (const atom of ATOMS[index]!) {
          const id = idOf(atom);
          if (staying.has(id)) continue;
          const node = nodes.current.get(id);
          if (!node) continue;
          const box = node.getBoundingClientRect();
          leaving.push({
            id,
            text: atom.text,
            tone: atom.tone,
            left: box.left - row.left,
            top: box.top - row.top,
          });
        }
      }

      setExiting(leaving);
      setIndex(nextIndex);
    }, HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [index]);

  /** Clear the departed once their animation has run. */
  useEffect(() => {
    if (exiting.length === 0) return;
    const timer = window.setTimeout(() => setExiting([]), EXIT_MS + 60);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  /**
   * FLIP for everything that stayed.
   *
   * The line is centred, so a phrase that gets shorter pulls every surviving
   * word rightwards even though nothing about those words changed. Without this
   * they would jump the moment the new phrase laid out, which is the exact
   * "the whole heading re-rendered" impression the component exists to avoid.
   */
  useLayoutEffect(() => {
    const previous = rects.current;
    const current = new Map<string, DOMRect>();

    for (const [id, node] of nodes.current) {
      const box = node.getBoundingClientRect();
      current.set(id, box);

      const before = previous.get(id);
      if (!before || reduced) continue;

      const dx = before.left - box.left;
      const dy = before.top - box.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

      // A word that changed line is not gliding anywhere. Two of the four
      // phrases wrap and two do not, so a survivor can move from the end of
      // line two to the middle of line one — animated, that is a word flying
      // diagonally across the headline, which looks like a bug and draws the
      // eye away from the words that are actually changing. It takes its new
      // position immediately instead, under cover of the roll happening beside
      // it.
      if (Math.abs(dy) > box.height * 0.5) {
        node.style.transition = "none";
        node.style.transform = "none";
        continue;
      }

      node.style.transition = "none";
      node.style.transform = `translate(${dx}px, ${dy}px)`;
      // Read once so the browser commits the inverted position before the
      // transition is attached; without it the two style writes coalesce and
      // nothing animates.
      void node.offsetWidth;
      node.style.transition = `transform ${GLIDE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
      node.style.transform = "translate(0, 0)";
    }

    rects.current = current;
  }, [index, reduced]);

  const atoms = ATOMS[index]!;

  return (
    <span
      className="relative grid w-full"
      style={{ perspective: reduced ? undefined : "900px" }}
    >
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
          key={i}
          aria-hidden
          className="col-start-1 row-start-1 block invisible text-balance"
          style={{ pointerEvents: "none" }}
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
        Centred in the reserved box on both axes.

        The box is as tall as the tallest phrase, which is two lines; three of
        the four phrases are one line. Sitting them at the top would leave a
        line of dead space underneath and read as a mistake — centred, the
        reservation is invisible.

        `text-balance` so the two-line phrase breaks as "Know who's winning /
        in polls" rather than stranding "polls" on a line of its own. It is on
        the ghosts too: they decide the reserved height, so they have to wrap
        the same way the real thing does.
      */}
      <span
        ref={rowRef}
        aria-hidden
        className="relative col-start-1 row-start-1 block self-center text-balance"
      >
        {atoms.map((atom, i) => {
          const id = idOf(atom);
          const isNew = !rects.current.has(id);
          if (isNew) entering.current.add(id);

          return (
            <span key={id}>
              {atom.startsWord && i > 0 ? " " : null}
              <span
                ref={(node) => {
                  if (node) nodes.current.set(id, node);
                  else nodes.current.delete(id);
                }}
                className="inline-block will-change-transform"
                style={{
                  color: TONE_COLOR[atom.tone],
                  transformOrigin: "50% 100%",
                  animation: isNew
                    ? reduced
                      ? `ohq-headline-fade ${ENTER_MS}ms ease both`
                      : `ohq-headline-in ${ENTER_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${ENTER_DELAY_MS}ms both`
                    : undefined,
                }}
              >
                {atom.text}
              </span>
            </span>
          );
        })}

        {/* The departing pieces, pinned where they were. Out of flow, so the
            arriving phrase lays out as if they had already gone. */}
        {exiting.map((piece) => (
          <span
            key={`out:${piece.id}`}
            aria-hidden
            className="pointer-events-none absolute inline-block will-change-transform"
            style={{
              left: piece.left,
              top: piece.top,
              color: TONE_COLOR[piece.tone],
              transformOrigin: "50% 0%",
              animation: reduced
                ? `ohq-headline-fade-out ${EXIT_MS}ms ease both`
                : `ohq-headline-out ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.7, 0.4) both`,
            }}
          >
            {piece.text}
          </span>
        ))}
      </span>
    </span>
  );
}
