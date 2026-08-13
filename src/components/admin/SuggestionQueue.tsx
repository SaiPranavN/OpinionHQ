"use client";

/**
 * The suggestions desk.
 *
 * APPROVING CREATES A DRAFT AND SENDS THE EDITOR STRAIGHT TO IT. The alternative
 * — approve here, find it in the topics list later — is how a queue fills up
 * with half-made subjects that were approved and never finished. The draft is
 * unpublished, so nothing reaches the site until somebody has actually written
 * the summary and set a status.
 *
 * Declining asks for a note and does not require one. A reason is worth having
 * and forcing one produces "no", which is worse than the blank it replaced.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import {
  approveSuggestion,
  declineSuggestion,
  readOpenSuggestions,
  type Suggestion,
} from "@/lib/suggestions";

export function SuggestionQueue() {
  const router = useRouter();
  const { toast } = usePrototype();
  const [rows, setRows] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = () => {
    readOpenSuggestions().then(setRows);
  };
  useEffect(load, []);

  if (rows === null) {
    return <p className="m-0 text-[13px] text-dim">Reading the queue…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="ohq-panel m-0 p-6 text-[13.5px] leading-[1.6] text-muted">
        Nothing waiting. Suggestions are a Pro feature, so this fills up as
        members join — and an empty queue is not the same as nobody asking.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((s) => (
        <li key={s.id} className="ohq-panel flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-full border px-2.5 py-[2px] font-mono text-[9.5px] tracking-[0.12em] uppercase"
              style={{
                borderColor:
                  s.kind === "poll" ? "rgba(122,162,247,0.4)" : "rgba(29,185,84,0.4)",
                color: s.kind === "poll" ? "#7AA2F7" : "#4ED27C",
              }}
            >
              {s.kind}
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-dim">
              {s.requestedByName} · {new Date(s.createdAt).toLocaleDateString("en-IN")}
            </span>
            {s.categoryId ? (
              <span className="font-mono text-[10.5px] text-dim">{s.categoryId}</span>
            ) : null}
            {s.placeId ? (
              <span className="font-mono text-[10.5px] text-dim">{s.placeId}</span>
            ) : null}
          </div>

          <h3 className="m-0 text-[16px] leading-[1.3] font-semibold tracking-[-0.01em] text-cream-bright">
            {s.title}
          </h3>

          {s.options.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {s.options.map((option) => (
                <li
                  key={option}
                  className="rounded-full border border-poll/35 bg-poll/8 px-3 py-1 text-[12px] text-poll-soft"
                >
                  {option}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="m-0 max-w-[76ch] text-[13.5px] leading-[1.6] text-soft">{s.rationale}</p>

          {declining === s.id ? (
            <div className="flex flex-col gap-2 border-t border-veil/8 pt-3">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why not? The suggester sees this."
                className="w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[13.5px] text-cream outline-none focus:border-positive/50"
              />
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={async () => {
                    setBusy(s.id);
                    try {
                      await declineSuggestion(s, note);
                      toast("Declined.");
                      setDeclining(null);
                      setNote("");
                      load();
                    } catch (e) {
                      toast(e instanceof Error ? e.message : "Could not decline that.");
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="cursor-pointer rounded-full border border-negative/40 px-4 py-2 text-[12.5px] font-medium text-negative-soft transition-colors hover:border-negative/70"
                >
                  Confirm decline
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeclining(null);
                    setNote("");
                  }}
                  className="cursor-pointer text-[12.5px] text-dim transition-colors hover:text-soft"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 border-t border-veil/8 pt-3">
              <button
                type="button"
                disabled={busy === s.id}
                onClick={async () => {
                  setBusy(s.id);
                  try {
                    const slug = await approveSuggestion(s);
                    toast("Approved. Finish the draft and publish when it is ready.");
                    router.push(`/admin/${s.kind === "topic" ? "topics" : "polls"}/${slug}`);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Could not approve that.");
                    setBusy(null);
                  }
                }}
                className="cursor-pointer rounded-full bg-positive px-4 py-2 text-[12.5px] font-semibold text-positive-ink transition-opacity duration-300 disabled:opacity-40"
              >
                {busy === s.id ? "Creating the draft…" : "Approve — create a draft"}
              </button>
              <button
                type="button"
                onClick={() => setDeclining(s.id)}
                className="cursor-pointer rounded-full border border-veil/16 px-4 py-2 text-[12.5px] font-medium text-muted transition-colors hover:border-veil/36 hover:text-cream"
              >
                Decline
              </button>
              <span className="text-[11.5px] text-dim">
                Approving creates an unpublished draft with {s.requestedByName} credited
                on the card.
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
