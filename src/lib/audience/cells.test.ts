import { describe, expect, it } from "vitest";

import {
  contrarianOf,
  crossTab,
  matchesFilter,
  pollCells,
  readScope,
  scopeLabel,
  summarise,
  topicCells,
  withDim,
  type AudienceCell,
  type PollCellRow,
  type TopicCellRow,
} from "@/lib/audience/cells";
import { rowsToAudience as topicMarginals } from "@/lib/topics/rows";
import { rowsToAudience as pollMarginals } from "@/lib/polls/rows";

/* ------------------------------------------------------------------ fixtures */

/**
 * A sample with the awkward parts in it on purpose.
 *
 * Somebody with no state, somebody with no age, somebody who declined a gender,
 * an occupation that does not count in breakdowns — every one of which is a
 * different denominator. A fixture where everybody answered everything would
 * pass whatever the code did.
 */
const TOPIC_ROWS: TopicCellRow[] = [
  { region: "Karnataka", age: "21–24", occupation: "Student", gender: "Man", vote: "Positive", responses: 6 },
  { region: "Karnataka", age: "21–24", occupation: "Student", gender: "Woman", vote: "Negative", responses: 2 },
  { region: "Karnataka", age: "25–30", occupation: "Educator", gender: "Woman", vote: "Neutral", responses: 3 },
  { region: "Karnataka", age: "31 and over", occupation: "Retired", gender: null, vote: "Negative", responses: 4 },
  { region: "Kerala", age: "21–24", occupation: "Student", gender: "Man", vote: "Negative", responses: 5 },
  { region: "Kerala", age: "31 and over", occupation: "Educator", gender: "Woman", vote: "Negative", responses: 4 },
  // No state — counts in age, occupation and gender, and in none of the regions.
  { region: null, age: "17–20", occupation: "Student", gender: "Man", vote: "Positive", responses: 7 },
  // No age, and an occupation that does not count in breakdowns.
  { region: "Kerala", age: null, occupation: null, gender: "Woman", vote: "Positive", responses: 2 },
];

const POLL_ROWS: PollCellRow[] = [
  { region: "Karnataka", age: "21–24", occupation: "Student", gender: "Man", slot: "a", voters: 9 },
  { region: "Karnataka", age: "21–24", occupation: "Student", gender: "Woman", slot: "b", voters: 4 },
  { region: "Karnataka", age: "31 and over", occupation: "Retired", gender: null, slot: "c", voters: 6 },
  { region: "Kerala", age: "25–30", occupation: "Working professional", gender: "Man", slot: "b", voters: 8 },
  { region: "Kerala", age: "25–30", occupation: "Working professional", gender: "Woman", slot: "a", voters: 3 },
  { region: null, age: "17–20", occupation: "Student", gender: "Man", slot: "c", voters: 5 },
];

/** The same sample, in the shape the shipped marginal RPC returns. */
function toTopicMarginalRows(rows: TopicCellRow[]) {
  const out: { dimension: string; segment: string; vote: string; responses: number }[] = [];
  const dims: [string, keyof TopicCellRow][] = [
    ["region", "region"],
    ["age", "age"],
    ["occupation", "occupation"],
    ["gender", "gender"],
  ];
  for (const row of rows) {
    for (const [dimension, key] of dims) {
      const segment = row[key];
      if (typeof segment !== "string") continue;
      out.push({ dimension, segment, vote: row.vote, responses: row.responses });
    }
  }
  return out;
}

function toPollMarginalRows(rows: PollCellRow[]) {
  const out: { dimension: string; segment: string; slot: string; voters: number }[] = [];
  const dims: [string, keyof PollCellRow][] = [
    ["region", "region"],
    ["age", "age"],
    ["occupation", "occupation"],
    ["gender", "gender"],
  ];
  for (const row of rows) {
    for (const [dimension, key] of dims) {
      const segment = row[key];
      if (typeof segment !== "string") continue;
      out.push({ dimension, segment, slot: row.slot, voters: row.voters });
    }
  }
  return out;
}

const cells = topicCells(TOPIC_ROWS);

/* -------------------------------------------------------------------- shape */

