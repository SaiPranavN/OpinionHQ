"use client";

/**
 * A deck of the kinds of things people argue about here, dealt one at a time.
 *
 * The cards are stacked in depth behind the screen. Scrolling brings the front
 * one up and out of the way and the next one forward out of the deck, so the
 * section reads as a hand of subjects being dealt rather than as a list.
 *
 * ── These are examples, and they say so ─────────────────────────────────────
 *
 * The first version dealt the live catalog, linked. That was the honest option
 * while the catalog was the point, and it stopped being the right one the
 * moment the section had to show breadth: everything published so far is
 * entertainment, because that is the one category seeded, so a deck of real
 * rows was a deck of films and shows under a heading promising exams, colleges
 * and phone launches.
 *
 * So the deck is a written set that covers the range, and the section is
 * explicit that it is showing kinds of subjects rather than open rows — with
 * the real counts stated underneath, next to the way in. Nothing here is a
 * link, because a card that looks clickable and is not is worse than one that
 * never offered.
 *
 * NO FIGURES, EVER. Titles, categories and the instrument, and nothing else —
 * no count, no percentage, no verdict. A subject line asserts nothing; a
 * subject line with a number beside it is a measurement, and a reader has no
 * way to know it came from a landing page rather than from a result. This site
 * has twice had to delete invented figures that read exactly like findings.
 */

import Link from "next/link";

import { ScrollScene } from "@/components/motion/ScrollScene";
import { DECK_DEPTH, dealAt, deckSeat } from "@/lib/motion/scene";

export interface DeckCard {
  title: string;
  category: string;
  kind: "topic" | "poll";
}

/**
 * The deck.
 *
 * Weighted the way the product is, not the way the seed data happens to be:
 * exams, colleges, tech and careers first, because those are the subjects
 * people in India argue about with something at stake, and two films at the end
 * rather than eight. Green measures a subject, purple forces a choice, and the
 * two alternate all the way down so neither reads as the main event.
 *
 * Products, formats, institutions and open questions — never a named private
 * individual. The politicians category exists and carries its own approval
 * notice for exactly that reason; a landing page is not the place to put a
 * person's name beside an invitation to judge them.
 */
const DECK: DeckCard[] = [
  { title: "Was the NEET UG paper set fairly this year?", category: "Exams", kind: "topic" },
  { title: "IIT or a top private university?", category: "Colleges", kind: "poll" },
  { title: "Opinion on the first foldable iPhone", category: "Technology", kind: "topic" },
  { title: "Coaching centre or self-study", category: "Exams", kind: "poll" },
  { title: "Is a CS degree still worth four years?", category: "Careers", kind: "topic" },
  { title: "Remote, hybrid or back to the office", category: "Careers", kind: "poll" },
  { title: "How good is the campus placement season?", category: "Colleges", kind: "topic" },
  { title: "Android or iPhone", category: "Technology", kind: "poll" },
  { title: "Should board exams be held twice a year?", category: "Exams", kind: "topic" },
  { title: "AI coding assistants: help or crutch?", category: "Technology", kind: "poll" },
  { title: "How good was the last big release?", category: "Entertainment", kind: "topic" },
  { title: "Theatre or streaming", category: "Entertainment", kind: "poll" },
];

