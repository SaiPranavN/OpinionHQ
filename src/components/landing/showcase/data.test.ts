import { describe, expect, it } from "vitest";

import {
  AGES,
  CELLS,
  DAYS,
  DIM_VALUES,
  STATES,
  WORK,
  breakdown,
  contrarian,
  filterLabel,
  read,
  roundShares,
  stackFor,
  trend,
  withDim,
  type Dim,
  type Filter,
  type Mode,
} from "@/components/landing/showcase/data";

/**
 * The showcase model, tested for the properties the panels assume.
 *
 * Nothing here checks a *value* — the numbers are an illustration and any of
 * them may be tuned. What is tested is the set of invariants the charts are
 * drawn against, every one of which fails silently and visibly:
 *
 *   • shares that do not total 100 leave a gap at the end of a stacked bar
 *   • a filter that selects nobody divides by zero and renders NaN%
 *   • an "against the grain" callout naming a group that is not actually
 *     against the grain is the one thing on the panel that would be a lie
 *
 * The last is the reason this file exists. `contrarian` is a search, not a
 * constant, so it can quietly start reporting a group that agrees with
 * everybody the moment an effect above it is retuned.
 */

const MODES: Mode[] = ["topic", "poll"];
const DIMS: Dim[] = ["state", "age", "work"];

/** Every single-axis filter, plus the unfiltered case. */
function everyFilter(): Filter[] {
  const out: Filter[] = [{}];
  for (const dim of DIMS) {
    for (const value of DIM_VALUES[dim]) out.push(withDim({}, dim, value));
  }
  return out;
}

