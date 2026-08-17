"use client";

/**
 * The search bar, shared by every catalog.
 *
 * One component so the three of them cannot drift apart, and so the keyboard
 * behaviour is written once. It is a proper combobox: arrow keys move a
 * highlight, Enter opens it, Escape closes the list before it clears the
 * field, and `aria-activedescendant` tells a screen reader which row is
 * current without moving focus off the input.
 *
 * TWO ANIMATIONS, doing different jobs. An empty box cycles through real
 * queries from the catalog underneath it, so the field advertises what is in
 * there rather than sitting blank. A box being typed into drops its matches in
 * with a short stagger, which reads as the list arriving rather than blinking
 * into place. Both are suppressed under `prefers-reduced-motion` — the hints
 * stop rotating and the rows appear at once.
 */

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { hintCycle, suggest, type Suggestion, type SuggestItem } from "@/lib/suggest";

const HINT_MS = 3200;

export function SearchField({
  value,
  onChange,
  index,
  label,
  placeholder = "Search",
  accent = "positive",
}: {
  value: string;
  onChange: (next: string) => void;
  /** Everything searchable on this page. Ranked by `suggest`. */
  index: readonly SuggestItem[];
  /** The accessible name. Never rendered — the placeholder rotates. */
  label: string;
  placeholder?: string;
  accent?: "positive" | "poll" | "private";
}) {
  const router = useRouter();
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState(0);
  const [reduced, setReduced] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const hints = useMemo(() => hintCycle(index), [index]);
  const matches = useMemo(() => suggest(value, index), [value, index]);

  // The rotation only runs while the field is empty and idle. Cycling text
  // under somebody's cursor while they type would be a distraction, and moving
  // text behind a caret is the worst version of it.
  const rotating = !reduced && !focused && value === "" && hints.length > 1;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setHint((i) => (i + 1) % hints.length), HINT_MS);
    return () => window.clearInterval(timer);
  }, [rotating, hints.length]);

  const open = focused && matches.length > 0;

  useEffect(() => setActive(-1), [value]);

  const choose = (match: Suggestion) => {
    if (match.href) {
      router.push(match.href);
      return;
    }
    onChange(match.label);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Close the list first, clear the query only if it was already closed.
      if (open) setFocused(false);
      else onChange("");
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const match = matches[active];
      if (match) choose(match);
    }
  };

  const tone = TONE[accent];

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-[560px]">
      {/* `h-11`, not `h-12`. It was the tallest thing in a row of controls that
          are all the same kind of thing; see ui/control.ts. */}
      <div
        className={`flex h-11 items-center gap-2.5 rounded-full border bg-surface pr-2 pl-4 transition-[border-color,box-shadow] duration-300 ${
          focused ? tone.focus : "border-veil/10"
        }`}
      >
        <SearchIcon />
        <span className="relative flex min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            // Deferred so a click on a row lands before the list unmounts.
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onKeyDown={onKeyDown}
            placeholder={rotating ? "" : placeholder}
            className="ohq-search-input min-w-0 flex-1 bg-transparent text-[14px] text-cream outline-none placeholder:text-dim"
          />
          {/* The rotating hint sits behind the input rather than inside its
              placeholder attribute, because a placeholder cannot be animated
              and swapping it produces a hard cut. `key` restarts the
              animation on each change. */}
          {rotating ? (
            <span
              key={hint}
              aria-hidden
              className="ohq-hint pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 truncate text-[14px] text-dim"
            >
              <span className="shrink-0 opacity-70">{placeholder}</span>
              <span className="truncate text-soft/70">{hints[hint]}</span>
            </span>
          ) : null}
        </span>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-dim transition-colors duration-300 outline-none hover:bg-veil/6 hover:text-cream focus-visible:ring-2 focus-visible:ring-veil/30"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="ohq-suggestions absolute top-[calc(100%+8px)] right-0 left-0 z-40 m-0 max-h-[340px] list-none overflow-y-auto rounded-[18px] border border-veil/12 bg-surface-raised p-1.5 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.9)]"
        >
          {matches.map((match, i) => (
            <li
              key={match.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(match)}
              style={reduced ? undefined : { animationDelay: `${i * 28}ms` }}
              className={`ohq-suggestion flex cursor-pointer items-center gap-3 rounded-[13px] px-3 py-2.5 transition-colors duration-200 ${
                i === active ? tone.row : ""
              }`}
            >
              <KindBadge kind={match.kind} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13.5px] leading-[1.35] text-cream">
                  <Highlighted label={match.label} range={match.range} tone={tone.mark} />
                </span>
                {match.hint ? (
                  <span className="truncate text-[11.5px] text-dim">{match.hint}</span>
                ) : null}
              </span>
              {match.href ? (
                <span aria-hidden className="shrink-0 text-[13px] text-dim">
                  ↵
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The matched run, in the accent colour. Everything else stays as written. */
function Highlighted({
  label,
  range,
  tone,
}: {
  label: string;
  range?: [number, number];
  tone: string;
}) {
  if (!range) return <>{label}</>;
  const [from, to] = range;
  return (
    <>
      {label.slice(0, from)}
      <mark className={`bg-transparent font-semibold ${tone}`}>{label.slice(from, to)}</mark>
      {label.slice(to)}
    </>
  );
}

function KindBadge({ kind }: { kind: Suggestion["kind"] }) {
  return (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-veil/8 bg-veil/4 font-mono text-[9px] tracking-[0.06em] uppercase text-dim"
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

const KIND_LABEL: Record<Suggestion["kind"], string> = {
  topic: "Tp",
  poll: "Pl",
  question: "Qn",
  category: "Cat",
  place: "Pin",
  tag: "Tag",
};

const TONE = {
  positive: {
    focus: "border-positive/45 shadow-[0_0_0_3px_rgba(29,185,84,0.12)]",
    row: "bg-positive/10",
    mark: "text-positive-light",
  },
  poll: {
    focus: "border-poll/45 shadow-[0_0_0_3px_rgba(167,139,250,0.14)]",
    row: "bg-poll/12",
    mark: "text-poll-soft",
  },
  private: {
    focus: "border-private/45 shadow-[0_0_0_3px_rgba(143,168,196,0.14)]",
    row: "bg-private/12",
    mark: "text-private-soft",
  },
} as const;

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0 text-dim"
    >
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
