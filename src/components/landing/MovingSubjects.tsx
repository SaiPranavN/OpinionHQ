"use client";

/**
 * A deck of what is actually open right now, dealt one card at a time.
 *
 * The cards are stacked in depth behind the screen. Scrolling brings the front
 * one up and out of the way and the next one forward out of the deck, so the
 * section reads as a hand of subjects being dealt rather than as a list.
 *
 * ── These are real, and that is the whole point ─────────────────────────────
 *
 * Every card is a published topic or poll, passed down from the page's own
 * queries and linked to its page. The obvious way to build this section was a
 * hardcoded list of appealing-sounding subjects, and it would have been a
 * mistake: the section is headed "moving right now", the site has twice shipped
 * invented content that read as real, and a deck of plausible titles that go
 * nowhere is the same failure in a friendlier costume. If the catalog is thin
 * the deck is thin, and if it is empty the section does not render at all.
 *
 * NO FIGURES. Titles, categories and the instrument, and nothing else — no
 * count, no percentage, no verdict. A subject line asserts nothing; a subject
 * line with a number beside it is a measurement, and the reader has no way to
 * know it came from a landing page rather than from a result.
 */

import Link from "next/link";

import { ScrollScene } from "@/components/motion/ScrollScene";
import { SlotMachineText } from "@/components/motion/SlotMachineText";
import { DECK_DEPTH, dealAt, deckSeat } from "@/lib/motion/scene";

export interface DeckCard {
  href: string;
  title: string;
  category: string;
  place: string;
  kind: "topic" | "poll";
}

const HEADING = "Moving topics and polls.";

export function MovingSubjects({ cards }: { cards: DeckCard[] }) {
  // A deck of one is not a deck, and the animation would have nothing to do.
  if (cards.length < 3) return null;

  return (
    <ScrollScene
      id="moving"
      /* About a third of a screen per card, capped.
         The three pinned scenes on this page cost a visitor real scrolling —
         together they roughly double the length of the landing page — so the
         budget is deliberate rather than whatever felt good on one card. At
         this rate a card turns over in about two wheel notches, which is fast
         enough that the deck reads as dealing rather than as a queue. */
      distance={Math.min(cards.length * 0.28, 3.4)}
      className="relative border-t border-veil/5 px-5 sm:px-10 lg:px-20"
    >
      {({ progress, scrubbing }) => (
        <div
          className={`mx-auto max-w-[1200px] ${
            scrubbing
              ? "flex min-h-svh flex-col justify-center pt-[var(--ohq-nav-h)] pb-10"
              : "py-[clamp(72px,11vw,140px)]"
          }`}
        >
          <div data-reveal className="ohq-reveal mx-auto max-w-[760px] text-center">
            <span className="ohq-eyebrow">Open right now</span>
            <h2
              aria-label={HEADING}
              className="mt-4 mb-5 font-display text-[clamp(2.1rem,4.2vw,3.6rem)] leading-[1.06] font-bold tracking-[-0.025em] text-balance text-cream-bright"
            >
              <SlotMachineText text={HEADING} />
            </h2>
            <p className="m-0 text-[15.5px] leading-[1.6] font-light text-pretty text-muted">
              Everything below is live and takes a vote. Green measures how people feel
              about a subject; purple makes them pick one.
            </p>
          </div>

          {scrubbing ? (
            <Deck cards={cards} progress={progress} />
          ) : (
            /* The phone and reduced-motion layout: the same cards as an ordinary
               responsive grid. No deck, no depth, nothing pinned — a stack that
               deals on scroll is a stack that has taken the scroll gesture, and
               on a small screen that gesture is also how somebody gets past a
               section they are not interested in.

               HALF THE DECK, and only here. Twelve cards in one column is about
               1,800px of phone scrolling in the middle of a landing page, which
               is a catalog rather than a taste of one — and there is a catalog,
               two taps away, with search and filters on it. The deck can afford
               all twelve because it deals them in place. */
            <ul className="mx-auto mt-[clamp(30px,5vw,52px)] grid max-w-[900px] list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
              {cards.slice(0, 6).map((card, i) => (
                <li
                  key={card.href}
                  data-reveal
                  className="ohq-reveal"
                  style={{ transitionDelay: `${Math.min(i * 50, 400)}ms` }}
                >
                  <SubjectCard card={card} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ScrollScene>
  );
}

function Deck({ cards, progress }: { cards: DeckCard[]; progress: number }) {
  // The deal position. Held a fraction short of the last card so the deck stops
  // with something on the table rather than emptying itself at the very bottom
  // of the scene and leaving the reader looking at nothing.
  const at = dealAt(progress, cards.length);
  const front = Math.min(cards.length - 1, Math.max(0, Math.round(at)));

  return (
    <div className="mt-[clamp(30px,5vw,54px)] flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <div
        className="relative h-[min(300px,34svh)] w-full max-w-[560px]"
        style={{ perspective: "1200px" }}
      >
        {cards.map((card, i) => {
          const k = i - at;
          if (Math.abs(k) > DECK_DEPTH) return null;
          const seat = deckSeat(k);
          if (seat.opacity <= 0.002) return null;

          return (
            <div
              key={card.href}
              aria-hidden={i !== front}
              className="absolute inset-x-0 top-1/2"
              style={{
                // The card is placed from its own centre, so the deck grows
                // symmetrically out of the middle of the box rather than
                // hanging off its top edge.
                transform: `translateY(-50%) translateY(${seat.y.toFixed(1)}px) translateZ(${seat.z.toFixed(
                  1,
                )}px) rotateX(${seat.rotate.toFixed(2)}deg)`,
                opacity: seat.opacity,
                filter: seat.blur === 0 ? "none" : `blur(${seat.blur.toFixed(2)}px)`,
                // Only the card at the front takes a click. Behind it are up to
                // three more links stacked in the same place, and a deck where
                // the wrong one is followed is worse than one that is not
                // clickable at all.
                pointerEvents: i === front ? "auto" : "none",
                zIndex: 100 - Math.round(Math.abs(k) * 10),
                willChange: "transform, opacity",
              }}
            >
              <SubjectCard card={card} />
            </div>
          );
        })}
      </div>

      <p aria-live="off" className="m-0 font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
        {front + 1} / {cards.length}
      </p>
    </div>
  );
}

function SubjectCard({ card }: { card: DeckCard }) {
  const poll = card.kind === "poll";
  return (
    <Link
      href={card.href}
      className={`ohq-panel-raised flex flex-col gap-3 p-5 transition-[border-color,background] duration-300 sm:p-6 ${
        poll ? "hover:border-poll/40" : "hover:border-positive/40"
      }`}
    >
      <span
        className={`flex items-center gap-2.5 font-mono text-[9.5px] tracking-[0.14em] uppercase ${
          poll ? "text-poll-soft" : "text-positive-light"
        }`}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${poll ? "bg-poll" : "bg-positive"}`}
        />
        {poll ? "Pick a side" : "Give your opinion"}
      </span>

      <h3 className="font-display m-0 text-[clamp(1.05rem,1.9vw,1.4rem)] leading-[1.25] font-semibold tracking-[-0.015em] text-balance text-cream-bright">
        {card.title}
      </h3>

      <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-line pt-3 text-[11.5px] text-dim">
        <span>{card.category}</span>
        <span aria-hidden>·</span>
        <span>{card.place}</span>
      </span>
    </Link>
  );
}
