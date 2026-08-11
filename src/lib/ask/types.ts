/**
 * Domain types for Ask Verified — private one-to-one guidance.
 *
 * The whole feature is one sentence: a person asks a private question, and
 * people who have proved they know something relevant answer it. Everything
 * here exists to serve that and nothing else.
 *
 * ONE ACCOUNT. There is no separate "contributor" identity. A professional is
 * a user who has verified proof — same account, one extra attribute. That is
 * why `Professional` below carries a `userId` and nothing that duplicates a
 * profile: it is a view over an account, not a second kind of account.
 *
 * Kept in its own module tree from `lib/types.ts` because topics and polls are
 * public measurement objects and these are private consultations. Sharing
 * storage between them is how a private question ends up in a public feed.
 */

import type { PlaceId } from "@/lib/places";

/* --------------------------------------------------------------- taxonomy */

/** Three areas. Chosen because the proof behind each is checkable. */
export type AskCategoryId = "career" | "college" | "exam";

/** A question weighs between two and four options — the same bounds as a poll. */
export const MIN_ASK_OPTIONS = 2;
export const MAX_ASK_OPTIONS = 4;

export interface AskCategory {
  id: AskCategoryId;
  label: string;
  short: string;
  blurb: string;
  /** What a question here usually sounds like. */
  examples: string[];
}

/* ----------------------------------------------------------- verification */

/** The kind of proof submitted. Never the proof itself. */
export type ProofType =
  // career
  | "employment"
  | "experience-letter"
  | "linkedin"
  | "portfolio"
  // college
  | "student-id"
  | "degree"
  | "alumni"
  // exam
  | "scorecard"
  | "rank-card"
  | "admission-letter";

export interface ProofKind {
  id: ProofType;
  category: AskCategoryId;
  /** What the applicant offers to show. */
  evidenceLabel: string;
  /** Class of that evidence, safe to display. */
  evidenceCategory: string;
  /** The outcome sentence shown next to their answers. */
  publicLabel: string;
  /** Said plainly, so nobody reads more into the badge than it carries. */
  notVerified: string;
}

/**
 * One verified claim.
 *
 * `publicLabel` is the only field ever rendered to another user. There is no
 * field on this record for a document, an address or an identity number — that
 * absence is the enforcement, not a promise.
 */
export interface Credential {
  id: string;
  userId: string;
  category: AskCategoryId;
  proofType: ProofType;
  publicLabel: string;
  evidenceCategory: string;
  verifiedAt: string;
}

/**
 * A user who has verified proof, viewed as somebody who can answer.
 *
 * Derived from an account plus its credentials rather than stored separately.
 */
export interface Professional {
  userId: string;
  name: string;
  initials: string;
  /** Role or qualification, shown under the name. */
  headline: string;
  /** Monogram tint. No photographs are attached to fictional people. */
  tone: string;
  /** Matching keywords: technologies, functions, programmes, exams. */
  expertise: string[];
  /** Areas they hold at least one credential in. */
  areas: AskCategoryId[];
  /** Simulated. Withheld below the reporting threshold. */
  answered: number;
  helpfulPct: number;
  /** True for the seeded people, so the UI can label them. */
  simulated?: boolean;
}

/* -------------------------------------------------------------- questions */

/** Where a question or thread stands. Five states, all self-explanatory. */
export type ThreadStatus =
  | "Awaiting answer"
  | "Answered"
  | "In discussion"
  | "Resolved"
  | "Closed";

export type QuestionStatus = "Finding someone" | ThreadStatus;

/**
 * Who can read a question.
 *
 * Public is the default, because a good answer to "IIT or a state college?"
 * is worth reading by the next hundred people asking it, and a product where
 * every answer is written once and seen by one person throws that away.
 *
 * Private is one checkbox away and changes nothing else about the flow. The
 * questions that need it — a specific employer, a named institution, anything
 * a person would not put their name to — are a minority, but for those the
 * feature has to be complete rather than a setting that merely hides a card.
 */
