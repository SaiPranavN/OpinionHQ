"use client";

/**
 * The editor's view of one poll.
 *
 * Unlike a topic, a poll has no timeline — a choice does not develop, it just
 * closes. So the panel order is inverted: the poll's own wording first, then
 * the options, then the closing date, which is the one field an editor comes
 * back to change.
 *
 * OPTIONS CAN BE REWORDED AND NOT REORDERED. A vote is stored against a slot,
 * so renaming "Alpha" to "Alpha 2" keeps every vote pointing at the same thing
 * and fixes a typo. Swapping slots a and b would silently move every vote to
 * the other side. The first is an edit; the second is a rewrite of the result,
 * and there is no button for it here.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlacePicker } from "@/components/ui/PlacePicker";
import { renameOption, updatePoll } from "@/lib/admin/polls";
import { pollColor } from "@/lib/derive-poll";
import type { PlaceId } from "@/lib/places";
import { CATEGORIES, STATUS_STYLES } from "@/lib/taxonomy";
import type { CategoryId, StatusId } from "@/lib/types";

export interface EditablePoll {
  id: string;
  slug: string;
  question: string;
  categoryId: string;
  placeId: string;
  status: string;
  summary: string;
  about: string;
  tags: string[];
  closesAt: string | null;
  published: boolean;
  archived: boolean;
}

export interface EditableOption {
  id: string;
  slot: string;
  name: string;
  blurb: string;
  votes: number;
}

const STATUSES = Object.keys(STATUS_STYLES) as StatusId[];

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` with no zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PollEditor({
  poll,
  options,
}: {
  poll: EditablePoll;
  options: EditableOption[];
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    question: poll.question,
    categoryId: poll.categoryId,
    placeId: poll.placeId,
    status: poll.status,
    summary: poll.summary,
    about: poll.about,
    tags: poll.tags.join(", "),
    closesAt: toLocalInput(poll.closesAt),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [optionDrafts, setOptionDrafts] = useState(
    Object.fromEntries(options.map((o) => [o.id, { name: o.name, blurb: o.blurb }])),
  );
  const [savingOption, setSavingOption] = useState<string | null>(null);

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updatePoll(poll.id, {
      question: form.question,
      categoryId: form.categoryId,
      placeId: form.placeId,
      status: form.status,
      summary: form.summary,
      about: form.about,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      closesAt: form.closesAt,
    });
    setSaving(false);
    if (!result.ok) {
      setMessage({ tone: "bad", text: result.message });
      return;
    }
    setMessage({ tone: "ok", text: "Saved." });
    router.refresh();
  };

  const saveOption = async (id: string) => {
    const draft = optionDrafts[id];
    if (!draft) return;
    setSavingOption(id);
    setMessage(null);
    const result = await renameOption(id, draft);
    setSavingOption(null);
    if (!result.ok) {
      setMessage({ tone: "bad", text: result.message });
      return;
    }
    setMessage({ tone: "ok", text: "Option updated." });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 font-display text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.018em] text-cream-bright">
            Edit poll
          </h2>
          <p className="m-0 font-mono text-[11px] tracking-[0.06em] text-dim">
            /polls/{poll.slug} · {totalVotes} vote{totalVotes === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/polls"
            className="rounded-full border border-veil/16 px-4 py-1.5 text-[12.5px] text-soft transition-colors hover:border-veil/40 hover:text-cream"
          >
            Back
          </Link>
          {poll.published && !poll.archived ? (
            <Link
              href={`/polls/${poll.slug}`}
              className="rounded-full border border-veil/16 px-4 py-1.5 text-[12.5px] text-soft transition-colors hover:border-veil/40 hover:text-cream"
            >
              View live ↗
            </Link>
          ) : null}
        </div>
      </div>

      {message ? (
        <p
          role="alert"
          className={`m-0 rounded-[12px] border px-4 py-3 text-[13px] ${
            message.tone === "ok"
              ? "border-positive/30 bg-positive/8 text-positive-light"
              : "border-negative/30 bg-negative/8 text-negative-light"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {/* ------------------------------------------------------ what it asks */}
      <section className="ohq-panel flex flex-col gap-4 p-5">
        <h3 className="m-0 text-[14px] font-semibold text-cream-bright">What it asks</h3>

        <Field label="Question">
          <input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className={inputClass}
            >
              {CATEGORIES.map((c: { id: CategoryId; label: string }) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Where it applies">
          <PlacePicker
            value={form.placeId as PlaceId}
            onChange={(place) => setForm({ ...form, placeId: place })}
          />
        </Field>

        <Field
          label="Closes"
          hint="Leave empty for open-ended. Past this moment the database refuses new votes; the poll stays readable."
        >
          <input
            type="datetime-local"
            value={form.closesAt}
            onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Summary">
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            rows={4}
            className={inputClass}
          />
        </Field>

        <Field label="Tags" hint="Comma separated.">
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="cursor-pointer rounded-full bg-positive px-5 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors hover:bg-[#25CC61] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- options */}
      <section className="ohq-panel flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[14px] font-semibold text-cream-bright">The options</h3>
          <p className="m-0 max-w-[70ch] text-[12.5px] leading-[1.6] text-muted">
            Wording can be corrected. The order cannot be changed here, and neither
            can the number of them: a vote is recorded against a position, so
            swapping two options would move every vote already cast to the other
            side without touching a single number on the page.
          </p>
        </div>

        {options.map((option, i) => {
          const draft = optionDrafts[option.id] ?? { name: "", blurb: "" };
          const dirty = draft.name !== option.name || draft.blurb !== option.blurb;
          return (
            <div
              key={option.id}
              className="flex flex-col gap-3 rounded-[12px] border border-veil/10 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: pollColor(i) }}
                />
                <span className="font-mono text-[10.5px] tracking-[0.12em] text-dim uppercase">
                  Option {option.slot}
                </span>
                <span className="font-mono text-[10.5px] text-dim">
                  {option.votes} vote{option.votes === 1 ? "" : "s"}
                </span>
              </div>

              <input
                value={draft.name}
                onChange={(e) =>
                  setOptionDrafts({
                    ...optionDrafts,
                    [option.id]: { ...draft, name: e.target.value },
                  })
                }
                placeholder="Name"
                className={inputClass}
              />
              <input
                value={draft.blurb}
                onChange={(e) =>
                  setOptionDrafts({
                    ...optionDrafts,
                    [option.id]: { ...draft, blurb: e.target.value },
                  })
                }
                placeholder="One line on what this option is, or the case for it."
                className={inputClass}
              />

              {dirty ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveOption(option.id)}
                    disabled={savingOption === option.id}
                    className="cursor-pointer rounded-full border border-veil/16 px-4 py-1.5 text-[12px] font-medium text-cream transition-colors hover:border-veil/40 disabled:cursor-not-allowed disabled:text-dim"
                  >
                    {savingOption === option.id ? "Saving…" : "Save option"}
                  </button>
                  {option.votes > 0 ? (
                    <span className="text-[11.5px] text-dim">
                      {option.votes} {option.votes === 1 ? "person has" : "people have"} already
                      voted for this wording.
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-veil/12 bg-surface-sunken px-3.5 py-2.5 text-[13.5px] text-cream outline-none transition-colors focus:border-positive/50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-soft">{label}</span>
      {children}
      {hint ? <span className="text-[11.5px] leading-[1.5] text-dim">{hint}</span> : null}
    </label>
  );
}
