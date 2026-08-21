/**
 * A heading whose characters land like the reels of a slot machine.
 *
 * Every letter is a vertical reel of decoy glyphs with the real one at the
 * bottom. The reels start together, run at slightly different lengths and land
 * left to right, so the line resolves as a run of characters snapping into
 * place rather than as one block of text arriving.
 *
 * ── The width bug, because it will come back if this is refactored ──────────
 *
 * The first version wrecked the spacing of every heading it touched — "Some
 * questions" rendered as "Some quest i ons", with narrow letters floating in
 * wide gaps. The cause was structural rather than a bad number: the reel cells
 * were block children of the clipped inline-block, so **the inline-block sized
 * itself to the widest cell in the reel** — which is a random decoy. An `i`
 * whose reel happened to contain a `W` occupied a `W`'s width, permanently, in
 * the finished heading.
 *
 * The fix is the ghost below. A hidden copy of the *real* character is the only
 * thing in normal flow, so the slot is exactly as wide as the letter it will
 * end on; the reel is taken out of flow on top of it and contributes no width
 * at all. Decoys wider than the real letter overflow and are clipped, which is
 * what a physical reel behind a window does anyway.
 *
 * ── The geometry is in the markup, not only in the stylesheet ───────────────
 *
 * `relative`, `absolute inset-x-0 top-0`, `invisible` and `text-center` say the
 * same thing as the hand-written rules in globals.css, and they are there
 * deliberately rather than redundantly. The first deploy of the width fix
 * shipped correct JS against a stale CSS chunk — the build cache served the
 * previous stylesheet, so the markup had a ghost element and the stylesheet had
 * never heard of it, and the headings went out with the spacing bug still in
 * them. Utilities that the stylesheet already contains cannot go stale that
 * way. The named rules stay because they are where the reasoning lives.
 *
 * ── It is a server component, and that is the interesting part ──────────────
 *
 * There is no `"use client"` here, no state, no effect and no observer. The
 * decoys are drawn from a seeded generator so the server and the client produce
 * the same markup; the spin is a CSS animation gated on the `[data-shown]` flag
 * that `RevealOnScroll` already sets when a block enters the viewport. One
 * observer for the whole page, and this costs nothing at runtime.
 *
 * ── What it looks like when nothing runs ────────────────────────────────────
 *
 * The reel's *resting* transform already shows the real characters, and the
 * keyframes end on exactly that transform. So the heading reads correctly with
 * JavaScript off, with the observer never firing, before hydration, to a
 * crawler, and under `prefers-reduced-motion` — and the animation, when it does
 * run, only ever travels away from the truth and back to it. The opposite
 * arrangement, resting on the first decoy and relying on the animation to
 * arrive, would put gibberish in an `<h2>` on every one of those paths.
 *
 * The accessible text is the plain string, carried on the heading by the
 * caller: a screen reader must never be handed forty single-character spans of
 * scrambled alphabet.
 */

import { Fragment } from "react";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

/** Deterministic, so server and client agree. Hashes the seed, then iterates. */
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * The alphabet a character spins through.
 *
 * Like for like: a capital spins through capitals, a digit through digits.
 * Punctuation gets no reel at all — a spinning full stop is a distraction with
 * nothing to say, and the commas and stops staying put are part of what makes
 * the letters read as landing.
 *
 * NARROW LETTERS SPIN THROUGH NARROW LETTERS. `i`, `l`, `t`, `j`, `f` and `r`
 * get their own pool, and it is not cosmetic: the reel is clipped to the real
 * letter's width, so an `i` whose decoys are all `M`s and `W`s spins a column of
 * letters with their sides cut off. Matching the rough width keeps the decoys
 * legible as letters, which is the whole illusion.
 */
const NARROW_LOWER = "ijltfr";
const NARROW_UPPER = "IJLTFE";

function alphabetFor(ch: string): string | null {
  if (NARROW_LOWER.includes(ch)) return NARROW_LOWER;
  if (NARROW_UPPER.includes(ch)) return NARROW_UPPER;
  if (LOWER.includes(ch)) return LOWER;
  if (UPPER.includes(ch)) return UPPER;
  if (DIGITS.includes(ch)) return DIGITS;
  return null;
}

/** Reel lengths. Varied so the line lands as a run rather than as a chord. */
const MIN_CELLS = 5;
const MAX_CELLS = 10;

/** Per-character start offset, and the ceiling it stops climbing at. */
const STAGGER_MS = 34;
const MAX_STAGGER_MS = 560;

const SPIN_MS = 700;

export interface SlotMachineTextProps {
  /** The finished line. Also what the caller should put in the accessible name. */
  text: string;
  /**
   * Shifts every reel's start. Lets two headings on one screen land in sequence
   * rather than together.
   */
  delayMs?: number;
  /** Height of one reel cell. Defaults to one line box of the heading. */
  cell?: string;
  className?: string;
}

export function SlotMachineText({
  text,
  delayMs = 0,
  cell = "1lh",
  className = "",
}: SlotMachineTextProps) {
  // Split on spaces and keep the words whole. Each word is an inline-block so a
  // line can never break inside one — the reels are inline-blocks themselves,
  // and without this a heading would happily wrap between two letters of the
  // same word. The spaces between words stay real spaces, so the block still
  // breaks and balances exactly where it did before.
  const words = text.split(" ");
  let charIndex = 0;

  return (
    <span
      aria-hidden
      className={className}
      style={{ ["--ohq-slot-cell" as string]: cell }}
    >
      {words.map((word, w) => {
        const node = (
          <span className="inline-block whitespace-nowrap">
            {[...word].map((ch, c) => {
              const i = charIndex++;
              const alphabet = alphabetFor(ch);
              if (!alphabet) return <Fragment key={c}>{ch}</Fragment>;

              const rand = rng(i * 31 + ch.charCodeAt(0));
              const cells = MIN_CELLS + Math.floor(rand() * (MAX_CELLS - MIN_CELLS));
              const decoys = Array.from(
                { length: cells - 1 },
                () => alphabet[Math.floor(rand() * alphabet.length)] ?? ch,
              );

              return (
                <span key={c} className="ohq-slot relative">
                  {/*
                    The only thing in normal flow. It is the real character, so
                    the slot is exactly the width that character will occupy —
                    see the note at the top of this file for what happens when
                    the reel is allowed to decide the width instead.
                  */}
                  <span className="ohq-slot-ghost invisible">{ch}</span>
                  <span
                    className="ohq-slot-reel absolute inset-x-0 top-0"
                    style={{
                      // Negative: the reel travels upward, the same direction
                      // the hero's drum turns. The resting transform is this
                      // same value, which is why the real character is what
                      // shows when nothing is animating.
                      ["--ohq-slot-travel" as string]: `calc(var(--ohq-slot-cell) * -${cells - 1})`,
                      animationDelay: `${delayMs + Math.min(i * STAGGER_MS, MAX_STAGGER_MS)}ms`,
                      animationDuration: `${SPIN_MS}ms`,
                    }}
                  >
                    {decoys.map((decoy, d) => (
                      <span key={d} className="ohq-slot-cell text-center">
                        {decoy}
                      </span>
                    ))}
                    <span className="ohq-slot-cell text-center">{ch}</span>
                  </span>
                </span>
              );
            })}
          </span>
        );
        charIndex++; // the space between words keeps the stagger walking evenly
        return (
          <Fragment key={`w-${w}`}>
            {node}
            {w === words.length - 1 ? null : " "}
          </Fragment>
        );
      })}
    </span>
  );
}
