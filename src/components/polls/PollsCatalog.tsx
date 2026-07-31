"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { PollCard } from "@/components/polls/PollCard";
import { usePrototype } from "@/components/prototype/PrototypeProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PrototypeDataBadge } from "@/components/ui/PrototypeDataBadge";
import { decoratePoll, formatNumber } from "@/lib/derive-poll";
import { filterAndSortPolls, POLL_SORTS, pollSortLabel, type PollSortId } from "@/lib/polls";
import { categoryOf } from "@/lib/taxonomy";
import type { CategoryFilterId, DecoratedPoll } from "@/lib/types";

export function PollsCatalog({
  polls,
  counts,
  totalVotes,
}: {
  polls: DecoratedPoll[];
  counts: Map<string, number>;
  totalVotes: number;
}) {
  const { createdPolls } = usePrototype();
  const [category, setCategory] = useState<CategoryFilterId>("All");
  const [sort, setSort] = useState<PollSortId>("trending");
  const [query, setQuery] = useState("");

  // Polls published from the composer sit alongside the editor-published ones,
  // newest first, so a just-created poll is immediately visible.
  const all = useMemo(
    () => [...createdPolls.map(decoratePoll), ...polls],
    [createdPolls, polls],
  );

  const liveCounts = useMemo(() => {
    const next = new Map(counts);
    for (const poll of createdPolls) {
      next.set(poll.cat, (next.get(poll.cat) ?? 0) + 1);
    }
    return next;
  }, [counts, createdPolls]);

  const results = useMemo(
    () => filterAndSortPolls(all, { category, sort, query }),
    [all, category, sort, query],
  );

  const scope = category === "All" ? "" : ` in ${categoryOf(category).label}`;
  const summary =
    results.length === all.length
      ? `${results.length} polls sorted by ${pollSortLabel(sort)}`
      : `${results.length} of ${all.length} polls${scope} sorted by ${pollSortLabel(sort)}`;

  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8 lg:px-14">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Polls" }]} />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="m-0 font-serif text-[clamp(2rem,4vw,3.1rem)] leading-[1.02] font-normal tracking-[-0.025em] text-cream-bright">
            Pick a <em className="italic">side</em>
          </h1>
          <p className="mt-2 mb-0 max-w-[580px] text-[14px] leading-[1.5] font-light text-muted">
            Head-to-head polls. Two options, no fence to sit on, and{" "}
            {formatNumber(totalVotes)} votes cast so far. Every result breaks down by
            region, age and occupation.
          </p>
        </div>
        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <PrototypeDataBadge />
          <Link
            href="/polls/new"
            className="rounded-full border border-[#A78BFA]/45 bg-[#A78BFA]/12 px-4 py-[7px] text-[13px] font-medium whitespace-nowrap text-[#C4B5FD] transition-colors duration-300 outline-none hover:bg-[#A78BFA]/20 focus-visible:ring-2 focus-visible:ring-[#A78BFA]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            + Create a poll
          </Link>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative flex min-w-0 flex-1 items-center sm:max-w-[300px]">
          <span aria-hidden className="absolute left-3 text-[13px] text-dim">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search polls, options, tags…"
            aria-label="Search polls by question, option, category or tag"
            className="w-full rounded-[10px] border border-white/10 bg-surface py-[10px] pr-3 pl-8 text-[13.5px] text-cream outline-none transition-colors duration-300 focus:border-[#A78BFA]/50 focus-visible:ring-2 focus-visible:ring-[#A78BFA]/40"
          />
        </label>
        <label className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as PollSortId)}
            aria-label="Sort polls"
            className="cursor-pointer rounded-[10px] border border-white/10 bg-surface px-3 py-[10px] font-sans text-[13.5px] tracking-[-0.01em] normal-case text-cream outline-none transition-colors duration-300 focus:border-[#A78BFA]/50"
          >
            {POLL_SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <CategoryFilter value={category} counts={liveCounts} onChange={setCategory} />
      </div>

      <div className="mt-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
        <p aria-live="polite" className="m-0 text-[12.5px] text-dim">
          {summary}
        </p>
        {query || category !== "All" ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="cursor-pointer rounded-full border border-white/12 px-3 py-1 text-[11.5px] text-muted transition-colors duration-300 outline-none hover:border-white/28 hover:text-cream focus-visible:ring-2 focus-visible:ring-[#A78BFA]/60"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-white/10 px-5 py-[clamp(48px,8vw,96px)] text-center">
          <p className="m-0 font-serif text-[clamp(1.5rem,3vw,2.2rem)] text-cream-bright">
            No polls here <em className="italic">yet.</em>
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="cursor-pointer rounded-full border border-[#A78BFA]/40 bg-[#A78BFA]/12 px-5 py-2.5 text-[13.5px] font-medium text-[#C4B5FD] outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/60"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
