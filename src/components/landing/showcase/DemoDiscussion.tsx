"use client";

/**
 * What people write, and where it goes.
 *
 * The half of the product the landing page never showed. A reading is the
 * output; this is the input — and the two formats are the point of the panel:
 *
 *   Topic  — a written opinion carries the author's position as a chip, sits in
 *            one list with the structured Pro format, and has replies threaded
 *            underneath it rather than piled at the bottom of the page.
 *   Poll   — reasons are grouped by which option the writer picked, in two
 *            columns of equal width, so neither side reads as the default.
 *
 * NOBODY IS INVENTED HERE. Every card is attributed to "Participant" and a
 * position, never to a name or an avatar, and no card carries a like count. A
 * landing page with five plausible names and five plausible engagement numbers
 * on it is a landing page with five users who do not exist — which is the line
 * AGENTS.md draws, and it does not move because the pixels would look better on
 * the other side of it.
 */

import { useState } from "react";

import {
  POLL_OPTIONS,
  SAMPLE_OPINIONS,
  SAMPLE_REASONS,
  SENTIMENT_ROWS,
  type Mode,
  type SampleOpinion,
} from "@/components/landing/showcase/data";

/**
 * The composer, shown rather than described.
 *
 * "How do users contribute" has a one-line answer — they vote, and then they
 * may write — and the box is the answer. It is inert on purpose: an enabled
 * textarea on a landing page invites somebody to type a real opinion into a
 * form that will silently throw it away, which is a worse experience than not
 * offering the box at all. `readOnly` and a caption that says where the writing
 * would go.
 */
function Composer({
  stance,
  placeholder,
  note,
  chips,
}: {
  stance: string;
  placeholder: string;
  note: string;
  chips: string[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-dashed border-veil/14 bg-surface-sunken p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-dim">
          Your contribution
        </span>
        <span className="ohq-pill border-veil/12 text-dim">
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase">voted</span>
          <span className="font-medium text-soft">{stance}</span>
        </span>
      </div>

      <textarea
        readOnly
        rows={2}
        aria-label="Example composer — reading only"
        placeholder={placeholder}
        className="w-full resize-none rounded-[12px] border border-veil/10 bg-surface px-3.5 py-3 text-[13.5px] leading-[1.55] text-soft outline-none placeholder:text-dim focus-visible:ring-2 focus-visible:ring-positive/60"
      />

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span key={chip} className="ohq-pill border-veil/10 text-dim">
            {chip}
          </span>
        ))}
        <span className="ml-auto rounded-full bg-veil/8 px-4 py-1.5 text-[12.5px] font-semibold text-dim">
          Post
        </span>
      </div>

      <p className="m-0 text-[12px] leading-[1.55] text-dim">{note}</p>
    </div>
  );
}

/**
 * The position chip, read off the same three rows the donut draws.
 *
 * Derived rather than restated so a card can never label itself something the
 * chart above it does not recognise.
 */
const STANCE_ROW: Record<SampleOpinion["stance"], 0 | 1 | 2> = {
  Positive: 0,
  Neutral: 1,
  Negative: 2,
};

function stanceOf(stance: SampleOpinion["stance"]) {
  return SENTIMENT_ROWS[STANCE_ROW[stance]];
}

export function DemoDiscussion({ mode }: { mode: Mode }) {
  return mode === "topic" ? <Opinions /> : <Reasons />;
}

/* ------------------------------------------------------------------ topic */

