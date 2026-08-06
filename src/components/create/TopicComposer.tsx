"use client";

/**
 * Topic composer — the manual half of the hybrid authoring model.
 *
 * Three steps: what the topic is, what people should be asked about it, and a
 * review before it goes live. The aspect step is the important one: a generic
 * up/neutral/down vote is nearly useless, so a new topic is not publishable
 * until it carries at least two questions of its own.
 *
 * The agent-assisted half plugs in at `suggestAspects()`. Today it seeds the
 * category's generic set as a starting point; in production the same call goes
 * to an extraction agent that reads the topic's description and sources and
 * proposes aspects for a human to edit and approve. The rest of this flow —
 * shapes, validation, publish — does not change when that lands.
 *
 * IT DOES NOT KNOW WHERE THE TOPIC GOES. Given a `publisher` it writes to
 * Postgres through the admin's session; without one it falls back to the
 * prototype's `localStorage` store. Two callers, one set of rules — which
 * matters because the rules are the valuable part of this file, and a second
 * composer for the admin would have been a second place for "at least two
 * aspects" to be enforced differently.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PlacePicker } from "@/components/ui/PlacePicker";
import { SentimentBar } from "@/components/ui/SentimentBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DEFAULT_FACET_SET, FACET_SETS } from "@/lib/facets";
import type { PlaceId } from "@/lib/places";
import { CATEGORIES, SENTIMENT_COLOR, STATUS_STYLES } from "@/lib/taxonomy";
import type { CategoryId, Topic, Facet, StatusId } from "@/lib/types";

const STEPS = ["What it is", "What to ask", "Review"] as const;

const MIN_ASPECTS = 2;
const MAX_ASPECTS = 6;
const MAX_SUMMARY = 160;
const MAX_ABOUT = 420;

interface DraftAspect {
  key: string;
  label: string;
  prompt: string;
  pos: string;
  neu: string;
  neg: string;
}

const BLANK_ASPECT = (): DraftAspect => ({
  key: Math.random().toString(36).slice(2, 9),
  label: "",
  prompt: "",
  pos: "",
  neu: "",
  neg: "",
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function toFacets(aspects: DraftAspect[]): Facet[] {
  return aspects.map((aspect, i) => ({
    id: `a${i}-${slugify(aspect.label) || "aspect"}`,
    label: aspect.label.trim(),
    prompt: aspect.prompt.trim(),
    options: [
      { id: "pos", label: aspect.pos.trim(), tone: "Positive" as const },
      { id: "neu", label: aspect.neu.trim(), tone: "Neutral" as const },
      { id: "neg", label: aspect.neg.trim(), tone: "Negative" as const },
    ],
  }));
}

function isComplete(aspect: DraftAspect): boolean {
  return Boolean(
    aspect.label.trim() && aspect.prompt.trim() && aspect.pos.trim() && aspect.neu.trim() && aspect.neg.trim(),
  );
}

/**
 * Where a finished topic goes.
 *
 * Absent means the prototype store. The admin passes one that writes to
 * Postgres; nothing else about the flow changes.
 */
export interface TopicPublisher {
  publish: (draft: {
    slug: string;
    name: string;
    category: CategoryId;
    place: PlaceId;
    status: StatusId;
    summary: string;
    about: string;
    tags: string[];
    aspects: Facet[];
    publish: boolean;
  }) => Promise<{ ok: true; slug: string } | { ok: false; message: string }>;
  isSlugFree: (slug: string) => Promise<boolean>;
  /** Where to land afterwards. */
  destination: (slug: string) => string;
  /** Shown on the review step: publishing straight away, or saving a draft. */
  allowDraft?: boolean;
}

