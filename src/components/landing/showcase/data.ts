/**
 * The worked example the landing showcase draws.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT. Every figure in this file is an
 * illustration. Nobody was asked, nothing was counted, and no panel built on it
 * carries a headcount — shares only, under a badge that says so on every screen
 * it appears on. It exists because "we break a result down by region, age and
 * occupation, and show you where the split flips" is a sentence nobody can
 * picture, and one look at the actual instrument settles it.
 *
 * That is a different thing from the generated cross-tabs this codebase has
 * already deleted twice (see the headers of lib/derive-poll.ts and
 * components/topic/ParticipationChart.tsx). Those sat on *real* subject pages,
 * in the same typography a measured reading uses, and were indistinguishable
 * from counted data. The rule that came out of it is not "never draw a shape" —
 * it is that a number must never be presented as a measurement unless it is
 * one. So: a generic subject that implicates no real institution, exam, film or
 * person; no vote counts anywhere; and the word "illustration" attached to the
 * frame rather than buried in a caption.
 *
 * IT IS ONE MODEL, NOT A PILE OF HAND-PICKED PERCENTAGES. The sample is a set
 * of cells — one per (region × age band × occupation) — each with a weight and
 * a lean. Every panel in the showcase is an aggregation over those cells, which
 * is why the cross-filter can work at all: clicking "17–20" re-reads the donut,
 * the trend and the split bar from the same cells, and the numbers reconcile
 * because there is nothing to reconcile. Hand-authored panels would drift apart
 * the first time anybody edited one.
 */

/* ------------------------------------------------------------- dimensions */

/**
 * Compass regions rather than named states.
 *
 * The product measures real places and says so. An illustration must not:
 * attaching an invented opinion to a named state is the one way this file
 * could still be read as a claim about somebody. Directions carry the same
 * "the split flips by geography" point and claim nothing.
 */
export const REGIONS = ["North", "South", "West", "East", "Central", "North-east"] as const;
export const AGES = ["17–20", "21–24", "25–30", "31–40", "41+"] as const;
export const WORK = [
  "Student",
  "Salaried",
  "Self-employed",
  "Public sector",
  "Not working",
] as const;

export type Region = (typeof REGIONS)[number];
export type Age = (typeof AGES)[number];
export type Work = (typeof WORK)[number];

/** The three cross-filterable axes. Gender is deliberately not one — see below. */
export type Dim = "region" | "age" | "work";

export const DIM_LABEL: Record<Dim, string> = {
  region: "Region",
  age: "Age band",
  work: "Occupation",
};

export const DIM_VALUES: Record<Dim, readonly string[]> = {
  region: REGIONS,
  age: AGES,
  work: WORK,
};

/** A cross-filter. Empty means the whole illustrative sample. */
export interface Filter {
  region?: Region;
  age?: Age;
  work?: Work;
}

export function filterValue(filter: Filter, dim: Dim): string | undefined {
  return dim === "region" ? filter.region : dim === "age" ? filter.age : filter.work;
}

export function withDim(filter: Filter, dim: Dim, value: string | undefined): Filter {
  return { ...filter, [dim]: value };
}

export function filterLabel(filter: Filter): string {
  const parts = [filter.region, filter.age, filter.work].filter(Boolean);
  return parts.length === 0 ? "Everyone" : parts.join(" · ");
}

/* ------------------------------------------------------------------ shape */

/** How many people are in a cell, relative to every other cell. */
const REGION_WEIGHT: Record<Region, number> = {
  North: 0.22,
  South: 0.24,
  West: 0.21,
  East: 0.14,
  Central: 0.12,
  "North-east": 0.07,
};

const AGE_WEIGHT: Record<Age, number> = {
  "17–20": 0.16,
  "21–24": 0.27,
  "25–30": 0.26,
  "31–40": 0.19,
  "41+": 0.12,
};

/**
 * Occupation given age, rather than an independent weight.
 *
 * Multiplying two marginals would put as many students in the 41+ band as in
 * the 17–20 one, and a breakdown that says so is a breakdown nobody believes.
 * The coupling is the cheapest thing that makes the sample read as people.
 */