export type QuestionVisibility = "public" | "private";

export interface AskQuestion {
  id: string;
  askerUserId: string;
  /**
   * Shown to the asker and to matched professionals. Deliberately NOT shown on
   * a public question: the answers are the useful part, and a question can be
   * read without knowing who is in the situation. Choosing to publish a
   * question is not choosing to publish yourself.
   */
  askerName: string;
  visibility: QuestionVisibility;
  category: AskCategoryId;
  /**
   * Where the asker is deciding.
   *
   * Coarse on purpose — a state, or the country, never an address. A question
   * about which college to take is a different question in Karnataka than it
   * is in Bihar, and a professional who knows one market is not automatically
   * useful in the other. It is shown publicly, so anything finer than this
   * would be identifying somebody who chose to publish a question and not
   * themselves.
   */
  place: PlaceId;
  title: string;
  /** One box. The placeholder prompts for situation, goal and constraints. */
  context: string;
  /**
   * The choices being weighed, two to four. These are the question: a
   * professional scores these, not a generic set of dimensions.
   */
  options: string[];
  /** Free text. Empty when there is no deadline. */
  deadline: string;
  createdAt: string;
  updatedAt: string;
  /** True for seeded questions, so the UI can label them. */
  simulated?: boolean;
}

/**
 * A professional routed to a question.
 *
 * No preview state and no accept step: matching *is* the grant. The asker
 * chose to send the question to people with relevant proof, and adding a
 * handshake on top bought ceremony rather than privacy.
 */
export interface Match {
  id: string;
  questionId: string;
  professionalUserId: string;
  /** Why the rules picked them, in plain words, shown to both sides. */
  reasons: string[];
  matchedAt: string;
  /** Set when the asker resolves or closes the thread. */
  revokedAt?: string;
}

/* ------------------------------------------------------------ assessments */

/**
 * One point on the five-step verdict scale, ordered worst to best.
 *
 * The scale is fixed so two answers stay comparable. What gets scored is not:
 * the asker writes the options, and the professional scores those.
 */
export interface AssessmentLevel {
  label: string;
  tone: "poor" | "weak" | "mid" | "good" | "strong";
}

export interface Answer {
  id: string;
  questionId: string;
  professionalUserId: string;
  /** One verdict per option, aligned by index with `question.options`. */
  verdicts: number[];
  /** Index of the option they would take, or -1 for "none of these". */
  pick: number;
  /** One line at the top of the response. */
  summary: string;
  reasoning: string;
  /** Practical things to do next. */
  nextSteps: string[];
  createdAt: string;
  updatedAt: string;
  /**
   * Votes from readers, on a published answer only — see `canVote`.
   *
   * Deliberately not the same instrument as the asker's rating. The rating is
   * one person saying whether the advice worked for their situation and it
   * stays private; these are readers saying the answer was or was not worth
   * reading. An answer can be liked by fifty people and still be wrong for the
   * one person who asked, which is exactly why the two are kept apart.
   *
   * Held as two counts rather than one net score. A score of zero could be
   * nobody voting or fifty people disagreeing, and those are not the same
   * page — collapsing them would throw away the more interesting one.
   *
   * Simulated on the seeded answers, like every other count in this build.
   */
  likes?: number;
  dislikes?: number;
}

/* ------------------------------------------------------------- discussion */

export type SenderRole = "asker" | "professional";

export interface Message {
  id: string;
  questionId: string;
  professionalUserId: string;
  senderUserId: string;
  senderRole: SenderRole;
  body: string;
  createdAt: string;
}

