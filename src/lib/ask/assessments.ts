/**
 * The structured part of an answer.
 *
 * This used to be three fixed scales per area — "Overall", "Profile fit",
 * "Risk". They were too general to be worth much: every career question got
 * the same three questions asked of it, and "Moderate fit" told the asker
 * almost nothing about the actual decision in front of them.
 *
 * So the asker sets the structure. They write the question and the two to four
 * options they are choosing between, and the professional gives a verdict on
 * *each of those options* plus the one they would take. The scale is fixed so
 * two answers stay comparable; the things being scored are the asker's own.
 *
 * That makes the side-by-side view worth having: the rows are the choices the
 * person actually faces, and disagreement shows up as two professionals
 * scoring the same option differently.
 *
 * It is still a private read of one situation — never aggregated, never
 * published. It is not a poll.
 */

import type { AssessmentLevel, AskQuestion } from "@/lib/ask/types";

/** Ordered worst → best. The stored value is the index. */
export const VERDICT_LEVELS: AssessmentLevel[] = [
  { label: "Strongly avoid", tone: "poor" },
  { label: "Avoid", tone: "weak" },
  { label: "Workable", tone: "mid" },
  { label: "Good", tone: "good" },
  { label: "Strongly recommend", tone: "strong" },
];

export const VERDICT_PROMPT = "How good is this option, for this person?";

/** `pick` uses this when the honest answer is that none of them are right. */
export const NO_PICK = -1;

const TONE_COLOR: Record<string, string> = {
  poor: "#E5484D",
  weak: "#F0785A",
  mid: "#A1A1A1",
  good: "#63C57E",
  strong: "#1DB954",
};

export function toneColor(tone: string): string {
  return TONE_COLOR[tone] ?? TONE_COLOR.mid!;
}

export function verdictLevel(value: number): AssessmentLevel | undefined {
  return VERDICT_LEVELS[value];
}

/**
 * Pairs the asker's options with the verdicts given on them.
 *
 * An option left unscored is dropped rather than shown at a default — a blank
 * is not a "Workable", and rendering it as one puts words in somebody's mouth.
 */
export interface OptionVerdict {
  index: number;
  option: string;
  value: number;
  level: AssessmentLevel;
  /** True for the option this professional would take. */
  picked: boolean;
}

export function verdictsFor(
  question: Pick<AskQuestion, "options">,
  verdicts: number[] | undefined,
  pick: number,
): OptionVerdict[] {
  const out: OptionVerdict[] = [];
  const scores = verdicts ?? [];
  question.options.forEach((option, index) => {
    const value = scores[index];
    if (typeof value !== "number") return;
    const level = VERDICT_LEVELS[value];
    if (!level) return;
    out.push({ index, option, value, level, picked: pick === index });
  });
  return out;
}

/** Complete once every option the asker listed has a verdict and a pick exists. */
export function isComplete(
  question: Pick<AskQuestion, "options">,
  verdicts: number[] | undefined,
  pick: number,
): boolean {
  const scores = verdicts ?? [];
  const scored = question.options.every(
    (_, i) => typeof scores[i] === "number" && VERDICT_LEVELS[scores[i]!] !== undefined,
  );
  const picked = pick === NO_PICK || (pick >= 0 && pick < question.options.length);
  return scored && picked && pick !== undefined;
}

/** The line an answer leads with: what they would actually do. */
export function pickLabel(question: Pick<AskQuestion, "options">, pick: number): string {
  if (pick === NO_PICK) return "Neither — see below";
  return question.options[pick] ?? "—";
}

/**
 * The asker's private note on an answer. One scale, not four — it feeds that
 * person's stats, and a four-part survey after every answer is one nobody fills
 * in.
 */
export const RATING_LEVELS = [
  "Not useful",
  "Somewhat useful",
  "Helpful",
  "Exactly what I needed",
] as const;