const WORK_GIVEN_AGE: Record<Age, Record<Work, number>> = {
  "17–20": { Student: 0.78, Salaried: 0.06, "Self-employed": 0.03, "Public sector": 0.01, "Not working": 0.12 },
  "21–24": { Student: 0.41, Salaried: 0.38, "Self-employed": 0.1, "Public sector": 0.04, "Not working": 0.07 },
  "25–30": { Student: 0.09, Salaried: 0.55, "Self-employed": 0.19, "Public sector": 0.1, "Not working": 0.07 },
  "31–40": { Student: 0.02, Salaried: 0.48, "Self-employed": 0.27, "Public sector": 0.16, "Not working": 0.07 },
  "41+": { Student: 0.01, Salaried: 0.34, "Self-employed": 0.31, "Public sector": 0.22, "Not working": 0.12 },
};

/* ------------------------------------------------------------------- lean */

/**
 * The topic reading, as an additive score in roughly [-1, 1].
 *
 * Positive is "in favour". The effects are small and the interesting ones are
 * on occupation, because that is where the example has something to say: the
 * people who would absorb the cost of the change read it differently from the
 * people who would take the day. A demo whose every segment agrees is a demo
 * that argues against its own cross-tabs.
 */
const TOPIC_BASE = 0.3;

const TOPIC_REGION: Record<Region, number> = {
  North: -0.05,
  South: 0.12,
  West: 0.06,
  East: -0.02,
  Central: -0.11,
  "North-east": 0.03,
};

const TOPIC_AGE: Record<Age, number> = {
  "17–20": 0.26,
  "21–24": 0.18,
  "25–30": 0.02,
  "31–40": -0.13,
  "41+": -0.29,
};

const TOPIC_WORK: Record<Work, number> = {
  Student: 0.22,
  Salaried: 0.11,
  "Self-employed": -0.34,
  "Public sector": -0.08,
  "Not working": 0.04,
};

/**
 * The poll asks the same crowd to pick one of three working patterns, so the
 * scores below are read through a softmax rather than a single axis. Office,
 * hybrid, remote — in that order, everywhere.
 */
const POLL_BASE = [0.08, 0.7, 0.42] as const;

const POLL_REGION: Record<Region, readonly [number, number, number]> = {
  North: [0.12, 0.02, -0.14],
  South: [-0.16, 0.04, 0.18],
  West: [-0.06, 0.1, 0.02],
  East: [0.08, -0.02, -0.08],
  Central: [0.18, -0.04, -0.16],
  "North-east": [-0.1, -0.08, 0.26],
};

const POLL_AGE: Record<Age, readonly [number, number, number]> = {
  "17–20": [0.24, -0.1, 0.02],
  "21–24": [0.1, 0.06, -0.08],
  "25–30": [-0.12, 0.16, 0.04],
  "31–40": [-0.18, 0.1, 0.16],
  "41+": [-0.08, -0.06, 0.22],
};

const POLL_WORK: Record<Work, readonly [number, number, number]> = {
  Student: [0.3, -0.12, -0.06],
  Salaried: [-0.04, 0.22, -0.08],
  "Self-employed": [-0.22, -0.06, 0.34],
  "Public sector": [0.26, -0.14, -0.12],
  "Not working": [-0.14, -0.1, 0.2],
};

/* ------------------------------------------------------------------ cells */

export interface Cell {
  region: Region;
  age: Age;
  work: Work;
  /** Share of the illustrative sample, before any filter. */
  w: number;
  /** Topic lean, roughly -1 (against) to +1 (in favour). */
  lean: number;
  /** Unnormalised poll scores: office, hybrid, remote. */
  poll: readonly [number, number, number];
}

export const CELLS: Cell[] = REGIONS.flatMap((region) =>
  AGES.flatMap((age) =>
    WORK.map((work): Cell => {
      const w = REGION_WEIGHT[region] * AGE_WEIGHT[age] * WORK_GIVEN_AGE[age][work];
      const lean = TOPIC_BASE + TOPIC_REGION[region] + TOPIC_AGE[age] + TOPIC_WORK[work];
      const poll = [0, 1, 2].map(
        (i) =>
          (POLL_BASE[i] ?? 0) +
          (POLL_REGION[region][i] ?? 0) +
          (POLL_AGE[age][i] ?? 0) +
          (POLL_WORK[work][i] ?? 0),
      ) as unknown as readonly [number, number, number];
      return { region, age, work, w, lean, poll };
    }),
  ),
);

