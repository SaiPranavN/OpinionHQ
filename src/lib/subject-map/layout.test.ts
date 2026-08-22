import { describe, expect, it } from "vitest";

import {
  CIRCLE_DIAMETER,
  CIRCLE_SPACING,
  hexSpiral,
  layoutCluster,
  neighbourMap,
  orderForSpiral,
} from "./layout";

const subject = (id: string, createdKey: number) => ({ id, createdKey });

describe("hexSpiral", () => {
  it("puts the first cell at the exact centre", () => {
    const cells = hexSpiral(1);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ x: 0, y: 0, ring: 0 });
  });

  it("fills complete rings: 1, then 6, then 12, then 18", () => {
    const cells = hexSpiral(1 + 6 + 12 + 18);
    const byRing = new Map<number, number>();
    for (const cell of cells) byRing.set(cell.ring, (byRing.get(cell.ring) ?? 0) + 1);
    expect(byRing.get(0)).toBe(1);
    expect(byRing.get(1)).toBe(6);
    expect(byRing.get(2)).toBe(12);
    expect(byRing.get(3)).toBe(18);
  });

  it("assigns earlier indices to inner rings — newest stays central", () => {
    const cells = hexSpiral(50);
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i]!.ring).toBeGreaterThanOrEqual(cells[i - 1]!.ring);
    }
  });

  it("keeps every neighbouring pair at least one spacing apart — no overlap", () => {
    const cells = hexSpiral(200);
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const d = Math.hypot(cells[i]!.x - cells[j]!.x, cells[i]!.y - cells[j]!.y);
        expect(d).toBeGreaterThanOrEqual(CIRCLE_SPACING - 0.001);
      }
    }
  });

  it("spacing leaves room for the maximum combined hover + selection scale", () => {
    // Lens tops out at 1, hover adds 5%, selection 9%: two adjacent circles at
    // their worst case must still not touch.
    const worstRadii = (CIRCLE_DIAMETER / 2) * (1.05 + 1.09);
    expect(CIRCLE_SPACING).toBeGreaterThan(worstRadii);
  });

  it("is deterministic", () => {
    expect(hexSpiral(97)).toEqual(hexSpiral(97));
  });

  it("handles zero and large counts", () => {
    expect(hexSpiral(0)).toEqual([]);
    expect(hexSpiral(500)).toHaveLength(500);
  });
});

describe("orderForSpiral", () => {
  it("sorts newest first", () => {
    const ordered = orderForSpiral([subject("a", 1), subject("b", 3), subject("c", 2)]);
    expect(ordered.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks creation-time ties by id, stably across shuffles", () => {
    const list = [subject("z", 5), subject("m", 5), subject("a", 5)];
    const shuffled = [list[1]!, list[2]!, list[0]!];
    expect(orderForSpiral(list).map((s) => s.id)).toEqual(["a", "m", "z"]);
    expect(orderForSpiral(shuffled).map((s) => s.id)).toEqual(["a", "m", "z"]);
  });

  it("sorts unknown creation times (0) to the outermost positions", () => {
    const ordered = orderForSpiral([subject("old", 0), subject("new", 10)]);
    expect(ordered[0]!.id).toBe("new");
  });
});

describe("layoutCluster", () => {
  it("places the newest subject at the centre", () => {
    const layout = layoutCluster([subject("older", 1), subject("newest", 9)]);
    expect(layout.byId.get("newest")).toMatchObject({ x: 0, y: 0, ring: 0 });
    expect(layout.byId.get("older")!.ring).toBe(1);
  });

  it("centres a single subject with bounds of one diameter", () => {
    const layout = layoutCluster([subject("only", 1)]);
    expect(layout.bounds.width).toBe(CIRCLE_DIAMETER);
    expect(layout.bounds.height).toBe(CIRCLE_DIAMETER);
    expect(layout.bounds.centerX).toBe(0);
    expect(layout.bounds.centerY).toBe(0);
  });

  it("bounds contain every circle including its radius", () => {
    const layout = layoutCluster(
      Array.from({ length: 120 }, (_, i) => subject(`s${i}`, i)),
    );
    const r = CIRCLE_DIAMETER / 2;
    for (const { position } of layout.placed) {
      expect(position.x - r).toBeGreaterThanOrEqual(layout.bounds.minX);
      expect(position.x + r).toBeLessThanOrEqual(layout.bounds.maxX);
      expect(position.y - r).toBeGreaterThanOrEqual(layout.bounds.minY);
      expect(position.y + r).toBeLessThanOrEqual(layout.bounds.maxY);
    }
  });

  it("lays out several hundred subjects quickly", () => {
    const many = Array.from({ length: 500 }, (_, i) => subject(`s${i}`, i % 37));
    const started = performance.now();
    const layout = layoutCluster(many);
    expect(performance.now() - started).toBeLessThan(50);
    expect(layout.placed).toHaveLength(500);
    expect(new Set(layout.placed.map((p) => `${p.position.x},${p.position.y}`)).size).toBe(500);
  });
});

describe("neighbourMap", () => {
  it("gives the centre cell exactly six neighbours in a full ring", () => {
    const cells = hexSpiral(7);
    const neighbours = neighbourMap(cells);
    expect(neighbours[0]).toHaveLength(6);
  });

  it("never lists a cell as its own neighbour", () => {
    const cells = hexSpiral(30);
    const neighbours = neighbourMap(cells);
    neighbours.forEach((list, i) => expect(list).not.toContain(i));
  });
});
