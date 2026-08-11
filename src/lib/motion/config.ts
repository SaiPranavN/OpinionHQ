/**
 * Every number the ambient background system is allowed to use.
 *
 * Centralised on purpose: a motion system tuned across six files drifts within
 * a week, and "why is the landing page busier than Topics?" becomes impossible
 * to answer. Components read from here and own no magic numbers of their own.
 *
 * The metaphor the whole system serves: individual signals moving through a
 * network and gradually forming collective opinion. Every value below is in
 * service of that reading — sparse enough that a node reads as *one person*,
 * slow enough that connections read as consensus forming rather than traffic.
 */

/** Which page personality the background is wearing. */
export type AmbientVariant =
  | "landing"
  | "topics"
  | "polls"
  | "ask"
  | "minimal"
  | "static";

/** How much of the system is allowed to run, decided at runtime. */
export type MotionTier = "full" | "reduced" | "static";

/** Device budget, from viewport width. Density scales off this, not off UA. */
export type DeviceTier = "mobile" | "tablet" | "desktop";

/* ------------------------------------------------------------------ timing */

/**
 * Ambient, not animated. Nothing here is fast enough to read as a transition —
 * the shortest loop is over half a minute, so the page looks different when you
 * glance back rather than moving while you read.
 */
export const DURATION = {
  /** Mesh blob drift, in seconds. Coprime-ish so the composition never loops. */
  mesh: [34, 41, 47, 53] as const,
  /** Contour band drift. Slower still — these are the "ground". */
  contour: [67, 79, 91] as const,
  /** Cursor glow catch-up. Long enough to lag the pointer, short enough to track. */
  cursorEaseMs: 620,
  /** Reveal and micro-interaction range, per §11/§12. */
  revealMs: 620,
  metricMs: 700,
  hoverMs: 300,
} as const;

/* ----------------------------------------------------------------- density */

export interface NodeDensity {
  /** Node count at this device tier. */
  count: number;
  /** Pixels within which two nodes may connect. */
  linkRadius: number;
  /** Hard cap on simultaneous connections — the anti-neural-network rule. */
  maxLinks: number;
}

/**
 * Sparse by mandate. The brief's test is that a reader notices the nodes only
 * after looking for a moment, which puts the desktop count in the dozens, not
 * the hundreds. Mobile drops to a handful and mostly stops moving.
 */
export const DENSITY: Record<DeviceTier, NodeDensity> = {
  desktop: { count: 34, linkRadius: 190, maxLinks: 7 },
  tablet: { count: 20, linkRadius: 165, maxLinks: 4 },
  mobile: { count: 8, linkRadius: 130, maxLinks: 2 },
};

/* ---------------------------------------------------------------- opacity */

/**
 * Ceilings, not targets. Everything ambient sits under the text it shares a
 * page with; these are the values that keep body copy at full contrast.
 */
export const ALPHA = {
  meshMax: 0.16,
  contourLine: 0.055,
  contourLineStrong: 0.085,
  node: 0.42,
  nodeDim: 0.14,
  link: 0.16,
  cursorGlow: 0.05,
  /** The faint fragmented grid, kept only for `minimal`. */
  gridLine: 0.045,
} as const;

/* -------------------------------------------------------------- parallax */

/**
 * Scroll multipliers, per §8. Deliberately tiny: the point is that layers
 * separate in depth, not that anything visibly travels.
 */
export const PARALLAX = {
  mesh: 0.03,
  contour: 0.07,
  nodes: 0.045,
  /** Pointer pull, in pixels at the screen edge. */
  cursorMesh: 14,
  cursorNodes: 9,
} as const;

/* --------------------------------------------------------------- palette */

export interface MeshBlob {
  /** CSS colour, normally a theme variable so it survives a theme flip. */
  color: string;
  /** Percentage of the layer, as `left`/`top`. */
  x: number;
  y: number;
  /** Diameter in vmax. */
  size: number;
  /** Peak alpha, clamped by ALPHA.meshMax. */
  alpha: number;
  /** Index into DURATION.mesh. */
  drift: number;
}

export type NodeTone = "positive" | "neutral" | "negative" | "poll" | "private";

