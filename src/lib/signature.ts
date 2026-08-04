/**
 * Duplicate detection — the flooding problem, solved at the point of entry.
 *
 * THE PROBLEM. A poll is only worth reading because a lot of people answered
 * the same question. Let anyone create one and a news event produces forty
 * cards asking the same thing in forty phrasings, each holding a fortieth of
 * the sample. Nothing on the page is then true: not the split, not the margin,
 * not the cross-tabs. The value of the section is destroyed not by bad polls
 * but by redundant ones, which is a harder problem because every single one of
 * them looks reasonable on its own.
 *
 * THE APPROACH. Reduce a poll to a signature that survives rewording, and
 * refuse a second poll with a signature that already exists. The signature is
 * built from what a poll actually *is*:
 *
 *   place :: the set of things you are choosing between :: what else is asked
 *
 * Order-independent, punctuation-blind, filler-blind. "Messi or Ronaldo?",
 * "Ronaldo or Messi?" and "Who is better — Messi or Ronaldo?" are one poll and
 * produce one signature. "Who should captain, Messi or Ronaldo?" keeps
 * `captain` in the residue and is a different poll, correctly.
 *
 * WHY THE OPTION SET CARRIES THE WEIGHT. The question text is where the
 * variation lives — everybody words it differently, and half the words are
 * scaffolding. The options are the poll. Two polls offering the same choice in
 * the same place are the same poll however the question is phrased, and that
 * observation is what makes this robust rather than a string comparison
 * wearing a hash for a hat.
 *
 * TWO TIERS, ON PURPOSE. An exact signature match is refused outright. A near
 * match is shown to the author with the existing poll and a choice, because
 * "similar" is a judgement and a false positive that silently blocks a genuine
 * new question is worse than a duplicate that got through. Certainty blocks;
 * suspicion asks.
 *
 * Deliberately scoped to polls. Topics and Ask Verified questions are excluded
 * for now — a topic is a subject rather than a choice and needs a different
 * signature, and questions are one-to-one consultations where two people asking
 * the same thing is not a defect.
 */

import type { PlaceId } from "@/lib/places";
import type { Poll } from "@/lib/types";

/**
 * Words carrying no information about *which* poll this is.
 *
 * Three groups, and the third is the debatable one:
 *
 *   1. Grammar — articles, prepositions, conjunctions, auxiliaries.
 *   2. Question scaffolding — which, what, who, should, would, pick, choose.
 *   3. Comparatives — better, best, worth, prefer, really, genuinely.
 *
 * Group 3 is a judgement call and it is the one that makes this work. "Messi or
 * Ronaldo?" and "Who is genuinely better, Messi or Ronaldo?" are the same poll,
 * and they only collapse together if `genuinely` and `better` are treated as
 * noise. The cost is that a poll whose entire distinction is a comparative —
 * "cheapest" versus "fastest" over identical options — collapses too. Those
 * words are kept out of the list for exactly that reason; only comparatives
 * that mean "which do you rate more highly", the default question a poll
 * already asks, are dropped.
 */
const STOPWORDS = new Set([
  // grammar
  "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "at", "by",
  "with", "from", "as", "is", "are", "am", "was", "were", "be", "been", "being",
  "do", "does", "did", "it", "its", "this", "that", "these", "those", "there",
  "than", "then", "so", "but", "if", "into", "over", "about", "your", "you",
  "my", "our", "we", "i", "me", "us", "they", "them", "he", "she", "his", "her",
  // question scaffolding
  "which", "what", "who", "whom", "whose", "when", "where", "why", "how",
  "should", "would", "could", "will", "shall", "can", "may", "must",
  "pick", "choose", "choosing", "choice", "vote", "poll", "option", "options",
  "side", "sides", "one", "ones", "instead", "rather", "vs", "versus",
  // comparatives that restate the question a poll already asks
  "better", "best", "worse", "worst", "prefer", "preferred", "preference",
  "favourite", "favorite", "top", "greatest", "goat", "really", "actually",
  "genuinely", "truly", "more", "most", "think", "opinion", "opinions",
]);

/**
 * Text reduced to comparable tokens.
 *
 * Lowercased, accents folded, punctuation dropped, stopwords removed, trailing
 * plural `s` stripped. Numbers survive intact — "iPhone 18" and "iPhone 17" are
 * different phones and a signature that could not tell them apart would be
 * worse than useless.
 */
