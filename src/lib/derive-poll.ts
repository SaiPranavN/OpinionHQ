/**
 * Presentation-layer derivations for polls.
 *
 * A poll asks between two and four options. Two is the sharpest question and
 * four is where a bar stops being readable and the "winner" stops meaning much
 * — below about 30% a plurality is a statement about a crowded field rather
 * than about the option.
 *
 * The interesting output is not the headline split — it is how each slice of
 * the audience divided. "68% of 17–20s picked A, 41% of over-31s did" says
 * something a single bar cannot. In production those cross-tabs are computed
 * server-side; here they are derived deterministically from the poll's own
 * totals so the numbers reconcile with the headline instead of drifting.
 */

import { isPlaceId, placeContext, placeLabel } from "@/lib/places";
import { reasonsFor } from "@/lib/sample-data/poll-reasons";
import { categoryOf } from "@/lib/taxonomy";
import {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  type DecoratedPoll,
  type DecoratedPollOption,
  type Poll,
  type PollOption,
  type PollOptionId,
  type PollSplitRow,
} from "@/lib/types";

/**
 * Options are competing teams, not a good choice and a bad one, so they cannot
 * borrow the sentiment palette. These four are far apart in hue and stay
 * distinguishable for the common colour-vision deficiencies; every place they
 * appear also carries the option's name, so colour is never the only signal.
 */
export const POLL_COLORS = ["#1DB954", "#A78BFA", "#5AA9F0", "#F0A83C"] as const;

/** Readable text on each fill. */
export const POLL_INK = ["#07240f", "#1B1233", "#06182B", "#2A1B03"] as const;

/**
 * The same four identities, for when an option's colour is set in *type*
 * rather than in a fill — the result headline, a name in a cross-tab row.
 *
 * These have to be theme variables while the fills above stay literal. A fill
 * carries its own ink and works on any page; the same hue as 40px text is a
 * 2.4:1 contrast on white. The light theme therefore darkens all four (see
 * globals.css), and only the text follows — the bars keep their identity so a
 * chart still means the same thing in either theme, and so the PDF export,
 * which cannot resolve a `var()`, keeps working off the literals.
 */
export const POLL_TEXT_VARS = [
  "var(--color-opt-a)",
  "var(--color-opt-b)",
  "var(--color-opt-c)",
  "var(--color-opt-d)",
] as const;

export function pollTextVar(index: number): string {
  return POLL_TEXT_VARS[index % POLL_TEXT_VARS.length]!;
}

/** Kept for the two-option miniatures on the landing page. */
export const POLL_A_COLOR = POLL_COLORS[0];
export const POLL_B_COLOR = POLL_COLORS[1];

export function pollColor(index: number): string {
  return POLL_COLORS[index % POLL_COLORS.length]!;
}

export function pollInk(index: number): string {
  return POLL_INK[index % POLL_INK.length]!;
}

const DEFAULT_SPREAD = 12;

/** Fewest votes before a split is described as a verdict or cross-tabbed. */
const MIN_REPORTABLE = 10;