export function TopicComposer({ publisher }: { publisher?: TopicPublisher } = {}) {
  const router = useRouter();
  const { signedIn, openAuth, createTopic, isIdAvailable, ready } = usePrototype();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  /**
   * Whether the address is taken, when a publisher is answering.
   *
   * Held in state rather than checked inside `validateBasics`, because that call
   * is synchronous and the real answer is a round trip. Starts `false` so a
   * blank form does not open on an error.
   */
  const [slugTaken, setSlugTaken] = useState(false);
  const [name, setName] = useState("");
  const [cat, setCat] = useState<CategoryId>("entertainment");
  const [place, setPlace] = useState<PlaceId>("india");
  const [status, setStatus] = useState<StatusId>("Ongoing");
  const [summary, setSummary] = useState("");
  const [about, setAbout] = useState("");
  const [tagText, setTagText] = useState("");
  const [aspects, setAspects] = useState<DraftAspect[]>([BLANK_ASPECT(), BLANK_ASPECT()]);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(
    () =>
      tagText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6),
    [tagText],
  );

  const id = slugify(name);
  const complete = aspects.filter(isComplete);
  const isReserved = CATEGORIES.find((c) => c.id === cat)?.reserved ?? false;

  // Debounced, so typing a name is not one request per keystroke. The stale
  // guard matters more than the delay: replies can arrive out of order, and the
  // slow answer to an old name would otherwise overwrite the fast answer to the
  // current one.
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

  /**
   * The seam an authoring agent will sit behind. Same signature, same output
   * shape — only the source of the suggestions changes.
   */
  const suggestAspects = () => {
    const source = FACET_SETS[DEFAULT_FACET_SET[cat]] ?? [];
    setAspects(
      source.slice(0, 4).map((facet) => ({
        key: facet.id,
        label: facet.label,
        prompt: facet.prompt,
        pos: facet.options[0]?.label ?? "",
        neu: facet.options[1]?.label ?? "",
        neg: facet.options[2]?.label ?? "",
      })),
    );
    setError(null);
  };

  const validateBasics = (): string | null => {
    if (name.trim().length < 4) return "Give the topic a name of at least four characters.";
    if (!id) return "That name does not produce a usable address. Add some letters or numbers.";
    const taken = publisher ? slugTaken : !isIdAvailable(id);
    if (taken) return "A topic with that name already exists. Try a more specific one.";
    if (summary.trim().length < 20) return "Write a one-line summary of at least twenty characters.";
    if (about.trim().length < 40) return "Add a little more context — at least forty characters.";
    return null;
  };

  const validateAspects = (): string | null => {
    if (complete.length < MIN_ASPECTS) {
      return `Add at least ${MIN_ASPECTS} complete aspects. Every field in an aspect is required.`;
    }
    const labels = complete.map((a) => a.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return "Two aspects share a label. Make each one distinct.";
    return null;
  };

  const next = () => {
    const problem = step === 0 ? validateBasics() : step === 1 ? validateAspects() : null;
    setError(problem);
    if (!problem) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const publish = async (asDraft = false) => {
    if (busy) return;
    const problem = validateBasics() ?? validateAspects();
    if (problem) {
      setError(problem);
      return;
    }

    if (publisher) {
      setBusy(true);
      setError(null);
      const result = await publisher.publish({
        slug: id,
        name: name.trim(),
        category: cat,
        place,
        status,
        summary: summary.trim(),
        about: about.trim(),
        tags: tags.length > 0 ? tags : [cat],
        aspects: toFacets(complete),
        publish: !asDraft,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(publisher.destination(result.slug));
      return;
    }

    const draft: Omit<Topic, "createdBy" | "createdAt"> = {
      id,
      name: name.trim(),
      cat,
      place,
      status,
      summary: summary.trim(),
      about: about.trim(),
      tags: tags.length > 0 ? tags : [cat],
      aspects: toFacets(complete),
      // A brand-new topic has no aggregate. Everything downstream reads
      // `participants === 0` and shows "no votes yet" rather than a fake split.
      pos: 0,
      neu: 0,
      neg: 0,
      participants: 0,
      trend: 0,
      recency: 0,
      updated: "just now",
      change: { metric: "participation", value: 0, direction: "up" },
    };
    createTopic(draft);
    router.push(`/topics/${id}`);
  };

  // The admin does its own gating in the route's layout, and its editors are
  // signed in by definition. This panel is the prototype's door.
  if (!publisher && ready && !signedIn) {
    return (
      <Shell>
        <div className="ohq-panel flex flex-col items-center gap-4 px-5 py-[clamp(48px,8vw,90px)] text-center">
          <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] tracking-[-0.02em] leading-[1.05] text-cream-bright">
            Sign in to <em className="italic">create a topic</em>
          </h1>
          <p className="m-0 max-w-[460px] text-[14px] leading-[1.6] font-light text-muted">
            Topics are attributed to the account that publishes them, so this
            one step needs an account. Browsing and reading never will.
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
          Create an <em className="italic">topic</em>
        </h1>
        <p className="m-0 max-w-[600px] text-[14px] leading-[1.55] font-light text-muted">
          A topic is a subject people can hold an opinion about. Describe it,
          then decide what participants should actually be asked — the questions
          are what make the result worth reading.
        </p>
      </header>

      <ol className="m-0 mt-7 flex list-none flex-wrap gap-2 p-0">
        {STEPS.map((label, i) => {
          const state = i === step ? "current" : i < step ? "done" : "todo";
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={state === "current" ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                  state === "current"
                    ? "border-positive/50 bg-positive/14 text-positive-light"
                    : state === "done"
                      ? "cursor-pointer border-veil/16 text-soft hover:border-veil/32"
                      : "border-veil/8 text-dim"
                }`}
              >
                <span className="font-mono text-[10px]">{i + 1}</span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {step === 0 ? (
          <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-7">
            <Field label="Name" hint="What people will search for">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="e.g. Chennai Metro Phase 2 Delays"
                className={inputClass}
              />
              {id ? (
                <span className="font-mono text-[10.5px] text-dim">
                  /topics/{id}{" "}
                  {!isIdAvailable(id) ? (
                    <span className="text-negative-light">· already taken</span>
                  ) : null}
                </span>
              ) : null}
            </Field>

            <Field label="Where it applies" hint="Required">
              <PlacePicker value={place} onChange={setPlace} className={inputClass} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type" hint="Sets the fallback questions">
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
                  {/* Kept in its own group so it reads as a deliberate escape
                      hatch rather than just the last item in a long list. */}
                  <optgroup label="Fits none of these">
                    {CATEGORIES.filter((c) => c.reserved).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {isReserved ? (
                  <span className="text-[11px] leading-[1.5] text-[#F0A83C]">
                    No category questions exist for this, so the suggested
                    aspects are generic. Writing your own matters more here than
                    anywhere else.
                  </span>
                ) : null}
              </Field>
              <Field label="Status" hint="Where this stands right now">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusId)}
                  className={inputClass}
                >
                  {Object.keys(STATUS_STYLES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="One-line summary"
              hint={`${summary.length}/${MAX_SUMMARY} — shown on the card`}
            >
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value.slice(0, MAX_SUMMARY))}
                rows={2}
                placeholder="What is it, and why are people talking about it?"
                className={inputClass}
              />
            </Field>

            <Field
              label="Description"
              hint={`${about.length}/${MAX_ABOUT} — shown under the name on the dashboard`}
            >
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
                rows={4}
                placeholder="The facts a reader needs before forming a view. Keep it neutral — opinions belong in votes, not here."
                className={inputClass}
              />
            </Field>

            <Field label="Tags" hint="Comma separated, up to six">
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="metro, chennai, infrastructure"
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
        ) : null}

        {step === 1 ? (
          <section className="flex flex-col gap-4">
            <div className="ohq-panel flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <h2 className="font-display m-0 mb-1.5 text-[15px] font-semibold text-cream-bright">
                  Aspects — the sub-opinions under the vote
                </h2>
                <p className="m-0 max-w-[520px] text-[12.5px] leading-[1.55] text-dim">
                  Each aspect is one question with three answers, ordered
                  positive, neutral, negative. Ask what people actually argue
                  about — not what a category template would ask.
                </p>
              </div>
              <button
                type="button"
                onClick={suggestAspects}
                className="cursor-pointer rounded-full border border-positive/35 bg-positive/10 px-4 py-2 text-[12.5px] font-medium whitespace-nowrap text-positive-light transition-colors duration-300 outline-none hover:bg-positive/16 focus-visible:ring-2 focus-visible:ring-positive/60"
              >
                Suggest from category
              </button>
            </div>

            {aspects.map((aspect, i) => (
              <div key={aspect.key} className="ohq-panel flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
                    Aspect {i + 1}
                    {isComplete(aspect) ? (
                      <span className="ml-2 text-positive-light">complete</span>
                    ) : null}
                  </span>
                  {aspects.length > MIN_ASPECTS ? (
                    <button
                      type="button"
                      onClick={() =>
                        setAspects((prev) => prev.filter((a) => a.key !== aspect.key))
                      }
                      className="cursor-pointer text-[12px] text-dim transition-colors duration-300 outline-none hover:text-negative-light focus-visible:ring-2 focus-visible:ring-positive/60"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Label" hint="Short — shown as the heading">
                    <input
                      value={aspect.label}
                      onChange={(e) =>
                        setAspects((prev) =>
                          prev.map((a) =>
                            a.key === aspect.key
                              ? { ...a, label: e.target.value.slice(0, 40) }
                              : a,
                          ),
                        )
                      }
                      placeholder="e.g. Signalling certification"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Question" hint="What participants are asked">
                    <input
                      value={aspect.prompt}
                      onChange={(e) =>
                        setAspects((prev) =>
                          prev.map((a) =>
                            a.key === aspect.key
                              ? { ...a, prompt: e.target.value.slice(0, 90) }
                              : a,
                          ),
                        )
                      }
                      placeholder="e.g. Is the stated reason for the delay credible?"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["pos", "Positive answer", "e.g. Credible"],
                      ["neu", "Neutral answer", "e.g. Thin"],
                      ["neg", "Negative answer", "e.g. Not credible"],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-[12px] text-muted">
                        <span
                          aria-hidden
                          className="h-[7px] w-[7px] rounded-[2px]"
                          style={{
                            background:
                              key === "pos"
                                ? SENTIMENT_COLOR.Positive
                                : key === "neu"
                                  ? SENTIMENT_COLOR.Neutral
                                  : SENTIMENT_COLOR.Negative,
                          }}
                        />
                        {label}
                      </span>
                      <input
                        value={aspect[key]}
                        onChange={(e) =>
                          setAspects((prev) =>
                            prev.map((a) =>
                              a.key === aspect.key
                                ? { ...a, [key]: e.target.value.slice(0, 30) }
                                : a,
                            ),
                          )
                        }
                        placeholder={placeholder}
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {aspects.length < MAX_ASPECTS ? (
              <button
                type="button"
                onClick={() => setAspects((prev) => [...prev, BLANK_ASPECT()])}
                className="cursor-pointer rounded-[16px] border border-dashed border-veil/14 px-5 py-4 text-[13px] text-muted transition-colors duration-300 outline-none hover:border-veil/30 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
              >
                + Add another aspect ({aspects.length}/{MAX_ASPECTS})
              </button>
            ) : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="flex flex-col gap-4">
            <div className="ohq-panel flex flex-col gap-4 p-5 sm:p-7">
              <span className="ohq-eyebrow">How the card will look</span>
              <div className="ohq-panel flex max-w-[400px] flex-col gap-3.5 p-5">
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
                  <StatusBadge status={status} size="sm" />
                </div>
                <h3 className="font-display m-0 text-[16.5px] leading-[1.28] font-semibold text-cream-bright">
                  {name || "Untitled topic"}
                </h3>
                <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] font-light text-muted">
                  {summary || "No summary yet."}
                </p>
                <span className="text-[20px] leading-none font-semibold text-[#D6D3CD]">
                  No votes yet
                </span>
                <SentimentBar pos={0} neu={0} neg={0} label="No votes recorded yet" />
                <span className="text-[12.5px] text-dim">Be the first to vote</span>
              </div>
            </div>

            <div className="ohq-panel flex flex-col gap-4 p-5 sm:p-7">
              <span className="ohq-eyebrow">
                {complete.length} aspects participants will be asked
              </span>
              {complete.map((aspect) => (
                <div
                  key={aspect.key}
                  className="flex flex-col gap-2 border-b border-veil/6 pb-4 last:border-0 last:pb-0"
                >
                  <span className="text-[14px] font-semibold text-cream">
                    {aspect.label}
                  </span>
                  <span className="text-[12.5px] text-dim">{aspect.prompt}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {[
                      [aspect.pos, SENTIMENT_COLOR.Positive],
                      [aspect.neu, SENTIMENT_COLOR.Neutral],
                      [aspect.neg, SENTIMENT_COLOR.Negative],
                    ].map(([label, color]) => (
                      <span
                        key={label}
                        className="rounded-[8px] border px-2.5 py-1 text-[12px] text-soft"
                        style={{ borderColor: `${color}66` }}
                      >
                        {label}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>

            <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/3 p-4 text-[12.5px] leading-[1.6] text-dim">
              In production this draft would enter a moderation queue before
              going live, and the description would need at least one source
              (brief §18). In the prototype it publishes immediately and is
              stored in this browser only.
            </p>
          </section>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 mb-0 text-[13px] text-negative-light">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            className="cursor-pointer rounded-full border border-veil/16 px-5 py-2.5 text-[13.5px] text-soft transition-colors duration-300 outline-none hover:border-veil/36 focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="cursor-pointer rounded-full bg-positive px-6 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light"
          >
            Continue
          </button>
        ) : (
          <>
            {/* Saving a draft is offered only where drafts are visible. In the
                prototype store there is nowhere for one to be seen from. */}
            {publisher?.allowDraft ? (
              <button
                type="button"
                onClick={() => void publish(true)}
                disabled={busy}
                className="cursor-pointer rounded-full border border-veil/16 px-5 py-2.5 text-[13.5px] font-medium text-cream transition-colors duration-300 outline-none hover:border-veil/40 focus-visible:ring-2 focus-visible:ring-positive/60 disabled:cursor-not-allowed disabled:text-dim"
              >
                Save as draft
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void publish(false)}
              disabled={busy}
              className="cursor-pointer rounded-full bg-positive px-6 py-2.5 text-[13.5px] font-semibold text-positive-ink transition-colors duration-300 outline-none hover:bg-[#25CC61] focus-visible:ring-2 focus-visible:ring-positive-light disabled:cursor-not-allowed disabled:bg-veil/10 disabled:text-dim"
            >
              {busy ? "Publishing…" : "Publish topic"}
            </button>
          </>
        )}
        <span className="ml-auto font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[860px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8">
      <div className="mb-5">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Explore", href: "/topics" },
            { label: "Create" },
          ]}
        />
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-veil/10 bg-surface-sunken px-3 py-2.5 text-[13.5px] leading-[1.5] text-cream outline-none transition-colors duration-300 focus:border-positive/50";

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
      <span className="flex flex-wrap items-baseline gap-2 text-[12px] text-muted">
        {label}
        {hint ? <span className="text-[10.5px] text-dim">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
