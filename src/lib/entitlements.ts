/**
 * What Pro buys, and what stays free.
 *
 * Pure, so the rules can be tested without rendering a paywall — and kept in
 * one file so there is exactly one place that decides what is gated. A pricing
 * rule scattered across components is a pricing rule that is enforced in three
 * places and forgotten in the fourth, and the fourth is the leak.
 *
 * WHAT IS ACTUALLY ENFORCED IS IN POSTGRES, not here. `is_pro()` and the row
 * policies that call it are what stop a non-member publishing a rich
 * contribution or posting without a name; everything below decides what to
 * *show*. Keep it that way. A gate that lives only in a component is a gate
 * that opens for anybody who can issue an HTTP request.
 *
 * READING IS NEVER GATED. Every price on this page is for publishing in a
 * richer form, never for looking. Voting, replying and writing ordinary
 * opinions stay free and are meant to.
 */

/**
 * Questions anybody may ask before subscribing.
 *
 * Ask Verified is parked, so nothing reads this in the product today. It stays
 * because `schema-sync.test.ts` holds it level with the allowance compiled into
 * `can_ask()` in the database, and a constant that a test pins to a live SQL
 * function is cheaper to keep than to re-derive later.
 */
export const FREE_ASKS = 2;

export type ProFeature =
  | "rich-contribution"
  | "anonymous"
  | "media"
  | "suggest"
  | "ask-question";

export interface Plan {
  name: string;
  price: string;
  period: string;
  includes: string[];
  /** Said plainly on the sheet, because a paywall that hides this is a trick. */
  freeForever: string[];
}

/**
 * The price after the launch window.
 *
 * Also stored on `pro_offer.price_inr`, and the database is the one that counts
 * — it is what the payment code will read when there is payment code. This
 * constant is the fallback for a screen that renders before the offer row
 * arrives, and the two are checked against each other by a test.
 */
export const PRO_PRICE_INR = 99;

export const PRO_PLAN: Plan = {
  name: "OpinionHQ Pro",
  price: `₹${PRO_PRICE_INR}`,
  period: "per month, after the free launch period",
  includes: [
    "Rich contributions — structured sections and an interactive block",
    "Images and GIFs on your contributions and poll reasons",
    "Post without your name on it, whenever you choose to",
    "Suggest topics and polls — approved ones carry your name on the card",
    "Your contributions rank above standard opinions",
    "Cancel any time; anything you published stays published",
  ],
  freeForever: [
    "Reading every topic, poll and result",
    "Voting, replying and writing ordinary opinions",
    "Following topics and polls",
    "Exporting any result card",
  ],
};

/**
 * How the free window is described.
 *
 * IT IS THE SAME MECHANISM, WORDED HONESTLY AS WHAT IT IS. Nothing about
 * `start_pro()` changed: anyone may take it, it costs nothing, and it ends on
 * the date in `pro_offer`. What changed is that "free Pro for everybody" reads
 * like a discount nobody values, and this is not a discount — it is the thing
 * you get for turning up before the site was finished. Saying so is both better
 * marketing and more accurate.
 *
 * "Founding member" over "early joining gift": a gift is something handed down,
 * and a founding member is something you *are*. The second is the one people
 * repeat to other people.
 */
export const FOUNDING = {
  badge: "Founding member",
  /** The offer, in one line. Used wherever the free window is mentioned. */
  headline: "Pro is on us, for founding members",
  /** Why it exists, said plainly. No urgency theatre. */
  blurb:
    "You are here early, while the site is still being built out. Pro is yours for nothing until the founding window closes — no card, nothing to cancel, and it simply stops when it stops.",
} as const;

/**
 * The offer, in one sentence.
 *
 * Takes the date from the database rather than hardcoding it, because an admin
 * can move `pro_offer.free_until` and a hardcoded month would then be a lie on
 * the most-read line of the sheet.
 */
export function offerLine(deadline: string, price: number): string {
  if (!deadline) return `₹${price} a month.`;
  return `Free for founding members until ${deadline}. ₹${price} a month after that.`;
}

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

/** Whether this account may post without its name attached. */
export function canPostAnonymously(pro: boolean): boolean {
  return pro;
}

/** Whether this account may attach images and GIFs. */
export function canAttachMedia(pro: boolean): boolean {
  return pro;
}

/** Whether this account may put a subject into the editorial queue. */
export function canSuggest(pro: boolean): boolean {
  return pro;
}

/** What the upgrade sheet says it is for. */
export const FEATURE_COPY: Record<ProFeature, { title: string; blurb: string }> = {
  "rich-contribution": {
    title: "Rich contributions are a Pro format",
    blurb:
      "Structured sections and an embedded interactive block. Your ordinary opinions, replies and votes are unaffected and always will be.",
  },
  anonymous: {
    title: "Posting without your name is a Pro feature",
    blurb:
      "Turn it on per contribution. Other readers see no name, no initials and no occupation — the post is unattributable to them, though the account behind it still exists.",
  },
  media: {
    title: "Images and GIFs are a Pro format",
    blurb:
      "Attach up to four pictures to a contribution or a poll reason. Written opinions stay free and always will.",
  },
  suggest: {
    title: "Suggesting a subject is a Pro feature",
    blurb:
      "Put a topic or a poll in front of the editors. If it runs, your name sits on the card as the person who asked for it.",
  },
  "ask-question": {
    title: "You have used your free questions",
    blurb: `Every account gets ${FREE_ASKS} questions to verified professionals. Pro removes the limit — everything else you have been doing stays free.`,
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