describe("folding rows into cells", () => {
  it("collapses one row per answer into one cell per combination", () => {
    // Two rows share Karnataka / 21-24 / Student but differ on gender, so they
    // stay two cells; nothing else in the fixture repeats a combination.
    expect(cells).toHaveLength(TOPIC_ROWS.length);
    const student = cells.find(
      (c) => c.region === "Karnataka" && c.gender === "Man" && c.age === "21–24",
    );
    expect(student?.counts).toEqual([6, 0, 0]);
  });

  it("keeps every person, however many fields they skipped", () => {
    const total = cells.reduce((sum, c) => sum + c.counts.reduce((a, b) => a + b, 0), 0);
    expect(total).toBe(TOPIC_ROWS.reduce((sum, r) => sum + r.responses, 0));
  });

  it("drops an answer it has no series for rather than misfiling it", () => {
    // A fifth slot on a four-option poll, or a sentiment value added later.
    const folded = pollCells([...POLL_ROWS, { ...POLL_ROWS[0]!, slot: "e", voters: 99 }], 3);
    const total = folded.reduce((sum, c) => sum + c.counts.reduce((a, b) => a + b, 0), 0);
    expect(total).toBe(POLL_ROWS.reduce((sum, r) => sum + r.voters, 0));
  });
});

/* ------------------------------------------------------------------ parity */

describe("agreement with the marginals we already ship", () => {
  it("reproduces every topic breakdown, unfiltered", () => {
    const shipped = topicMarginals(toTopicMarginalRows(TOPIC_ROWS));
    const pairs: [keyof typeof shipped, Parameters<typeof crossTab>[1]][] = [
      ["geo", "region"],
      ["ageGroups", "age"],
      ["occupations", "occupation"],
      ["genders", "gender"],
    ];

    for (const [key, dim] of pairs) {
      const mine = crossTab(cells, dim, {}, 3);
      const theirs = shipped[key];
      expect(mine.rows.map((r) => r.label).sort()).toEqual(
        theirs.map((r) => r.label).sort(),
      );
      for (const row of theirs) {
        const got = mine.rows.find((r) => r.label === row.label);
        expect(got, `${dim} / ${row.label}`).toBeDefined();
        expect(got!.count, `${dim} / ${row.label} count`).toBe(row.count);
        // The shipped panel rounds the share to a whole number; this one keeps
        // a decimal. They must agree once rounded the same way.
        expect(Math.round(got!.pct), `${dim} / ${row.label} share`).toBe(row.pct);
      }
    }
  });

  it("reproduces the topic negative share, which drives the geo lean", () => {
    const shipped = topicMarginals(toTopicMarginalRows(TOPIC_ROWS));
    const mine = crossTab(cells, "region", {}, 3);
    for (const row of shipped.geo) {
      const got = mine.rows.find((r) => r.label === row.label)!;
      // Index 2 is Negative in SENTIMENT_ORDER.
      expect(got.shares[2], row.label).toBe(row.negativeShare);
    }
  });

  it("reproduces every poll breakdown, unfiltered", () => {
    const pcells = pollCells(POLL_ROWS, 3);
    const shipped = pollMarginals(toPollMarginalRows(POLL_ROWS), 3);
    const pairs: [keyof typeof shipped, Parameters<typeof crossTab>[1]][] = [
      ["regions", "region"],
      ["ageGroups", "age"],
      ["occupations", "occupation"],
    ];
    for (const [key, dim] of pairs) {
      const mine = crossTab(pcells, dim, {}, 3);
      for (const row of shipped[key]) {
        const got = mine.rows.find((r) => r.label === row.label);
        expect(got, `${dim} / ${row.label}`).toBeDefined();
        expect(got!.count).toBe(row.voters);
        expect(Math.round(got!.pct)).toBe(row.share);
        expect(got!.shares).toEqual(row.pcts);
      }
    }
  });
});

/* --------------------------------------------------------------- denominators */