describe("roundShares", () => {
  it("totals exactly 100", () => {
    expect(roundShares([33.4, 33.3, 33.3]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(roundShares([0.4, 0.3, 99.3]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(roundShares([50, 50]).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives the spare point to the largest remainder", () => {
    // 33.4 / 33.3 / 33.3 floors to 99; the extra belongs to the first.
    expect(roundShares([33.4, 33.3, 33.3])).toEqual([34, 33, 33]);
  });

  it("never moves a share by more than a point", () => {
    const input = [12.6, 48.1, 39.3];
    roundShares(input).forEach((out, i) => {
      expect(Math.abs(out - input[i]!)).toBeLessThan(1);
    });
  });
});

describe("the sample", () => {
  it("has one cell per state, age band and occupation", () => {
    expect(CELLS).toHaveLength(STATES.length * AGES.length * WORK.length);
  });

  it("weights to one, so a share is a share of everybody", () => {
    const total = CELLS.reduce((sum, cell) => sum + cell.w, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("puts nobody in a cell twice and nobody in a negative one", () => {
    const seen = new Set(CELLS.map((c) => `${c.state}|${c.age}|${c.work}`));
    expect(seen.size).toBe(CELLS.length);
    expect(CELLS.every((c) => c.w > 0)).toBe(true);
  });
});

describe("read", () => {
  it("totals 100 on both instruments, under every single-axis filter", () => {
    for (const filter of everyFilter()) {
      const reading = read(filter);
      expect(reading.empty).toBe(false);
      expect(reading.sentiment.reduce((a, b) => a + b, 0)).toBe(100);
      expect(reading.poll.reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it("reports the whole sample when nothing is filtered", () => {
    expect(read({}).share).toBeCloseTo(100, 1);
  });

  it("narrows as filters are added, and never widens", () => {
    const all = read({});
    const kerala = read({ state: "Kerala" });
    const keralaYoung = read({ state: "Kerala", age: "21–24" });

    expect(kerala.share).toBeLessThan(all.share);
    expect(keralaYoung.share).toBeLessThan(kerala.share);
    expect(keralaYoung.share).toBeGreaterThan(0);
  });

  it("still totals 100 with all three axes pinned", () => {
    const reading = read({ state: "Uttar Pradesh", age: "41+", work: "Public sector" });
    expect(reading.empty).toBe(false);
    expect(reading.sentiment.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("moves the reading when the run drifts, without changing who was asked", () => {
    const flat = read({});
    const drifted = read({}, -0.4);
    expect(drifted.sentiment[0]).toBeLessThan(flat.sentiment[0]!);
    expect(drifted.share).toBeCloseTo(flat.share, 6);
  });
});

describe("breakdown", () => {
  it("splits the in-scope sample into rows that total 100", () => {
    for (const mode of MODES) {
      for (const dim of DIMS) {
        const { rows } = breakdown(dim, {}, mode);
        expect(rows).toHaveLength(DIM_VALUES[dim].length);
        expect(rows.reduce((sum, r) => sum + r.pct, 0)).toBeCloseTo(100, 0);
      }
    }
  });

  it("measures the swing against whichever answer is leading", () => {
    for (const mode of MODES) {
      const overall = read({});
      const shares = mode === "topic" ? overall.sentiment : overall.poll;
      const leader = Math.max(...shares);
      const { rows, swingOf } = breakdown("age", {}, mode);

      expect(swingOf).toStrictEqual(stackFor(mode)[shares.indexOf(leader)]);
      // Somebody has to be above the average and somebody below it, or the
      // column is reporting nothing.
      expect(rows.some((r) => r.swing > 0)).toBe(true);
      expect(rows.some((r) => r.swing < 0)).toBe(true);
    }
  });

  it("re-splits within an active filter rather than across everybody", () => {
    // Students concentrate in the young bands, so filtering to them has to
    // change the age composition — that is the whole point of a cross-tab.
    const all = breakdown("age", {}, "topic").rows;
    const students = breakdown("age", { work: "Student" }, "topic").rows;

    expect(students.reduce((sum, r) => sum + r.pct, 0)).toBeCloseTo(100, 0);
    expect(students[0]!.pct).toBeGreaterThan(all[0]!.pct);
  });
});

describe("contrarian", () => {
  it("only ever names a group that really does lead with something else", () => {
    for (const mode of MODES) {
      for (const filter of everyFilter()) {
        const found = contrarian(filter, mode);
        if (!found) continue;

        const overall = read(filter);
        const overallShares = mode === "topic" ? overall.sentiment : overall.poll;
        const overallLeader = overallShares.indexOf(Math.max(...overallShares));

        const group = read(withDim(filter, found.dim, found.label));
        const groupShares = mode === "topic" ? group.sentiment : group.poll;

        expect(found.leaderIndex).not.toBe(overallLeader);
        expect(groupShares.indexOf(Math.max(...groupShares))).toBe(found.leaderIndex);
        expect(found.leaderPct).toBe(groupShares[found.leaderIndex]);
      }
    }
  });

  it("never names an axis that is already pinned", () => {
    const found = contrarian({ work: "Self-employed" }, "poll");
    expect(found?.dim).not.toBe("work");
  });

  it("finds the disagreement the illustration is built around", () => {
    // Not an assertion about the world — an assertion that the tuning still
    // produces a poll worth showing cross-tabs for. If this fails, the
    // softmax temperature has drifted and the panel has gone quiet.
    expect(contrarian({}, "poll")).not.toBeNull();
  });
});

describe("trend", () => {
  it("plots one reading per day of the run", () => {
    const points = trend({});
    expect(points).toHaveLength(DAYS.length);
    expect(points.map((p) => p.n)).toEqual(DAYS.map((d) => d.n));
  });

  it("totals 100 at every point, on both instruments", () => {
    for (const filter of everyFilter()) {
      for (const point of trend(filter)) {
        expect(point.sentiment.reduce((a, b) => a + b, 0)).toBe(100);
        expect(point.poll.reduce((a, b) => a + b, 0)).toBe(100);
      }
    }
  });

  it("carries every event through to the point it landed on", () => {
    const marked = trend({}).filter((p) => p.marker);
    expect(marked.map((p) => p.n)).toEqual(DAYS.filter((d) => d.marker).map((d) => d.n));
  });

  it("ends exactly on the headline reading, under every filter", () => {
    // The donut is `read(filter)` at drift zero and the last point of the trend
    // is `read(filter, cumulative drift)`. If the drift series does not average
    // to zero those are two different figures six inches apart on one panel,
    // both describing "now" — which is the class of contradiction this whole
    // model exists to make impossible. The re-centring in DAYS is what holds
    // it, and this is the assertion that notices if somebody removes it.
    for (const filter of everyFilter()) {
      const points = trend(filter);
      const last = points[points.length - 1]!;
      const headline = read(filter);
      expect(last.sentiment).toEqual(headline.sentiment);
      expect(last.poll).toEqual(headline.poll);
    }
  });

  it("actually moves on the way there", () => {
    // A trend that ends on the headline could trivially be a flat line. The
    // opening crowd has to read the film differently from the whole run, or
    // the chart is decoration.
    const points = trend({});
    expect(points[0]!.sentiment[0]).toBeGreaterThan(points[points.length - 1]!.sentiment[0]! + 5);
  });

  it("finds a group that reads the subject the other way", () => {
    // Same argument as the poll's contrarian test: if no age band flips, the
    // cross-filter has nothing to demonstrate and the panel goes quiet.
    expect(contrarian({}, "topic")).not.toBeNull();
  });
});

describe("filterLabel", () => {
  it("says everyone when nothing is picked", () => {
    expect(filterLabel({})).toBe("Everyone");
  });

  it("joins the axes that are", () => {
    expect(filterLabel({ state: "Kerala", work: "Student" })).toBe("Kerala · Student");
  });
});

describe("stackFor", () => {
  it("gives three named, coloured series in both modes", () => {
    for (const mode of MODES) {
      const stack = stackFor(mode);
      expect(stack).toHaveLength(3);
      expect(stack.every((s) => s.id && s.label && s.color && s.text)).toBe(true);
    }
  });
});
