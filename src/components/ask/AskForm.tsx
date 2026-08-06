"use client";

/**
 * `/ask/new` — one page.
 *
 * Area, question, context, and optionally the choices and a deadline. That is
 * everything a person with relevant proof needs to give a useful read.
 *
 * The earlier version had six steps, including separate screens for response
 * format, contributor types and privacy. All three were removed rather than
 * merged: there is only one response format, matching already routes on proof
 * so picking job titles was busywork, and a privacy promise belongs where you
 * are typing rather than on a screen you click past.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useAsk, type QuestionDraft } from "@/components/ask/AskProvider";
import { PlacePicker } from "@/components/ui/PlacePicker";
import type { PlaceId } from "@/lib/places";
import {
  AskCategoryIcon,
  CredentialChip,
  Field,
  LockIcon,
  PRIVATE_COLOR,
  PRIVATE_LINE,
  PRIVATE_SOFT,
  PrivacyNotice,
  askInput,
  askPrimary,
} from "@/components/ask/primitives";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Brand } from "@/components/ui/Brand";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { rank } from "@/lib/ask/matching";
import { askAllowanceLine } from "@/lib/entitlements";
import { ASK_CATEGORIES, MAX_MATCHES } from "@/lib/ask/taxonomy";
import { credentialsFor } from "@/lib/ask/verification";
import {
  MAX_ASK_OPTIONS,
  MIN_ASK_OPTIONS,
  type AskCategoryId,
  type QuestionVisibility,
} from "@/lib/ask/types";

const PROMPTS: Record<AskCategoryId, string> = {
  career:
    "Where you are now, what the choice actually is, and what you want in two or three years. Numbers only if they matter to the decision.",
  college:
    "Her profile, the colleges and programmes in play, what the fees mean for you, and what she wants to end up doing.",
  exam:
    "Where your preparation stands, the exam and year, the score you want, and how many hours a week you can genuinely protect.",
};

export function AskForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signedIn, ready: sessionReady, openAuth, pro, openUpgrade } = usePrototype();
  const { ask, professionals, allCredentials, canAskNow, freeAsksLeft } = useAsk();

  const initial = (params.get("area") as AskCategoryId | null) ?? "career";
  const [category, setCategory] = useState<AskCategoryId>(
    ASK_CATEGORIES.some((c) => c.id === initial) ? initial : "career",
  );
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [deadline, setDeadline] = useState("");
  const [place, setPlace] = useState<PlaceId>("india");
  // Public by default. The answers to most of these questions are worth
  // reading by the next person in the same situation, and defaulting to
  // private threw that away one question at a time.
  const [visibility, setVisibility] = useState<QuestionVisibility>("public");
  const [error, setError] = useState<string | null>(null);

  const cleanOptions = useMemo(
    () => options.map((o) => o.trim()).filter(Boolean),
    [options],
  );

  const setOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, k) => (k === i ? value : o)));

  /** Who this would reach, computed live through the real matcher. */
  const willReach = useMemo(() => {
    if (title.trim().length < 8) return [];
    return rank(
      {
        id: "preview",
        askerUserId: "you",
        askerName: "You",
        visibility,
        category,
        place,
        title,
        context: "",
        options: cleanOptions,
        deadline: "",
        createdAt: "",
        updatedAt: "",
      },
      professionals.filter((p) => p.userId !== "you"),
      allCredentials,
    ).slice(0, MAX_MATCHES);
  }, [title, category, place, cleanOptions, visibility, professionals, allCredentials]);

  const submit = () => {
    if (title.trim().length < 12) {
      setError("Give the question a title of at least twelve characters.");
      return;
    }
    if (context.trim().length < 40) {
      setError("Add some context — at least forty characters. Nobody can read a situation they cannot see.");
      return;
    }
    if (cleanOptions.length < MIN_ASK_OPTIONS) {
      setError(
        `Write at least ${MIN_ASK_OPTIONS} choices. They are what gets scored — an answer to "what should I do?" with nothing to weigh is just an essay.`,
      );
      return;
    }
    const unique = new Set(cleanOptions.map((o) => o.toLowerCase()));
    if (unique.size !== cleanOptions.length) {
      setError("Two of your choices are the same. Each one needs to be a distinct option.");
      return;
    }
    setError(null);
    const draft: QuestionDraft = {
      category,
      place,
      title: title.trim(),
      context: context.trim(),
      options: cleanOptions,
      deadline: deadline.trim(),
      visibility,
    };
    // `ask` returns an empty id when the allowance is spent and opens the
    // subscribe sheet itself. Navigating on an empty id would land on a
    // not-found page behind the modal, which reads as a bug rather than a
    // price — so the composer stays exactly where it is, draft intact.
    const id = ask(draft);
    if (id) router.push(`/ask/questions/${id}`);
  };

  if (sessionReady && !signedIn) {
    return (
      <Shell>
        <div className="ohq-panel flex flex-col items-center gap-4 px-5 py-[clamp(48px,8vw,90px)] text-center">
          <span style={{ color: PRIVATE_COLOR }}>
            <LockIcon size={26} />
          </span>
          <h1 className="m-0 font-display font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] tracking-[-0.02em] leading-[1.05] text-cream-bright">
            Sign in to <em className="italic">ask</em>
          </h1>
          <p className="m-0 max-w-[440px] text-[14px] leading-[1.6] font-light text-muted">
            Asking needs an account, so the answers can find their way back to you.
            There is no anonymous mode — but your name is never attached to a
            question, whether you publish it or keep it private.
          </p>
          <button type="button" onClick={() => openAuth("signin")} className={askPrimary}>
            Sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-3">
        <h1 className="m-0 font-display font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.02] tracking-[-0.025em] text-cream-bright">
          Ask a <em className="italic">question</em>
        </h1>
        <p className="m-0 max-w-[600px] text-[14px] leading-[1.55] font-light text-muted">
          Write the question and the choices you are weighing. It goes to up to{" "}
          {MAX_MATCHES} people whose proof fits it — they score your choices and
          tell you which one they would take. Your name is never shown.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="ohq-panel flex flex-col gap-5 p-5 sm:p-7">
            <Field label="Area">
              <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-3">
                {ASK_CATEGORIES.map((item) => {
                  const active = category === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setCategory(item.id)}
                        aria-pressed={active}
                        className={`flex h-full w-full cursor-pointer flex-col gap-2 rounded-[14px] border p-3.5 text-left transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-positive/60 ${
                          active
                            ? "border-positive/45 bg-positive/8"
                            : "border-veil/10 hover:border-veil/24"
                        }`}
                      >
                        <span style={{ color: active ? "#4ED27C" : PRIVATE_COLOR }}>
                          <AskCategoryIcon category={item.id} size={17} />
                        </span>
                        <span className="text-[13.5px] font-semibold text-cream-bright">
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Field>

            <Field label="What are you deciding?" hint={`${title.length}/120`}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="e.g. Should I take the platform role, or wait for the promotion cycle?"
                className={askInput}
              />
            </Field>

            <Field label="Context" hint={PROMPTS[category]}>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 2000))}
                rows={9}
                placeholder="Describe it as you would to someone sitting across the table from you."
                className={askInput}
              />
            </Field>

            {/* The choices are the question. A professional scores these rather
                than a set of generic dimensions, which is what makes two
                answers comparable and the disagreement visible. */}
            <Field
              label="What are your choices?"
              hint={`${MIN_ASK_OPTIONS}–${MAX_ASK_OPTIONS} — these are what each person scores`}
            >
              <div className="flex flex-col gap-2.5">
                {options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-veil/12 font-mono text-[10.5px] text-dim"
                    >
                      {i + 1}
                    </span>
                    <input
                      value={option}
                      onChange={(e) => setOption(i, e.target.value.slice(0, 80))}
                      placeholder={
                        i === 0
                          ? "e.g. Take the platform role"
                          : i === 1
                            ? "e.g. Stay for the March cycle"
                            : "e.g. Ask for a trial period first"
                      }
                      className={askInput}
                    />
                    {options.length > MIN_ASK_OPTIONS ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((prev) => prev.filter((_, k) => k !== i))
                        }
                        aria-label={`Remove choice ${i + 1}`}
                        className="shrink-0 cursor-pointer px-1 text-[16px] leading-none text-dim transition-colors hover:text-negative-light"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
                {options.length < MAX_ASK_OPTIONS ? (
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => [...prev, ""])}
                    className="w-fit cursor-pointer rounded-full border border-dashed border-veil/14 px-4 py-1.5 text-[12.5px] text-muted transition-colors duration-300 outline-none hover:border-veil/30 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
                  >
                    + Add a choice ({options.length}/{MAX_ASK_OPTIONS})
                  </button>
                ) : null}
              </div>
            </Field>

            {/* Coarse on purpose. It routes the question and it is shown
                publicly, so a city is as fine as this ever gets. */}
            <Field label="Where you are deciding" hint="Shown on a public question">
              <PlacePicker value={place} onChange={setPlace} className={askInput} />
            </Field>

            <Field label="Deadline" hint="Optional">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={askInput}
              />
            </Field>

            {/*
              Two radios rather than a checkbox. A checkbox labelled "make this
              private" has an unstated default and makes one choice look like
              the deviation; laying both out states plainly what each does, and
              the consequence is written under each rather than in a tooltip
              somebody reads after publishing.
            */}
            {/* A fieldset, deliberately NOT the `Field` primitive. `Field`
                wraps its children in a `<label>`, and each choice below is a
                label of its own — nested labels are invalid HTML, and the
                parser silently split them into four inputs where there should
                have been two. A group of controls wants a legend, not a label. */}
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className="mb-1.5 p-0 text-[12px] text-muted">
                Who can read this
              </legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <VisibilityChoice
                  value="public"
                  current={visibility}
                  onSelect={setVisibility}
                  title="Anyone"
                  body="Your question and its answers appear in Ask Verified. Your name is not shown."
                />
                <VisibilityChoice
                  value="private"
                  current={visibility}
                  onSelect={setVisibility}
                  title="Only the people answering"
                  body="Nobody else can open it, or see that it exists."
                />
              </div>
            </fieldset>
          </section>

          {error ? (
            <p role="alert" className="m-0 text-[13px] text-negative-light">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={canAskNow ? submit : () => openUpgrade("ask-question")}
              className={askPrimary}
            >
              <LockIcon size={14} />
              {!canAskNow
                ? "Get Pro to ask"
                : visibility === "private"
                  ? "Send privately"
                  : "Publish question"}
            </button>
            <span className="text-[12px] text-dim">
              {visibility === "private"
                ? "Not public, not searchable, not on anyone’s profile."
                : "Published to the browse list. Who asked stays private."}
            </span>
          </div>

          {/* The allowance, stated before they write rather than after.
              A limit you discover by hitting it feels like a trap; one you can
              see coming is a price. */}
          <p
            className="m-0 rounded-[12px] border px-3.5 py-3 text-[12.5px] leading-[1.55]"
            style={{
              borderColor: canAskNow ? "var(--color-line)" : PRIVATE_LINE,
              background: canAskNow ? "transparent" : PRIVATE_SOFT,
              color: canAskNow ? "var(--color-dim)" : "var(--color-private-soft)",
            }}
          >
            {askAllowanceLine(pro, freeAsksLeft)}{" "}
            {!pro && !canAskNow
              ? "Everything else — reading questions and answers, answering with verified proof, voting and replying — stays free."
              : null}
          </p>
        </div>

        {/* Who it reaches, through the real matcher rather than a mock-up. */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--ohq-nav-h)+24px)] lg:self-start">
          <div className="ohq-panel flex flex-col gap-4 p-5">
            <span className="ohq-eyebrow">Who this reaches</span>
            {willReach.length === 0 ? (
              <p className="m-0 text-[12.5px] leading-[1.6] text-dim">
                Write a title and this fills in — it runs the same matching the real send
                does.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                {willReach.map(({ professional }) => (
                  <li key={professional.userId} className="flex flex-col gap-2">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[13.5px] font-semibold text-cream">
                        {professional.name}
                      </span>
                      <span className="text-[11.5px] text-dim">{professional.headline}</span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {credentialsFor(allCredentials, professional.userId, category).map(
                        (credential) => (
                          <CredentialChip key={credential.id} credential={credential} />
                        ),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 border-t border-line pt-3.5 text-[11.5px] leading-[1.6] text-dim">
              Matched on your title and the area only. Your context is never used for
              matching — it is the most personal thing you write.
            </p>
          </div>

          {/* Tracks the live selection: a notice that promises privacy while
              "Anyone" is checked is not reassurance, it is a false statement
              about the form it sits next to. */}
          <PrivacyNotice visibility={visibility} />

          <p className="m-0 rounded-[12px] border border-veil/8 bg-veil/2 p-4 text-[12px] leading-[1.6] text-dim">
            Medical, legal, financial, tax, immigration, relationship and mental-health
            questions are out of scope and have no area here. Those belong with a licensed
            professional, and <Brand /> will not route them to one.
          </p>
        </aside>
      </div>
    </Shell>
  );
}

/**
 * One of the two visibility options.
 *
 * A real radio input under the card, so the group is keyboard-navigable with
 * arrow keys and announces as a radio group — a pair of styled `<button>`s
 * would look identical and behave like neither.
 */
function VisibilityChoice({
  value,
  current,
  onSelect,
  title,
  body,
}: {
  value: QuestionVisibility;
  current: QuestionVisibility;
  onSelect: (v: QuestionVisibility) => void;
  title: string;
  body: string;
}) {
  const active = current === value;
  return (
    <label
      className="flex cursor-pointer flex-col gap-1 rounded-[12px] border p-3.5 transition-[border-color,background] duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-positive/60"
      style={{
        borderColor: active ? PRIVATE_LINE : "color-mix(in oklab, var(--color-veil) 10%, transparent)",
        background: active ? PRIVATE_SOFT : "transparent",
      }}
    >
      <span className="flex items-center gap-2">
        <input
          type="radio"
          name="ask-visibility"
          checked={active}
          onChange={() => onSelect(value)}
          className="sr-only"
        />
        <span
          aria-hidden
          className="grid h-4 w-4 shrink-0 place-items-center rounded-full border"
          style={{
            borderColor: active ? PRIVATE_COLOR : "color-mix(in oklab, var(--color-veil) 26%, transparent)",
          }}
        >
          {active ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: PRIVATE_COLOR }}
            />
          ) : null}
        </span>
        <span className="text-[13.5px] font-medium text-cream">{title}</span>
      </span>
      <span className="pl-6 text-[12px] leading-[1.5] text-dim">{body}</span>
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1080px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8">
      <div className="mb-5">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Ask Verified", href: "/ask" },
            { label: "New question" },
          ]}
        />
      </div>
      {children}
    </section>
  );
}
