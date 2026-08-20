/**
 * Where things sit at a given point in a pinned scroll scene.
 *
 * Three sections on the landing page convert a scroll gesture into a 0–1
 * progress value and place their contents from it: the mode cards arriving on a
 * conveyor, the result stage stepping through four acts, and the deck of open
 * subjects dealing one card at a time. The placement is pure arithmetic, so it
 * lives here rather than inside the three client components that render it.
 *
 * That separation is not tidiness. These are the parts of the landing page that
 * only exist *while scrolling*, and a scroll is the one interaction that cannot
 * be verified by loading a page and looking at it — the state at progress 0 is
 * the only one a static check ever sees. Pulling the arithmetic out means the
 * middle and the end are assertable without a browser at all, which is how the
 * accompanying tests can say anything about the eighty percent of these
 * animations that a screenshot never reaches.
 */

/* ------------------------------------------------------------------ shared */

/**
 * Eases a linear scrub.
 *
 * Scroll position is linear, and motion driven straight off it looks mechanical
 * because it starts and stops as abruptly as the reader's finger does. The
 * standard smoothstep — zero derivative at both ends — puts the ease back
 * without introducing the lag a numeric ScrollTrigger `scrub` would.
 */
export function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/**
 * Maps a scene's overall progress onto one step's own 0–1 range.
 *
 * A scene with four steps gives each a quarter of the scroll. Clamped at both
 * ends, so a step that has finished stays finished rather than continuing to
 * animate off the far side while the next one runs.
 */
export function stageOf(progress: number, index: number, count: number): number {
  if (count <= 0) return 1;
  const span = 1 / count;
  return clamp01((progress - index * span) / span);
}

/* ------------------------------------------------------- the card conveyor */

/**
 * How much of the next card's arrival overlaps the previous card's.
 *
 * 0 would give each card the scene to itself and read as two disconnected
 * events with a dead patch of scrolling between them. A third and they arrive
 * together and the stagger disappears. This is the "slight stagger" — the
 * second card starts turning while the first is finishing its settle.
 */
export const BAND_OVERLAP = 0.16;

/** Where a card starts: off to the right, edge-on, back, and small. */
export const CONVEYOR_FROM = {
  rotateY: 75,
  translateX: 72,
  translateZ: -280,
  scale: 0.86,
  blur: 6,
} as const;

/**
 * The band of scene progress a card owns, as its own 0–1.
 *
 * Returned this way so a card does not need to know how many cards there are or
 * where it sits among them.
 */
export function bandOf(progress: number, index: number, count: number): number {
  if (count <= 1) return clamp01(progress);
  const span = 1 / (count - (count - 1) * BAND_OVERLAP);
  const start = index * span * (1 - BAND_OVERLAP);
  return clamp01((progress - start) / span);
}

export interface ConveyorSeat {
  transform: string;
  opacity: number;
  filter: string;
}

export function conveyorSeat(t: number): ConveyorSeat {
  const away = 1 - clamp01(t);
  const f = CONVEYOR_FROM;
  // Dropped outright near the end. A blur filter forces its own raster layer,
  // and text rasterised through one never comes back quite as crisp — the cards
  // carry body copy and figures, and those have to be sharp once they stop.
  const blur = t > 0.88 ? 0 : away * f.blur;
  return {
    transform: `translateX(${(away * f.translateX).toFixed(2)}%) translateZ(${(
      away * f.translateZ
    ).toFixed(1)}px) rotateY(${(away * f.rotateY).toFixed(2)}deg) scale(${(
      1 -
      away * (1 - f.scale)
    ).toFixed(4)})`,
    // Solid well before it lands, so the card is legible for the whole of its
    // settle rather than fading in at the end of it.
    opacity: Math.min(1, clamp01(t) * 2.6),
    filter: blur === 0 ? "none" : `blur(${blur.toFixed(2)}px)`,
  };
}

/* --------------------------------------------------------- the stage steps */

/**
 * How far either side of a step's centre it stays fully opaque, and where it
 * has faded out completely. Both in units of one band.
 *
 * These were 0.3 and 0.66, which made the crossfade span most of every band:
 * at the midpoint between two acts both sat at 44% and neither was legible, so
 * a reader scrolling through the stage spent a third of it looking at two
 * ghosted panels on top of each other. An act is now solid across 88% of its
 * band and hands over in the remaining 12% — at the handover the brighter of
 * the two is still above 60%, which reads as a swap rather than a dissolve.
 *
 * A second thing falls out of `STEP_GONE < 1`: acts sit one band apart, so at
 * most two can be within that distance of their centres at once. The stage
 * never composites more than two panels.
 */
export const STEP_SOLID = 0.44;
export const STEP_GONE = 0.6;

/** How far an act travels as the scroll passes through it, in px. */
export const STEP_DRIFT = 40;

