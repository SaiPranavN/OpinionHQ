/**
 * The demographic vocabularies.
 *
 * Lifted out of the sign-up form and into the data layer because they are not a
 * form's business: every occupation cross-tab on every dashboard is a group-by
 * over this exact list, and the database seeds its `occupations` table from it
 * (`scripts/generate-reference-migration.ts`). A vocabulary that lives inside a
 * React component is a vocabulary the server cannot see.
 */

/**
 * `countsInBreakdowns: false` is how "Prefer not to say" works.
 *
 * Somebody choosing it has answered, and their row is simply not counted into an
 * occupation breakdown. Refusing to let them proceed would be demanding an
 * answer to the one question people most reasonably decline, and silently
 * counting them as an eighth category would put a bar on a chart that means
 * "declined to say" while looking like it means an occupation.
 */
export const OCCUPATION_OPTIONS: readonly { label: string; countsInBreakdowns: boolean }[] = [
  { label: "Student", countsInBreakdowns: true },
  { label: "Working professional", countsInBreakdowns: true },
  { label: "Self-employed or business owner", countsInBreakdowns: true },
  { label: "Parent or guardian", countsInBreakdowns: true },
  { label: "Educator", countsInBreakdowns: true },
  { label: "Retired", countsInBreakdowns: true },
  { label: "Prefer not to say", countsInBreakdowns: false },
] as const;

export const OCCUPATIONS: string[] = OCCUPATION_OPTIONS.map((o) => o.label);

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Singapore",
  "Other",
];

/**
 * The age buckets the cross-tabs report, ordered youngest first.
 *
 * `Under 17` exists because sign-up admits thirteen-year-olds. Folding them into
 * `17–20` would be inventing a demographic for somebody who told us their real
 * one, and a band nobody falls into simply never renders.
 */
export const AGE_BANDS = ["Under 17", "17–20", "21–24", "25–30", "31 and over"] as const;

export type AgeBand = (typeof AGE_BANDS)[number];
