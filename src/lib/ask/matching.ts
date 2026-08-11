/**
 * Routing a question to people who can actually answer it.
 *
 * Rule-based rather than a model, because both sides have to be told why:
 * the asker ("why them?") and the professional ("why me?"). A rule you can
 * read is a rule you can argue with.
 *
 * The gate comes first and is not a score. Somebody with no verified proof in
 * the question's area is not ranked low — they are not a candidate. Proof of
 * employment says nothing about college admissions, and a CAT score says
 * nothing about GATE.
 */

import { isVerifiedFor, credentialsFor } from "@/lib/ask/verification";
import { MAX_MATCHES } from "@/lib/ask/taxonomy";
import type { Credential, Match, AskQuestion, Professional } from "@/lib/ask/types";

export interface Candidate {
  professional: Professional;
  score: number;
  reasons: string[];
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2);
}

/**
 * Scores one person against one question, or returns null if they are not
 * eligible at all — keeping ineligibility distinct from "eligible but a poor
 * fit", so a strong score elsewhere can never buy standing here.
 *
 * Matching reads the title, tags and options only. The context box is never
 * used: it is the most personal thing on the record.
 */
export function score(
  question: AskQuestion,
  professional: Professional,
  credentials: Credential[],
): Candidate | null {
  if (!isVerifiedFor(credentials, professional.userId, question.category)) return null;

  const proof = credentialsFor(credentials, professional.userId, question.category);
  const reasons: string[] = [];
  let total = 0;

  // Verified in the right area — the reason that always applies.
  total += 30;
  reasons.push(
    proof.length === 1
      ? `Verified in ${question.category}: ${proof[0]!.publicLabel.toLowerCase()}`
      : `Verified in ${question.category} on ${proof.length} counts`,
  );

  // Depth of proof: two independent checks beat one.
  total += Math.min(proof.length, 3) * 8;

  const haystack = new Set([
    ...words(question.title),
    ...question.options.flatMap(words),
  ]);
  const hits = professional.expertise.filter((skill) =>
    words(skill).some((w) => haystack.has(w)),
  );
  if (hits.length > 0) {
    total += Math.min(hits.length, 3) * 14;
    reasons.push(`Works with ${hits.slice(0, 3).join(", ")}`);
  }

  if (professional.answered >= 5) {
    total += Math.round((professional.helpfulPct / 100) * 10);
  }

  return { professional, score: total, reasons };
}

/**
 * Ranks eligible people. Ties break on id so the same question always produces
 * the same shortlist — a matcher that reshuffles on every render is impossible
 * to reason about and impossible to test.
 */
export function rank(
  question: AskQuestion,
  professionals: Professional[],
  credentials: Credential[],
): Candidate[] {
  return professionals
    .map((p) => score(question, p, credentials))
    .filter((c): c is Candidate => c !== null)
    .sort(
      (a, b) =>
        b.score - a.score || a.professional.userId.localeCompare(b.professional.userId),
    );
}

/**
 * Creates the matches for a question.
 *
 * Matching *is* the grant — there is no preview, no accept step and no second
 * state to move through. The asker chose to send their question to people with
 * relevant proof; a handshake on top of that bought ceremony, not privacy.
 */
export function matchQuestion(
  question: AskQuestion,
  professionals: Professional[],
  credentials: Credential[],
  at = new Date().toISOString(),
): Match[] {
  return rank(question, professionals, credentials)
    .slice(0, MAX_MATCHES)
    .map((candidate) => ({
      id: `m-${question.id}-${candidate.professional.userId}`,
      questionId: question.id,
      professionalUserId: candidate.professional.userId,
      reasons: candidate.reasons,
      matchedAt: at,
    }));
}