export interface StepPlacement {
  opacity: number;
  visible: boolean;
  y: number;
  scale: number;
}

/**
 * Places one act by its signed distance from the centre of its own band.
 *
 * The alternative — a boolean "is this the current step" — is the whole feel of
 * the thing: a boolean gives four hard cuts, whereas a distance gives a
 * continuous crossfade in which the outgoing act is still leaving as the next
 * arrives, both moving the way the page would have taken them.
 */
export function stepPlacement(
  progress: number,
  index: number,
  count: number,
): StepPlacement {
  let d = (progress - (index + 0.5) / count) * count;

  /*
   * THE OUTER TWO ACTS DO NOT FADE AT THE ENDS OF THE SCENE.
   *
   * Without this the arithmetic is symmetric and wrong at exactly the two
   * moments a reader is most likely to be looking. Each act is solid within
   * 0.3 bands of its own centre, and at progress 0 the first act is 0.5 bands
   * from its centre — so the stage pinned itself to the viewport and presented
   * its opening act at 44% opacity. The same at the other end: the last act,
   * the written half, never reached full strength before the pin released.
   *
   * Clamping the distance means the first act is treated as centred for
   * anything before its centre and the last for anything after, so the stage
   * opens solid, closes solid, and only crossfades in between — which is the
   * only place a crossfade was ever wanted.
   */
  if (index === 0) d = Math.max(d, 0);
  if (index === count - 1) d = Math.min(d, 0);

  const away = Math.abs(d);
  const opacity =
    away <= STEP_SOLID
      ? 1
      : Math.max(0, 1 - (away - STEP_SOLID) / (STEP_GONE - STEP_SOLID));
  return {
    opacity,
    visible: opacity > 0.001,
    y: -d * STEP_DRIFT,
    scale: 1 - away * 0.045,
  };
}

/** Which act the rail and the heading should name. */
export function activeStep(progress: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}

/* ---------------------------------------------------------------- the deck */

/** How much of the deck is drawn. Beyond this a card is too deep to see. */
export const DECK_DEPTH = 3.1;

export interface DeckSeat {
  z: number;
  y: number;
  rotate: number;
  opacity: number;
  blur: number;
}

/**
 * Where a card sits, given how many deals away from the front it is.
 *
 * `k` is 0 at the front, positive while the card is still in the deck, negative
 * once it has been dealt away. The two halves are deliberately asymmetric: a
 * card climbs out of the deck slowly and leaves quickly, which is what makes
 * the front of the stack feel like where something is happening.
 */
/**
 * How far a card travels before it starts to fade on the way out.
 *
 * Without this dead zone the deck visibly dims at the start of every deal. The
 * card at the front begins fading the instant it is nudged, while the one
 * behind it is still most of a step away and correspondingly dim, so for a
 * moment the brightest thing on screen was about 74% — a deck that flickers
 * once per card. Holding the outgoing card at full strength for the first
 * eighth of its exit closes that gap, and it costs nothing: it is still gone
 * far faster than the next one arrives.
 */
const DECK_EXIT_HOLD = 0.12;

export function deckSeat(k: number): DeckSeat {
  const away = Math.abs(k);

  if (k < 0) {
    return {
      z: away * 140,
      y: -away * 190,
      rotate: -away * 9,
      opacity: Math.max(0, 1 - Math.max(0, away - DECK_EXIT_HOLD) * 1.7),
      blur: Math.min(away * 5, 7),
    };
  }

  return {
    // `away === 0` rather than letting the negation through: `-0 * 190` is
    // negative zero, which formats as `translateZ(-0.0px)`.
    z: away === 0 ? 0 : -away * 190,
    // A small downward offset as well as the depth, so the deck shows its edges
    // rather than being one card with a halo behind it.
    y: away * 18,
    rotate: 0,
    // Shallower than it was, for the same reason as the exit hold above: the
    // card one place back has to be bright enough to carry the moment the front
    // one is leaving.
    opacity: Math.max(0, 1 - away * 0.22),
    blur: away < 0.35 ? 0 : Math.min((away - 0.35) * 2.6, 5),
  };
}

/** The share of the scene the deck spends holding on its final card. */
const DECK_TAIL = 0.08;

/**
 * The deal position, in cards, for a deck of `count`.
 *
 * Reaching `count - 1` before the end of the scene is the point: the last card
 * lands and then stays landed while the remaining scroll runs out, so the
 * section finishes with a card on the table.
 *
 * It used to be `progress * (count - 0.55)`, which was meant to hold short of
 * the end and did the opposite — at full progress the deal position was *past*
 * the last card, so the deck ended on that card 32% faded and flying upward.
 * The section's closing frame was an empty table.
 */
export function dealAt(progress: number, count: number): number {
  return clamp01(clamp01(progress) / (1 - DECK_TAIL)) * (count - 1);
}
