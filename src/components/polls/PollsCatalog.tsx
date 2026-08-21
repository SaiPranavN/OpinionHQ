"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useSession } from "@/components/auth/SessionProvider";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { PollCard } from "@/components/polls/PollCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SuggestButton } from "@/components/pro/SuggestButton";
import { WelcomeOffer } from "@/components/pro/WelcomeOffer";
import { CONTROL_LABEL, CONTROL_SHELL } from "@/components/ui/control";
import { PlaceFilter } from "@/components/ui/PlaceFilter";
import { SearchField } from "@/components/ui/SearchField";
import { formatNumber } from "@/lib/derive-poll";
import { placeLabel, type PlaceFilterId } from "@/lib/places";
import {
  filterAndSortPolls,
  pollIndex,
  POLL_SORTS,
  pollSortLabel,
  type PollSortId,
} from "@/lib/polls";
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
  const { isEditor, interests } = useSession();
  // Derived, not initial state — see CatalogView for why the session arriving
  // late makes an initial `useState` value the wrong tool here.
  const [picked, setPicked] = useState<CategoryFilterId | null>(null);
  const category: CategoryFilterId = picked ?? (interests.length > 0 ? "ForYou" : "All");
  const setCategory = setPicked;
  const [sort, setSort] = useState<PollSortId>("trending");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<PlaceFilterId>("any");

  // `polls` is the catalog, whole, from the server. It used to be the fixture
  // list with this browser's own localStorage polls concatenated on top —
  // which meant two visitors on the same page saw two different catalogs, and
  // the counts beside the filters described neither.
  const results = useMemo(
    () => filterAndSortPolls(polls, { category, sort, query, place, interests }),
    [polls, category, sort, query, place, interests],
  );

  const index = useMemo(() => pollIndex(polls), [polls]);

  const scope = [
    category === "All"
      ? ""
      : category === "ForYou"
        ? " in the categories you picked"
        : ` in ${categoryOf(category).label}`,
    place === "any" ? "" : ` for ${placeLabel(place)}`,
  ].join("");
  // The empty catalog is a different problem when it is the reader's own
  // categories that are empty rather than a filter they set on this page.
  const onlyForYou = category === "ForYou" && !query && place === "any";
  const noun = results.length === 1 ? "poll" : "polls";
  const summary =
    results.length === polls.length
      ? `${results.length} ${noun} sorted by ${pollSortLabel(sort)}`
      : `${results.length} of ${polls.length} ${noun}${scope} sorted by ${pollSortLabel(sort)}`;

  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-7 pb-[clamp(64px,8vw,110px)] sm:px-8 lg:px-14">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Polls" }]} />

      {/* Fires only for an account that has just been created — see the
          component for why the flag is a query parameter. */}
      <WelcomeOffer />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[clamp(2rem,4vw,3.1rem)] leading-[1.02] font-bold tracking-[-0.025em] text-cream-bright">
            Pick a <em>side</em>
          </h1>
          <p className="mt-2 mb-0 max-w-[580px] text-[14px] leading-[1.5] font-light text-muted">
            Forced-choice polls. Two to four options, no fence to sit on, and{" "}
            {formatNumber(totalVotes)} votes cast so far. Every result breaks down by
            region, age and occupation.
          </p>
        </div>
        {/* Editors only, exactly as the topics catalog does it — and for the
            same reason. The question a poll asks is the whole instrument: two
            options that are not really opposites produce a split that means
            nothing, so authoring sits with the desk. This is presentation, not
            the boundary: `/admin/polls/new` guards itself and the row policies
            refuse everyone else regardless of what is on screen. */}
        {/* Suggest sits beside Create rather than inside the editor branch:
            anyone may ask for a poll, only an editor may mint one. */}
        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <SuggestButton kind="poll" />
          {isEditor ? (
            <Link
              href="/admin/polls/new"
              className="rounded-full border border-poll/45 bg-poll/12 px-4 py-[7px] text-[13px] font-medium whitespace-nowrap text-poll-soft transition-colors duration-300 outline-none hover:bg-poll/20 focus-visible:ring-2 focus-visible:ring-poll/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              + Create a poll
            </Link>
          ) : null}
        </div>
      </header>

      {/* The same row as the topics catalog, laid out the same way and built
          from the same pieces — see CatalogView for why the two selects are a
          grid rather than more wrapping flex items. The sort control is a
          local one only because a poll sorts by things a topic has no notion
          of; it wears the shared shell. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex w-full min-w-0 sm:w-auto sm:flex-1">
          <SearchField
            value={query}
            onChange={setQuery}
            index={index}
            label="Search polls by question, option, category, place or tag"
            placeholder="Search polls"
            accent="poll"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0 sm:items-center">
          <PlaceFilter
            value={place}
            places={polls.map((poll) => poll.place)}
            onChange={setPlace}
            accent="poll"
          />
          <label className={CONTROL_LABEL}>
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as PollSortId)}
              aria-label="Sort polls"
              className={`cursor-pointer border-veil/10 ${CONTROL_SHELL} focus:border-poll/60 focus-visible:ring-2 focus-visible:ring-poll/40`}
            >
              {POLL_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <CategoryFilter
          value={category}
          counts={counts}
          interests={interests}
          onChange={setCategory}
        />
      </div>

      <div className="mt-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-veil/8 pb-3">
        <p aria-live="polite" className="m-0 text-[12.5px] text-dim">
          {summary}
        </p>
        {query || (category !== "All" && category !== "ForYou") || place !== "any" ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(interests.length > 0 ? "ForYou" : "All");
              setPlace("any");
            }}
            className="cursor-pointer rounded-full border border-veil/12 px-3 py-1 text-[11.5px] text-muted transition-colors duration-300 outline-none hover:border-veil/28 hover:text-cream focus-visible:ring-2 focus-visible:ring-poll/60"
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
        <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-veil/10 px-5 py-[clamp(48px,8vw,96px)] text-center">
          <p className="m-0 font-display font-bold text-[clamp(1.5rem,3vw,2.2rem)] tracking-[-0.02em] text-cream-bright">
            No polls here <em>yet.</em>
          </p>
          {/* "Clear filters" would reset the category to "For you", which on
              an account whose chosen categories are empty is the filter that
              was already showing nothing — a button that visibly does not
              work. Widening is the only move that helps. See CatalogView. */}
          {onlyForYou ? (
            <>
              <p className="m-0 max-w-[420px] text-[14px] font-light text-muted">
                Nothing is open yet in the categories you picked.
              </p>
              <button
                type="button"
                onClick={() => setCategory("All")}
                className="cursor-pointer rounded-full border border-poll/40 bg-poll/12 px-5 py-2.5 text-[13.5px] font-medium text-poll-soft outline-none focus-visible:ring-2 focus-visible:ring-poll/60"
              >
                Show every poll
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(interests.length > 0 ? "ForYou" : "All");
                setPlace("any");
              }}
              className="cursor-pointer rounded-full border border-poll/40 bg-poll/12 px-5 py-2.5 text-[13.5px] font-medium text-poll-soft outline-none focus-visible:ring-2 focus-visible:ring-poll/60"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
