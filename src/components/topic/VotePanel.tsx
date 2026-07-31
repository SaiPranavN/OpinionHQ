"use client";

/**
 * Vote plus optional written opinion (brief §8, §14.4).
 *
 * Selection is possible while signed out; authentication is only requested at
 * submit, and the draft is handed to the modal rather than discarded.
 */

import { useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { sentimentColor } from "@/lib/derive";
import type { Sentiment } from "@/lib/types";

const MAX_NOTE = 280;

const OPTIONS: { id: Sentiment; icon: string; hint: string }[] = [
  { id: "Positive", icon: "▲", hint: "I support this / it is going well" },
  { id: "Neutral", icon: "●", hint: "Mixed, or waiting for facts" },
  { id: "Negative", icon: "▼", hint: "I oppose this / it is going badly" },
];

export function VotePanel({ topicId }: { topicId: string }) {
  const { votes, submitVote, clearVote, ready, toast } = usePrototype();
  const recorded = votes[topicId];

  const [vote, setVote] = useState<Sentiment | "">("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  // Seed the composer from a previously recorded vote when re-editing.
  useEffect(() => {
    if (recorded && editing) {
      setVote(recorded.vote);
      setNote(recorded.note);
    }
  }, [recorded, editing]);

  const showComposer = !recorded || editing;

  const submit = () => {
    if (!vote) {
      toast("Pick Positive, Neutral or Negative first.");
      return;
    }
    submitVote(topicId, vote, note.trim());
    setEditing(false);
  };

  return (
    <section
      aria-label="Share your opinion"
      className="ohq-panel-raised p-5 sm:p-[34px]"
    >
      <h2 className="m-0 mb-2 font-serif text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05] font-normal tracking-[-0.02em] text-cream-bright">
        Share your <em className="italic">opinion</em>
      </h2>
      <p className="m-0 mb-6 text-[13.5px] text-dim">
        No account needed to choose — sign-in happens only when you submit.
      </p>

      {!ready ? (
        <div className="h-[220px] animate-pulse rounded-[14px] bg-white/3" />
      ) : showComposer ? (
        <div className="flex flex-col gap-[18px]">
          <div
            role="group"
            aria-label="Your vote"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3"
          >
            {OPTIONS.map((option) => {
              const selected = vote === option.id;
              const tone = sentimentColor(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVote(option.id)}
                  aria-pressed={selected}
                  aria-label={`${option.id} — ${option.hint}`}
                  className="flex min-h-22 cursor-pointer flex-col items-start gap-1.5 rounded-[14px] border px-[18px] py-4 text-left transition-[border-color,background] duration-[350ms] hover:border-white/32"
                  style={{
                    background: selected ? "rgba(255,255,255,0.05)" : "transparent",
                    borderColor: selected ? tone : "rgba(255,255,255,0.12)",
                  }}
                >
                  <span
                    className="flex items-center gap-[9px] text-[15.5px] font-semibold"
                    style={{ color: selected ? "#F7F5F1" : "#D6D3CD" }}
                  >
                    <span aria-hidden className="text-[11px]" style={{ color: tone }}>
                      {option.icon}
                    </span>
                    {option.id}
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-dim">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">
              Add a short explanation (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
              rows={3}
              placeholder="What shaped your view?"
              className="resize-y rounded-[12px] border border-white/10 bg-surface-sunken p-3.5 text-[14px] leading-[1.6] text-cream outline-none transition-colors duration-300 focus:border-positive/50"
            />
            <span className="self-end font-mono text-[10.5px] text-dim">
              {note.length}/{MAX_NOTE}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={submit}
              className="cursor-pointer rounded-full px-8 py-[15px] text-[15px] font-semibold tracking-[-0.01em] transition-[background,box-shadow] duration-[450ms] hover:shadow-[0_12px_40px_-12px_rgba(29,185,84,0.5)]"
              style={{
                background: vote ? "#1DB954" : "rgba(29,185,84,0.28)",
                color: vote ? "#07240F" : "rgba(7,36,15,0.6)",
              }}
            >
              {vote ? "Submit opinion" : "Select an option to continue"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="cursor-pointer text-[13px] text-muted transition-colors hover:text-cream"
              >
                Cancel
              </button>
            ) : null}
            <span className="text-[12.5px] text-dim">
              Your vote can be updated later. One vote counts per account.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[18px] rounded-[14px] border border-positive/32 bg-positive/5 p-5">
          <span className="flex flex-col gap-1.5">
            <span className="text-[15px] font-semibold text-cream-bright">
              <span aria-hidden className="text-positive-light">
                ✓
              </span>{" "}
              Your vote: {recorded.vote} — recorded
            </span>
            <span className="max-w-[520px] text-[13.5px] leading-[1.55] text-muted">
              {recorded.note ? `“${recorded.note}”` : "No written explanation added."}
            </span>
          </span>
          <span className="ml-auto flex gap-2.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="cursor-pointer rounded-full border border-white/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-colors hover:border-white/40"
            >
              Update opinion
            </button>
            <button
              type="button"
              onClick={() => {
                clearVote(topicId);
                setVote("");
                setNote("");
                toast("Vote withdrawn. It no longer counts toward the aggregate.");
              }}
              className="cursor-pointer rounded-full border border-white/12 px-[18px] py-[9px] text-[13px] font-medium text-dim transition-colors hover:border-negative/40 hover:text-negative-light"
            >
              Withdraw
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
