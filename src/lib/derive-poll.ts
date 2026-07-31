/**
 * Presentation-layer derivations for head-to-head polls.
 *
 * The interesting output is not the headline split — it is how each slice of
 * the audience divided. "68% of 17–20s picked A, 41% of over-31s did" says
 * something a single bar cannot. In production those cross-tabs are computed
 * server-side; here they are derived deterministically from the poll's own
 * totals so the numbers reconcile with the headline instead of drifting.
 */

import { reasonsFor } from "@/lib/sample-data/poll-reasons";
import { categoryOf } from "@/lib/taxonomy";
import type {
  DecoratedPoll,
  DecoratedPollSide,
  Poll,
  PollSide,
  PollSplitRow,
} from "@/lib/types";

/**
 * Poll sides are two teams, not a good option and a bad one, so they cannot
 * borrow the sentiment palette. Green and violet are far apart in hue and stay
 * distinguishable for the common colour-vision deficiencies.
 */
export const POLL_A_COLOR = "#1DB954";
export const POLL_B_COLOR = "#A78BFA";

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
 * Cross-tab for one set of segments.
 *
 * Each segment's swing is deterministic, then re-centred so the share-weighted
 * average lands back on the headline split. Without that step the segments
 * would quietly contradict the top-line number.
 */
function splitRows(
  segments: readonly { label: string; share: number }[],
  overallAPct: number,
  total: number,
  seed: number,
  spread: number,
  salt: number,
  overrides?: Record<string, number>,
): PollSplitRow[] {
  const raw = segments.map((segment, i) => {
    // Deterministic pseudo-random in [-1, 1].
    const wave = Math.sin((seed % 977) + i * 2.399 + salt * 1.117);
    return wave * spread;
  });

  const weightedMean =
    raw.reduce((sum, jitter, i) => sum + jitter * (segments[i]!.share / 100), 0) /
    (segments.reduce((sum, s) => sum + s.share, 0) / 100);

  return segments.map((segment, i) => {
    const pinned = overrides?.[segment.label];
    const aPct =
      pinned === undefined
        ? Math.round(clamp(overallAPct + (raw[i]! - weightedMean), 6, 94))
        : Math.round(clamp(pinned, 0, 100));
    const bPct = 100 - aPct;
    return {
      label: segment.label,
      share: segment.share,
      voters: Math.round((total * segment.share) / 100),
      aPct,
      bPct,
      leans: aPct === bPct ? "even" : aPct > bPct ? "a" : "b",
    };
  });
}

/* ------------------------------------------------------------------ verdict */

function verdictFor(margin: number): string {
  if (margin < 3) return "Too close to call";
  if (margin < 10) return "Narrow lead";
  if (margin < 25) return "Clear lead";
  if (margin < 45) return "Decisive";
  return "Landslide";
}

/* --------------------------------------------------------------- decorate */

function decorateSide(
  side: PollSide,
  pct: number,
  color: string,
  reasonCount: number,
): DecoratedPollSide {
  return {
    ...side,
    pct,
    color,
    votesLabel: `${formatNumber(side.votes)} ${side.votes === 1 ? "vote" : "votes"}`,
    reasonCount,
  };
}

export function decoratePoll(poll: Poll): DecoratedPoll {
  const total = poll.a.votes + poll.b.votes;
  // A poll nobody has voted on has no split. Reporting it as 50/50 would read
  // as a dead heat rather than as an empty result.
  const unvoted = total === 0;
  // Below this, a poll has a result but nothing that can honestly be called a
  // verdict — and no audience worth breaking down.
  const smallSample = total > 0 && total < MIN_REPORTABLE;
  const reasons = reasonsFor(poll.id);

  // Round once and derive the other side from it, so the pair always totals 100.
  const aPct = total === 0 ? 50 : Math.round((poll.a.votes / total) * 100);
  const bPct = 100 - aPct;

  const a = decorateSide(
    poll.a,
    aPct,
    POLL_A_COLOR,
    reasons.filter((r) => r.side === "a").length,
  );
  const b = decorateSide(
    poll.b,
    bPct,
    POLL_B_COLOR,
    reasons.filter((r) => r.side === "b").length,
  );

  const leader = aPct >= bPct ? a : b;
  const trailer = leader === a ? b : a;
  const margin = Math.abs(aPct - bPct);

  const seed = seedOf(poll.id);
  const spread = poll.spread ?? DEFAULT_SPREAD;
  // Derived cross-tabs stand in for server aggregates on fixture polls. They
  // must never be applied to a handful of real votes: a regional breakdown of
  // one voter is invention, not a placeholder.
  const reportable = !unvoted && !smallSample;
  const regions = reportable
    ? splitRows(REGIONS, aPct, total, seed, spread, 1, poll.regionOverrides)
    : [];
  const ageGroups = reportable
    ? splitRows(AGE_GROUPS, aPct, total, seed, spread * 0.85, 2)
    : [];
  const occupations = reportable
    ? splitRows(OCCUPATIONS, aPct, total, seed, spread * 0.7, 3)
    : [];

  // The segment that most disagrees with the overall winner is usually the
  // most interesting line in the whole poll, so it gets surfaced explicitly.
  const overallLean = leader.id;
  const contrarian =
    [...regions, ...ageGroups, ...occupations]
      .filter((row) => row.leans !== overallLean && row.leans !== "even")
      .sort((x, y) => Math.abs(y.aPct - y.bPct) - Math.abs(x.aPct - x.bPct))[0] ?? null;

  return {
    ...poll,
    category: categoryOf(poll.cat),
    unvoted,
    smallSample,
    sides: [a, b],
    total,
    totalLabel: unvoted
      ? "No votes yet"
      : `${formatNumber(total)} ${total === 1 ? "vote" : "votes"}`,
    totalShort: unvoted ? "No votes yet" : formatCompact(total),
    leader,
    trailer,
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
        : verdictFor(margin),
    splitLabel: unvoted
      ? "No votes recorded yet"
      : `${a.name} ${aPct} percent, ${b.name} ${bPct} percent, of ${formatNumber(total)} votes`,
    regions,
    ageGroups,
    occupations,
    contrarian,
    reasonCount: reasons.length,
    demographicOptIn: 52 + (seed % 13),
  };
}
