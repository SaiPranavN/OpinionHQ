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
import { useMemo, useState } from "react";

import { PollSplitBar } from "@/components/polls/PollSplitBar";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { decoratePoll, POLL_A_COLOR, POLL_B_COLOR } from "@/lib/derive-poll";
import { CATEGORIES } from "@/lib/taxonomy";
import type { CategoryId, Poll } from "@/lib/types";

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

export function PollComposer() {
  const router = useRouter();
  const { signedIn, ready, openAuth, createPoll, isPollIdAvailable } = usePrototype();

  const [question, setQuestion] = useState("");
  const [cat, setCat] = useState<CategoryId>("entertainment");
  const [summary, setSummary] = useState("");
  const [about, setAbout] = useState("");
  const [tagText, setTagText] = useState("");
  const [closes, setCloses] = useState("Open-ended");
  const [aName, setAName] = useState("");
  const [aBlurb, setABlurb] = useState("");
  const [bName, setBName] = useState("");
  const [bBlurb, setBBlurb] = useState("");
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

  const id = slugify(question);

  /** Live preview, built through the same derivation the real page uses. */
  const preview = useMemo(
    () =>
      decoratePoll({
        id: id || "preview",
        question: question || "Your question?",
        cat,
        status: "Live",
        summary,
        about,
        tags,
        a: { id: "a", name: aName || "Option A", blurb: aBlurb, votes: 0 },
        b: { id: "b", name: bName || "Option B", blurb: bBlurb, votes: 0 },
        closes,
        trend: 0,
        recency: 0,
        updated: "just now",
      }),
    [id, question, cat, summary, about, tags, aName, aBlurb, bName, bBlurb, closes],
  );

  const validate = (): string | null => {
    if (question.trim().length < 8) return "Write a question of at least eight characters.";
    if (!question.trim().endsWith("?")) return "A poll has to be a question — end it with a question mark.";
    if (!id) return "That question does not produce a usable address. Add some letters or numbers.";
    if (!isPollIdAvailable(id)) return "A poll with that question already exists.";
    if (aName.trim().length < 2 || bName.trim().length < 2) return "Both options need a name.";
    if (aName.trim().toLowerCase() === bName.trim().toLowerCase())
      return "The two options are the same. A poll needs a real choice.";
    if (!aBlurb.trim() || !bBlurb.trim())
      return "Give each option a one-line case — it is what makes the choice fair.";
    if (summary.trim().length < 20) return "Write a one-line summary of at least twenty characters.";
    return null;
  };

  const publish = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const draft: Poll = {
      id,
      question: question.trim(),
      cat,
      status: "Live",
      summary: summary.trim(),
      about: about.trim() || summary.trim(),
      tags: tags.length > 0 ? tags : [cat],
      a: { id: "a", name: aName.trim(), blurb: aBlurb.trim(), votes: 0 },
      b: { id: "b", name: bName.trim(), blurb: bBlurb.trim(), votes: 0 },
      closes: closes.trim() || "Open-ended",
      trend: 0,
      recency: 0,
      updated: "just now",
    };
    createPoll(draft);
    router.push(`/polls/${id}`);
  };

  if (ready && !signedIn) {
    return (
      <Shell>
        <div className="ohq-panel flex flex-col items-center gap-4 px-5 py-[clamp(48px,8vw,90px)] text-center">
          <h1 className="m-0 font-serif text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.05] text-cream-bright">
            Sign in to <em className="italic">create a poll</em>
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
        <h1 className="m-0 font-serif text-[clamp(2rem,4vw,3.1rem)] leading-[1.02] tracking-[-0.025em] text-cream-bright">
          Create a <em className="italic">poll</em>
        </h1>
        <p className="m-0 max-w-[620px] text-[14px] leading-[1.55] font-light text-muted">
          Two options, one question, no middle ground. The best polls on{" "}
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
                  {!isPollIdAvailable(id) ? (
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
              <Field label="Closes" hint="Or leave it open-ended">
                <input
                  value={closes}
                  onChange={(e) => setCloses(e.target.value.slice(0, 40))}
                  placeholder="e.g. Open until 30 Sep 2026"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          {/* The two options, each in its own side's colour. */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ["A", POLL_A_COLOR, aName, setAName, aBlurb, setABlurb, "e.g. Night train"],
                ["B", POLL_B_COLOR, bName, setBName, bBlurb, setBBlurb, "e.g. Morning flight"],
              ] as const
            ).map(([letter, color, name, setName, blurb, setBlurb, placeholder]) => (
              <div
                key={letter}
                className="flex flex-col gap-4 rounded-[18px] border p-5"
                style={{ borderColor: `${color}44`, background: `${color}0A` }}
              >
                <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span style={{ color }}>Option {letter}</span>
                </span>
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, MAX_OPTION))}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </Field>
                <Field label="The case for it" hint={`${blurb.length}/${MAX_BLURB}`}>
                  <textarea
                    value={blurb}
                    onChange={(e) => setBlurb(e.target.value.slice(0, MAX_BLURB))}
                    rows={2}
                    placeholder="One line. Make it the strongest honest version."
                    className={inputClass}
                  />
                </Field>
              </div>
            ))}
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
                      className="rounded-full border border-white/8 px-2.5 py-[3px] text-[11px] text-dim"
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
                  className="grid h-7 w-7 place-items-center rounded-[8px] border border-white/8 bg-white/4 text-muted"
                >
                  <CategoryIcon category={cat} size={15} />
                </span>
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
                  {CATEGORIES.find((c) => c.id === cat)?.short}
                </span>
              </span>
              <span className="rounded-full border border-white/12 px-2.5 py-[3px] text-[10.5px] text-dim">
                {preview.verdict}
              </span>
            </div>
            <h3 className="m-0 text-[16.5px] leading-[1.28] font-semibold text-pretty text-cream-bright">
              {question || "Your question?"}
            </h3>
            <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] font-light text-muted">
              {summary || "Your one-line summary appears here."}
            </p>
            <PollSplitBar poll={preview} height={28} />
            <span className="border-t border-white/6 pt-3 text-[12.5px] text-soft">
              Be the first to vote
            </span>
          </div>

          <p className="m-0 rounded-[12px] border border-white/8 bg-white/3 p-4 text-[12.5px] leading-[1.6] text-dim">
            In production a new poll enters a moderation queue, and both options
            must be checked for a loaded framing before it goes live (brief §18).
            Here it publishes immediately and is stored in this browser only.
          </p>

          {error ? (
            <p role="alert" className="m-0 text-[13px] text-negative-light">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={publish}
            className="cursor-pointer rounded-full bg-[#A78BFA] px-6 py-3 text-[14.5px] font-semibold text-[#1B1233] transition-colors duration-300 outline-none hover:bg-[#B9A2FC] focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
          >
            Publish poll
          </button>
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
  "w-full rounded-[10px] border border-white/10 bg-surface-sunken px-3 py-2.5 text-[13.5px] leading-[1.5] text-cream outline-none transition-colors duration-300 focus:border-[#A78BFA]/50";

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
