"use client";

/**
 * Vote plus optional written opinion (brief §8, §14.4).
 *
 * Selection is possible while signed out; authentication is only requested at
 * submit, and the draft is handed to the modal rather than discarded.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { ProComposer } from "@/components/topic/ProComposer";
import { sentimentColor } from "@/lib/derive";
import { MIN_EXPLANATION, isExplained } from "@/lib/contributions";
import {
  MAX_CONTRIBUTION_EDITS,
  readMyPublished,
  withdrawContribution,
  type MyPublished,
} from "@/lib/topics/contributions";
import type { Sentiment } from "@/lib/types";

const MAX_NOTE = 280;

const OPTIONS: { id: Sentiment; icon: string; hint: string }[] = [
  { id: "Positive", icon: "▲", hint: "I support this / it is going well" },
  { id: "Neutral", icon: "●", hint: "Mixed, or waiting for facts" },
  { id: "Negative", icon: "▼", hint: "I oppose this / it is going badly" },
];

export function VotePanel({ topicId, accent }: { topicId: string; accent: string }) {
  const { votes, submitVote, clearVote, ready, toast, pro, openUpgrade, proDraftFor } =
    usePrototype();
  const recorded = votes[topicId];

  const [vote, setVote] = useState<Sentiment | "">("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  // Which composer a Pro user is in. Normal users never see this switch and
  // their flow is byte-identical to what it was.
  const [mode, setMode] = useState<"quick" | "rich">("quick");
  const hasDraft = Boolean(proDraftFor(topicId)?.length);

  /**
   * The contribution this account already has on this topic, if any.
   *
   * Read on mount rather than threaded down from the server query, because it
   * is only needed once somebody is signed in and Pro — most page loads never
   * touch it.
   */
  const router = useRouter();
  const [published, setPublished] = useState<MyPublished | null>(null);
  const [editingPro, setEditingPro] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const refreshPublished = useCallback(() => {
    if (!pro) return;
    readMyPublished(topicId).then(setPublished);
  }, [pro, topicId]);

  useEffect(refreshPublished, [refreshPublished]);

  // Seed the composer from a previously recorded vote when re-editing.
  useEffect(() => {
    if (recorded && editing) {
      setVote(recorded.vote);
      setNote(recorded.note);
    }
  }, [recorded, editing]);

  const showComposer = !recorded || editing;

  const explained = isExplained(note);

  const submit = () => {
    if (!vote) {
      toast("Pick Positive, Neutral or Negative first.");
      return;
    }
    // Said here so it is not discovered as a server refusal. `cast_vote`
    // enforces the same rule, and that is the one that counts.
    if (!explained) {
      toast(`Add a short explanation — at least ${MIN_EXPLANATION} characters.`);
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
      <h2 className="m-0 mb-2 font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.05] font-bold tracking-[-0.02em] text-cream-bright">
        Share your <em>opinion</em>
      </h2>
      <p className="m-0 mb-6 text-[13.5px] text-dim">
        No account needed to choose — sign-in happens only when you submit.
      </p>

      {/* The Pro entry point, inside the composer that already exists rather
          than in a nav item of its own.

          Shown to everyone, not only to subscribers. A feature you cannot see
          is a feature you never choose; hiding the door until somebody has
          already paid is how a subscription nobody knows about fails to sell.
          Pressing it without Pro opens the subscribe sheet naming this
          feature, which is a better first encounter with the price than
          finding out afterwards. */}
      {ready ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(
            [
              { id: "quick", label: "Share a quick opinion" },
              { id: "rich", label: "Build a Pro contribution" },
            ] as const
          ).map((choice) => {
            const active = mode === choice.id;
            const locked = choice.id === "rich" && !pro;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() =>
                  locked ? openUpgrade("rich-contribution") : setMode(choice.id)
                }
                aria-pressed={active}
                className="cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/50"
                style={{
                  borderColor: active
                    ? `color-mix(in oklab, ${accent} 55%, transparent)`
                    : "color-mix(in oklab, var(--color-veil) 14%, transparent)",
                  background: active
                    ? `color-mix(in oklab, ${accent} 10%, transparent)`
                    : "transparent",
                  color: active ? accent : "var(--color-muted)",
                }}
              >
                {choice.label}
                {locked ? (
                  <span className="ml-2 font-mono text-[10px] text-dim">Pro</span>
                ) : choice.id === "rich" && hasDraft ? (
                  <span className="ml-2 font-mono text-[10px] text-dim">draft saved</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Already published, and not currently being edited: state, then the
          two things you can do about it. */}
      {ready && pro && published && !editingPro ? (
        <div className="flex flex-wrap items-center gap-[18px] rounded-[14px] border p-5"
          style={{
            borderColor: `color-mix(in oklab, ${accent} 32%, transparent)`,
            background: `color-mix(in oklab, ${accent} 5%, transparent)`,
          }}
        >
          <span className="flex flex-col gap-1.5">
            <span className="text-[15px] font-semibold text-cream-bright">
              Your contribution is published
              {published.anonymous ? (
                <span className="ml-2 font-mono text-[10px] tracking-[0.12em] uppercase text-dim">
                  anonymous
                </span>
              ) : null}
            </span>
            <span className="max-w-[520px] text-[13px] leading-[1.55] text-muted">
              {published.edits >= MAX_CONTRIBUTION_EDITS
                ? `Updated ${MAX_CONTRIBUTION_EDITS} times, which is the limit. You can still withdraw it.`
                : `${MAX_CONTRIBUTION_EDITS - published.edits} of ${MAX_CONTRIBUTION_EDITS} updates left. Withdrawing is always available.`}
            </span>
          </span>
          <span className="ml-auto flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={published.edits >= MAX_CONTRIBUTION_EDITS}
              onClick={() => {
                setEditingPro(true);
                setMode("rich");
              }}
              className="cursor-pointer rounded-full border border-veil/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-colors hover:border-veil/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Update
            </button>
            <button
              type="button"
              disabled={withdrawing}
              onClick={async () => {
                setWithdrawing(true);
                try {
                  await withdrawContribution(topicId);
                  setPublished(null);
                  setEditingPro(false);
                  setMode("quick");
                  toast("Withdrawn. The contribution and your vote are both gone.");
                  router.refresh();
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Could not withdraw that.");
                } finally {
                  setWithdrawing(false);
                }
              }}
              className="cursor-pointer rounded-full border border-veil/12 px-[18px] py-[9px] text-[13px] font-medium text-dim transition-colors hover:border-negative/40 hover:text-negative-light disabled:opacity-40"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw"}
            </button>
          </span>
        </div>
      ) : ready && pro && mode === "rich" ? (
        <ProComposer
          topicId={topicId}
          accent={accent}
          editing={editingPro ? published : null}
          onClose={() => {
            setMode("quick");
            setEditingPro(false);
            refreshPublished();
          }}
        />
      ) : !ready ? (
        <div className="h-[220px] animate-pulse rounded-[14px] bg-veil/3" />
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
                  className="flex min-h-22 cursor-pointer flex-col items-start gap-1.5 rounded-[14px] border px-[18px] py-4 text-left transition-[border-color,background] duration-[350ms] hover:border-veil/32"
                  style={{
                    background: selected ? "color-mix(in oklab, var(--color-veil) 5%, transparent)" : "transparent",
                    borderColor: selected ? tone : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
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

          {/* Required now, and said as a requirement rather than shown as a
              disabled button somebody has to work out. The counter turns from
              "how much is left" into "how much more is needed" while it is
              short, because those are two different questions and only one of
              them is being asked before the floor is cleared. */}
          <label className="flex flex-col gap-2">
            <span className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] text-muted">
                Why? <span className="text-dim">A short explanation is required.</span>
              </span>
              <span
                className="font-mono text-[10.5px]"
                style={{ color: explained ? "var(--color-dim)" : "var(--color-neutral)" }}
              >
                {explained
                  ? `${note.length}/${MAX_NOTE}`
                  : `${MIN_EXPLANATION - note.trim().length} more`}
              </span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
              rows={3}
              required
              aria-describedby="ohq-note-rule"
              placeholder="What shaped your view?"
              className="resize-y rounded-[12px] border border-veil/10 bg-surface-sunken p-3.5 text-[14px] leading-[1.6] text-cream outline-none transition-colors duration-300 focus:border-positive/50"
            />
            <span id="ohq-note-rule" className="text-[11.5px] leading-[1.5] text-dim">
              A vote on its own tells the room what you think and nothing about
              why, and why is the part anybody can argue with.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-4">
            {/* Not `disabled`. A dead button explains nothing; this one is
                pressable and answers what is missing, which is the difference
                between a form that refuses you and one that tells you why. */}
            <button
              type="button"
              onClick={submit}
              className="cursor-pointer rounded-full px-8 py-[15px] text-[15px] font-semibold tracking-[-0.01em] transition-[background,box-shadow] duration-[450ms] hover:shadow-[0_12px_40px_-12px_rgba(29,185,84,0.5)]"
              style={{
                background: vote && explained ? "#1DB954" : "rgba(29,185,84,0.28)",
                color: vote && explained ? "#07240F" : "rgba(7,36,15,0.6)",
              }}
            >
              {!vote
                ? "Select an option to continue"
                : explained
                  ? "Submit opinion"
                  : "Add a short explanation"}
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
              className="cursor-pointer rounded-full border border-veil/16 px-[18px] py-[9px] text-[13px] font-medium text-soft transition-colors hover:border-veil/40"
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
              className="cursor-pointer rounded-full border border-veil/12 px-[18px] py-[9px] text-[13px] font-medium text-dim transition-colors hover:border-negative/40 hover:text-negative-light"
            >
              Withdraw
            </button>
          </span>
        </div>
      )}

    </section>
  );
}
