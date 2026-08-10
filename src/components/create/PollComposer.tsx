"use client";

/**
 * Poll composer.
 *
 * A poll is a much smaller object than a topic — a question and two options —
 * so this is one page rather than a wizard. The only real constraints are the
 * ones that keep a poll answerable: it has to be a question, and the two
 * options have to be genuinely different things.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PollSplitBar } from "@/components/polls/PollSplitBar";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PlacePicker } from "@/components/ui/PlacePicker";
import { decoratePoll, pollColor } from "@/lib/derive-poll";
import { type PlaceId } from "@/lib/places";
import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryId, PollOption, PollOptionId, StatusId } from "@/lib/types";
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS } from "@/lib/types";

const MAX_QUESTION = 90;
const MAX_SUMMARY = 160;
const MAX_ABOUT = 420;
const MAX_OPTION = 40;
const MAX_BLURB = 90;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * The composer's closing field is prose, and a deadline is a timestamp.
 *
 * Only something `Date` can actually read becomes one; "Open-ended" and
 * anything unparseable mean no deadline. Guessing a date out of free text is
 * how a poll ends up closing on a day nobody chose.
 */
function parseCloses(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || /open[- ]ended/i.test(trimmed)) return "";
  const cleaned = trimmed.replace(/^open until\s+/i, "");
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) return "";
  return parsed.toISOString();
}

/**
 * Where a finished poll goes.
 *
 * The same arrangement `TopicComposer` uses: this component owns the flow, the
 * validation and the duplicate check, and knows nothing about who stores the
 * result. `/admin/polls/new` hands it one that writes to Postgres; without one
 * it falls back to the prototype's browser storage.
 */
export interface PollPublisher {
  publish: (draft: {
    slug: string;
    question: string;
    category: CategoryId;
    place: PlaceId;
    status: StatusId;
    summary: string;
    about: string;
    tags: string[];
    options: { name: string; blurb: string }[];
    closesAt: string;
    publish: boolean;
  }) => Promise<{ ok: true; slug: string } | { ok: false; message: string }>;
  isSlugFree: (slug: string) => Promise<boolean>;
  destination: (slug: string) => string;
  /** Whether "save as draft" is offered at all. */
  allowDraft?: boolean;
}

