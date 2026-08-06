"use client";

import { useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import type { DecoratedPoll, PollOptionId } from "@/lib/types";

const MAX_REASON = 400;

/**
 * Pick a side, optionally say why.
 *
 * A poll forces a choice, so there is no neutral option — the honest way out is
 * simply not voting. The reason is optional and appears next to the vote rather
 * than in a thread: polls have no discussion by design.
 */
export function PollVotePanel({ poll }: { poll: DecoratedPoll }) {
  const { pollVotes, clearPollVote, submitPollVote, signedIn, ready } = usePrototype();
  const cast = pollVotes[poll.id];

  const [side, setSide] = useState<PollOptionId | null>(null);
  const [reason, setReason] = useState("");

  // Once storage has hydrated, show the vote already on record.
  useEffect(() => {
    if (!ready) return;
    setSide(cast?.side ?? null);
    setReason(cast?.reason ?? "");
  }, [ready, cast?.side, cast?.reason]);

  return (
    <section aria-label="Cast your vote" className="ohq-panel-raised p-5 sm:p-[34px]">
      <h2 className="m-0 mb-2 font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05] font-bold tracking-[-0.02em] text-cream-bright">
        {cast ? (
          <>
            Your vote is <em className="italic">counted.</em>
          </>
        ) : (
          <>
            So — which <em className="italic">one?</em>
          </>
        )}
      </h2>
      <p className="m-0 mb-6 max-w-[560px] text-[13.5px] leading-[1.6] text-dim">
        {cast
          ? "You can change or withdraw it at any time. One vote counts per account."
          : `Pick one of the ${poll.options.length}. There is no middle option in a poll — if you genuinely have no preference, the honest thing is not to vote.`}
      </p>

      {/* Two options sit side by side; three or four wrap into a grid rather
          than shrinking to unreadable columns. */}
      <div
        role="group"
        aria-label="Your pick"
        className={`grid grid-cols-1 gap-3 ${
          poll.options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        {poll.options.map((option) => {
          const active = side === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSide(option.id)}
              aria-pressed={active}
              className="flex cursor-pointer flex-col gap-2 rounded-[16px] border p-4 text-left transition-[border-color,background] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-poll/60"
              style={{
                borderColor: active ? option.color : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                background: active ? `${option.color}1A` : "transparent",
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full border"
                  style={{ borderColor: active ? option.color : "color-mix(in oklab, var(--color-veil) 28%, transparent)" }}
                >
                  {active ? (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: option.color }}
                    />
                  ) : null}
                </span>
                <span
                  className="text-[15px] font-semibold tracking-[-0.01em]"
                  style={{ color: active ? "#F7F5F1" : "#D6D3CD" }}
                >
                  {option.name}
                </span>
              </span>
              <span className="text-[12.5px] leading-[1.5] text-muted">{option.blurb}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-5 flex flex-col gap-2">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[13px] text-soft">
            Why? <span className="text-dim">Optional, but it is what makes a poll readable.</span>
          </span>
          <span className="font-mono text-[10.5px] text-dim">
            {reason.length}/{MAX_REASON}
          </span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
          rows={3}
          placeholder="One specific reason beats three general ones."
          className="resize-y rounded-[12px] border border-veil/10 bg-surface-sunken p-3.5 text-[14px] leading-[1.6] text-cream outline-none transition-colors duration-300 focus:border-poll/50"
        />
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!side}
          onClick={() => side && submitPollVote(poll.id, side, reason)}
          className="cursor-pointer rounded-full bg-positive px-6 py-3 text-[14.5px] font-semibold text-positive-ink transition-[background,opacity] duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cast ? "Update my vote" : "Cast my vote"}
        </button>
        {cast ? (
          <button
            type="button"
            onClick={() => {
              clearPollVote(poll.id);
              setSide(null);
              setReason("");
            }}
            className="cursor-pointer text-[13px] text-muted transition-colors duration-300 outline-none hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Withdraw
          </button>
        ) : null}
        <span className="ml-auto text-[12px] text-dim">
          {signedIn ? "One vote per account." : "Signing in takes one step."}
        </span>
      </div>
    </section>
  );
}
