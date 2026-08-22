/**
 * Spatial layout for the catalogue map.
 *
 * PURE, AND THE PART WITH CLAIMS IN IT. The subject map promises three
 * things the UI cannot verify by looking at itself: the newest subject sits at
 * the exact centre, every subsequent subject occupies the next cell of an
 * outward hexagonal spiral, and the same list always produces the same
 * arrangement. Those are assertions, so they live here where a test can hold
 * them, and the components only ever draw what this module says.
 *
 * No randomness anywhere. A catalogue that shuffles on refresh reads as a
 * decoration; one that keeps its shape reads as a place.
 */

/** Base circle diameter in world units (CSS px at zoom 1). */
export const CIRCLE_DIAMETER = 148;

/**
 * Centre-to-centre distance between adjacent circles.
 *
 * The 15% margin is not taste — it is the sum of every scale the circles are
 * allowed to reach at once: the lens tops out at 1, hover adds ~5%, selection
 * ~9%. Two adjacent circles at their combined maxima span 1.14 diameters of
 * radius between them, so 1.15 is the smallest spacing at which "tightly
 * packed" and "never overlapping" are both true.
 */
export const CIRCLE_SPACING = Math.round(CIRCLE_DIAMETER * 1.15);

export interface CirclePosition {
  /** World-space centre. The origin is the centre of the cluster. */
  x: number;
  y: number;
  /** Which hexagonal ring this cell belongs to. 0 is the centre cell. */
  ring: number;
}

/**
 * Axial hex directions, in the order the spiral walks a ring. Pointy-top
 * orientation: rows run horizontally and alternate rows sit offset by half a
 * cell, which is the Apple Watch arrangement.
 */
const HEX_DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

function axialToPixel(q: number, r: number, spacing: number): { x: number; y: number } {
  return {
    x: spacing * (q + r / 2),
    y: spacing * ((Math.sqrt(3) / 2) * r),
  };
}

/**
 * The first `count` cells of a hexagonal spiral, centre first, then ring by
 * ring outward. Deterministic: index n is always the same cell.
 */
export function hexSpiral(count: number, spacing = CIRCLE_SPACING): CirclePosition[] {
  const cells: CirclePosition[] = [];
  if (count <= 0) return cells;

  cells.push({ x: 0, y: 0, ring: 0 });

  let ring = 1;
  while (cells.length < count) {
    // Start each ring at the cell directly "south-west" of centre and walk the
    // six sides. Starting cell = direction[4] scaled by the ring index.
    let q = HEX_DIRECTIONS[4]![0] * ring;
    let r = HEX_DIRECTIONS[4]![1] * ring;
    for (let side = 0; side < 6 && cells.length < count; side++) {
      for (let step = 0; step < ring && cells.length < count; step++) {
        const { x, y } = axialToPixel(q, r, spacing);
        cells.push({ x, y, ring });
        q += HEX_DIRECTIONS[side]![0];
        r += HEX_DIRECTIONS[side]![1];
      }
    }
    ring += 1;
  }

  return cells;
}

/**
 * The ordering law: newest first, and a stable secondary key so two subjects
 * created in the same instant do not swap places between refreshes.
 *
 * `createdKey` is the creation timestamp in milliseconds; 0 means unknown,
 * which sorts oldest — an honest place for a record whose age we cannot state.
 */
export interface Orderable {
  id: string;
  createdKey: number;
}

export function orderForSpiral<T extends Orderable>(subjects: readonly T[]): T[] {
  return [...subjects].sort((a, b) => {
    if (b.createdKey !== a.createdKey) return b.createdKey - a.createdKey;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface ClusterLayout<T extends Orderable> {
  /** Subjects in spiral order (newest first), paired with their cells. */
  placed: { subject: T; position: CirclePosition }[];
  /** Position keyed by subject id, for O(1) lookup during camera flights. */
  byId: Map<string, CirclePosition>;
  /** World-space bounding box of the cluster, *including* circle radii. */
  bounds: ClusterBounds;
}

export interface ClusterBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function layoutCluster<T extends Orderable>(
  subjects: readonly T[],
  spacing = CIRCLE_SPACING,
  diameter = CIRCLE_DIAMETER,
): ClusterLayout<T> {
  const ordered = orderForSpiral(subjects);
  const cells = hexSpiral(ordered.length, spacing);

  const placed = ordered.map((subject, i) => ({ subject, position: cells[i]! }));
  const byId = new Map(placed.map((p) => [p.subject.id, p.position]));

  const radius = diameter / 2;
  let minX = -radius;
  let maxX = radius;
  let minY = -radius;
  let maxY = radius;
  for (const cell of cells) {
    minX = Math.min(minX, cell.x - radius);
    maxX = Math.max(maxX, cell.x + radius);
    minY = Math.min(minY, cell.y - radius);
    maxY = Math.max(maxY, cell.y + radius);
  }

  return {
    placed,
    byId,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    },
  };
}

/**
 * Which circles sit directly beside each cell — for the hover repulsion, which
 * nudges immediate neighbours a few pixels and must know who they are without
 * measuring the DOM. Adjacency in a hex grid is a distance check: anything
 * within ~1.05 spacings is a touching neighbour, everything else is not.
 */
export function neighbourMap(
  cells: readonly CirclePosition[],
  spacing = CIRCLE_SPACING,
): number[][] {
  const limit = spacing * 1.05;
  const limitSq = limit * limit;
  const out: number[][] = cells.map(() => []);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const dx = cells[i]!.x - cells[j]!.x;
      const dy = cells[i]!.y - cells[j]!.y;
      if (dx * dx + dy * dy <= limitSq) {
        out[i]!.push(j);
        out[j]!.push(i);
      }
    }
  }
  return out;
}
