/**
 * The Ask Verified taxonomy: three areas, five statuses, two accent colours.
 *
 * The scope is narrow on purpose. Careers, colleges and exams are areas where
 * a verifiable proof exists — an employment record, a degree, a scorecard.
 * Medical, legal, financial, tax, immigration, relationship and mental-health
 * questions have no category here, which is the enforcement: there is nowhere
 * for them to go.
 */

import type { AskCategory, AskCategoryId, QuestionStatus } from "@/lib/ask/types";

/* ------------------------------------------------------------- categories */

export const ASK_CATEGORIES: readonly AskCategory[] = [
  {
    id: "career",
    label: "Career & jobs",
    short: "Career",
    blurb: "Job offers, software careers, interviews, switches and higher studies.",
    examples: [
      "Should I accept this offer, or hold out for the other one?",
      "Frontend, backend, cloud, data or DevOps — which fits my profile?",
      "Is an MBA after engineering worth the two years?",
    ],
  },
  {
    id: "college",
    label: "Colleges",
    short: "College",
    blurb: "Choosing a college, a programme, placements, fees and campus life.",
    examples: [
      "College A or College B for this branch?",
      "Is this programme worth the fees given the placement record?",
      "What is the student experience actually like?",
    ],
  },
  {
    id: "exam",
    label: "Exams",
    short: "Exam",
    blurb: "Preparation plans, timelines, mocks, targets and whether to attempt.",
    examples: [
      "Can I realistically prepare for CAT while working full time?",
      "Coaching or self-study, given where I am starting from?",
      "Should I attempt this year, or postpone by one cycle?",
    ],
  },
] as const;

export const ASK_CATEGORY_BY_ID: ReadonlyMap<AskCategoryId, AskCategory> = new Map(
  ASK_CATEGORIES.map((c) => [c.id, c]),
);

export function askCategory(id: AskCategoryId): AskCategory {
  return ASK_CATEGORY_BY_ID.get(id) ?? ASK_CATEGORIES[0]!;
}

/* ---------------------------------------------------------------- palette */

/**
 * Private-guidance chrome. A desaturated member of the existing activity-blue
 * family rather than a new hue: it reads as confidential next to the green of
 * a verified credential, without competing with the purple Polls owns.
 *
 * Expressed as `var()` references rather than literals so the same constants
 * work in both themes — a steel that reads as confidential on near-black is
 * far too pale to read as anything on near-white. Every use is an inline
 * style, so the variable resolves at paint.
 */
export const PRIVATE_COLOR = "var(--color-private)";
export const PRIVATE_SOFT =
  "color-mix(in oklab, var(--color-private) 13%, transparent)";
export const PRIVATE_LINE =
  "color-mix(in oklab, var(--color-private) 32%, transparent)";

/** Verification keeps the platform's green. Verified means verified anywhere. */
export const VERIFIED_COLOR = "var(--color-positive)";

/* --------------------------------------------------------------- statuses */

export interface AskStatusStyle {
  fg: string;
  bg: string;
  border: string;
  /** Spelled out for tooltips and screen readers. */
  meaning: string;
  /** Whose move it is, for grouping the dashboard. */
  waitingOn: "professional" | "you" | "nobody";
}

export const ASK_STATUS_STYLES: Record<QuestionStatus, AskStatusStyle> = {
  "Finding someone": {
    fg: "#8FA8C4",
    bg: "rgba(143,168,196,0.12)",
    border: "rgba(143,168,196,0.32)",
    meaning: "Finding someone with relevant verified proof",
    waitingOn: "professional",
  },
  "Awaiting answer": {
    fg: "#8FA8C4",
    bg: "rgba(143,168,196,0.12)",
    border: "rgba(143,168,196,0.32)",
    meaning: "Matched, and yet to answer",
    waitingOn: "professional",
  },
  Answered: {
    fg: "#1DB954",
    bg: "rgba(29,185,84,0.12)",
    border: "rgba(29,185,84,0.36)",
    meaning: "An answer is ready to read",
    waitingOn: "you",
  },
  "In discussion": {
    fg: "#5AA9F0",
    bg: "rgba(90,169,240,0.12)",
    border: "rgba(90,169,240,0.34)",
    meaning: "The private thread is in progress",
    waitingOn: "nobody",
  },
  Resolved: {
    fg: "#1DB954",
    bg: "rgba(29,185,84,0.12)",
    border: "rgba(29,185,84,0.36)",
    meaning: "You marked this one done",
    waitingOn: "nobody",
  },
  Closed: {
    fg: "#8F8C86",
    bg: "rgba(143,140,134,0.1)",
    border: "rgba(143,140,134,0.3)",
    meaning: "Closed — no further messages",
    waitingOn: "nobody",
  },
};

export function askStatusStyle(status: QuestionStatus): AskStatusStyle {
  return ASK_STATUS_STYLES[status] ?? ASK_STATUS_STYLES["Finding someone"];
}

export function isThreadOpen(status: string): boolean {
  return status !== "Resolved" && status !== "Closed";
}

/**
 * Reply cap.
 *
 * Bounded guidance, not an open retainer. Five each way is enough to clarify a
 * decision and short of consulting; the counter is shown so both sides see it
 * coming rather than discovering it by hitting it.
 */
export const REPLY_CAP = 5;

/** How many professionals one question is routed to. */
export const MAX_MATCHES = 3;
