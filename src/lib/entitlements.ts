/**
 * What Pro buys, and what stays free.
 *
 * Pure, so the rules can be tested without rendering a paywall — and kept in
 * one file so there is exactly one place that decides what is gated. A pricing
 * rule scattered across components is a pricing rule that is enforced in three
 * places and forgotten in the fourth, and the fourth is the leak.
 *
 * ONE PRINCIPLE RUNS THROUGH IT: reading is never gated, and neither is
 * supplying. You can read every public question, every answer, every topic and
 * every poll without an account at all, and a verified professional can answer
 * as many questions as they like for nothing. What costs money is *asking* past
 * a point, and *publishing* in the richer format — the two things that consume
 * other people's attention. Gating the supply side would starve the section it
 * was meant to fund.
 */

/**
 * Questions anybody may ask before subscribing.
 *
 * Two, not one and not five. One is a trial you cannot learn anything from —
 * you get a single answer and no sense of whether a second opinion disagrees,
 * which is the entire proposition. Two is enough to see the thing work. Five
 * would be enough that most people never need to pay.
 */
export const FREE_ASKS = 2;

export type ProFeature = "ask-question" | "rich-contribution";

export interface Plan {
  name: string;
  price: string;
  period: string;
  includes: string[];
  /** Said plainly on the sheet, because a paywall that hides this is a trick. */
  freeForever: string[];
}

export const PRO_PLAN: Plan = {
  name: "OpinionHQ Pro",
  price: "₹249",
  period: "per month",
  includes: [
    "Unlimited questions to verified professionals",
    "Rich contributions — structured sections and an interactive block",
    "Save and follow contributors across topics",
    "Cancel any time; anything you published stays published",
  ],
  freeForever: [
    "Reading every public question and answer",
    "Voting, replying and writing ordinary opinions",
    "Answering questions if you have verified proof",
    `Your first ${FREE_ASKS} questions`,
  ],
};

/** How many free questions remain after `asked` of them. Never negative. */
export function freeAsksLeft(asked: number): number {
  return Math.max(FREE_ASKS - Math.max(asked, 0), 0);
}

/**
 * Whether this person may ask right now.
 *
 * Derived from the questions they have actually asked rather than from a
 * separate counter. A counter can drift from the record it is supposed to
 * describe — this cannot, because it *is* the record.
 */
export function canAsk(pro: boolean, asked: number): boolean {
  return pro || freeAsksLeft(asked) > 0;
}

export function canBuildRich(pro: boolean): boolean {
  return pro;
}

/** What the upgrade sheet says it is for. */
export const FEATURE_COPY: Record<ProFeature, { title: string; blurb: string }> = {
  "ask-question": {
    title: "You have used your free questions",
    blurb: `Every account gets ${FREE_ASKS} questions to verified professionals. Pro removes the limit — everything else you have been doing stays free.`,
  },
  "rich-contribution": {
    title: "Rich contributions are a Pro format",
    blurb:
      "Structured sections and an embedded interactive block. Your ordinary opinions, replies and votes are unaffected and always will be.",
  },
};

/**
 * The line under the ask button.
 *
 * Shown before anybody hits the wall, not at it. A limit you discover by
 * hitting it feels like a trap; a limit you can see coming is a price.
 *
 * Takes what is *left* rather than what was asked, so it reads the same number
 * the gate reads. Passing a raw question count let two call sites compute the
 * allowance their own way, and one of them counted the seeded demo questions —
 * which told a brand-new account it had already used everything up.
 */
export function askAllowanceLine(pro: boolean, left: number): string {
  if (pro) return "Pro — unlimited questions.";
  if (left <= 0) return "No free questions left. Pro removes the limit.";
  return `${left} of ${FREE_ASKS} free ${left === 1 ? "question" : "questions"} left.`;
}
