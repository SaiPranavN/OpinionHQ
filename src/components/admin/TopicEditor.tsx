"use client";

/**
 * The editor's view of one topic: what it says, and what has happened to it.
 *
 * TWO PANELS, AND THE ORDER IS THE POINT. Developments come first, because that
 * is the thing an editor comes back to do — a topic's description is written
 * once and its record grows for months. Burying "publish an update" under a form
 * full of fields nobody is changing is how a status goes stale on a live page.
 *
 * Aspects are shown and not editable here. Rewording a question people have
 * already answered silently rewrites what their answer meant, so changing them
 * needs a decision about the existing responses that this screen does not have —
 * see the note where they are rendered.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlacePicker } from "@/components/ui/PlacePicker";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  addDevelopment,
  removeDevelopment,
  setTopicStatus,
  updateTopic,
  type DevelopmentDraft,
} from "@/lib/admin/timeline";
import { safeExternalUrl, urlHost } from "@/lib/safe-url";
import type { PlaceId } from "@/lib/places";
import { CATEGORIES, STATUS_STYLES } from "@/lib/taxonomy";
import type { StatusId } from "@/lib/types";

export interface EditableTopic {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  placeId: string;
  status: string;
  summary: string;
  about: string;
  tags: string[];
  published: boolean;
  archived: boolean;
}

export interface EditableAspect {
  id: string;
  label: string;
  prompt: string;
  options: { id: string; label: string; tone: string }[];
}

export interface Development {
  id: string;
  date: string;
  title: string;
  description: string;
  sourceName: string;
  sourceUrl: string | null;
  status: string;
}

const STATUSES = Object.keys(STATUS_STYLES) as StatusId[];

const today = () => new Date().toISOString().slice(0, 10);

export function TopicEditor({
  topic,
  aspects,
  events,
}: {
  topic: EditableTopic;
  aspects: EditableAspect[];
  events: Development[];
}) {
  const router = useRouter();

  const [name, setName] = useState(topic.name);
  const [categoryId, setCategoryId] = useState(topic.categoryId);
  const [placeId, setPlaceId] = useState<PlaceId>(topic.placeId as PlaceId);
  const [status, setStatus] = useState(topic.status);
  const [summary, setSummary] = useState(topic.summary);
  const [about, setAbout] = useState(topic.about);
  const [tagText, setTagText] = useState(topic.tags.join(", "));

  const [draft, setDraft] = useState<DevelopmentDraft>({
    date: today(),
    title: "",
    description: "",
    sourceName: "",
    sourceUrl: "",
    status: topic.status,
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<{ ok: boolean; message?: string }>, done?: string) => {
    setBusy(key);
    setError(null);
    setSaved(null);
    const result = await action();
    setBusy(null);
    if (!result.ok) {
      setError(result.message ?? "That did not work.");
      return false;
    }
    if (done) setSaved(done);
    router.refresh();
    return true;
  };

  const publishDevelopment = async () => {
    const ok = await run(
      "development",
      () => addDevelopment(topic.id, draft),
      "Update published. It is live on the topic's timeline.",
    );
    if (ok) {
      setDraft({
        date: today(),
        title: "",
        description: "",
        sourceName: "",
        sourceUrl: "",
        status: draft.status,
      });
      // The development usually *is* the status change, so the topic follows it
      // rather than making somebody set the same thing twice.
      if (draft.status !== status) {
        setStatus(draft.status);
        await setTopicStatus(topic.id, draft.status);
        router.refresh();
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
            {topic.name}
          </h2>
          <StatusBadge status={status as StatusId} />
          <span
            className={`rounded-full border px-2 py-[2px] font-mono text-[9.5px] tracking-[0.12em] uppercase ${
              topic.archived
                ? "border-veil/14 text-dim"
                : topic.published
                  ? "border-positive/40 bg-positive/12 text-positive-light"
                  : "border-veil/20 text-soft"
            }`}
          >
            {topic.archived ? "Archived" : topic.published ? "Live" : "Draft"}
          </span>
          <span className="ml-auto flex gap-2.5">
            <Link
              href={`/topics/${topic.slug}`}
              className="rounded-full border border-veil/16 px-4 py-1.5 text-[12.5px] font-medium text-cream transition-colors hover:border-veil/40"
            >
              View public page
            </Link>
            <Link
              href="/admin/topics"
              className="rounded-full border border-veil/14 px-4 py-1.5 text-[12.5px] text-muted transition-colors hover:text-cream"
            >
              All topics
            </Link>
          </span>
        </div>
      </header>

      {error ? (
        <p role="alert" className="m-0 rounded-[12px] border border-negative/30 bg-negative/8 px-4 py-3 text-[13px] text-negative-light">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="m-0 rounded-[12px] border border-positive/30 bg-positive/8 px-4 py-3 text-[13px] text-positive-light">
          {saved}
        </p>
      ) : null}

      {/* ------------------------------------------------------ developments */}
      <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 font-display text-[1.15rem] leading-[1.2] font-semibold tracking-[-0.015em] text-cream-bright">
            Publish an update
          </h3>
          <p className="m-0 max-w-[68ch] text-[13px] leading-[1.6] font-light text-muted">
            A sourced development — what happened, and where a reader can check it.
            This is the only way the verified record changes after publication, and
            it is what the timeline on the public page is made of.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="What happened" required className="sm:col-span-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Board confirms the paper was leaked before the exam"
              className={input}
            />
          </Field>

          <Field label="Detail" hint="Optional — one or two lines" className="sm:col-span-2">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              placeholder="What the update actually says, in plain words."
              className={`${input} resize-y`}
            />
          </Field>

          <Field label="Source" required hint="Who reported it">
            <input
              value={draft.sourceName}
              onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })}
              placeholder="The Hindu"
              className={input}
            />
          </Field>

          <Field label="Link" hint="Optional, but strongly preferred">
            <input
              value={draft.sourceUrl}
              onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
              placeholder="https://…"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              className={input}
            />
            {draft.sourceUrl.trim() && !safeExternalUrl(draft.sourceUrl) ? (
              <span className="text-[11.5px] text-negative-light">
                Not a usable http or https address.
              </span>
            ) : null}
          </Field>

          <Field label="Date" required>
            <input
              type="date"
              value={draft.date}
              max={today()}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className={input}
            />
          </Field>

          <Field label="Status as of this update" hint="Moves the topic's own status too">
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className={input}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <button
            type="button"
            onClick={publishDevelopment}
            disabled={busy === "development"}
            className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61] disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
          >
            {busy === "development" ? "Publishing…" : "Publish update"}
          </button>
        </div>

        {events.length > 0 ? (
          <ol className="m-0 flex list-none flex-col gap-2 border-t border-veil/8 p-0 pt-5">
            {events.map((event) => {
              const href = safeExternalUrl(event.sourceUrl);
              return (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[12px] border border-veil/8 px-3.5 py-3"
                >
                  <time className="font-mono text-[10.5px] text-dim">{event.date}</time>
                  <span className="text-[13.5px] font-medium text-cream-bright">
                    {event.title}
                  </span>
                  <StatusBadge status={event.status as StatusId} size="sm" />
                  <span className="text-[12px] text-muted">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-veil/30 underline-offset-4 hover:text-cream"
                      >
                        {event.sourceName} ({urlHost(href)}) ↗
                      </a>
                    ) : (
                      <span title="No link — the source cannot be opened by a reader.">
                        {event.sourceName} · no link
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => run(event.id, () => removeDevelopment(event.id))}
                    disabled={busy === event.id}
                    className="ml-auto cursor-pointer text-[12px] text-dim transition-colors hover:text-negative-light disabled:cursor-not-allowed"
                  >
                    {busy === event.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="m-0 border-t border-veil/8 pt-5 text-[13px] text-dim">
            Nothing published on this topic yet.
          </p>
        )}
      </section>

      {/* ----------------------------------------------------------- basics */}
      <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-6">
        <h3 className="m-0 font-display text-[1.15rem] leading-[1.2] font-semibold tracking-[-0.015em] text-cream-bright">
          What it is
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </Field>

          <Field label="Address" hint="Fixed — links already point here">
            <input value={`/topics/${topic.slug}`} readOnly className={`${input} text-dim`} />
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={input}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={input}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Where it applies">
            <PlacePicker value={placeId} onChange={setPlaceId} />
          </Field>

          <Field label="One-line summary" className="sm:col-span-2">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className={`${input} resize-y`}
            />
          </Field>

          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              className={`${input} resize-y`}
            />
          </Field>

          <Field label="Tags" hint="Comma separated" className="sm:col-span-2">
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              className={input}
            />
          </Field>
        </div>

        <div>
          <button
            type="button"
            disabled={busy === "basics"}
            onClick={() =>
              run(
                "basics",
                () =>
                  updateTopic(topic.id, {
                    name,
                    categoryId,
                    placeId,
                    status,
                    summary,
                    about,
                    tags: tagText
                      .split(",")
                      .map((t) => t.trim().toLowerCase())
                      .filter(Boolean)
                      .slice(0, 6),
                  }),
                "Saved.",
              )
            }
            className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61] disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
          >
            {busy === "basics" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- aspects */}
      <section className="ohq-panel flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 font-display text-[1.15rem] leading-[1.2] font-semibold tracking-[-0.015em] text-cream-bright">
            What people are asked
          </h3>
          {/* Read-only, and not an oversight. Rewording a question that has
              already been answered silently changes what every existing answer
              meant — the tally stays, the question under it moves. Editing these
              needs a decision about the responses (keep them, or clear them and
              say so), and that decision belongs in a screen built for it rather
              than behind a text input that looks like every other one here. */}
          <p className="m-0 max-w-[68ch] text-[13px] leading-[1.6] font-light text-muted">
            Shown, not editable. Rewording a question people have already answered
            would change what their answers meant without changing the tally, so
            editing these needs its own flow — one that decides what happens to the
            existing responses.
          </p>
        </div>

        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {aspects.map((aspect) => (
            <li key={aspect.id} className="rounded-[12px] border border-veil/8 px-3.5 py-3">
              <span className="text-[13.5px] font-medium text-cream-bright">{aspect.label}</span>
              <span className="ml-2 text-[12.5px] text-muted">{aspect.prompt}</span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {aspect.options.map((option) => (
                  <span
                    key={option.id}
                    className="rounded-full border border-veil/12 px-2.5 py-[3px] text-[11.5px] text-soft"
                  >
                    {option.label}
                  </span>
                ))}
              </span>
            </li>
          ))}
          {aspects.length === 0 ? (
            <li className="text-[13px] text-dim">
              No aspects on this topic — a plain up/neutral/down vote is all it can
              collect.
            </li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}

const input =
  "w-full rounded-[10px] border border-veil/12 bg-surface-sunken px-3 py-2.5 text-[13.5px] text-cream outline-none transition-colors focus:border-positive/50";

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-baseline gap-1.5 text-[12px] text-muted">
        {label}
        {required ? <span className="text-positive-light">*</span> : null}
        {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