describe("denominators", () => {
  it("counts somebody who skipped a field in every field they did answer", () => {
    // The 7 with no state are in the age, occupation and gender columns.
    expect(crossTab(cells, "region", {}, 3).measured).toBe(26);
    expect(crossTab(cells, "age", {}, 3).measured).toBe(31);
    expect(crossTab(cells, "gender", {}, 3).measured).toBe(29);
    // 2 declined an occupation that counts, and 4 are retired-but-genderless —
    // occupations keeps the latter and drops the former.
    expect(crossTab(cells, "occupation", {}, 3).measured).toBe(31);
  });

  it("shares within a dimension sum to 100", () => {
    for (const dim of ["region", "age", "occupation", "gender"] as const) {
      const { rows } = crossTab(cells, dim, {}, 3);
      const total = rows.reduce((sum, r) => sum + r.pct, 0);
      expect(Math.round(total), dim).toBe(100);
    }
  });

  it("gives every row a split summing to exactly 100", () => {
    for (const dim of ["region", "age", "occupation", "gender"] as const) {
      for (const row of crossTab(cells, dim, {}, 3).rows) {
        expect(row.shares.reduce((a, b) => a + b, 0), `${dim} / ${row.label}`).toBe(100);
      }
    }
  });
});

/* ------------------------------------------------------------------ filtering */

describe("cross-filtering", () => {
  it("re-reads a dimension inside another dimension's filter", () => {
    const all = crossTab(cells, "age", {}, 3);
    const inKarnataka = crossTab(cells, "age", { region: "Karnataka" }, 3);

    // 17-20 exists overall and only outside Karnataka, so the filter removes it.
    expect(all.rows.map((r) => r.label)).toContain("17–20");
    expect(inKarnataka.rows.map((r) => r.label)).not.toContain("17–20");
    expect(inKarnataka.measured).toBe(15);
  });

  it("drops people who never gave the field being filtered on", () => {
    // The 7 with no state are not in "everybody outside Kerala" — they are
    // simply not placed at all.
    const placed = readScope(cells, { region: "Karnataka" }, 3).total;
    const kerala = readScope(cells, { region: "Kerala" }, 3).total;
    expect(placed + kerala).toBe(26);
    expect(readScope(cells, {}, 3).total).toBe(33);
  });

  it("still shows a picked row's neighbours rather than collapsing to 100%", () => {
    const { rows } = crossTab(cells, "region", { region: "Kerala" }, 3);
    expect(rows.map((r) => r.label)).toEqual(["Karnataka", "Kerala"]);
  });

  it("stacks filters across dimensions", () => {
    const both = readScope(cells, { region: "Karnataka", occupation: "Student" }, 3);
    expect(both.total).toBe(8);
    expect(both.counts).toEqual([6, 0, 2]);
  });

  it("reports an empty intersection as empty, not as an even split", () => {
    const none = readScope(cells, { region: "Kerala", occupation: "Retired" }, 3);
    expect(none.empty).toBe(true);
    expect(none.total).toBe(0);
    expect(none.shares).toEqual([0, 0, 0]);
    expect(none.leaderIndex).toBe(-1);
  });

  it("keeps a cell out of a filter it has no value for", () => {
    const noState: AudienceCell = {
      region: null,
      age: "21–24",
      occupation: null,
      gender: null,
      counts: [1, 0, 0],
    };
    expect(matchesFilter(noState, {})).toBe(true);
    expect(matchesFilter(noState, { age: "21–24" })).toBe(true);
    expect(matchesFilter(noState, { region: "Kerala" })).toBe(false);
  });
});

/* ---------------------------------------------------------------- the swing */

describe("the swing column", () => {
  it("measures a group against the surrounding scope on its leading answer", () => {
    const tab = crossTab(cells, "region", {}, 3);
    const scope = readScope(cells, {}, 3);
    const leader = scope.leaderIndex;
    for (const row of tab.rows) {
      expect(row.swing).toBe((row.shares[leader] ?? 0) - (scope.shares[leader] ?? 0));
    }
  });

  it("measures against the filtered scope, not the whole subject", () => {
    const tab = crossTab(cells, "age", { region: "Karnataka" }, 3);
    // The scope a Karnataka age row is compared with is Karnataka, not everyone.
    expect(tab.scope.total).toBe(15);
    expect(tab.scope).toEqual(readScope(cells, { region: "Karnataka" }, 3));
  });

  it("is zero everywhere when nobody is in scope", () => {
    const tab = crossTab(cells, "age", { region: "Goa" }, 3);
    expect(tab.rows).toEqual([]);
    expect(tab.scope.empty).toBe(true);
    expect(tab.swingIndex).toBe(-1);
  });
});

