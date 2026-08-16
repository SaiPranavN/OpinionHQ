/**
 * The worked example the landing showcase draws.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT. Every figure in this file is an
 * illustration. Nobody was asked, nothing was counted, and no panel built on it
 * carries a headcount — shares only, under a badge that says so on every screen
 * it appears on. It exists because "we break a result down by state, age and
 * occupation, and show you where the split flips" is a sentence nobody can
 * picture, and one look at the actual instrument settles it.
 *
 * That is a different thing from the generated cross-tabs this codebase has
 * already deleted twice (see the headers of lib/derive-poll.ts and
 * components/topic/ParticipationChart.tsx). Those sat on *real* subject pages,
 * in the same typography a measured reading uses, and were indistinguishable
 * from counted data. The rule that came out of it is not "never draw a shape" —
 * it is that a number must never be presented as a measurement unless it is
 * one. What carries that here: the "Illustration" badge in the stage chrome,
 * above the first chart, in the position a live page uses for its status; no
 * vote count anywhere; and no invented people — every contribution is
 * attributed to "Participant" and a position, never to a name.
 *
 * THE SUBJECT IS A FILM ON PURPOSE. It was a policy question first, and a
 * policy question is one most of the people who land here have no stake in — a
 * student reading about the working week is reading about somebody else's life.
 * A film everybody has an opinion about is the demonstration doing its job.
 *
 * IT IS ONE MODEL, NOT A PILE OF HAND-PICKED PERCENTAGES. The sample is a set
 * of cells — one per (state × age band × occupation) — each with a weight and
 * a lean. Every panel in the showcase is an aggregation over those cells, which
 * is why the cross-filter can work at all: clicking "17–20" re-reads the donut,
 * the trend and the split bar from the same cells, and the numbers reconcile
 * because there is nothing to reconcile. Hand-authored panels would drift apart
 * the first time anybody edited one.
 */

import { FACET_SETS } from "@/lib/facets";

/* ------------------------------------------------------------- dimensions */

/**
 * Real states, from the same gazetteer the product measures with.
 *
 * An earlier version used compass directions to avoid attaching an opinion to
 * a named place. It read as a hedge and it taught the wrong thing: the live
 * panel says "Where participants are voting from" and lists Karnataka, so a
 * demonstration of that panel that lists "South" is demonstrating something
 * else. These six are the labels in lib/places.ts, and the reason it is safe to
 * use them is the badge rather than the anonymisation — the panel says out loud
 * that nobody was asked.
 */
export const STATES = [
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Delhi NCR",
  "Kerala",
  "Uttar Pradesh",
] as const;

export const AGES = ["17–20", "21–24", "25–30", "31–40", "41+"] as const;
export const WORK = [
  "Student",
  "Salaried",
  "Self-employed",
  "Public sector",
  "Not working",
] as const;

export type State = (typeof STATES)[number];
export type Age = (typeof AGES)[number];
export type Work = (typeof WORK)[number];

/** The three cross-filterable axes. Gender is deliberately not one — see below. */
export type Dim = "state" | "age" | "work";

export const DIM_LABEL: Record<Dim, string> = {
  state: "State",
  age: "Age band",
  work: "Occupation",
};

export const DIM_VALUES: Record<Dim, readonly string[]> = {
  state: STATES,
  age: AGES,
  work: WORK,
};

/** A cross-filter. Empty means the whole illustrative sample. */
export interface Filter {
  state?: State;
  age?: Age;
  work?: Work;
}

export function filterValue(filter: Filter, dim: Dim): string | undefined {
  return dim === "state" ? filter.state : dim === "age" ? filter.age : filter.work;
}

export function withDim(filter: Filter, dim: Dim, value: string | undefined): Filter {
  return { ...filter, [dim]: value };
}

export function filterLabel(filter: Filter): string {
  const parts = [filter.state, filter.age, filter.work].filter(Boolean);
  return parts.length === 0 ? "Everyone" : parts.join(" · ");
}

/* ------------------------------------------------------------------ shape */

/** How many people are in a cell, relative to every other cell. */
const STATE_WEIGHT: Record<State, number> = {
  Maharashtra: 0.23,
  Karnataka: 0.21,
  "Tamil Nadu": 0.18,
  "Delhi NCR": 0.16,
  Kerala: 0.12,
  "Uttar Pradesh": 0.1,
};

