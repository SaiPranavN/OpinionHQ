/**
 * Proof.
 *
 * This is the one part of Ask Verified that must not be simplified away, because
 * it is the entire reason the feature exists: the asker has to know *why* they
 * should believe the person answering. A generic "Verified" tick tells them
 * something was checked without saying what, which is worse than saying nothing
 * — the reader fills the gap generously.
 *
 * Every entry pairs three things:
 *
 *   evidenceLabel     what the user offers to show
 *   evidenceCategory  the class of that evidence, safe to display
 *   publicLabel       the outcome sentence, the only thing another user sees
 *
 * The evidence itself — the document, the address, the number — is never stored
 * on a `Credential` and has no field to be stored in. `notVerified` travels with
 * every claim because a badge that only says what it proves invites the reader
 * to assume it proves more.
 */

import type { AskCategoryId, Credential, ProofKind, ProofType } from "@/lib/ask/types";

export const PROOF_KINDS: readonly ProofKind[] = [
  /* -------------------------------------------------------------- career */
  {
    id: "employment",
    category: "career",
    evidenceLabel: "Work email or employee ID",
    evidenceCategory: "Employer-issued identity",
    publicLabel: "Current employment verified",
    notVerified: "Does not confirm seniority, compensation or tenure length.",
  },
  {
    id: "experience-letter",
    category: "career",
    evidenceLabel: "Experience or relieving letter",
    evidenceCategory: "Employer-issued experience document",
    publicLabel: "Previous employment verified",
    notVerified: "Does not confirm the scope or quality of the work performed.",
  },
  {
    id: "linkedin",
    category: "career",
    evidenceLabel: "LinkedIn profile",
    evidenceCategory: "Professional profile, cross-checked",
    publicLabel: "LinkedIn employment matched",
    notVerified: "Self-reported history beyond the matched role is not checked.",
  },
  {
    id: "portfolio",
    category: "career",
    evidenceLabel: "Portfolio or GitHub",
    evidenceCategory: "Published work",
    publicLabel: "Published work reviewed",
    notVerified: "Volume of output is not a measure of judgement.",
  },
  /* ------------------------------------------------------------- college */
  {
    id: "student-id",
    category: "college",
    evidenceLabel: "Student ID or college email",
    evidenceCategory: "Institution-issued identity",
    publicLabel: "Current student verified",
    notVerified: "Does not confirm marks, branch standing or placement status.",
  },
  {
    id: "degree",
    category: "college",
    evidenceLabel: "Degree certificate",
    evidenceCategory: "Institution-issued award",
    publicLabel: "Degree verified",
    notVerified: "Does not confirm class, grade or specialisation performance.",
  },
  {
    id: "alumni",
    category: "college",
    evidenceLabel: "Alumni email",
    evidenceCategory: "Institution-controlled alumni domain",
    publicLabel: "Alumni status verified",
    notVerified: "Does not confirm how current their campus knowledge is.",
  },
  /* ---------------------------------------------------------------- exam */
  {
    id: "scorecard",
    category: "exam",
    evidenceLabel: "Scorecard",
    evidenceCategory: "Examination-body result document",
    publicLabel: "Score verified",
    notVerified: "A score is not evidence of the method that produced it.",
  },
  {
    id: "rank-card",
    category: "exam",
    evidenceLabel: "Rank card",
    evidenceCategory: "Examination-body rank document",
    publicLabel: "Rank verified",
    notVerified: "Ranks are cycle-specific and do not transfer across years.",
  },
  {
    id: "admission-letter",
    category: "exam",
    evidenceLabel: "Admission letter",
    evidenceCategory: "Institution-issued admission document",
    publicLabel: "Admission from this exam verified",
    notVerified: "Does not confirm they completed the programme.",
  },
] as const;

export const PROOF_BY_ID: ReadonlyMap<ProofType, ProofKind> = new Map(
  PROOF_KINDS.map((k) => [k.id, k]),
);

export function proofKind(id: ProofType): ProofKind | undefined {
  return PROOF_BY_ID.get(id);
}

export function proofKindsFor(category: AskCategoryId): ProofKind[] {
  return PROOF_KINDS.filter((k) => k.category === category);
}

/**
 * Turns submitted proof into credentials.
 *
 * IN THE PROTOTYPE THIS APPROVES IMMEDIATELY. There is no review queue and no
 * pending state, because a manual approval step sits between the reviewer and
 * the workflow they are trying to see. In production this same call creates
 * records in a `Pending` state and a human approves each label individually —
 * the shape of what gets published does not change, only who decides it.
 */
export function verify(
  userId: string,
  category: AskCategoryId,
  proofTypes: ProofType[],
  at = new Date().toISOString(),
): Credential[] {
  return proofTypes.flatMap((proofType) => {
    const kind = proofKind(proofType);
    if (!kind || kind.category !== category) return [];
    return [
      {
        id: `cr-${userId}-${category}-${proofType}`,
        userId,
        category,
        proofType,
        publicLabel: kind.publicLabel,
        evidenceCategory: kind.evidenceCategory,
        verifiedAt: at,
      },
    ];
  });
}

export function credentialsFor(
  credentials: Credential[],
  userId: string,
  category?: AskCategoryId,
): Credential[] {
  return credentials.filter(
    (c) => c.userId === userId && (category === undefined || c.category === category),
  );
}

/**
 * Which areas somebody may answer in.
 *
 * Per area, and literal about it: proof of employment qualifies you on careers
 * and on nothing else. A verified software engineer has no standing on college
 * admissions, and a CAT score says nothing about GATE.
 */
export function verifiedAreas(credentials: Credential[], userId: string): AskCategoryId[] {
  const seen = new Set<AskCategoryId>();
  for (const credential of credentials) {
    if (credential.userId === userId) seen.add(credential.category);
  }
  return [...seen];
}

export function isVerifiedFor(
  credentials: Credential[],
  userId: string,
  category: AskCategoryId,
): boolean {
  return credentials.some((c) => c.userId === userId && c.category === category);
}

/**
 * Strongest claim first, so a reader who stops after one line reads that one.
 *
 * Exported because the database stores it too: `proof_kinds.weight` is seeded
 * from here, so an admin queue ordering credentials in SQL and a card ordering
 * them in React agree without either one restating the ranking.
 */
export const PROOF_WEIGHT: Record<ProofType, number> = {
  employment: 0,
  "rank-card": 0,
  "student-id": 0,
  scorecard: 1,
  degree: 1,
  "experience-letter": 2,
  alumni: 2,
  "admission-letter": 2,
  linkedin: 3,
  portfolio: 4,
};

export function orderCredentials(credentials: Credential[]): Credential[] {
  return [...credentials].sort((a, b) => PROOF_WEIGHT[a.proofType] - PROOF_WEIGHT[b.proofType]);
}

/** The disclosure under a set of credential chips, named per area. */
export function verificationDisclosure(category: AskCategoryId): string {
  switch (category) {
    case "career":
      return "OpinionHQ checked this person's employment using the evidence they submitted. It has not assessed the quality or accuracy of their advice.";
    case "college":
      return "OpinionHQ checked this person's association with the institution using institution-issued evidence. Campus experience is personal, and OpinionHQ has not assessed the quality or accuracy of their advice.";
    case "exam":
      return "OpinionHQ checked this person's examination result using examination-body evidence. A result is not evidence of the method behind it, and OpinionHQ has not assessed the quality or accuracy of their advice.";
  }
}

/**
 * Aggregate stats are withheld below this many answers. "100% helpful" off two
 * ratings is noise wearing a statistic's clothes.
 */
export const MIN_REPORTABLE_ANSWERS = 5;