export function MovingSubjects({
  topicCount,
  pollCount,
}: {
  topicCount: number;
  pollCount: number;
}) {
  return (
    <ScrollScene
      id="moving"
      // About a third of a screen per card, capped. The scenes on this page cost
      // a visitor real scrolling, so the budget is deliberate rather than
      // whatever felt good on one card. At this rate a card turns over in about
      // two wheel notches, which reads as dealing rather than as a queue.
      distance={Math.min(DECK.length * 0.28, 3.4)}
      // A phone has one thumb-flick per card rather than one notch, so the same
      // deck wants a little more room to avoid feeling flicked past.
      narrowDistance={Math.min(DECK.length * 0.34, 4)}
      className="relative border-t border-veil/5"
    >
      {({ progress, scrubbing, narrow }) => (
        <div
          className={`mx-auto flex max-w-[1200px] flex-col px-5 sm:px-10 lg:px-20 ${
            scrubbing
              ? "h-full justify-center pt-[var(--ohq-nav-h)] pb-6"
              : "py-[clamp(72px,11vw,140px)]"
          }`}
        >
          <div data-reveal className="ohq-reveal mx-auto max-w-[760px] text-center">
            <span className="ohq-eyebrow">What gets asked here</span>
            <h2 className="mt-3 mb-4 font-display text-[clamp(1.9rem,4.2vw,3.6rem)] leading-[1.04] font-bold tracking-[-0.025em] text-balance text-cream-bright">
              Moving <em>topics and polls.</em>
            </h2>
            <p className="m-0 text-[clamp(13.5px,1.1vw,15.5px)] leading-[1.6] font-light text-pretty text-muted">
              Examples of the kinds of subjects that move here — exam papers, campus
              placements, phone launches, career paths. Green measures how people feel
              about one; purple makes them pick a side.
            </p>
          </div>

          {scrubbing ? (
            <Deck progress={progress} narrow={narrow} />
          ) : (
            /* Reduced motion: the same cards as an ordinary responsive grid,
               half the deck, because a list is a list and the catalog is two
               taps away with search and filters on it. */
            <ul className="mx-auto mt-[clamp(30px,5vw,52px)] grid max-w-[900px] list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
              {DECK.slice(0, 6).map((card) => (
                <li key={card.title}>
                  <SubjectCard card={card} />
                </li>
              ))}
            </ul>
          )}

          {/* The real numbers, and the way in. The deck above makes no claim to
              be live; this line is where the live figures actually are. */}
          <div
            className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-3 ${
              scrubbing ? "mt-5" : "mt-10"
            }`}
          >
            <Link
              href="/topics"
              className="ohq-press rounded-full bg-positive px-6 py-2.5 text-[14px] font-semibold text-positive-ink duration-500 ease-ohq hover:bg-[#25CC61]"
            >
              Explore {topicCount} {topicCount === 1 ? "topic" : "topics"}
            </Link>
            <Link
              href="/polls"
              className="ohq-press rounded-full border border-poll/45 bg-poll/10 px-6 py-2.5 text-[14px] font-semibold text-poll-soft duration-500 ease-ohq hover:bg-poll/18"
            >
              Vote in {pollCount} {pollCount === 1 ? "poll" : "polls"}
            </Link>
          </div>
        </div>
      )}
    </ScrollScene>
  );
}

function Deck({ progress, narrow }: { progress: number; narrow: boolean }) {
  const at = dealAt(progress, DECK.length);
  const front = Math.min(DECK.length - 1, Math.max(0, Math.round(at)));

  return (
    <div className="mt-[clamp(22px,4vw,44px)] flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
      <div
        className="relative h-[min(280px,32svh)] w-full max-w-[560px]"
        style={{ perspective: narrow ? "900px" : "1200px" }}
      >
        {DECK.map((card, i) => {
          const k = i - at;
          if (Math.abs(k) > DECK_DEPTH) return null;
          const seat = deckSeat(k);
          if (seat.opacity <= 0.002) return null;

          return (
            <div
              key={card.title}
              aria-hidden={i !== front}
              className="absolute inset-x-0 top-1/2"
              style={{
                // Placed from its own centre, so the deck grows symmetrically
                // out of the middle of the box rather than hanging off its top.
                transform: `translateY(-50%) translateY(${seat.y.toFixed(1)}px) translateZ(${seat.z.toFixed(
                  1,
                )}px) rotateX(${seat.rotate.toFixed(2)}deg)`,
                opacity: seat.opacity,
                // Blur is the first thing to go on a phone: a stack of four
                // blurred layers is four full-screen raster passes a frame, and
                // it is the cheapest thing here to give up.
                filter: narrow || seat.blur === 0 ? "none" : `blur(${seat.blur.toFixed(2)}px)`,
                zIndex: 100 - Math.round(Math.abs(k) * 10),
                willChange: "transform, opacity",
              }}
            >
              <SubjectCard card={card} />
            </div>
          );
        })}
      </div>

      <p className="m-0 font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
        {front + 1} / {DECK.length}
      </p>
    </div>
  );
}

function SubjectCard({ card }: { card: DeckCard }) {
  const poll = card.kind === "poll";
  return (
    <div className="ohq-panel-raised flex flex-col gap-3 p-5 sm:p-6">
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
        <span>Example — not a live result</span>
      </span>
    </div>
  );
}
