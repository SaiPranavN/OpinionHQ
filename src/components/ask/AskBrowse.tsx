"use client";

/**
 * `/ask` — the browse screen, and the section's front door.
 *
 * This used to be a dashboard: the first thing you saw was your own questions,
 * and if you had none it was an empty page with an explanation. A section whose
 * landing screen is empty until you contribute to it has nothing to show for
 * itself, which is most of why questions are public now.
 *
 * So the front door is the questions themselves, readable signed out. The
 * personal surfaces — what you asked, what is waiting for you — moved to their
 * own routes and are reachable from the rail on every screen.
 */

import { useMemo, useState } from "react";

import { useAsk } from "@/components/ask/AskProvider";
import { AskRail } from "@/components/ask/AskRail";
import { QuestionCard } from "@/components/ask/QuestionCard";
import {
  AskCategoryIcon,
  EmptyState,
  PrototypeAuthNotice,
} from "@/components/ask/primitives";
import { Brand } from "@/components/ui/Brand";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SearchField } from "@/components/ui/SearchField";
import { ASK_CATEGORIES } from "@/lib/ask/taxonomy";
import type { AskCategoryId } from "@/lib/ask/types";
import { placeLabel } from "@/lib/places";
import type { SuggestItem } from "@/lib/suggest";

type Filter = "all" | AskCategoryId;

export function AskBrowse() {
  const { browsable, answers, ready } = useAsk();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of browsable) map.set(q.category, (map.get(q.category) ?? 0) + 1);
    return map;
  }, [browsable]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return browsable.filter((q) => {
      if (filter !== "all" && q.category !== filter) return false;
      if (!needle) return true;
      // The context box is deliberately not searched. It is where people write
      // the specifics of their situation, and a search that reaches into it
      // makes a published question more exposed than its author expected.
      return [q.title, ...q.options].join(" ").toLowerCase().includes(needle);
    });
  }, [browsable, filter, query]);

  /**
   * The suggestion index.
   *
   * Titles and choices only. The context box is not indexed, for the same
   * reason it is not searched: it is where people write the specifics of their
   * situation, and a suggestion list that surfaces those makes a published
   * question more exposed than its author expected.
   */
  const index = useMemo<SuggestItem[]>(
    () =>
      browsable.map((q) => ({
        id: q.id,
        label: q.title,
        kind: "question",
        href: `/ask/questions/${q.id}`,
        hint: `${q.category} · ${placeLabel(q.place)}`,
        keywords: [...q.options, placeLabel(q.place)],
      })),
    [browsable],
  );

  const answerCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of answers) map.set(a.questionId, (map.get(a.questionId) ?? 0) + 1);
    return map;
  }, [answers]);

  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8 lg:px-14">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Ask Verified" }]} />

      <header className="mt-4 flex flex-col gap-3">
        <h1 className="m-0 font-display font-bold text-[clamp(2rem,4vw,3.1rem)] leading-[1.02] tracking-[-0.025em] text-cream-bright">
          Questions answered by people who <em className="italic">proved it</em>
        </h1>
        <p className="m-0 max-w-[640px] text-[14px] leading-[1.55] font-light text-muted">
          Career, college and exam decisions, answered one to one by people whose
          proof <Brand /> has checked. Most are public so the next person with the
          same decision can read them — the asker&rsquo;s name never is. Anything
          you would rather keep to yourself can be asked privately instead.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <SearchField
              value={query}
              onChange={setQuery}
              index={index}
              label="Search public questions by title or choice"
              placeholder="Search questions"
              accent="private"
            />
          </div>

          <ul className="ohq-scroll-x mt-4 flex list-none gap-2 overflow-x-auto p-0 pb-1">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label="All"
              count={browsable.length}
            />
            {ASK_CATEGORIES.map((c) => (
              <FilterChip
                key={c.id}
                active={filter === c.id}
                onClick={() => setFilter(c.id)}
                label={c.short}
                count={counts.get(c.id) ?? 0}
                icon={<AskCategoryIcon category={c.id} size={13} />}
              />
            ))}
          </ul>

          <p aria-live="polite" className="mt-4 mb-4 text-[12.5px] text-dim">
            {results.length}{" "}
            {results.length === 1 ? "public question" : "public questions"}
          </p>

          {!ready ? null : results.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 xl:grid-cols-2">
              {results.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  answers={answerCount.get(q.id) ?? 0}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nothing here yet"
              body={
                query || filter !== "all"
                  ? "No public question matches that. Try a different area or clear the search."
                  : "No public questions yet. Be the first to ask one."
              }
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <AskRail />
          <PrototypeAuthNotice />
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-private/60 ${
          active
            ? "border-private/50 bg-private/12 text-private-soft"
            : "border-veil/10 text-muted hover:border-veil/26 hover:text-cream"
        }`}
      >
        {icon}
        {label}
        <span className="font-mono text-[10.5px] text-dim">{count}</span>
      </button>
    </li>
  );
}
