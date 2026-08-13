"use client";

/**
 * The rich composer, opened from inside the ordinary opinion panel.
 *
 * Built around one idea: you start with a headline and an empty page, and you
 * add only the sections you actually have something to put in. Showing all six
 * fields at once would turn a contribution into a form to be completed, and a
 * form gets completed — people write a breakdown because there is a breakdown
 * box, not because they had one. Empty sections are worse than absent ones.
 *
 * Hence: one required field, an "Add section" row, and everything removable
 * and reorderable. The preview is the same `ContributionCard` the feed
 * renders, not a facsimile of it, so what you see is what publishes.
 */

import { useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { ContributionCard } from "@/components/topic/ContributionCard";
import { AnonymousToggle } from "@/components/ui/AnonymousToggle";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { mediaUrl } from "@/lib/media";
import {
  MAX_CONTRIBUTION_EDITS,
  type MediaDraft,
  type MyPublished,
} from "@/lib/topics/contributions";
import { isPublishable, OPTIONAL_SECTIONS, BLOCK_KIND_LABEL } from "@/lib/contributions";
import { sentimentColor } from "@/lib/derive";
import type {
  InteractiveKind,
  Opinion,
  ProSection,
  ProSectionType,
  Sentiment,
} from "@/lib/types";

const SENTIMENTS: Sentiment[] = ["Positive", "Neutral", "Negative"];

const BLOCK_KINDS: InteractiveKind[] = [
  "poll",
  "rating",
  "rank",
  "scenario",
  "agree_challenge",
  "verdict",
];

const field =
  "w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[14px] leading-[1.55] text-cream outline-none transition-colors duration-300 focus:border-positive/50";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;

function blankSection(type: ProSectionType, position: number): ProSection {
  switch (type) {
    case "key_points":
      return { id: nextId("s"), type, position, points: [""] };
    case "interactive":
      return {
        id: nextId("s"),
        type,
        position,
        block: {
          id: nextId("b"),
          kind: "poll",
          prompt: "",
          // Two is the minimum that measures anything; the composer starts
          // there and lets you add more rather than opening with empty rows.
          options: [
            { id: nextId("o"), label: "", count: 0 },
            { id: nextId("o"), label: "", count: 0 },
          ],
        },
      };
    default:
      return { id: nextId("s"), type, position, text: "" };
  }
}

export function ProComposer({
  topicId,
  accent,
  onClose,
  /**
   * The published contribution being edited, if there is one.
   *
   * Read back from the server rather than from a local draft, because an edit
   * has to start from what is actually published — starting from whatever this
   * browser still held is how somebody overwrites a version they changed on
   * another device.
   */
  editing,
}: {
  topicId: string;
  accent: string;
  onClose: () => void;
  editing?: MyPublished | null;
}) {
  const { publishPro, saveProDraft, discardProDraft, proDraftFor, displayName, toast } =
    usePrototype();

  // The published version wins over a local draft when editing: the draft may
  // predate it.
  const saved = editing ? null : proDraftFor(topicId);
  const [sections, setSections] = useState<ProSection[]>(
    editing && editing.sections.length > 0
      ? editing.sections
      : saved && saved.length > 0
        ? saved
        : [{ id: nextId("s"), type: "headline", position: 0, text: "" }],
  );
  const [vote, setVote] = useState<Sentiment>(editing?.vote ?? "Neutral");
  const [preview, setPreview] = useState(false);
  const [anonymous, setAnonymous] = useState(editing?.anonymous ?? false);
  const [media, setMedia] = useState<MediaDraft[]>(editing?.media ?? []);
  const [publishing, setPublishing] = useState(false);

  const editsLeft = editing ? MAX_CONTRIBUTION_EDITS - editing.edits : MAX_CONTRIBUTION_EDITS;
  const outOfEdits = Boolean(editing) && editsLeft <= 0;

  const headline = sections.find((s) => s.type === "headline");
  const optional = sections.filter((s) => s.type !== "headline");
  const used = new Set(optional.map((s) => s.type));

  const update = (id: string, next: Partial<ProSection>) =>
    setSections((prev) =>
      prev.map((s) => (s.id === id ? ({ ...s, ...next } as ProSection) : s)),
    );

  const add = (type: ProSectionType) =>
    setSections((prev) => [...prev, blankSection(type, prev.length)]);

  const remove = (id: string) =>
    setSections((prev) =>
      prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })),
    );

  /** Reorder within the optional block only — the headline is always first. */
  const move = (id: string, delta: number) =>
    setSections((prev) => {
      const list = [...prev];
      const from = list.findIndex((s) => s.id === id);
      const to = from + delta;
      if (from < 1 || to < 1 || to >= list.length) return prev;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item!);
      return list.map((s, i) => ({ ...s, position: i }));
    });

  const cleaned = (): ProSection[] =>
    sections
      .map((section) => {
        if (section.type === "key_points") {
          return { ...section, points: section.points.map((p) => p.trim()).filter(Boolean) };
        }
        if (section.type === "interactive") {
          return {
            ...section,
            block: {
              ...section.block,
              prompt: section.block.prompt.trim(),
              options: section.block.options
                .map((o) => ({ ...o, label: o.label.trim() }))
                .filter((o) => o.label),
            },
          };
        }
        return { ...section, text: section.text.trim() };
      })
      // A section left empty was started and abandoned. Publishing it would put
      // a labelled blank on the card, which reads as a bug rather than as a
      // choice — so it is dropped rather than shipped.
      .filter((section) => {
        if (section.type === "key_points") return section.points.length > 0;
        if (section.type === "interactive") {
          return section.block.prompt.length > 0 && section.block.options.length >= 2;
        }
        return section.text.length > 0;
      })
      .map((section, i) => ({ ...section, position: i }));

  // The preview shows what everybody else will see, which is the whole reason
  // it exists — so with anonymity on it shows the anonymous card rather than
  // the author's own name with a note attached.
  const draftPreview: Opinion = {
    id: `preview-${topicId}`,
    topicId,
    name: anonymous ? "Anonymous" : `${displayName || "You"} (you)`,
    initials: anonymous ? "··" : (displayName || "You").slice(0, 2).toUpperCase(),
    vote,
    text: "",
    time: "Just now",
    helpful: 0,
    replies: 0,
    format: "pro",
    sections: cleaned(),
    authorLine: anonymous ? undefined : "Pro contributor",
    anonymous,
    media: media.map((m) => ({
      id: m.path,
      url: mediaUrl(m.path),
      kind: m.kind,
      alt: m.alt,
      width: m.width,
      height: m.height,
    })),
  };

  const ready = isPublishable(cleaned());

  return (
    <section
      aria-label="Build a Pro contribution"
      className="flex flex-col gap-5 rounded-[16px] border p-4 sm:p-6"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 30%, transparent)`,
        background: `color-mix(in oklab, ${accent} 4%, transparent)`,
      }}
    >
      <header className="flex flex-wrap items-center gap-3">
        <span
          className="font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color: accent }}
        >
          Pro contribution
        </span>
        <span className="text-[12.5px] text-dim">
          Only a headline is required. Add what you actually have.
        </span>
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="ml-auto cursor-pointer rounded-full border border-veil/14 px-3.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-veil/32 hover:text-cream"
        >
          {preview ? "Back to editing" : "Preview"}
        </button>
      </header>

      {preview ? (
        <div className="flex flex-col gap-3">
          {ready ? (
            // A preview of something not yet published, so it has no thread and
            // nobody has voted in one.
            <ContributionCard
              contribution={draftPreview}
              view="opinions"
              accent={accent}
              replies={[]}
              myReplyVotes={{}}
            />
          ) : (
            <p className="m-0 rounded-[12px] border border-dashed border-veil/12 px-4 py-8 text-center text-[13px] text-dim">
              Write a headline to see the card.
            </p>
          )}
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] text-muted">Headline</span>
            <input
              value={headline && headline.type === "headline" ? headline.text : ""}
              onChange={(e) =>
                headline && update(headline.id, { text: e.target.value.slice(0, 120) })
              }
              placeholder="The point of your contribution, in one line."
              className={`${field} text-[16px] font-medium`}
            />
          </label>

          <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[12.5px] text-muted">Your position</legend>
            {SENTIMENTS.map((s) => {
              const active = vote === s;
              const tone = sentimentColor(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVote(s)}
                  aria-pressed={active}
                  className="cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/50"
                  style={{
                    borderColor: active ? tone : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                    background: active ? `color-mix(in oklab, ${tone} 12%, transparent)` : "transparent",
                    color: active ? tone : "var(--color-muted)",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </fieldset>

          {optional.map((section, i) => (
            <SectionEditor
              key={section.id}
              section={section}
              accent={accent}
              first={i === 0}
              last={i === optional.length - 1}
              onChange={(next) => update(section.id, next)}
              onRemove={() => remove(section.id)}
              onMove={(delta) => move(section.id, delta)}
            />
          ))}

          <div className="flex flex-col gap-2.5 border-t border-veil/8 pt-4">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-dim">
              Add section
            </span>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_SECTIONS.map((option) => {
                const taken = used.has(option.type);
                return (
                  <button
                    key={option.type}
                    type="button"
                    disabled={taken}
                    title={taken ? "Already added" : option.hint}
                    onClick={() => add(option.type)}
                    className="cursor-pointer rounded-full border border-veil/14 px-3.5 py-2 text-[12.5px] font-medium text-muted transition-colors duration-300 outline-none hover:border-veil/34 hover:text-cream disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-positive/50"
                  >
                    + {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-4 border-t border-veil/8 pt-4">
        <MediaPicker media={media} onChange={setMedia} accent={accent} />
        <AnonymousToggle on={anonymous} onChange={setAnonymous} />
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-veil/8 pt-4">
        <button
          type="button"
          disabled={!ready || publishing || outOfEdits}
          onClick={async () => {
            setPublishing(true);
            const id = await publishPro(topicId, cleaned(), vote, anonymous, media);
            setPublishing(false);
            // Only on success. Closing regardless would throw away the draft in
            // front of somebody whose publish had just been refused.
            if (id) onClose();
          }}
          className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-opacity duration-300 outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-positive-light"
        >
          {publishing
            ? "Publishing…"
            : editing
              ? "Update contribution"
              : "Publish contribution"}
        </button>
        <button
          type="button"
          onClick={() => {
            saveProDraft(topicId, sections);
            toast("Draft saved. It will be here when you come back.");
          }}
          className="cursor-pointer rounded-full border border-veil/16 px-4 py-2.5 text-[13px] font-medium text-soft transition-colors hover:border-veil/36"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => {
            discardProDraft(topicId);
            onClose();
          }}
          className="cursor-pointer text-[13px] text-dim transition-colors hover:text-soft"
        >
          Discard
        </button>
        {/* The allowance is stated before it is spent, not discovered as a
            refusal on the fourth save. */}
        {editing ? (
          <span className="ml-auto text-[12px] text-dim">
            {outOfEdits
              ? `Updated ${MAX_CONTRIBUTION_EDITS} times, which is the limit. You can still withdraw it.`
              : `${editsLeft} of ${MAX_CONTRIBUTION_EDITS} updates left.`}
          </span>
        ) : !ready ? (
          <span className="ml-auto text-[12px] text-dim">
            A headline of at least eight characters is needed to publish.
          </span>
        ) : null}
      </footer>
    </section>
  );
}

/* -------------------------------------------------------- section editor */

function SectionEditor({
  section,
  accent,
  first,
  last,
  onChange,
  onRemove,
  onMove,
}: {
  section: ProSection;
  accent: string;
  first: boolean;
  last: boolean;
  onChange: (next: Partial<ProSection>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  const meta = OPTIONAL_SECTIONS.find((o) => o.type === section.type);

  return (
    <div className="flex flex-col gap-2.5 rounded-[12px] border border-veil/10 bg-surface-sunken/60 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="font-mono text-[9.5px] tracking-[0.12em] uppercase"
          style={{ color: accent }}
        >
          {meta?.label ?? section.type}
        </span>
        <span className="text-[11.5px] text-dim">{meta?.hint}</span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={first}
            aria-label="Move section up"
            className="cursor-pointer rounded-md px-1.5 py-1 text-[12px] text-dim transition-colors hover:bg-veil/6 hover:text-soft disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={last}
            aria-label="Move section down"
            className="cursor-pointer rounded-md px-1.5 py-1 text-[12px] text-dim transition-colors hover:bg-veil/6 hover:text-soft disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${meta?.label ?? "section"}`}
            className="cursor-pointer rounded-md px-1.5 py-1 text-[12px] text-dim transition-colors hover:bg-negative/10 hover:text-negative-light"
          >
            ✕
          </button>
        </span>
      </div>

      {section.type === "key_points" ? (
        <div className="flex flex-col gap-2">
          {section.points.map((point, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={point}
                onChange={(e) => {
                  const points = [...section.points];
                  points[i] = e.target.value.slice(0, 160);
                  onChange({ points } as Partial<ProSection>);
                }}
                placeholder={`Point ${i + 1}`}
                className={field}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    points: section.points.filter((_, j) => j !== i),
                  } as Partial<ProSection>)
                }
                aria-label={`Remove point ${i + 1}`}
                className="cursor-pointer rounded-md px-2 py-1 text-[12px] text-dim transition-colors hover:text-negative-light"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ points: [...section.points, ""] } as Partial<ProSection>)}
            className="w-fit cursor-pointer text-[12px] text-muted transition-colors hover:text-cream"
          >
            + Add point
          </button>
        </div>
      ) : section.type === "interactive" ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_KINDS.map((kind) => {
              const active = section.block.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onChange({ block: { ...section.block, kind } } as Partial<ProSection>)}
                  aria-pressed={active}
                  className="cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] transition-colors duration-300"
                  style={{
                    borderColor: active
                      ? `color-mix(in oklab, ${accent} 55%, transparent)`
                      : "color-mix(in oklab, var(--color-veil) 12%, transparent)",
                    color: active ? accent : "var(--color-muted)",
                  }}
                >
                  {BLOCK_KIND_LABEL[kind]}
                </button>
              );
            })}
          </div>
          <input
            value={section.block.prompt}
            onChange={(e) =>
              onChange({
                block: { ...section.block, prompt: e.target.value.slice(0, 140) },
              } as Partial<ProSection>)
            }
            placeholder="What do you want to ask the room?"
            className={field}
          />
          {section.block.options.map((option, i) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                value={option.label}
                onChange={(e) => {
                  const options = section.block.options.map((o, j) =>
                    j === i ? { ...o, label: e.target.value.slice(0, 80) } : o,
                  );
                  onChange({ block: { ...section.block, options } } as Partial<ProSection>);
                }}
                placeholder={`Option ${i + 1}`}
                className={field}
              />
              <button
                type="button"
                disabled={section.block.options.length <= 2}
                onClick={() =>
                  onChange({
                    block: {
                      ...section.block,
                      options: section.block.options.filter((_, j) => j !== i),
                    },
                  } as Partial<ProSection>)
                }
                aria-label={`Remove option ${i + 1}`}
                className="cursor-pointer rounded-md px-2 py-1 text-[12px] text-dim transition-colors hover:text-negative-light disabled:cursor-not-allowed disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
          {section.block.options.length < 6 ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  block: {
                    ...section.block,
                    options: [
                      ...section.block.options,
                      { id: nextId("o"), label: "", count: 0 },
                    ],
                  },
                } as Partial<ProSection>)
              }
              className="w-fit cursor-pointer text-[12px] text-muted transition-colors hover:text-cream"
            >
              + Add option
            </button>
          ) : null}
          <p className="m-0 text-[11px] leading-[1.5] text-dim">
            Answers stay on this contribution. They never move the topic&rsquo;s sentiment
            or any poll in the Polls section.
          </p>
        </div>
      ) : (
        <textarea
          value={section.text}
          onChange={(e) =>
            onChange({
              text: e.target.value.slice(0, section.type === "breakdown" ? 3000 : 320),
            } as Partial<ProSection>)
          }
          rows={section.type === "breakdown" ? 7 : 2}
          placeholder={
            section.type === "breakdown"
              ? "The reasoning. Blank lines separate paragraphs."
              : section.type === "quick_take"
                ? "The answer, before the argument."
                : "Where you land, in a sentence."
          }
          className={`${field} resize-y`}
        />
      )}
    </div>
  );
}