export function PollComposer({ publisher }: { publisher?: PollPublisher } = {}) {
  const router = useRouter();
  const { signedIn, ready, openAuth } = usePrototype();

  const [question, setQuestion] = useState("");
  const [cat, setCat] = useState<CategoryId>("entertainment");
  const [place, setPlace] = useState<PlaceId>("india");
  const [summary, setSummary] = useState("");
  const [about, setAbout] = useState("");
  const [tagText, setTagText] = useState("");
  const [closes, setCloses] = useState("Open-ended");
  const [drafts, setDrafts] = useState<{ name: string; blurb: string }[]>([
    { name: "", blurb: "" },
    { name: "", blurb: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);

  const setDraft = (i: number, patch: Partial<{ name: string; blurb: string }>) =>
    setDrafts((prev) => prev.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  /** Positional ids, assigned in the order the author wrote them. */
  const optionsFrom = (list: { name: string; blurb: string }[]): PollOption[] =>
    list.map((d, i) => ({
      id: (["a", "b", "c", "d"] as PollOptionId[])[i]!,
      name: d.name.trim() || `Option ${i + 1}`,
      blurb: d.blurb.trim(),
      votes: 0,
    }));

  const tags = useMemo(
    () =>
      tagText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6),
    [tagText],
  );

  const id = slugify(question);

  /** Live preview, built through the same derivation the real page uses. */
  const preview = useMemo(
    () =>
      decoratePoll({
        id: id || "preview",
        question: question || "Your question?",
        cat,
        place,
        status: "Live",
        summary,
        about,
        tags,
        options: optionsFrom(drafts),
        closes,
        trend: 0,
        recency: 0,
        updated: "just now",
      }),
    [id, question, cat, place, summary, about, tags, drafts, closes],
  );

  /**
   * The duplicate check, run as the draft is written rather than at publish.
   *
   * Somebody who has filled in a question, two options and a summary before
   * being told the poll already exists has been made to do the work twice for
   * nothing. Told early, they go and vote on the one that exists — which is
   * the outcome the whole feature is for.
   */
  // The duplicate check ran against a fixture catalog held in this browser.
  // The real one is `slug_available` in Postgres, which the publisher calls —
  // so there is nothing left to compare against here, and a check that always
  // says "clear" would be worse than no check at all.

  // Debounced, so typing a question is not one request per keystroke. The
  // stale guard matters more than the delay: replies can arrive out of order,
  // and the slow answer to an old question would overwrite the fast answer to
  // the current one.
  useEffect(() => {
    if (!publisher || !id) {
      setSlugTaken(false);
      return;
    }
    let stale = false;
    const timer = window.setTimeout(async () => {
      const free = await publisher.isSlugFree(id);
      if (!stale) setSlugTaken(!free);
    }, 350);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [publisher, id]);

  const validate = (): string | null => {
    if (slugTaken) return "A poll or topic already uses that address.";
    if (question.trim().length < 8) return "Write a question of at least eight characters.";
    if (!question.trim().endsWith("?")) return "A poll has to be a question — end it with a question mark.";
    if (!id) return "That question does not produce a usable address. Add some letters or numbers.";
    if (drafts.some((d) => d.name.trim().length < 2))
      return "Every option needs a name of at least two characters.";
    const names = drafts.map((d) => d.name.trim().toLowerCase());
    if (new Set(names).size !== names.length)
      return "Two of the options are the same. A poll needs a real choice between them.";
    if (drafts.some((d) => !d.blurb.trim()))
      return "Give each option a one-line case — it is what keeps the choice fair.";
    if (summary.trim().length < 20) return "Write a one-line summary of at least twenty characters.";
    return null;
  };

  const publish = async (asDraft = false) => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    if (publisher) {
      setSaving(true);
      setError(null);
      const result = await publisher.publish({
        slug: id,
        question: question.trim(),
        category: cat,
        place,
        status: "Live",
        summary: summary.trim(),
        about: about.trim() || summary.trim(),
        tags: tags.length > 0 ? tags : [cat],
        options: drafts.map((d, i) => ({
          name: d.name.trim() || `Option ${i + 1}`,
          blurb: d.blurb.trim(),
        })),
        // The composer's `closes` field is prose ("Open-ended", "Open until
        // 15 Aug"). A real deadline is a timestamp, so only a parseable date is
        // sent — anything else means open-ended, which is a state rather than a
        // missing value.
        closesAt: parseCloses(closes),
        publish: !asDraft,
      });
      setSaving(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(publisher.destination(result.slug));
      return;
    }

    // Without a publisher there is nowhere for this to go. The public
    // composer route is gone; only /admin/polls/new renders this component.
    setError("Publishing is not available here.");
  };

  if (ready && !signedIn) {
    return (
      <Shell>
        <div className="ohq-panel flex flex-col items-center gap-4 px-5 py-[clamp(48px,8vw,90px)] text-center">
          <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] tracking-[-0.02em] leading-[1.05] text-cream-bright">
            Sign in to <em>create a poll</em>
          </h1>
          <p className="m-0 max-w-[460px] text-[14px] leading-[1.6] font-light text-muted">
            Polls are attributed to the account that publishes them. Reading and
            browsing never needs one.
          </p>
          <button
            type="button"
            onClick={() => openAuth("signin")}
            className="cursor-pointer rounded-full bg-positive px-6 py-3 text-[14px] font-semibold text-positive-ink outline-none focus-visible:ring-2 focus-visible:ring-positive-light"
          >
            Sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-3">
        <h1 className="m-0 font-display font-bold text-[clamp(2rem,4vw,3.1rem)] leading-[1.02] tracking-[-0.025em] text-cream-bright">
          Create a <em>poll</em>
        </h1>
        <p className="m-0 max-w-[620px] text-[14px] leading-[1.55] font-light text-muted">
          One question, two to four options, no middle ground. The best polls on{" "}
          <Brand /> force a choice people genuinely find hard — if one option is
          obviously right, there is nothing to measure.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-7">
            <Field label="The question" hint={`${question.length}/${MAX_QUESTION} — must end with “?”`}>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
                placeholder="e.g. Night trains or morning flights?"
                className={inputClass}
              />
              {id ? (
                <span className="font-mono text-[10.5px] text-dim">
                  /polls/{id}{" "}
                  {slugTaken ? (
                    <span className="text-negative-light">· already taken</span>
                  ) : null}
                </span>
              ) : null}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type">
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value as CategoryId)}
                  className={inputClass}
                >
                  {CATEGORIES.filter((c) => !c.reserved).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                  {/* A poll can be about anything, so the catch-all needs to be
                      an obvious option rather than a buried one. */}
                  <optgroup label="Fits none of these">
                    {CATEGORIES.filter((c) => c.reserved).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              <Field label="Where it applies" hint="Required">
                <PlacePicker value={place} onChange={setPlace} className={inputClass} />
              </Field>
              <Field label="Closes" hint="Or leave it open-ended" className="sm:col-span-2">
                <input
                  value={closes}
                  onChange={(e) => setCloses(e.target.value.slice(0, 40))}
                  placeholder="e.g. Open until 30 Sep 2026"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>


          {/* One card per option, each in its own colour. Between two and four:
              two is the sharpest question, and past four a split bar stops
              being readable and a "winner" stops meaning much. */}
          <section className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {drafts.map((draft, i) => {
                const color = pollColor(i);
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-4 rounded-[18px] border p-5"
                    style={{ borderColor: `${color}44`, background: `${color}0A` }}
                  >
                    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ background: color }}
                      />
                      <span style={{ color }}>Option {String.fromCharCode(65 + i)}</span>
                      {drafts.length > MIN_POLL_OPTIONS ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((prev) => prev.filter((_, k) => k !== i))
                          }
                          className="ml-auto cursor-pointer text-[10px] tracking-[0.1em] text-dim normal-case transition-colors hover:text-negative-light"
                        >
                          Remove
                        </button>
                      ) : null}
                    </span>
                    <Field label="Name">
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setDraft(i, { name: e.target.value.slice(0, MAX_OPTION) })
                        }
                        placeholder={
                          i === 0 ? "e.g. Night train" : i === 1 ? "e.g. Morning flight" : "e.g. Overnight bus"
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="The case for it" hint={`${draft.blurb.length}/${MAX_BLURB}`}>
                      <textarea
                        value={draft.blurb}
                        onChange={(e) =>
                          setDraft(i, { blurb: e.target.value.slice(0, MAX_BLURB) })
                        }
                        rows={2}
                        placeholder="One line. Make it the strongest honest version."
                        className={inputClass}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>

            {drafts.length < MAX_POLL_OPTIONS ? (
              <button
                type="button"
                onClick={() => setDrafts((prev) => [...prev, { name: "", blurb: "" }])}
                className="cursor-pointer rounded-[16px] border border-dashed border-veil/14 px-5 py-3.5 text-[13px] text-muted transition-colors duration-300 outline-none hover:border-veil/30 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
              >
                + Add another option ({drafts.length}/{MAX_POLL_OPTIONS})
              </button>
            ) : null}
          </section>

          <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-7">
            <Field
              label="One-line summary"
              hint={`${summary.length}/${MAX_SUMMARY} — shown on the card`}
            >
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, MAX_SUMMARY))}
                rows={2}
                placeholder="Why is this worth asking right now?"
                className={inputClass}
              />
            </Field>
            <Field
              label="Context"
              hint={`${about.length}/${MAX_ABOUT} — optional, shown under the question`}
            >
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
                rows={4}
                placeholder="The facts a voter needs before choosing. Keep it even-handed — the case for each side belongs on the option, not here."
                className={inputClass}
              />
            </Field>
            <Field label="Tags" hint="Comma separated, up to six">
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="trains, travel, commute"
                className={inputClass}
              />
              {tags.length > 0 ? (
                <span className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-veil/8 px-2.5 py-[3px] text-[11px] text-dim"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </Field>
          </section>
        </div>

        {/* Live preview — the actual card component, not a mock-up of it. */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--ohq-nav-h)+24px)] lg:self-start">
          <span className="ohq-eyebrow">Live preview</span>
          <div className="ohq-panel flex flex-col gap-3.5 p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-[8px] border border-veil/8 bg-veil/4 text-muted"
                >
                  <CategoryIcon category={cat} size={15} />
                </span>
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
                  {CATEGORIES.find((c) => c.id === cat)?.short}
                </span>
              </span>
              <span className="rounded-full border border-veil/12 px-2.5 py-[3px] text-[10.5px] text-dim">
                {preview.verdict}
              </span>
            </div>
            <h3 className="font-display m-0 text-[16.5px] leading-[1.28] font-semibold text-pretty text-cream-bright">
              {question || "Your question?"}
            </h3>
            <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] font-light text-muted">
              {summary || "Your one-line summary appears here."}
            </p>
            <PollSplitBar poll={preview} height={28} />
            <span className="border-t border-veil/6 pt-3 text-[12.5px] text-soft">
              Be the first to vote
            </span>
          </div>

          <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/3 p-4 text-[12.5px] leading-[1.6] text-dim">
            In production a new poll enters a moderation queue, and both options
            must be checked for a loaded framing before it goes live (brief §18).
            Here it publishes immediately and is stored in this browser only.
          </p>

          {error ? (
            <p role="alert" className="m-0 text-[13px] text-negative-light">
              {error}
            </p>
          ) : null}

          {(
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void publish()}
                disabled={saving}
                className="cursor-pointer rounded-full bg-poll px-6 py-3 text-[14.5px] font-semibold text-poll-ink transition-colors duration-300 outline-none hover:bg-[#B9A2FC] focus-visible:ring-2 focus-visible:ring-poll-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Publishing…" : "Publish poll"}
              </button>
              {publisher?.allowDraft ? (
                <button
                  type="button"
                  onClick={() => void publish(true)}
                  disabled={saving}
                  className="cursor-pointer rounded-full border border-veil/16 px-6 py-2.5 text-[13px] font-medium text-soft transition-colors duration-300 hover:border-veil/40 hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save as draft
                </button>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1160px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8">
      <div className="mb-5">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Polls", href: "/polls" },
            { label: "Create" },
          ]}
        />
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[13.5px] leading-[1.5] text-cream outline-none transition-colors duration-300 focus:border-poll/50";

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex flex-wrap items-baseline gap-2 text-[12px] text-muted">
        {label}
        {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
