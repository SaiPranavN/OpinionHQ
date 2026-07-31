/**
 * Single source of truth for the topic taxonomy, status semantics and
 * sentiment colours. Nothing in the UI should hard-code a category label or a
 * status colour — import from here so the platform stays consistent.
 */

import type { Category, CategoryId, Sentiment, SortId, StatusId } from "@/lib/types";

/* ---------------------------------------------------------------- sentiment */

export const SENTIMENT_COLOR: Record<Sentiment, string> = {
  Positive: "#1DB954",
  Neutral: "#9BA1A6",
  Negative: "#E5484D",
};

export const SPLIT_COLOR = "#D6D3CD";

export function sentimentColor(sentiment: Sentiment): string {
  return SENTIMENT_COLOR[sentiment];
}

/* ------------------------------------------------------------------ status */

export interface StatusStyle {
  /** Dot and text colour. */
  fg: string;
  /** Translucent chip background. */
  bg: string;
  border: string;
  /** Spelled out for screen readers and tooltips. */
  meaning: string;
}

/**
 * Semantic status palette. Colour is never the only signal — the status text
 * always renders alongside it.
 */
export const STATUS_STYLES: Record<StatusId, StatusStyle> = {
  Proposed: {
    fg: "#9BA1A6",
    bg: "rgba(155,161,166,0.12)",
    border: "rgba(155,161,166,0.34)",
    meaning: "Proposed — not yet decided or notified",
  },
  Upcoming: {
    fg: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.34)",
    meaning: "Upcoming — scheduled but not yet started",
  },
  Ongoing: {
    fg: "#5AA9F0",
    bg: "rgba(90,169,240,0.12)",
    border: "rgba(90,169,240,0.34)",
    meaning: "Ongoing — currently in progress",
  },
  Live: {
    fg: "#5AA9F0",
    bg: "rgba(90,169,240,0.14)",
    border: "rgba(90,169,240,0.4)",
    meaning: "Live — happening right now",
  },
  Announced: {
    fg: "#5AA9F0",
    bg: "rgba(90,169,240,0.12)",
    border: "rgba(90,169,240,0.34)",
    meaning: "Announced — confirmed publicly, not yet in effect",
  },
  "Under Investigation": {
    fg: "#F0A83C",
    bg: "rgba(240,168,60,0.12)",
    border: "rgba(240,168,60,0.36)",
    meaning: "Under investigation — an official inquiry is open",
  },
  Disputed: {
    fg: "#F0A83C",
    bg: "rgba(240,168,60,0.12)",
    border: "rgba(240,168,60,0.36)",
    meaning: "Disputed — the facts are contested",
  },
  Confirmed: {
    fg: "#E5484D",
    bg: "rgba(229,72,77,0.12)",
    border: "rgba(229,72,77,0.36)",
    meaning: "Confirmed — established by an official finding",
  },
  Resolved: {
    fg: "#1DB954",
    bg: "rgba(29,185,84,0.12)",
    border: "rgba(29,185,84,0.36)",
    meaning: "Resolved — closed out",
  },
  Completed: {
    fg: "#1DB954",
    bg: "rgba(29,185,84,0.12)",
    border: "rgba(29,185,84,0.36)",
    meaning: "Completed — finished",
  },
  Cancelled: {
    fg: "#E5484D",
    bg: "rgba(229,72,77,0.12)",
    border: "rgba(229,72,77,0.36)",
    meaning: "Cancelled — called off",
  },
  Delayed: {
    fg: "#F0A83C",
    bg: "rgba(240,168,60,0.12)",
    border: "rgba(240,168,60,0.36)",
    meaning: "Delayed — pushed beyond its announced date",
  },
  Inactive: {
    fg: "#8F8C86",
    bg: "rgba(143,140,134,0.1)",
    border: "rgba(143,140,134,0.3)",
    meaning: "Inactive — no recent developments",
  },
};

export function statusStyle(status: StatusId): StatusStyle {
  return STATUS_STYLES[status] ?? STATUS_STYLES.Inactive;
}

/* -------------------------------------------------------------- categories */

export const CATEGORIES: readonly Category[] = [
  {
    id: "entertainment",
    label: "Entertainment",
    short: "Entertainment",
    blurb: "Films, series, music and live shows people argue about.",
  },
  {
    id: "brands",
    label: "Brands",
    short: "Brands",
    blurb: "Consumer companies, judged on price, quality and how they treat you.",
  },
  {
    id: "sports",
    label: "Sports",
    short: "Sports",
    blurb: "Teams, tournaments, selections and the calls that decide them.",
  },
  {
    id: "technology",
    label: "Technology",
    short: "Technology",
    blurb: "Launches, gadgets, platforms and the companies behind them.",
  },
  {
    id: "events",
    label: "National & International Events",
    short: "Events",
    blurb: "Summits, ceremonies, disasters and moments the world watches.",
  },
  {
    id: "national-politics",
    label: "National Politics",
    short: "Politics",
    blurb: "Elections, alliances, legislation and the political weather.",
  },
  {
    id: "policies",
    label: "Government Policies",
    short: "Policies",
    blurb: "Rules, schemes and proposals, and how they land in practice.",
  },
  {
    id: "politicians",
    label: "Politicians",
    short: "Politicians",
    blurb: "Individual public figures, judged on record rather than party.",
  },
  {
    id: "colleges",
    label: "Colleges",
    short: "Colleges",
    blurb: "Institutions rated by the students who actually attend them.",
  },
  {
    id: "exams",
    label: "Exams",
    short: "Exams",
    blurb: "Papers, conduct, results and everything that goes wrong with them.",
  },
  {
    id: "careers",
    label: "Career Streams",
    short: "Careers",
    blurb: "Degrees and paths, weighed by the people a few years ahead of you.",
  },
  {
    id: "food",
    label: "Food & Dining",
    short: "Food",
    blurb: "Restaurants, delivery, street food and what it costs to eat out.",
  },
  {
    id: "controversies",
    label: "Controversies",
    short: "Controversies",
    blurb: "Live disputes where the facts are still being established.",
  },
  {
    id: "other",
    label: "Something else",
    short: "Other",
    blurb: "For subjects that fit none of the above. Yours to define.",
    reserved: true,
  },
] as const;

export const CATEGORY_BY_ID: ReadonlyMap<CategoryId, Category> = new Map(
  CATEGORIES.map((c) => [c.id, c]),
);

export function categoryOf(id: CategoryId): Category {
  return CATEGORY_BY_ID.get(id) ?? CATEGORIES[0]!;
}

/* ------------------------------------------------------------------- sorts */

export const SORTS: readonly { id: SortId; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "discussed", label: "Most discussed" },
  { id: "recent", label: "Recently updated" },
  { id: "positive", label: "Most positive" },
  { id: "negative", label: "Most negative" },
  { id: "polarizing", label: "Most polarizing" },
  { id: "participation", label: "Highest participation" },
] as const;

export function sortLabel(id: SortId): string {
  return SORTS.find((s) => s.id === id)?.label ?? "Trending";
}