const AGE_WEIGHT: Record<Age, number> = {
  "17–20": 0.18,
  "21–24": 0.29,
  "25–30": 0.26,
  "31–40": 0.17,
  "41+": 0.1,
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
 * The sentiment reading, as an additive score in roughly [-1, 1].
 *
 * A spectacle film with a strong opening: broadly liked, and liked hardest by
 * the people who went first and went big. The interesting divergence is by age
 * — the crowd that turned up for the format is not the crowd that turned up
 * three weeks later for a story, and they do not report the same film.
 */
const TOPIC_BASE = 0.7;

const TOPIC_STATE: Record<State, number> = {
  Maharashtra: 0.06,
  Karnataka: 0.09,
  "Tamil Nadu": -0.04,
  "Delhi NCR": 0.03,
  Kerala: -0.11,
  "Uttar Pradesh": -0.07,
};

/**
 * The 41+ effect is large enough to *flip the donut*, and that is the point.
 *
 * A demonstration whose every segment agrees with the headline is a
 * demonstration arguing against its own cross-tabs — there is nothing to find,
 * so there is no reason to click. One band that reads the film the other way
 * turns the breakdown from a decoration into the thing the section is about,
 * and it is the split anybody who has sat through a loud spectacle film with
 * their parents will recognise.
 */
const TOPIC_AGE: Record<Age, number> = {
  "17–20": 0.11,
  "21–24": 0.07,
  "25–30": 0,
  "31–40": -0.24,
  "41+": -0.8,
};

const TOPIC_WORK: Record<Work, number> = {
  Student: 0.09,
  Salaried: 0.03,
  "Self-employed": -0.16,
  "Public sector": -0.12,
  "Not working": 0,
};

/**
 * The poll asks the same crowd how they would actually watch it, so the scores
 * below are read through a softmax rather than a single axis. IMAX, a regular
 * screen, waiting for streaming — in that order, everywhere.
 *
 * This is the axis where money and geography do the work: an IMAX screen is a
 * thing that exists in some cities and not others, and a ₹1,400 ticket is a
 * different proposition to a student than to a salaried thirty-year-old. Which
 * is the whole point of showing cross-tabs at all.
 */
const POLL_BASE = [0.55, 0.7, 0.3] as const;

const POLL_STATE: Record<State, readonly [number, number, number]> = {
  Maharashtra: [0.22, 0.02, -0.18],
  Karnataka: [0.26, -0.04, -0.16],
  "Tamil Nadu": [-0.08, 0.24, -0.1],
  "Delhi NCR": [0.18, 0.04, -0.14],
  Kerala: [-0.22, 0.28, 0.02],
  "Uttar Pradesh": [-0.3, 0.12, 0.24],
};

const POLL_AGE: Record<Age, readonly [number, number, number]> = {
  "17–20": [-0.14, -0.06, 0.34],
  "21–24": [0.06, 0.02, 0.06],
  "25–30": [0.24, 0.04, -0.18],
  "31–40": [0.14, 0.12, -0.14],
  "41+": [-0.16, 0.22, -0.02],
};

const POLL_WORK: Record<Work, readonly [number, number, number]> = {
  Student: [-0.34, -0.08, 0.52],
  Salaried: [0.26, 0.04, -0.22],
  "Self-employed": [0.08, 0.14, -0.1],
  "Public sector": [-0.06, 0.22, -0.08],
  "Not working": [-0.3, -0.02, 0.36],
};

/* ------------------------------------------------------------------ cells */

export interface Cell {
  state: State;
  age: Age;
  work: Work;
  /** Share of the illustrative sample, before any filter. */
  w: number;
  /** Sentiment lean, roughly -1 (negative) to +1 (positive). */
  lean: number;
  /** Unnormalised poll scores: IMAX, regular screen, streaming. */
  poll: readonly [number, number, number];
}

export const CELLS: Cell[] = STATES.flatMap((state) =>
  AGES.flatMap((age) =>
    WORK.map((work): Cell => {
      const w = STATE_WEIGHT[state] * AGE_WEIGHT[age] * WORK_GIVEN_AGE[age][work];
      const lean = TOPIC_BASE + TOPIC_STATE[state] + TOPIC_AGE[age] + TOPIC_WORK[work];
      const poll = [0, 1, 2].map(
        (i) =>
          (POLL_BASE[i] ?? 0) +
          (POLL_STATE[state][i] ?? 0) +
          (POLL_AGE[age][i] ?? 0) +
          (POLL_WORK[work][i] ?? 0),
      ) as unknown as readonly [number, number, number];
      return { state, age, work, w, lean, poll };
    }),
  ),
);

function matches(cell: Cell, filter: Filter): boolean {
  if (filter.state && cell.state !== filter.state) return false;
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
 * Too cold and the leading option runs away with it — nothing flips in any
 * segment, and the "against the grain" panel quietly disappears. A
 * demonstration of cross-tabs needs a result the cross-tabs can disagree with.
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
  /** IMAX, regular screen, streaming — whole numbers summing to 100. */
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

/**
 * How a day's drift lands on each poll option.
 *
 * The two move together for a reason: the crowd that turns up in the first
 * week is the crowd that books the big screen, and the drift that cools the
 * sentiment reading is the same drift that pushes the format answer towards
 * waiting. One number, two visible consequences.
 */
const DRIFT_POLL = [0.7, -0.1, -0.6] as const;

/* ----------------------------------------------------------------- the run */

/**
 * Three weeks of an illustrative run, labelled by day number rather than by
 * date. A calendar date is a claim that something was recorded on it.
 *
 * `share` is that day's slice of participation and `drift` is where the crowd
 * sat that day — both of which are the point: opinion moves, and for a film it
 * moves in a shape everybody recognises. A huge opening, a weekend rhythm, and
 * a reading that cools as the audience widens past the people who had already
 * decided they would love it.
 */
export interface Day {
  /** 1-based. */
  n: number;
  share: number;
  drift: number;
  marker?: string;
}

const ARRIVALS = [
  36, 31, 27, 14, 10, 9, 12, 25, 22, 11, 8, 7, 9, 19, 23, 13, 8, 6, 5, 5, 4,
] as const;

/**
 * Raw drift, re-centred below so the run ends exactly on the headline reading.
 *
 * THAT RE-CENTRING IS NOT COSMETIC. The donut is `read(filter)` at drift zero
 * and the last point of the trend is `read(filter, cumulative drift)`. If the
 * weighted mean of these numbers is not zero, those two are different figures
 * sitting six inches apart on the same panel, both describing "now" — which is
 * exactly the class of contradiction this whole model exists to make
 * impossible. Subtracting the mean costs one line and makes it structural.
 */
const RAW_DRIFT = [
  0.3, 0.28, 0.26, 0.19, 0.11, 0.07, 0.03, -0.01, -0.04, -0.05, -0.06, -0.06,
  -0.05, -0.09, -0.12, -0.13, -0.13, -0.12, -0.12, -0.11, -0.11,
] as const;

const MARKERS: Record<number, string> = {
  3: "Opening weekend ends",
  14: "Streaming date announced",
};

const ARRIVAL_TOTAL = ARRIVALS.reduce((a, b) => a + b, 0);
const SHARES = ARRIVALS.map((a) => a / ARRIVAL_TOTAL);
const DRIFT_MEAN = SHARES.reduce((sum, share, i) => sum + share * (RAW_DRIFT[i] ?? 0), 0);

export const DAYS: Day[] = SHARES.map((share, i) => ({
  n: i + 1,
  share,
  drift: (RAW_DRIFT[i] ?? 0) - DRIFT_MEAN,
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

  return DAYS.map((day) => {
    seen += day.share;
    leanSum += day.share * day.drift;
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
 * Filtering by age and then reading the state rows gives the states *within*
 * that age band, which is the whole reason cross-tabs are worth having: the
 * question is never "how did Kerala split", it is "how did Kerala split
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
  for (const dim of ["state", "age", "work"] as Dim[]) {
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
 * purpose. Inventing a gendered split on any subject would be the single most
 * quotable number on the page and the least defensible — an illustration is
 * allowed to show the *shape* of a breakdown without asserting that men and
 * women disagree about a film.
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
    eyebrow: "Opinion topic · Entertainment",
    question: "The Odyssey",
    prompt: "Three weeks in. Was it the film everyone spent a year waiting for?",
  },
  poll: {
    eyebrow: "Poll · Entertainment",
    question: "IMAX, regular screen, or wait for streaming?",
    prompt: "How you would tell a friend to watch it — pick one.",
  },
} as const;

/** The three sentiment positions, in the order every chart draws them. */
export const SENTIMENT_ROWS = [
  { key: "pos", label: "Positive", color: "var(--color-positive)", icon: "▲" },
  { key: "neu", label: "Neutral", color: "var(--color-neutral)", icon: "●" },
  { key: "neg", label: "Negative", color: "var(--color-negative)", icon: "▼" },
] as const;

/** Option identities, borrowed from the live poll palette so a demo and a real
 *  poll are the same colour language. See POLL_COLORS in lib/derive-poll.ts. */
export const POLL_OPTIONS = [
  { id: "imax", name: "IMAX 70mm", color: "#1DB954", text: "var(--color-opt-a)", ink: "#07240f" },
  { id: "regular", name: "Regular screen", color: "#A78BFA", text: "var(--color-opt-b)", ink: "#1B1233" },
  { id: "stream", name: "Wait for streaming", color: "#5AA9F0", text: "var(--color-opt-c)", ink: "#06182B" },
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
 * Aspect questions — taken from the product's own film set rather than written
 * for the demo.
 *
 * That is the point the panel is making: a topic is not asked "rate this out of
 * five", it is asked four questions chosen for what its category actually
 * argues about. Importing FACET_SETS.film means the showcase cannot drift away
 * from the questions a real film topic asks, and that anybody editing those
 * questions edits the landing page too. Only the tallies are illustrative.
 */
export interface Aspect {
  id: string;
  label: string;
  prompt: string;
  options: { id: string; label: string; tone: "Positive" | "Neutral" | "Negative"; pct: number }[];
}

/** Illustrative tallies, positive → neutral → negative, keyed by facet id. */
const ASPECT_TALLIES: Record<string, [number, number, number]> = {
  story: [46, 33, 21],
  acting: [74, 19, 7],
  music: [68, 24, 8],
  visuals: [88, 9, 3],
  value: [61, 27, 12],
};

export const ASPECTS: Aspect[] = FACET_SETS.film
  .filter((facet) => facet.id !== "music")
  .map((facet) => ({
    id: facet.id,
    label: facet.label,
    prompt: facet.prompt,
    options: facet.options.map((option, i) => ({
      id: option.id,
      label: option.label,
      tone: option.tone,
      pct: ASPECT_TALLIES[facet.id]?.[i] ?? 0,
    })),
  }));

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
    headline: "Sat in the front row by accident and would do it again",
    body: "The scale is not a gimmick here — it is the whole argument the film is making. Nothing on a laptop is going to survive the trip.",
    replies: [
      {
        stance: "Negative",
        body: "Scale is doing a lot of heavy lifting for a middle hour that forgets it has characters in it.",
      },
      {
        stance: "Neutral",
        body: "Both true. Spectacular to sit inside, thin to think about afterwards.",
      },
    ],
  },
  {
    id: "s2",
    stance: "Negative",
    headline: "Beautiful, loud, and about forty minutes too pleased with itself",
    body: "Half the dialogue is buried under the score and the other half is exposition. I could not tell you what anyone wanted by the end.",
    replies: [
      {
        stance: "Positive",
        body: "The sound mix complaint is fair. The rest of it lands differently on a big screen.",
      },
    ],
  },
  {
    id: "s3",
    stance: "Neutral",
    headline: "What the adaptation gains, and what the poem still does better",
    sections: [
      {
        label: "Where it is strongest",
        body: "The voyage sequences are the best case anyone has made in years for shooting practically and projecting big.",
      },
      {
        label: "Where it thins out",
        body: "The homecoming is the half of the story that carries the meaning, and it is the half given the least room.",
      },
      {
        label: "Worth the ticket",
        body: "Yes, on the largest screen you can reach. The argument for a second viewing is weaker than the argument for the first.",
      },
    ],
    body: "",
    replies: [],
  },
];

/** Written reasons, grouped by which option the writer picked. */
export const SAMPLE_REASONS: { option: number; body: string }[] = [
  { option: 0, body: "It was shot for this format. Watching it any other way is watching a different film." },
  { option: 1, body: "Nearest IMAX is a two-hour drive and a full day gone. The regular screen was fine." },
  { option: 2, body: "₹1,400 for one ticket. That is the whole month's subscription for one evening." },
  { option: 1, body: "Booked the good seats at a normal multiplex and paid a third of the price. No regrets." },
];