/* ------------------------------------------------------------------ ordering */

describe("row order", () => {
  it("keeps age bands in their natural order, not by size", () => {
    const labels = crossTab(cells, "age", {}, 3).rows.map((r) => r.label);
    expect(labels).toEqual(["17–20", "21–24", "25–30", "31 and over"]);
  });

  it("ranks regions by size, since states have no natural order", () => {
    const rows = crossTab(cells, "region", {}, 3).rows;
    expect(rows.map((r) => r.label)).toEqual(["Karnataka", "Kerala"]);
    expect(rows[0]!.count).toBeGreaterThanOrEqual(rows[1]!.count);
  });

  it("shows a segment the vocabulary does not know rather than dropping it", () => {
    const odd = topicCells([
      ...TOPIC_ROWS,
      { region: "Kerala", age: "21–24", occupation: "Gig worker", gender: "Man", vote: "Positive", responses: 9 },
    ]);
    expect(crossTab(odd, "occupation", {}, 3).rows.map((r) => r.label)).toContain(
      "Gig worker",
    );
  });

  it("omits a group nobody is in", () => {
    const labels = crossTab(cells, "occupation", {}, 3).rows.map((r) => r.label);
    expect(labels).not.toContain("Parent or guardian");
  });
});

/* ------------------------------------------------------------ against the grain */

describe("the contrarian group", () => {
  it("finds a group whose leading answer is not the overall one", () => {
    const odd = contrarianOf(cells, {}, 3);
    expect(odd).not.toBeNull();
    const overall = readScope(cells, {}, 3);
    expect(odd!.leaderIndex).not.toBe(overall.leaderIndex);
  });

  it("reports nothing when everybody agrees", () => {
    const unanimous = topicCells([
      { region: "Kerala", age: "21–24", occupation: "Student", gender: "Man", vote: "Positive", responses: 20 },
      { region: "Karnataka", age: "25–30", occupation: "Educator", gender: "Woman", vote: "Positive", responses: 14 },
    ]);
    expect(contrarianOf(unanimous, {}, 3)).toBeNull();
  });

  it("will not call one person a movement", () => {
    const tiny = topicCells([
      { region: "Kerala", age: "21–24", occupation: "Student", gender: "Man", vote: "Positive", responses: 20 },
      { region: "Karnataka", age: "25–30", occupation: "Educator", gender: "Woman", vote: "Negative", responses: 2 },
    ]);
    expect(contrarianOf(tiny, {}, 3)).toBeNull();
    expect(contrarianOf(tiny, {}, 3, 2)).not.toBeNull();
  });

  it("says nothing about a dimension already filtered", () => {
    const odd = contrarianOf(cells, { region: "Kerala" }, 3);
    expect(odd?.dim).not.toBe("region");
  });

  it("reports nothing when nobody is in scope", () => {
    expect(contrarianOf(cells, { region: "Goa" }, 3)).toBeNull();
  });
});

/* -------------------------------------------------------------------- labels */

describe("filter helpers", () => {
  it("names the scope", () => {
    expect(scopeLabel({})).toBe("Everyone");
    expect(scopeLabel({ region: "Kerala" })).toBe("Kerala");
    expect(scopeLabel({ region: "Kerala", occupation: "Student" })).toBe("Kerala · Student");
  });

  it("sets and clears one dimension without touching the others", () => {
    const one = withDim({}, "region", "Kerala");
    const two = withDim(one, "age", "21–24");
    expect(two).toEqual({ region: "Kerala", age: "21–24" });
    expect(withDim(two, "region", undefined)).toEqual({ age: "21–24" });
    // The input is never mutated — the filter is React state upstream.
    expect(one).toEqual({ region: "Kerala" });
  });
});

describe("summarise", () => {
  it("rounds shares to exactly 100", () => {
    expect(summarise([1, 1, 1]).shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("reports a tie's margin as zero", () => {
    expect(summarise([5, 0, 5]).margin).toBe(0);
  });
});
