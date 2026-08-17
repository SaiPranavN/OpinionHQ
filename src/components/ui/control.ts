/**
 * One shape for every filter control on a catalog.
 *
 * WHAT WAS WRONG. The four controls that sit in a row above a catalog were
 * written in four places and had drifted into four different objects: the
 * search box was a 48px pill, the place filter a 44px pill, the sort control a
 * 41px rectangle with 10px corners, and the category chips 31px pills. Three
 * heights and two corner radii in one row, which reads as a form that was
 * assembled rather than designed — and it is most obvious on a phone, where
 * they stack and every mismatch lines up vertically for comparison.
 *
 * They are not all the same size, and should not be: a chip is a toggle and a
 * select is a field. But everything that is *a field* is now one height and one
 * radius, and the chips keep the same radius at their own smaller height, so
 * the row has two sizes rather than four.
 *
 * WHY A MODULE AND NOT A TAILWIND COMPONENT CLASS. Tailwind scans source text
 * for class names, so a string assembled at runtime is a string it never emits.
 * These are whole literals, written out, in a file it reads.
 */

/** Height, radius, border and type for a select or an input in a filter row. */
export const CONTROL_SHELL =
  "h-11 w-full rounded-full border bg-surface px-4 font-sans text-[13.5px] tracking-[-0.01em] normal-case text-cream outline-none transition-[border-color,box-shadow,background] duration-300";

/**
 * The little monospace caption beside a control.
 *
 * Above the control on a phone and beside it from `sm`. Inline at every width,
 * the label ate a third of a 375px screen and left "Anywhere" in a box too
 * narrow to show "National & International Events".
 */
export const CONTROL_LABEL =
  "flex min-w-0 flex-col gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-dim sm:flex-row sm:shrink-0 sm:items-center sm:gap-2";