export interface VariantConfig {
  mesh: MeshBlob[];
  /** Contour band count. Zero disables the layer. */
  contours: number;
  /** Relative node count, 0–1 of the device budget. */
  nodeScale: number;
  /** Sampling weights for node tone. Rare reds are the point. */
  tones: Partial<Record<NodeTone, number>>;
  /** Two opposing fields that converge — the Polls behaviour. */
  opposing?: boolean;
  /** Nodes drift toward a centre point rather than wandering — Ask Verified. */
  enclosed?: boolean;
  /** Keep a faint fragmented grid. Internal/technical surfaces only. */
  grid?: boolean;
  cursorGlow: boolean;
}

/**
 * Per-page personalities.
 *
 * The differences are deliberately small. A background that changes character
 * dramatically between routes reads as four different products; these are the
 * same system leaning a few degrees in a different direction.
 */
export const VARIANTS: Record<AmbientVariant, VariantConfig> = {
  /**
   * The richest treatment. Green and purple — the two public modes — with a
   * lift behind the hero. Motion stays out of the headline's way: the blobs
   * sit off-centre and the node field thins toward the middle of the screen.
   */
  landing: {
    mesh: [
      { color: "var(--color-positive)", x: 18, y: 22, size: 62, alpha: 0.16, drift: 0 },
      { color: "var(--color-poll)", x: 82, y: 72, size: 56, alpha: 0.13, drift: 1 },
      { color: "var(--color-private)", x: 52, y: 44, size: 48, alpha: 0.08, drift: 2 },
      { color: "var(--color-positive)", x: 68, y: 8, size: 40, alpha: 0.07, drift: 3 },
    ],
    contours: 7,
    nodeScale: 1,
    tones: { positive: 5, neutral: 6, negative: 1, poll: 2 },
    cursorGlow: true,
  },

  /** Analytical. Green-led, one restrained sentiment accent, fewer blobs. */
  topics: {
    mesh: [
      { color: "var(--color-positive)", x: 14, y: 26, size: 54, alpha: 0.12, drift: 0 },
      { color: "var(--color-poll)", x: 88, y: 76, size: 46, alpha: 0.08, drift: 2 },
      { color: "var(--color-negative)", x: 70, y: 14, size: 34, alpha: 0.05, drift: 1 },
    ],
    contours: 6,
    nodeScale: 0.8,
    tones: { positive: 5, neutral: 7, negative: 2 },
    cursorGlow: true,
  },

  /**
   * Two competing positions. The fields originate left and right and drift
   * gently toward each other; they meet near the centre without colliding,
   * which is the whole argument a poll makes.
   */
  polls: {
    mesh: [
      { color: "var(--color-positive)", x: 4, y: 40, size: 58, alpha: 0.13, drift: 0 },
      { color: "var(--color-poll)", x: 96, y: 58, size: 58, alpha: 0.13, drift: 1 },
      { color: "var(--color-private)", x: 50, y: 50, size: 34, alpha: 0.05, drift: 3 },
    ],
    contours: 5,
    nodeScale: 0.85,
    tones: { positive: 5, poll: 5, neutral: 3 },
    opposing: true,
    cursorGlow: true,
  },

  /**
   * The calmest system on the platform. No red anywhere — a private guidance
   * screen must never carry a sentiment signal — and the nodes stay inside a
   * soft boundary rather than wandering off, which is as close to "enclosed
   * and confidential" as this vocabulary gets without drawing a literal shield.
   */
  ask: {
    mesh: [
      { color: "var(--color-positive)", x: 50, y: 30, size: 52, alpha: 0.09, drift: 2 },
      { color: "var(--color-private)", x: 24, y: 70, size: 44, alpha: 0.08, drift: 0 },
      { color: "var(--color-private)", x: 78, y: 62, size: 40, alpha: 0.06, drift: 3 },
    ],
    contours: 4,
    nodeScale: 0.5,
    tones: { positive: 3, neutral: 6, private: 4 },
    enclosed: true,
    cursorGlow: true,
  },

  /**
   * Composers and verification screens: forms, not reading. This is the one
   * place the old square grid survives, at well under half its former weight
   * and cut with contours so it never reads as a dashboard again.
   */
  minimal: {
    mesh: [
      { color: "var(--color-positive)", x: 12, y: 18, size: 44, alpha: 0.07, drift: 0 },
      { color: "var(--color-poll)", x: 90, y: 80, size: 40, alpha: 0.05, drift: 1 },
    ],
    contours: 3,
    nodeScale: 0,
    tones: { neutral: 1 },
    grid: true,
    cursorGlow: false,
  },

  /** The reduced-motion and print fallback. Gradient only, nothing moves. */
  static: {
    mesh: [
      { color: "var(--color-positive)", x: 18, y: 24, size: 58, alpha: 0.11, drift: 0 },
      { color: "var(--color-poll)", x: 84, y: 74, size: 50, alpha: 0.09, drift: 1 },
    ],
    contours: 4,
    nodeScale: 0,
    tones: {},
    cursorGlow: false,
  },
};