function Opinions() {
  const [open, setOpen] = useState<string | null>(SAMPLE_OPINIONS[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-3">
      <Composer
        stance="Positive"
        placeholder="Why do you feel that way? One or two sentences is plenty."
        note="The written half is optional — a vote counts on its own. What you write appears in the list below, carries the position you voted, and can be posted under your name or anonymously."
        chips={["Post anonymously", "Attach a link or image", "Long-form format"]}
      />
      {SAMPLE_OPINIONS.map((opinion) => {
        const stance = stanceOf(opinion.stance);
        const expanded = open === opinion.id;
        const pro = Boolean(opinion.sections?.length);

        return (
          <article
            key={opinion.id}
            className={`flex flex-col gap-3 rounded-[16px] border p-4 transition-[border-color,background] duration-300 sm:p-5 ${
              pro
                ? "border-poll/25 bg-poll/4"
                : "border-veil/8 bg-surface hover:border-veil/16"
            }`}
          >
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px]"
                style={{
                  borderColor: `color-mix(in oklab, ${stance.color} 40%, transparent)`,
                  color: stance.color,
                }}
              >
                {stance.icon}
              </span>
              <span className="text-[13px] font-semibold text-cream">Participant</span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
                style={{
                  color: stance.color,
                  background: `color-mix(in oklab, ${stance.color} 11%, transparent)`,
                }}
              >
                {stance.label}
              </span>
              {pro ? (
                <span className="rounded-full border border-poll/40 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.1em] uppercase text-poll-soft">
                  Structured
                </span>
              ) : null}
              {opinion.replies.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : opinion.id)}
                  aria-expanded={expanded}
                  className="ml-auto cursor-pointer font-mono text-[10px] tracking-[0.1em] uppercase text-dim transition-colors hover:text-cream"
                >
                  {expanded ? "hide" : "show"} {opinion.replies.length}{" "}
                  {opinion.replies.length === 1 ? "reply" : "replies"}
                </button>
              ) : null}
            </header>

            <h4 className="font-display m-0 text-[15px] leading-[1.35] font-semibold tracking-[-0.012em] text-cream-bright">
              {opinion.headline}
            </h4>

            {opinion.body ? (
              <p className="m-0 text-[13.5px] leading-[1.6] text-muted">{opinion.body}</p>
            ) : null}

            {/* The Pro format: named sections rather than one block of prose.
                Shown here because "a longer contribution has a shape" is not a
                claim anybody can picture from a feature list. */}
            {opinion.sections?.map((section) => (
              <div key={section.label} className="flex flex-col gap-1 border-l border-poll/30 pl-3">
                <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-poll-soft">
                  {section.label}
                </span>
                <p className="m-0 text-[13px] leading-[1.6] text-muted">{section.body}</p>
              </div>
            ))}

            {expanded && opinion.replies.length > 0 ? (
              // No `p-0`: `.ohq-thread` carries the 38px indent as padding, and
              // a utility that zeroes it puts every elbow outside the card.
              <ul className="ohq-thread m-0 list-none">
                {opinion.replies.map((reply, i) => {
                  const tone = stanceOf(reply.stance);
                  return (
                    <li key={i} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[9px]"
                        style={{
                          borderColor: `color-mix(in oklab, ${tone.color} 34%, transparent)`,
                          color: tone.color,
                        }}
                      >
                        {tone.icon}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-[12.5px] font-semibold text-cream">
                            Participant
                          </span>
                          <span className="text-[11px]" style={{ color: tone.color }}>
                            {tone.label}
                          </span>
                        </span>
                        <span className="text-[13px] leading-[1.6] text-muted">{reply.body}</span>
                        {/* The affordance that makes it a conversation rather
                            than a comment dump: every reply can be answered,
                            and the answer nests under it. */}
                        <span className="flex gap-3 font-mono text-[9.5px] tracking-[0.1em] uppercase text-dim">
                          <span>reply</span>
                          <span aria-hidden>·</span>
                          <span>like</span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </article>
        );
      })}

      <p className="m-0 text-[12px] leading-[1.55] text-dim">
        Example text. On a live topic, contributions carry their author, can be posted
        anonymously, and are kept separate from editor-published updates — which are
        sourced and sit in their own tab.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- poll */

function Reasons() {
  return (
    <div className="flex flex-col gap-3">
      <Composer
        stance="IMAX 70mm"
        placeholder="Why that one? The strongest case for a side is usually one sentence."
        note="The reason box opens the moment you pick a side, and what you write lands in that side’s column below. Voting without writing is fine — most people do."
        chips={["Post anonymously", "Attach a link or image"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {POLL_OPTIONS.map((option, i) => {
          const written = SAMPLE_REASONS.filter((r) => r.option === i);
          return (
            <section
              key={option.id}
              className="flex flex-col gap-2.5 rounded-[16px] border border-veil/8 bg-surface p-4"
            >
              <header className="flex items-center gap-2 border-b border-line pb-2.5">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: option.color }}
                />
                <span
                  className="truncate text-[12.5px] font-semibold"
                  style={{ color: option.text }}
                >
                  {option.name}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[9.5px] tracking-[0.1em] uppercase text-dim">
                  {written.length} {written.length === 1 ? "reason" : "reasons"}
                </span>
              </header>

              {written.map((reason, j) => (
                <p key={j} className="m-0 flex flex-col gap-1">
                  <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-dim">
                    Participant
                  </span>
                  <span className="text-[13px] leading-[1.6] text-muted">{reason.body}</span>
                </p>
              ))}

              {written.length === 0 ? (
                <p className="m-0 text-[12.5px] leading-[1.55] text-dim">
                  Nobody has written a case for this one yet — yours would be the first.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="m-0 text-[12px] leading-[1.55] text-dim">
        Example text. Reasons are grouped by the option the writer picked and each column
        keeps the same width, so no side reads as the default answer. Replies thread under
        a reason the same way they do under an opinion.
      </p>
    </div>
  );
}
