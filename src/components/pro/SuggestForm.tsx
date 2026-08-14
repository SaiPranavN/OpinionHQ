"use client";

/**
 * Putting a subject in front of the editors.
 *
 * IT ASKS WHY, AND THE WHY IS NOT DECORATION. A bare name gives an editor
 * nothing to judge — half of what makes a topic worth running is context the
 * suggester has and the desk does not. The reasoning also becomes the draft's
 * summary on approval, so a suggestion written properly arrives half-built.
 *
 * NOTHING PUBLISHES FROM HERE. Approval creates an unpublished draft that an
 * editor finishes. Said on the form, because a queue that looks like a publish
 * button produces suggestions written as though they were going straight out.
 */

import { useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { CATEGORIES } from "@/lib/taxonomy";
import { placeOptions } from "@/lib/places";
import { suggestPoll, suggestTopic } from "@/lib/suggestions";

const field =
  "w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[14px] leading-[1.55] text-cream outline-none transition-colors duration-300 focus:border-positive/50";

export function SuggestForm({
  /**
   * Locks the form to one kind and hides the switch.
   *
   * The Pro page offers both, because that is a page about Pro. The catalogs
   * open it from a button that already said which one — a "Suggest a topic"
   * pill that opens a form asking topic-or-poll has asked the question twice.
   */
  only,
  onDone,
}: {
  only?: "topic" | "poll";
  onDone?: () => void;
} = {}) {
  const { toast, pro } = usePrototype();
  const [kind, setKind] = useState<"topic" | "poll">(only ?? "topic");
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [categoryId, setCategoryId] = useState<string>(CATEGORIES[0]?.id ?? "technology");
  const [placeId, setPlaceId] = useState("india");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const places = placeOptions();
  const enoughOptions = options.filter((o) => o.trim()).length >= 2;
  const ready =
    title.trim().length >= 8 &&
    rationale.trim().length >= 20 &&
    (kind === "topic" || enoughOptions);

  async function submit() {
    setBusy(true);
    try {
      if (kind === "topic") {
        await suggestTopic({ name: title, rationale, categoryId, placeId });
      } else {
        await suggestPoll({ question: title, options, rationale, categoryId, placeId });
      }
      setDone(true);
      setTitle("");
      setRationale("");
      setOptions(["", ""]);
      toast("Suggested. An editor will look at it.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="ohq-panel flex flex-col gap-3 p-5 sm:p-6">
        <span className="ohq-eyebrow">In the queue</span>
        <p className="m-0 max-w-[60ch] text-[14px] leading-[1.6] text-soft">
          An editor reads every suggestion. If yours runs, your name sits on the
          card as the person who asked for it — permanently, and visible to
          everybody who finds the subject.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setDone(false)}
            className="cursor-pointer rounded-full border border-veil/16 px-4 py-2 text-[13px] font-medium text-soft transition-colors hover:border-veil/36 hover:text-cream"
          >
            Suggest another
          </button>
          {onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="cursor-pointer px-2 py-2 text-[13px] text-dim transition-colors hover:text-soft"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="ohq-panel flex flex-col gap-4 p-5 sm:p-6">
      {only ? (
        <p className="m-0 text-[12.5px] text-dim">
          {only === "topic"
            ? "Something people are arguing about, measured over time."
            : "One question, two to four answers, a single result."}
        </p>
      ) : (
      <div className="flex flex-wrap items-center gap-2">
        {(["topic", "poll"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            aria-pressed={kind === option}
            className="cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-medium transition-[color,border-color,background] duration-300"
            style={{
              borderColor:
                kind === option
                  ? "rgba(29,185,84,0.45)"
                  : "color-mix(in oklab, var(--color-veil) 14%, transparent)",
              background: kind === option ? "rgba(29,185,84,0.10)" : "transparent",
              color: kind === option ? "#4ED27C" : "#A8A49E",
            }}
          >
            {option === "topic" ? "A topic" : "A poll"}
          </button>
        ))}
        <span className="text-[12px] text-dim">
          {kind === "topic"
            ? "Something people are arguing about, measured over time."
            : "One question, two to four answers, a single result."}
        </span>
      </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-soft">
          {kind === "topic" ? "Topic name" : "The question"}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            kind === "topic"
              ? "What is the subject, in the words people use for it?"
              : "Ask it the way you would ask a room."
          }
          className={field}
        />
      </label>

      {kind === "poll" ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-soft">
            Options <span className="text-dim">Two to four.</span>
          </span>
          {options.map((option, i) => (
            <input
              key={i}
              value={option}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              placeholder={`Option ${i + 1}`}
              aria-label={`Option ${i + 1}`}
              className={field}
            />
          ))}
          {options.length < 4 ? (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="cursor-pointer self-start text-[12.5px] text-muted transition-colors hover:text-cream"
            >
              + Another option
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-[13px] text-soft">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={field}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-[13px] text-soft">Where</span>
          <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className={field}>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {" ".repeat(p.depth * 2)}
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[13px] text-soft">Why is this worth running?</span>
          <span className="font-mono text-[10.5px] text-dim">{rationale.length}/600</span>
        </span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value.slice(0, 600))}
          rows={4}
          placeholder="What is happening, who is arguing about it, and what would be worth measuring. This becomes the draft's summary."
          className={`${field} resize-y`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-veil/8 pt-4">
        <button
          type="button"
          disabled={!ready || busy || !pro}
          onClick={submit}
          className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-opacity duration-300 outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-positive-light"
        >
          {busy ? "Sending…" : "Send it to the desk"}
        </button>
        <span className="text-[12px] text-dim">
          {!pro
            ? "Suggesting is a Pro feature."
            : ready
              ? "An editor reviews it. Nothing publishes automatically."
              : "A name of eight characters and a reason of twenty are the minimum."}
        </span>
      </div>
    </div>
  );
}