function matches(cell: Cell, filter: Filter): boolean {
  if (filter.region && cell.region !== filter.region) return false;
  if (filter.age && cell.age !== filter.age) return false;
  if (filter.work && cell.work !== filter.work) return false;
  return true;
}

/* ------------------------------------------------------------- the readings */

/**
 * A lean turned into three shares.
 *
 * Neutral narrows as the cell polarises, which is the behaviour a sentiment
 * scale actually has: people with a strong view do not sit in the middle. The
 * three always sum to 100 before rounding.
 */
function sentimentOf(lean: number): [number, number, number] {
  const l = Math.max(-1, Math.min(1, lean));
  const neu = 19 - 7 * Math.abs(l);
  const pos = ((100 - neu) * (1 + l)) / 2;
  return [pos, neu, 100 - neu - pos];
}

/**
 * Temperature is the one knob that decides whether the poll is a race.
 *
 * Too cold and the leading option runs away with it — at 0.42 hybrid took 69%
 * and no segment anywhere flipped, which quietly deleted the "against the
 * grain" panel. A demonstration of cross-tabs needs a result the cross-tabs can
 * disagree with.
 */
function softmax(scores: readonly number[], temperature = 0.72): number[] {
  const exps = scores.map((s) => Math.exp(s / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => (e / sum) * 100);
}

/**
 * Rounds a set of shares to whole numbers that still sum to 100.
 *
 * Largest-remainder, because three independently rounded percentages next to a
 * bar that fills the width is how a chart ends up reading 33 / 33 / 33 = 99.
 */
export function roundShares(values: number[]): number[] {
  const floors = values.map(Math.floor);
  let short = 100 - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (const { i } of order) {
    if (short <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    short -= 1;
  }
  return out;
}

export interface Reading {
  /** Positive, neutral, negative — whole numbers summing to 100. */
  sentiment: [number, number, number];
  /** Office, hybrid, remote — whole numbers summing to 100. */
  poll: [number, number, number];
  /** What share of the whole sample this filter selects. */
  share: number;
  /** True when the filter selects nobody worth reading. */
  empty: boolean;
}

/**
 * The headline reading for a filter, with an optional lean shift.
 *
 * `drift` is what the trend uses: the same cells, read as they would have been
 * on an earlier day. Nothing about the composition of the sample changes — only
 * where it sat — which is why a day on the trend and the donut above it can
 * never disagree about who was asked.
 */
export function read(filter: Filter, drift = 0): Reading {
  let weight = 0;
  let lean = 0;
  const poll = [0, 0, 0];

  for (const cell of CELLS) {
    if (!matches(cell, filter)) continue;
    weight += cell.w;
    lean += cell.w * (cell.lean + drift);
    for (let i = 0; i < 3; i += 1) {
      poll[i] = (poll[i] ?? 0) + cell.w * ((cell.poll[i] ?? 0) + drift * DRIFT_POLL[i]!);
    }
  }

  if (weight === 0) {
    return { sentiment: [0, 0, 0], poll: [0, 0, 0], share: 0, empty: true };
  }

  const sentiment = roundShares(sentimentOf(lean / weight)) as [number, number, number];
  const pollShares = roundShares(softmax(poll.map((p) => p / weight))) as [number, number, number];

  return {
    sentiment,
    poll: pollShares,
    share: Math.round(weight * 1000) / 10,
    empty: false,
  };
}

/** How a day's drift lands on each poll option. Office loses what remote gains. */
const DRIFT_POLL = [-0.6, 0.1, 0.5] as const;

/* ----------------------------------------------------------------- the run */

/**
 * Twenty-one days of an illustrative run, labelled by day number rather than by
 * date. A calendar date is a claim that something was recorded on it.
 *
 * `share` is that day's slice of participation and `drift` is where the crowd
 * sat that day — both of which are the point: opinion moves, and it usually
 * moves right after something happens. The two markers are the something.
 */
export interface Day {
  /** 1-based. */
  n: number;
  share: number;
  drift: number;
  marker?: string;
}

const ARRIVALS = [
  9, 14, 11, 7, 6, 22, 31, 19, 13, 10, 8, 7, 15, 26, 18, 12, 9, 8, 7, 6, 5,
] as const;

const DRIFTS = [
  0.34, 0.31, 0.29, 0.28, 0.26, 0.05, -0.08, -0.11, -0.09, -0.06, -0.04, -0.02,
  0.04, 0.14, 0.17, 0.18, 0.19, 0.2, 0.2, 0.21, 0.21,
] as const;

const MARKERS: Record<number, string> = {
  6: "Draft proposal published",
  14: "Independent review released",
};

const ARRIVAL_TOTAL = ARRIVALS.reduce((a, b) => a + b, 0);

export const DAYS: Day[] = ARRIVALS.map((arrivals, i) => ({
  n: i + 1,
  share: arrivals / ARRIVAL_TOTAL,
  drift: DRIFTS[i] ?? 0,
  ...(MARKERS[i + 1] ? { marker: MARKERS[i + 1] } : {}),
}));

export interface TrendPoint {
  n: number;
  /** Cumulative sentiment shares to the end of this day. */
  sentiment: [number, number, number];
  /** Cumulative poll shares to the end of this day. */
  poll: [number, number, number];
  /** That day's share of participation, for the engagement strip. */
  arrivals: number;
  marker?: string;
}

/**
 * The run, read cumulatively — the split *as it stood* on each day, which is
 * the number a reader of the live page actually sees at the top. A per-day line
 * swings on a quiet Tuesday and disagrees with the headline.
 */
export function trend(filter: Filter): TrendPoint[] {
  let seen = 0;
  let leanSum = 0;
  const pollSum = [0, 0, 0];

  return DAYS.map((day) => {
    seen += day.share;
    leanSum += day.share * day.drift;
    for (let i = 0; i < 3; i += 1) {
      pollSum[i] = (pollSum[i] ?? 0) + day.share * day.drift * DRIFT_POLL[i]!;
    }
    const reading = read(filter, leanSum / seen);
    return {
      n: day.n,
      sentiment: reading.sentiment,
      poll: reading.poll,
      arrivals: day.share,
      ...(day.marker ? { marker: day.marker } : {}),
    };
  });
}

/* ------------------------------------------------------------- breakdowns */

export interface BreakdownRow {
  label: string;
  /** Share of the sample under the current filter, 0–100. */
  pct: number;
  /** This row's own reading, so a bar can carry a lean as well as a size. */
  sentiment: [number, number, number];
  poll: [number, number, number];
  /** Signed distance from the in-scope reading of `swingOf`, in points. */
  swing: number;
}

export interface Breakdown {
  rows: BreakdownRow[];
  /** Which series the swing column measures — the reading's leading one. */
  swingOf: StackSeries;
}

/**
 * One breakdown, respecting whatever else is filtered.
 *
 * Filtering by age and then reading the region rows gives the regions *within*
 * that age band, which is the whole reason cross-tabs are worth having: the
 * question is never "how did the South split", it is "how did the South split
 * differently from everybody else".
 */
export function breakdown(dim: Dim, filter: Filter, mode: Mode): Breakdown {
  const overall = read(filter);
  const shares = mode === "topic" ? overall.sentiment : overall.poll;
  // Measured against whichever answer is currently winning rather than against
  // a fixed column: "+14 on the leader" is a sentence, "+14 on option two" is
  // not, and the leader changes as soon as anything is filtered.
  const leader = shares.indexOf(Math.max(...shares));
  const base = shares[leader] ?? 0;

  const readings = DIM_VALUES[dim].map((value) => ({
    label: value,
    reading: read(withDim(filter, dim, value)),
  }));

  const total = readings.reduce((sum, r) => sum + r.reading.share, 0);

  return {
    swingOf: stackFor(mode)[leader] ?? stackFor(mode)[0]!,
    rows: readings.map(({ label, reading }) => ({
      label,
      pct: total === 0 ? 0 : Math.round((reading.share / total) * 1000) / 10,
      sentiment: reading.sentiment,
      poll: reading.poll,
      swing: ((mode === "topic" ? reading.sentiment : reading.poll)[leader] ?? 0) - base,
    })),
  };
}

export interface Contrarian {
  dim: Dim;
  label: string;
  /** The option (or sentiment position) this group leads with. */
  leaderIndex: number;
  leaderPct: number;
}

/**
 * The one group that goes the other way, found rather than written down.
 *
 * The live poll page calls this "against the grain" and it is the most-read
 * line on it. Here it is a scan over every value of every axis for the first
 * group whose leading answer is not the overall leading answer — which means it
 * survives a change to the model above, and disappears honestly when the crowd
 * is unanimous rather than printing a heading with nothing under it.
 */
export function contrarian(filter: Filter, mode: Mode): Contrarian | null {
  const overall = read(filter);
  if (overall.empty) return null;
  const shares = mode === "topic" ? overall.sentiment : overall.poll;
  const leader = shares.indexOf(Math.max(...shares));

  let best: Contrarian | null = null;
  for (const dim of ["region", "age", "work"] as Dim[]) {
    if (filterValue(filter, dim)) continue;
    for (const value of DIM_VALUES[dim]) {
      const reading = read(withDim(filter, dim, value));
      if (reading.empty) continue;
      const local = mode === "topic" ? reading.sentiment : reading.poll;
      const localLeader = local.indexOf(Math.max(...local));
      if (localLeader === leader) continue;
      const pct = local[localLeader] ?? 0;
      if (!best || pct > best.leaderPct) {
        best = { dim, label: value, leaderIndex: localLeader, leaderPct: pct };
      }
    }
  }
  return best;
}

/**
 * Gender, as a participation breakdown only.
 *
 * It is shown because the live product shows it, and it carries no lean on
 * purpose. Inventing a gendered split on a subject like this one would be the
 * single most quotable number on the page and the least defensible — an
 * illustration is allowed to show the *shape* of a breakdown without asserting
 * that men and women disagree about the working week.
 */
export const GENDERS: { label: string; pct: number }[] = [
  { label: "Woman", pct: 44.1 },
  { label: "Man", pct: 53.2 },
  { label: "Self-described", pct: 2.7 },
];

/* --------------------------------------------------------------- subjects */

export type Mode = "topic" | "poll";

export const SUBJECT = {
  topic: {
    eyebrow: "Opinion topic",
    question: "The four-day working week",
    prompt: "How do you feel about moving to a four-day week?",
    positive: "In favour",
    neutral: "No strong view",
    negative: "Against",
  },
  poll: {
    eyebrow: "Poll",
    question: "Office, hybrid or fully remote?",
    prompt: "If you had to pick one for the next five years.",
  },
} as const;

/** The three sentiment positions, in the order every chart draws them. */
export const SENTIMENT_ROWS = [
  { key: "pos", label: "In favour", color: "var(--color-positive)", icon: "▲" },
  { key: "neu", label: "No strong view", color: "var(--color-neutral)", icon: "●" },
  { key: "neg", label: "Against", color: "var(--color-negative)", icon: "▼" },
] as const;

/** Option identities, borrowed from the live poll palette so a demo and a real
 *  poll are the same colour language. See POLL_COLORS in lib/derive-poll.ts. */
export const POLL_OPTIONS = [
  { id: "office", name: "In the office", color: "#1DB954", text: "var(--color-opt-a)", ink: "#07240f" },
  { id: "hybrid", name: "Hybrid", color: "#A78BFA", text: "var(--color-opt-b)", ink: "#1B1233" },
  { id: "remote", name: "Fully remote", color: "#5AA9F0", text: "var(--color-opt-c)", ink: "#06182B" },
] as const;

/**
 * The three series a mode stacks, flattened to one shape.
 *
 * Sentiment rows and poll options are different objects with different key
 * names, and every panel that draws a stacked bar would otherwise have to know
 * which of the two it was holding. They only ever need an identity, a name and
 * a colour.
 */
export interface StackSeries {
  id: string;
  label: string;
  color: string;
  /** Readable as type, which the fill colour is not on a light page. */
  text: string;
}

export function stackFor(mode: Mode): StackSeries[] {
  return mode === "topic"
    ? SENTIMENT_ROWS.map((row) => ({
        id: row.key,
        label: row.label,
        color: row.color,
        text: row.color,
      }))
    : POLL_OPTIONS.map((option) => ({
        id: option.id,
        label: option.name,
        color: option.color,
        text: option.text,
      }));
}

/* ------------------------------------------------------------ the aspects */

/**
 * Aspect questions, written for this subject rather than for its category —
 * which is the point the panel is making. A film gets asked about its second
 * half; this gets asked about pay and cover.
 */
export interface Aspect {
  id: string;
  label: string;
  prompt: string;
  options: { id: string; label: string; tone: "Positive" | "Neutral" | "Negative"; pct: number }[];
}

export const ASPECTS: Aspect[] = [
  {
    id: "pay",
    label: "Pay",
    prompt: "Should the same pay carry over to the shorter week?",
    options: [
      { id: "same", label: "Same pay", tone: "Positive", pct: 71 },
      { id: "pro-rata", label: "Pro-rata", tone: "Neutral", pct: 21 },
      { id: "unsure", label: "Not sure", tone: "Negative", pct: 8 },
    ],
  },
  {
    id: "cover",
    label: "Cover",
    prompt: "Could your work actually be covered on the fifth day?",
    options: [
      { id: "yes", label: "Easily", tone: "Positive", pct: 38 },
      { id: "some", label: "With effort", tone: "Neutral", pct: 44 },
      { id: "no", label: "Not at all", tone: "Negative", pct: 18 },
    ],
  },
  {
    id: "hours",
    label: "Hours",
    prompt: "Would the same work just compress into four longer days?",
    options: [
      { id: "no", label: "No", tone: "Positive", pct: 26 },
      { id: "partly", label: "Partly", tone: "Neutral", pct: 39 },
      { id: "yes", label: "Yes, entirely", tone: "Negative", pct: 35 },
    ],
  },
  {
    id: "small",
    label: "Small employers",
    prompt: "Is it workable for a business with under ten people?",
    options: [
      { id: "yes", label: "Workable", tone: "Positive", pct: 19 },
      { id: "depends", label: "Depends", tone: "Neutral", pct: 34 },
      { id: "no", label: "Not workable", tone: "Negative", pct: 47 },
    ],
  },
];

/* --------------------------------------------------------- what people say */

/**
 * Example contributions.
 *
 * NO INVENTED PEOPLE. Every card is attributed to "Participant" and a position,
 * never to a name — a landing page carrying five plausible names, avatars and
 * like counts is a landing page carrying five plausible users who do not exist,
 * and that is the line rule 7 of AGENTS.md draws. What the cards demonstrate is
 * the *format*: a position chip on every contribution, a structured Pro
 * contribution sitting in the same list as a one-line one, and replies threaded
 * underneath rather than piled at the bottom.
 */
export interface SampleOpinion {
  id: string;
  stance: "Positive" | "Neutral" | "Negative";
  headline: string;
  body: string;
  /** Present on the structured Pro format only. */
  sections?: { label: string; body: string }[];
  replies: { stance: "Positive" | "Neutral" | "Negative"; body: string }[];
}

export const SAMPLE_OPINIONS: SampleOpinion[] = [
  {
    id: "s1",
    stance: "Positive",
    headline: "Four days, same output — the fifth was meetings",
    body: "Two of the five days went to status calls that could have been a document. Cut the day and the work does not move.",
    replies: [
      {
        stance: "Negative",
        body: "That holds for desk work. It does not hold for anyone on a shift or behind a counter.",
      },
      {
        stance: "Neutral",
        body: "Agreed on both — which is why this needs to be asked per sector rather than once.",
      },
    ],
  },
  {
    id: "s2",
    stance: "Negative",
    headline: "Fine for salaried teams. I run a shop.",
    body: "Nobody covers the fifth day for me. A four-day week is a five-day week where I lose a day of takings.",
    replies: [
      {
        stance: "Neutral",
        body: "This is the split the occupation breakdown shows — self-employed is the one group that goes the other way.",
      },
    ],
  },
  {
    id: "s3",
    stance: "Neutral",
    headline: "The trials are real, the sample sizes are small",
    sections: [
      {
        label: "What the evidence says",
        body: "Published pilots report retained output and lower attrition, mostly at knowledge-work employers under 300 people.",
      },
      {
        label: "What it does not cover",
        body: "Shift work, healthcare and retail are close to absent from the trial set, and they are most of the workforce.",
      },
      {
        label: "What would change my mind",
        body: "One published trial in a sector where output is measured per hour rather than per project.",
      },
    ],
    body: "",
    replies: [],
  },
];

/** Written reasons, grouped by which option the writer picked. */
export const SAMPLE_REASONS: { option: number; body: string }[] = [
  { option: 0, body: "Everything I learn, I learn by overhearing it. That does not happen on a call." },
  { option: 1, body: "Two days in is enough to keep a team together and short enough to keep the commute survivable." },
  { option: 2, body: "The commute was ninety minutes each way. That is a working day a week, unpaid." },
  { option: 1, body: "Hybrid only works if the days are fixed. Pick-your-own means nobody overlaps." },
];
