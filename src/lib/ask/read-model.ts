/**
 * Read model.
 *
 * Note what is not here: no `allQuestions()`, no `search()`, no `trending()`.
 * A public read model is exactly the thing this feature must not have, so the
 * module that would host one does not export a way to enumerate questions.
 *
 * What it does read is people and their proof — the only records here that are
 * legitimately shared, and even then only as outcomes, never as evidence.
 */

import { ASK_CATEGORIES } from "@/lib/ask/taxonomy";
import { credentialsFor, isVerifiedFor } from "@/lib/ask/verification";
import type { AskCategoryId, Credential, Professional } from "@/lib/ask/types";

export interface CategoryStats {
  category: AskCategoryId;
  /** People holding proof in this area right now. */
  available: number;
  /**
   * Share of them holding more than one independent check. One proof is a
   * claim; two is corroboration.
   */
  multiProofPct: number;
  /** The distinct labels answers in this area actually carry. */
  labels: string[];
}

export function professionalsFor(
  category: AskCategoryId,
  professionals: Professional[],
  credentials: Credential[],
): Professional[] {
  return professionals.filter((p) => isVerifiedFor(credentials, p.userId, category));
}

/**
 * Supply-side statistics only — who is available and how deeply verified.
 *
 * Deliberately no question count and no answer count. Those are the numbers a
 * public Q&A site leads with, and publishing them here would mean counting
 * private questions in an aggregate.
 */
export function categoryStats(
  professionals: Professional[],
  credentials: Credential[],
): CategoryStats[] {
  return ASK_CATEGORIES.map((category) => {
    const pool = professionalsFor(category.id, professionals, credentials);
    const multi = pool.filter(
      (p) => credentialsFor(credentials, p.userId, category.id).length > 1,
    ).length;
    const labels = new Set<string>();
    for (const person of pool) {
      for (const credential of credentialsFor(credentials, person.userId, category.id)) {
        labels.add(credential.publicLabel);
      }
    }
    return {
      category: category.id,
      available: pool.length,
      multiProofPct: pool.length === 0 ? 0 : Math.round((multi / pool.length) * 100),
      labels: [...labels],
    };
  });
}

export function professionalById(
  userId: string,
  professionals: Professional[],
): Professional | undefined {
  return professionals.find((p) => p.userId === userId);
}
