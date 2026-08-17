"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Brand } from "@/components/ui/Brand";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { TopicCard } from "@/components/catalog/TopicCard";
import { SortControl } from "@/components/catalog/SortControl";
import { useSession } from "@/components/auth/SessionProvider";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SuggestButton } from "@/components/pro/SuggestButton";
import { WelcomeOffer } from "@/components/pro/WelcomeOffer";
import { PlaceFilter } from "@/components/ui/PlaceFilter";
import { SearchField } from "@/components/ui/SearchField";
import { placeLabel, type PlaceFilterId } from "@/lib/places";
import { filterAndSort, topicIndex } from "@/lib/topics";
import { categoryOf, sortLabel } from "@/lib/taxonomy";
import type { CategoryFilterId, DecoratedTopic, SortId } from "@/lib/types";

export function CatalogView({
  topics,
  counts,
}: {
  topics: DecoratedTopic[];
  counts: Map<string, number>;
}) {
  const { isEditor } = useSession();
  const [category, setCategory] = useState<CategoryFilterId>("All");
  const [sort, setSort] = useState<SortId>("trending");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<PlaceFilterId>("any");

  /**
   * The catalog is what the server sent, and nothing else.
   *
   * It used to concatenate topics held in this browser's own storage, because
   * the composer published there. Every topic now lives in one place, and
   * merging a local list back in would put rows on screen that no other visitor
   * can see — on a page whose counts are read as a measurement of the platform.
   */
  const all = topics;
  const liveCounts = counts;

  const results = useMemo(
    () => filterAndSort(all, { category, sort, query, place }),
    [all, category, sort, query, place],
  );

  const index = useMemo(() => topicIndex(all), [all]);

  const scope = [
    category === "All" ? "" : ` in ${categoryOf(category).label}`,
    place === "any" ? "" : ` for ${placeLabel(place)}`,
  ].join("");
  const noun = results.length === 1 ? "topic" : "topics";
  const summary =
    results.length === all.length
      ? `${results.length} ${noun} sorted by ${sortLabel(sort)}`
      : `${results.length} of ${all.length} ${noun}${scope} sorted by ${sortLabel(sort)}`;

  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8 lg:px-14">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Explore" }]} />

      {/* Fires only for an account that has just been created — see the
          component for why the flag is a query parameter. */}
      <WelcomeOffer />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[clamp(1.75rem,3.4vw,2.8rem)] leading-[1.05] font-bold tracking-[-0.025em] text-balance text-cream-bright">
            Explore topics &amp; <em>give your opinion</em>
          </h1>
          <p className="mt-2 mb-0 max-w-[560px] text-[14px] leading-[1.5] font-light text-muted">
            Explore active topics and see how <Brand /> participants currently feel
            about them. Every dashboard is open to read.
          </p>
        </div>
        {/* Editors only. Topics are the verified half of the platform, and a
            catalog where any visitor can mint the subject cannot claim its
            topics are verified — so the invitation is shown to the people who
            actually have the power, and the row policies refuse everyone else
            regardless of what is on screen. */}
        {/* Suggest sits beside Create rather than inside the editor branch:
            anyone may ask for a subject, only an editor may mint one. */}
        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <SuggestButton kind="topic" />
          {isEditor ? (
            <Link
              href="/admin/topics/new"
              className="rounded-full border border-positive/40 bg-positive/12 px-4 py-[7px] text-[13px] font-medium whitespace-nowrap text-positive-light transition-colors duration-300 outline-none hover:bg-positive/18 focus-visible:ring-2 focus-visible:ring-positive/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              + Create a topic
            </Link>
          ) : null}
        </div>
      </header>

      {/* The search box takes a whole row on a phone and shares one from `sm`
          up. It used to sit inline at every width, which left it about 40% of a
          390px screen with "Search topics" already filling it.

          The two selects are a two-column grid underneath it rather than more
          wrapping flex items. Wrapped, they sized to their own content — a
          narrow "Anywhere" beside a wide "Trending" with a gap of dead space
          after them, and the pair re-splitting at every viewport width. A grid
          gives them one width each and one row, always. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full min-w-0 sm:w-auto sm:flex-1">
          <SearchField
            value={query}
            onChange={setQuery}
            index={index}
            label="Search topics by name, category, place, tag or description"
            placeholder="Search topics"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0 sm:items-center">
          <PlaceFilter
            value={place}
            places={all.map((topic) => topic.place)}
            onChange={setPlace}
          />
          <SortControl value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="mt-4">
        <CategoryFilter value={category} counts={liveCounts} onChange={setCategory} />
      </div>

      <div className="mt-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-veil/8 pb-3">
        <p aria-live="polite" className="m-0 text-[12.5px] text-dim">
          {summary}
        </p>
        {(query || category !== "All" || place !== "any") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
              setPlace("any");
            }}
            className="cursor-pointer rounded-full border border-veil/12 px-3 py-1 text-[11.5px] text-muted transition-colors duration-300 outline-none hover:border-veil/28 hover:text-cream focus-visible:ring-2 focus-visible:ring-positive/60"
          >
            Clear filters
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      ) : (
        /* Two different nothings, and telling them apart matters. A filter that
           matched nothing is fixed by clearing the filter; a catalog with
           nothing in it is not, and offering "Clear filters" there sends
           somebody to press a button that cannot help them. */
        <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-veil/10 px-5 py-[clamp(48px,8vw,96px)] text-center">
          <p className="m-0 font-display font-bold text-[clamp(1.5rem,3vw,2.2rem)] tracking-[-0.02em] text-cream-bright">
            {all.length === 0 ? (
              <>
                Nothing published <em>yet.</em>
              </>
            ) : (
              <>
                No topics here <em>yet.</em>
              </>
            )}
          </p>
          <p className="m-0 max-w-[420px] text-[14px] font-light text-muted">
            {all.length === 0
              ? "The first topics are being written now. Every number that appears here will be a real one — nothing is seeded."
              : "Editors publish topics in curated batches, so some categories are still thin during the private beta."}
          </p>
          {all.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All");
                setPlace("any");
              }}
              className="cursor-pointer rounded-full border border-positive/40 bg-positive/12 px-5 py-2.5 text-[13.5px] font-medium text-positive-light outline-none focus-visible:ring-2 focus-visible:ring-positive/60"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