export function canonicalTokens(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

/**
 * The crudest possible stemmer, on purpose.
 *
 * "fees" → "fee", "polls" → "poll". No Porter stemmer, no dictionary: an
 * aggressive stemmer folds words that are genuinely different ("universities"
 * and "universal" share a stem under some rules) and this is used to *refuse*
 * somebody's poll. Under-folding produces a duplicate that got through;
 * over-folding produces a person who cannot publish a question nobody has
 * asked. The first is recoverable.
 */
function singularize(token: string): string {
  if (token.length > 3 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("ses")) return token.slice(0, -2);
  if (token.length > 2 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

/** One option, reduced to a stable key. Word order inside a name is dropped. */
export function optionKey(name: string): string {
  return [...new Set(canonicalTokens(name))].sort().join("-");
}

export interface PollSignatureInput {
  question: string;
  options: readonly { name: string }[];
  place: PlaceId;
}

export interface PollSignatureParts {
  place: PlaceId;
  /** Canonical option keys, deduplicated and sorted. */
  optionKeys: string[];
  /** The same options as token sets, for the containment test below. */
  optionTokens: string[][];
  /**
   * Question tokens that are not already accounted for by the options.
   *
   * "Messi or Ronaldo?" leaves nothing — the question is entirely its options,
   * which is the shape of most head-to-heads. "Metro expansion or road
   * widening — where should the city budget go?" leaves `city budget go`, and
   * that residue is what separates it from a different poll offering the same
   * two options.
   */
  residue: string[];
  signature: string;
}

/**
 * Reduce a poll to its parts and its signature.
 *
 * Category is deliberately NOT in the signature. Somebody filing a duplicate
 * under Brands instead of Food has still filed a duplicate, and a signature
 * that could be evaded by picking a different dropdown value would be a
 * formality rather than a control.
 *
 * Place IS in it, because "Best CM?" in Karnataka and "Best CM?" in Kerala are
 * genuinely different polls with different electorates. Two polls that differ
 * only by place therefore both publish — and the near tier flags them for a
 * human, which is the right outcome for a judgement that depends on whether
 * the question is really local.
 */
export function pollSignatureParts(input: PollSignatureInput): PollSignatureParts {
  const keyed = new Map<string, string[]>();
  for (const option of input.options) {
    const tokens = [...new Set(canonicalTokens(option.name))].sort();
    const key = tokens.join("-");
    if (key) keyed.set(key, tokens);
  }
  const optionKeys = [...keyed.keys()].sort();

  const claimed = new Set(input.options.flatMap((o) => canonicalTokens(o.name)));
  const residue = [...new Set(canonicalTokens(input.question).filter((t) => !claimed.has(t)))].sort();

  return {
    place: input.place,
    optionKeys,
    optionTokens: optionKeys.map((key) => keyed.get(key) ?? []),
    residue,
    signature: `${input.place}::${optionKeys.join("+")}::${residue.join("-")}`,
  };
}

export function pollSignature(input: PollSignatureInput): string {
  return pollSignatureParts(input).signature;
}

/* --------------------------------------------------------------- matching */

function dice(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const shared = a.filter((x) => setB.has(x)).length;
  return (2 * shared) / (a.length + b.length);
}

/**
 * Do two option names name the same thing?
 *
 * Containment, not equality: the smaller token set has to sit entirely inside
 * the larger. "Messi" and "Lionel Messi" are one footballer, and the seeded
 * catalog writes the full name while a person re-posting it will not. This is
 * the single most important rule in the file, because option names are exactly
 * where honest duplicates diverge.
 *
 * It does not over-reach. "iPhone 18 Pro" and "iPhone 19 Pro" share two tokens
 * of three and neither contains the other, so they stay different phones.
 */
function sameOption(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const larger = new Set(a.length >= b.length ? a : b);
  const smaller = a.length >= b.length ? b : a;
  return smaller.every((token) => larger.has(token));
}

/**
 * Can every option in `a` be paired off with a distinct option in `b`?
 *
 * A perfect matching, found by backtracking. Polls have at most four options,
 * so the search space is trivial and greedy pairing — which can fail on
 * orderings a perfect matching would solve — is not worth the subtle bug.
 */
function sameOptionSet(a: readonly string[][], b: readonly string[][]): boolean {
  if (a.length !== b.length) return false;
  const taken = new Array<boolean>(b.length).fill(false);
  const match = (i: number): boolean => {
    if (i === a.length) return true;
    for (let j = 0; j < b.length; j += 1) {
      if (taken[j] || !sameOption(a[i]!, b[j]!)) continue;
      taken[j] = true;
      if (match(i + 1)) return true;
      taken[j] = false;
    }
    return false;
  };
  return match(0);
}

/**
 * Option sets that name a scale rather than the things being chosen between.
 *
 * The exception that the "options are the poll" rule needs. Six approval polls
 * all offer Approve/Disapprove, and by option set alone they are identical —
 * yet they are about six different people, and every one of those subjects
 * lives in the question. Without this, publishing an approval poll about
 * anybody would report the first one as a duplicate.
 *
 * When the options are one of these, the weighting flips and the question
 * carries the poll.
 */
const GENERIC_SCALES: readonly ReadonlySet<string>[] = [
  new Set(["approve", "disapprove"]),
  new Set(["yes", "no"]),
  new Set(["agree", "disagree"]),
  new Set(["support", "oppose"]),
  new Set(["for", "against"]),
  new Set(["true", "false"]),
];

function isGenericScale(optionKeys: readonly string[]): boolean {
  return GENERIC_SCALES.some(
    (scale) =>
      optionKeys.length === scale.size && optionKeys.every((key) => scale.has(key)),
  );
}

/**
 * How alike two polls are, 0 to 1.
 *
 * Normally weighted 70/30 towards the options, because the options are the poll
 * and the question text is where the noise lives. On a generic scale the weights
 * invert to 20/80: Approve/Disapprove says nothing about which poll this is, so
 * the subject in the question is all there is to go on.
 *
 * Compared at token level rather than by whole option key, so "Metro expansion"
 * still registers against "Metro". The near tier is meant to be generous — it
 * only ever raises a question with the author.
 */
export function pollSimilarity(a: PollSignatureParts, b: PollSignatureParts): number {
  const optionWeight = isGenericScale(a.optionKeys) || isGenericScale(b.optionKeys) ? 0.2 : 0.7;
  const options = dice(uniqueTokens(a.optionTokens), uniqueTokens(b.optionTokens));
  return optionWeight * options + (1 - optionWeight) * dice(a.residue, b.residue);
}

function uniqueTokens(sets: readonly string[][]): string[] {
  return [...new Set(sets.flat())].sort();
}

/**
 * Above this, two polls are shown to the author as possible duplicates.
 *
 * 0.6 means "the options substantially overlap". Identical options and a
 * completely unrelated question scores 0.7 and is flagged; one option in common
 * out of two scores 0.35 and is not.
 */
export const NEAR_DUPLICATE = 0.6;

/**
 * How alike two subjects have to be before the polls are the same poll.
 *
 * Only consulted when place and option set already match exactly, so this is
 * asking a narrow question: given two polls offering the same choice in the
 * same place, is the rest of the question the same question? 0.5 absorbs the
 * padding people add — "guys", "in your view", a stray "2026" — without
 * absorbing an actual difference. "Who should captain, Messi or Ronaldo?"
 * scores 0 against "Messi or Ronaldo?" and stays a separate poll.
 */
export const SAME_SUBJECT = 0.5;

/**
 * The rule that blocks.
 *
 * Same place, the same set of things to choose between, and the same subject.
 * Signature equality is the strict form of this and is checked first as a fast
 * path; this is what additionally catches the same poll whose options were
 * typed at a different length.
 */
export function isSamePoll(a: PollSignatureParts, b: PollSignatureParts): boolean {
  if (a.signature === b.signature) return true;
  if (a.place !== b.place) return false;
  if (!sameOptionSet(a.optionTokens, b.optionTokens)) return false;
  return dice(a.residue, b.residue) >= SAME_SUBJECT;
}

export interface SignedPoll {
  id: string;
  question: string;
  parts: PollSignatureParts;
}

export function signPoll(poll: Pick<Poll, "id" | "question" | "options" | "place">): SignedPoll {
  return {
    id: poll.id,
    question: poll.question,
    parts: pollSignatureParts(poll),
  };
}

export interface NearMatch {
  poll: SignedPoll;
  score: number;
}

/**
 * The verdict on a candidate poll.
 *
 * Three outcomes rather than a boolean, because "block it", "ask about it" and
 * "publish it" are three different things to do and collapsing the middle one
 * into either of the others is how this feature would go wrong.
 */
export type DuplicateVerdict =
  | { kind: "unique" }
  /** Same poll. Refused — the author is sent to the one that exists. */
  | { kind: "duplicate"; existing: SignedPoll }
  /** Similar enough to be worth a look. Publishable after confirmation. */
  | { kind: "near"; matches: NearMatch[] };

/**
 * Check a candidate against everything already published.
 *
 * `existing` is every poll in scope — fixtures and participant-created alike.
 * Passing them in rather than importing them keeps this pure and lets the
 * composer check against the live catalog, including polls created seconds ago
 * in the same session.
 */
export function checkPollDuplicate(
  candidate: PollSignatureInput,
  existing: readonly SignedPoll[],
): DuplicateVerdict {
  const parts = pollSignatureParts(candidate);

  // A poll with no usable options cannot be compared to anything — an empty
  // key set would match every other empty key set and refuse every draft. The
  // composer's own validation is what catches this case.
  if (parts.optionKeys.length === 0) return { kind: "unique" };

  const same = existing.find((poll) => isSamePoll(parts, poll.parts));
  if (same) return { kind: "duplicate", existing: same };

  const matches = existing
    .map((poll) => ({ poll, score: pollSimilarity(parts, poll.parts) }))
    .filter((m) => m.score >= NEAR_DUPLICATE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return matches.length > 0 ? { kind: "near", matches } : { kind: "unique" };
}

/** "84% alike" — the number, shown so the warning can be argued with. */
export function similarityLabel(score: number): string {
  return `${Math.round(score * 100)}% alike`;
}