/**
 * The one-to-one thread.
 *
 * Identified by (question, professional) rather than by its own id: there is
 * exactly one thread per pair, and giving it a separate identity invited code
 * that could accidentally join two professionals into one conversation.
 *
 * TWO THINGS LIVE IN ONE RECORD, and the distinction is the whole of
 * `privateOpenedAt`. The record exists from the moment somebody is matched,
 * because it is how this pair's status is tracked — matched, answered,
 * resolved. The private *channel* inside it is a separate thing that starts
 * closed.
 */
export interface Thread {
  questionId: string;
  professionalUserId: string;
  status: ThreadStatus;
  updatedAt: string;
  /**
   * When the asker opened the private channel — absent until they do.
   *
   * A private conversation nobody asked for is not a feature. Rendering the
   * box by default made the answer look unfinished until you replied to it,
   * and quietly told the professional a private line was already open. This is
   * the asker's door, and it stays shut until they open it.
   */
  privateOpenedAt?: string;
  /** How the asker closed it out. */
  outcome?: "Resolved" | "Not useful";
}

/* -------------------------------------------------------------- comments */

/**
 * A third party's public comment on an answer.
 *
 * Only ever exists on a public question — see `visibleComments`. The whole
 * point of publishing a question is that other people in the same situation
 * can read it, and a reader who can add "this happened to me and it went the
 * other way" makes the answer more useful than the answer alone.
 *
 * THREADED, which reverses an earlier decision worth recording rather than
 * quietly overwriting. Flat comments were chosen to stop a page of considered
 * assessments turning into a forum. What actually happened is that people
 * replied anyway — inside a new top-level comment, quoting the one they meant
 * — so the conversation existed with its structure thrown away. Nesting does
 * not create the discussion; it stops the page lying about which comment
 * answers which. `MAX_COMMENT_DEPTH` is where the forum argument still bites,
 * and it holds the line instead.
 */
export interface AnswerComment {
  id: string;
  questionId: string;
  /** Which answer it hangs off. */
  professionalUserId: string;
  /** The comment this replies to. Absent on a top-level comment. */
  parentId?: string;
  authorUserId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: string;
  /** Votes from other readers. Simulated on the seeded comments. */
  likes?: number;
  dislikes?: number;
  /** True for seeded comments, so the UI can label them. */
  simulated?: boolean;
}

/* ---------------------------------------------------------------- rating */

/** The asker's private note on an answer. Never shown to another user. */
export interface Rating {
  questionId: string;
  professionalUserId: string;
  /** 0–3, indexing `RATING_LEVELS`. */
  helpfulness: number;
  createdAt: string;
}

/* ------------------------------------------------------------- the viewer */

export type ViewerRole = "guest" | "asker" | "professional";

/** Who is asking. Passed explicitly so access rules stay testable. */
export interface Viewer {
  role: ViewerRole;
  userId: string;
}

/* ------------------------------------------------------ derived for view */

export interface DecoratedAnswer {
  answer: Answer;
  professional: Professional;
  /** Public comments on this answer, threaded. Empty on a private question. */
  comments: CommentNode[];
  /** Every comment under this answer, at any depth. */
  commentCount: number;
  /** Verified claims for this question's area, in display order. */
  credentials: Credential[];
  thread: Thread;
  /** Whether the asker has opened the private channel on this thread. */
  privateOpen: boolean;
  messages: Message[];
  rating?: Rating;
  /** Replies used against the cap, per side. */
  replies: { asker: number; professional: number; cap: number };
}

/** One comment and everything hanging off it. Built by `commentTree`. */
export interface CommentNode {
  comment: AnswerComment;
  /** Indentation level, clamped to `MAX_COMMENT_DEPTH`. */
  depth: number;
  replies: CommentNode[];
  /** Descendants at any depth — what the collapsed summary counts. */
  total: number;
}

export interface DecoratedQuestion {
  question: AskQuestion;
  category: AskCategory;
  matches: Match[];
  answerCount: number;
  unreadCount: number;
  status: QuestionStatus;
  /** Plain sentence describing where this is up to. */
  statusLine: string;
  deadlineNote: string;
}