function seedOf(id: string): number {
  let hash = 7;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) % 99_991;
  return hash;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 100_000).toFixed(1)}L`;
}

/**
 * Rounds a set of percentages to whole numbers that still total exactly 100.
 *
 * Largest-remainder rather than naive rounding: with four options, rounding
 * each independently lands on 99 or 101 often enough that a reader would spot
 * it, and a split that does not add up undermines every other number on the
 * page.
 */
export function roundTo100(values: number[]): number[] {
  const floors = values.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((sum, v) => sum + v, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((x, y) => y.frac - x.frac);
  const out = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i] = out[i]! + 1;
    remainder -= 1;
  }
  return out;
}

/* ------------------------------------------------------------- audience mix */

const REGIONS: readonly { label: string; share: number }[] = [
  { label: "Maharashtra", share: 18 },
  { label: "Uttar Pradesh", share: 16 },
  { label: "Delhi NCR", share: 15 },
  { label: "Karnataka", share: 14 },
  { label: "Tamil Nadu", share: 12 },
  { label: "West Bengal", share: 10 },
  { label: "Other states", share: 15 },
];

const AGE_GROUPS: readonly { label: string; share: number }[] = [
  { label: "17–20", share: 24 },
  { label: "21–24", share: 31 },
  { label: "25–30", share: 26 },
  { label: "31 and over", share: 19 },
];

const OCCUPATIONS: readonly { label: string; share: number }[] = [
  { label: "Student", share: 34 },
  { label: "Working professional", share: 44 },
  { label: "Parent or guardian", share: 14 },
  { label: "Educator", share: 8 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Cross-tab for one set of segments across N options.
 *
 * Each segment gets a deterministic swing per option, then every option's
 * column is re-centred so its share-weighted average lands back on the headline
 * share. Without that step the segments would quietly contradict the top-line
 * number, and a breakdown that disagrees with the headline makes the whole page
 * untrustworthy. Re-centring runs twice because normalising each row to 100
 * reintroduces a little drift.
 */
function splitRows(
  segments: readonly { label: string; share: number }[],
  headline: number[],
  total: number,
  seed: number,
  spread: number,
  salt: number,
  optionIds: PollOptionId[],
  overrides?: Record<string, number[]>,
): PollSplitRow[] {
  const n = headline.length;
  const shareTotal = segments.reduce((sum, s) => sum + s.share, 0);

  // Deterministic swing per (segment, option), in roughly [-spread, spread].
  const swing = segments.map((_, i) =>
    Array.from({ length: n }, (_, k) =>
      Math.sin((seed % 977) + i * 2.399 + k * 1.731 + salt * 1.117) * spread,
    ),
  );

  const recentre = () => {
    for (let k = 0; k < n; k++) {
      const mean =
        swing.reduce((sum, row, i) => sum + row[k]! * segments[i]!.share, 0) / shareTotal;
      for (let i = 0; i < segments.length; i++) swing[i]![k] = swing[i]![k]! - mean;
    }
  };
  recentre();

  const rows = segments.map((segment, i) => {
    const pinned = overrides?.[segment.label];
    const raw =
      pinned && pinned.length === n
        ? pinned.map((v) => clamp(v, 0, 100))
        : headline.map((base, k) => clamp(base + swing[i]![k]!, 2, 96));
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    return raw.map((v) => (v / sum) * 100);
  });

  // Second pass: normalising rows shifted the column means, so correct once
  // more against the actual normalised values.
  for (let k = 0; k < n; k++) {
    const mean =
      rows.reduce((sum, row, i) => sum + row[k]! * segments[i]!.share, 0) / shareTotal;
    const drift = headline[k]! - mean;
    for (let i = 0; i < segments.length; i++) {
      if (overrides?.[segments[i]!.label]) continue;
      rows[i]![k] = clamp(rows[i]![k]! + drift, 1, 97);
    }
  }

  return segments.map((segment, i) => {
    const sum = rows[i]!.reduce((a, b) => a + b, 0) || 1;
    const pcts = roundTo100(rows[i]!.map((v) => (v / sum) * 100));
    const sorted = [...pcts].sort((a, b) => b - a);
    const top = sorted[0]!;
    const winners = pcts.filter((p) => p === top).length;
    return {
      label: segment.label,
      share: segment.share,
      voters: Math.round((total * segment.share) / 100),
      pcts,
      leans: winners > 1 ? "even" : optionIds[pcts.indexOf(top)]!,
      margin: top - (sorted[1] ?? 0),
    };
  });
}

/* ------------------------------------------------------------------ verdict */

function verdictFor(margin: number, options: number): string {
  if (margin < 3) return "Too close to call";
  if (margin < 10) return "Narrow lead";
  if (margin < 25) return options > 2 ? "Clear front-runner" : "Clear lead";
  if (margin < 45) return "Decisive";
  return "Landslide";
}

/* --------------------------------------------------------------- decorate */

function decorateOption(
  option: PollOption,
  pct: number,
  index: number,
  reasonCount: number,
): DecoratedPollOption {
  return {
    ...option,
    pct,
    color: pollColor(index),
    textColor: pollTextVar(index),
    votesLabel: `${formatNumber(option.votes)} ${option.votes === 1 ? "vote" : "votes"}`,
    reasonCount,
  };
}

/**
 * Whether a value read back from storage can survive `decoratePoll`.
 *
 * A `Poll` restored from localStorage is a claim, not a guarantee: it is JSON
 * some earlier version of this code wrote. A poll created before options
 * replaced the old two-sided `{ a, b }` shape has no `options` array at all,
 * and one such record is enough to take the entire catalog down — every poll
 * on the page is decorated in the same pass. Callers filter on read so a stale
 * record costs its author that one poll rather than the whole route.
 */
export function isUsablePoll(value: unknown): value is Poll {
  if (typeof value !== "object" || value === null) return false;
  const { options, place } = value as { options?: unknown; place?: unknown };
  // Written before places existed, or written by a tab still running the old
  // code. It would decorate as "Worldwide", which is a claim its author never
  // made — so it is dropped rather than silently relocated.
  if (typeof place !== "string" || !isPlaceId(place)) return false;
  if (!Array.isArray(options)) return false;
  if (options.length < MIN_POLL_OPTIONS || options.length > MAX_POLL_OPTIONS) {
    return false;
  }
  // Votes are summed and ids are matched against reasons, so a malformed
  // option is as fatal as a missing array.
  return options.every(
    (option: unknown) =>
      typeof option === "object" &&
      option !== null &&
      typeof (option as PollOption).id === "string" &&
      typeof (option as PollOption).name === "string" &&
      typeof (option as PollOption).votes === "number",
  );
}

export function decoratePoll(poll: Poll): DecoratedPoll {
  const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
  // A poll nobody has voted on has no split. Reporting an even share would
  // read as a dead heat rather than as an empty result.
  const unvoted = total === 0;
  // Below this, a poll has a result but nothing that can honestly be called a
  // verdict — and no audience worth breaking down.
  const smallSample = total > 0 && total < MIN_REPORTABLE;
  const reasons = reasonsFor(poll.id);

  const pcts = unvoted
    ? poll.options.map(() => Math.round(100 / poll.options.length))
    : roundTo100(poll.options.map((option) => (option.votes / total) * 100));

  const options = poll.options.map((option, i) =>
    decorateOption(
      option,
      pcts[i]!,
      i,
      reasons.filter((r) => r.side === option.id).length,
    ),
  );

  const ranked = [...options].sort((x, y) => y.pct - x.pct || y.votes - x.votes);
  const leader = ranked[0]!;
  const runnerUp = ranked[1] ?? leader;
  const margin = leader.pct - runnerUp.pct;

  const seed = seedOf(poll.id);
  const spread = poll.spread ?? DEFAULT_SPREAD;
  const optionIds = poll.options.map((o) => o.id);
  // Derived cross-tabs stand in for server aggregates on fixture polls. They
  // must never be applied to a handful of real votes: a regional breakdown of
  // one voter is invention, not a placeholder.
  const reportable = !unvoted && !smallSample;
  const regions = reportable
    ? splitRows(REGIONS, pcts, total, seed, spread, 1, optionIds, poll.regionOverrides)
    : [];
  const ageGroups = reportable
    ? splitRows(AGE_GROUPS, pcts, total, seed, spread * 0.85, 2, optionIds)
    : [];
  const occupations = reportable
    ? splitRows(OCCUPATIONS, pcts, total, seed, spread * 0.7, 3, optionIds)
    : [];

  // The segment that most disagrees with the overall winner is usually the
  // most interesting line in the whole poll, so it gets surfaced explicitly.
  const contrarian =
    [...regions, ...ageGroups, ...occupations]
      .filter((row) => row.leans !== leader.id && row.leans !== "even")
      .sort((x, y) => y.margin - x.margin)[0] ?? null;

  const namedSplit = options.map((o) => `${o.name} ${o.pct} percent`).join(", ");

  return {
    ...poll,
    category: categoryOf(poll.cat),
    placeLabel: placeLabel(poll.place),
    placeContext: placeContext(poll.place),
    unvoted,
    smallSample,
    options,
    ranked,
    total,
    totalLabel: unvoted
      ? "No votes yet"
      : `${formatNumber(total)} ${total === 1 ? "vote" : "votes"}`,
    totalShort: unvoted ? "No votes yet" : formatCompact(total),
    leader,
    runnerUp,
    margin,
    marginLabel: unvoted
      ? "Be the first to vote"
      : smallSample
        ? `${leader.name} ahead on ${formatNumber(total)} ${total === 1 ? "vote" : "votes"}`
        : margin === 0
          ? "Dead even"
          : `${leader.name} leads by ${margin} point${margin === 1 ? "" : "s"}`,
    verdict: unvoted
      ? "No votes yet"
      : smallSample
        ? "Too few votes to call"
        : verdictFor(margin, options.length),
    splitLabel: unvoted
      ? "No votes recorded yet"
      : `${namedSplit}, of ${formatNumber(total)} votes`,
    regions,
    ageGroups,
    occupations,
    contrarian,
    reasonCount: reasons.length,
    demographicOptIn: 52 + (seed % 13),
  };
}