/** Tone → CSS colour. Kept here so no component hard-codes a node colour. */
export const TONE_COLOR: Record<NodeTone, string> = {
  positive: "var(--color-positive)",
  neutral: "var(--color-muted)",
  negative: "var(--color-negative)",
  poll: "var(--color-poll)",
  private: "var(--color-private)",
};

/**
 * Maps a route to its variant.
 *
 * Lives here rather than in the layout so adding a route means editing one
 * list, and so the mapping is testable without mounting React.
 */
export function variantForPath(pathname: string): AmbientVariant {
  // Composers and verification first — they are `minimal` even though they sit
  // under a section prefix that would otherwise claim them.
  if (
    pathname.endsWith("/new") ||
    pathname.startsWith("/ask/verify") ||
    pathname.startsWith("/admin")
  ) {
    return "minimal";
  }
  if (pathname.startsWith("/polls")) return "polls";
  if (pathname.startsWith("/topics")) return "topics";
  if (pathname.startsWith("/ask")) return "ask";
  if (pathname === "/") return "landing";
  return "topics";
}

/** Viewport width → device tier. One breakpoint pair, used everywhere. */
export function deviceTierFor(width: number): DeviceTier {
  if (width < 768) return "mobile";
  if (width < 1180) return "tablet";
  return "desktop";
}

/* ------------------------------------------------------------- resolution */

export interface ResolvedLayers {
  /** Which variant's palette and density actually apply. */
  variant: AmbientVariant;
  /** Mesh blobs are painted (always) and animated (sometimes). */
  meshAnimates: boolean;
  contoursAnimate: boolean;
  /** The canvas mounts at all. */
  nodes: boolean;
  cursor: boolean;
  parallax: boolean;
}

/**
 * The single decision about how much of the system runs.
 *
 * Pulled out of the component and made pure because it is the part with real
 * consequences — an accessibility promise and a battery promise — and a rule
 * expressed as nested ternaries inside JSX is a rule nobody can test. Every
 * guarantee the brief asks for is one assertion against this function.
 *
 * The three rules, in order of authority:
 *   1. A reduced-motion request wins over everything. Nothing moves, and the
 *      variant collapses to `static` so the page keeps colour and contour but
 *      no loops of any kind.
 *   2. Mobile keeps the gradient and drops everything that costs a frame
 *      budget: no canvas, no parallax, no pointer work.
 *   3. Pointer effects additionally require a fine pointer, so a tablet with a
 *      mouse gets a glow and a laptop trackpad user is unaffected.
 */
export function resolveLayers(input: {
  variant: AmbientVariant;
  motion: MotionTier;
  device: DeviceTier;
  pointerFine: boolean;
}): ResolvedLayers {
  const { motion, device, pointerFine } = input;

  if (motion !== "full") {
    return {
      variant: "static",
      meshAnimates: false,
      contoursAnimate: false,
      nodes: false,
      cursor: false,
      parallax: false,
    };
  }

  const rich = device !== "mobile";
  const config = VARIANTS[input.variant];

  return {
    variant: input.variant,
    // The gradient is the one thing that keeps breathing on a phone: it is a
    // single composited transform and it is what stops a mobile page looking
    // like a different product from the desktop one.
    meshAnimates: true,
    contoursAnimate: rich,
    nodes: rich && config.nodeScale > 0,
    cursor: rich && pointerFine && config.cursorGlow,
    parallax: rich,
  };
}
