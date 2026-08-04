/**
 * The rules that make Ask Verified work: who can read a private question, who
 * is allowed to answer it, and that none of it reaches a public surface.
 *
 * These are the tests worth having. Screens can be re-checked by eye; a private
 * question quietly appearing in a public read model is exactly the kind of
 * regression nobody spots by looking.
 */

import { describe, expect, it } from "vitest";

import {
  canComment,
  canMessagePrivately,
  canOpenPrivate,
  canSeeAsker,
  canVote,
  decideAccess,
  isPrivateOpen,
  publicQuestions,
  matchedQuestionIds,
  visibleAnswers,
  visibleComments,
  visibleMessages,
  visibleRatings,
  visibleThreads,
} from "@/lib/ask/access";
import {
  commentTree,
  countComments,
  MAX_COMMENT_DEPTH,
  nextVote,
  voteCount,
} from "@/lib/ask/comments";
import {
  isComplete,
  NO_PICK,
  pickLabel,
  RATING_LEVELS,
  VERDICT_LEVELS,
  verdictsFor,
} from "@/lib/ask/assessments";
import {
  countReplies,
  decorateQuestion,
  questionStatus,
  relativeTime,
} from "@/lib/ask/derive";
import { matchQuestion, rank, score } from "@/lib/ask/matching";
import { categoryStats } from "@/lib/ask/read-model";
import {
  CREDENTIALS,
  INBOUND_QUESTIONS,
  PROFESSIONALS,
  PUBLIC_ANSWERS,
  SELF_ANSWERS,
  SELF_COMMENTS,
  SELF_MATCHES,
  SELF_MESSAGES,
  SELF_QUESTIONS,
  SELF_THREADS,
  SELF_USER_ID,
} from "@/lib/ask/sample-data/seed";
import { ASK_CATEGORIES, ASK_STATUS_STYLES, MAX_MATCHES, REPLY_CAP } from "@/lib/ask/taxonomy";
import { MAX_ASK_OPTIONS, MIN_ASK_OPTIONS } from "@/lib/ask/types";
import {
  isVerifiedFor,
  PROOF_KINDS,
  verifiedAreas,
  verify,
} from "@/lib/ask/verification";
import { allPolls } from "@/lib/polls";
import { allTopics } from "@/lib/topics";
import type { Viewer } from "@/lib/ask/types";

const offer = SELF_QUESTIONS.find((q) => q.id === "q-offer")!;
const collegeQ = SELF_QUESTIONS.find((q) => q.id === "q-college")!;
const examQ = SELF_QUESTIONS.find((q) => q.id === "q-cat")!;
const who = (id: string) => PROFESSIONALS.find((p) => p.userId === id)!;

const at1 = "2026-08-01T00:00:00.000Z";

const asker: Viewer = { role: "asker", userId: SELF_USER_ID };
const aarav: Viewer = { role: "professional", userId: "p-aarav" };
const divya: Viewer = { role: "professional", userId: "p-divya" };
const outsider: Viewer = { role: "professional", userId: "p-tanvi" };
const guest: Viewer = { role: "guest", userId: "" };

describe("one account", () => {
  it("describes a professional as a user plus proof, not a second identity", () => {
    // A Professional carries no password, no email and no account fields — it
    // is a view over an account, which is what keeps sign-up single.
    for (const person of PROFESSIONALS) {
      const keys = Object.keys(person);
      for (const forbidden of ["email", "password", "accountId", "profile"]) {
        expect(keys, person.userId).not.toContain(forbidden);
      }
      expect(person.userId).toBeTruthy();
    }
  });

  it("derives the areas somebody can answer in purely from their credentials", () => {
    for (const person of PROFESSIONALS) {
      expect(verifiedAreas(CREDENTIALS, person.userId).sort(), person.userId).toEqual(
        [...person.areas].sort(),
      );
    }
  });

  it("grants an area the moment proof exists, with no approval step in between", () => {
    const fresh = verify("u-new", "career", ["employment"]);
    expect(fresh).toHaveLength(1);
    expect(isVerifiedFor(fresh, "u-new", "career")).toBe(true);
    expect(isVerifiedFor(fresh, "u-new", "college")).toBe(false);
  });
});

describe("access", () => {
  it("lets the asker read their own question", () => {
    const decision = decideAccess(asker, offer, SELF_MATCHES);
    expect(decision.allowed).toBe(true);
  });

  it("lets a matched professional read it, with no accept step", () => {
    expect(decideAccess(aarav, offer, SELF_MATCHES).allowed).toBe(true);
    expect(decideAccess(divya, offer, SELF_MATCHES).allowed).toBe(true);
  });

  it("tells an unmatched professional the question does not exist", () => {
    // Not "forbidden": confirming a private question exists at an address is
    // itself a disclosure.
    const decision = decideAccess(outsider, offer, SELF_MATCHES);
    expect(decision.allowed).toBe(false);
    expect(decision.allowed === false && decision.reason).toBe("No such question.");
  });

  it("refuses a signed-out visitor and an unknown id", () => {
    expect(decideAccess(guest, offer, SELF_MATCHES).allowed).toBe(false);
    expect(decideAccess(asker, undefined, SELF_MATCHES).allowed).toBe(false);
  });

  it("ends access when the asker closes the thread", () => {
    const revoked = SELF_MATCHES.map((m) =>
      m.professionalUserId === "p-aarav" && m.questionId === "q-offer"
        ? { ...m, revokedAt: "2026-07-31T00:00:00.000Z" }
        : m,
    );
    const decision = decideAccess(aarav, offer, revoked);
    expect(decision.allowed).toBe(false);
    expect(matchedQuestionIds(revoked, "p-aarav")).not.toContain("q-offer");
  });
});

describe("what each side can see", () => {
  it("gives the asker every answer on their question", () => {
    const visible = visibleAnswers(asker, "asker", SELF_ANSWERS, offer);
    expect(visible.map((a) => a.professionalUserId).sort()).toEqual(["p-aarav", "p-divya"]);
  });

  it("gives a professional only their own answer", () => {
    // The value of a second opinion is that it was formed without reading the
    // first one.
    const visible = visibleAnswers(aarav, "professional", SELF_ANSWERS, offer);
    expect(visible).toHaveLength(1);
    expect(visible[0]!.professionalUserId).toBe("p-aarav");
  });

  it("gives a professional only their own thread and messages", () => {
    expect(visibleThreads(divya, "professional", SELF_THREADS, "q-offer")).toHaveLength(1);
    const messages = visibleMessages(aarav, "professional", SELF_MESSAGES, "q-offer");
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((m) => m.professionalUserId === "p-aarav")).toBe(true);
  });

  it("never shows one professional another's rating", () => {
    const ratings = [
      {
        questionId: "q-offer",
        professionalUserId: "p-aarav",
        helpfulness: 3,
        createdAt: "2026-07-30T00:00:00.000Z",
      },
    ];
    expect(visibleRatings(aarav, "professional", ratings, "q-offer")).toHaveLength(1);
    expect(visibleRatings(divya, "professional", ratings, "q-offer")).toHaveLength(0);
  });

  it("sorts a thread oldest first", () => {
    const messages = visibleMessages(asker, "asker", SELF_MESSAGES, "q-offer");
    const times = messages.map((m) => m.createdAt);
    expect([...times].sort()).toEqual(times);
  });
});

describe("only relevant proof qualifies you", () => {
  it("refuses a verified engineer on a college or exam question", () => {
    // Not "ranked low" — not a candidate. A strong career score must never buy
    // standing in an area nobody checked.
    expect(score(collegeQ, who("p-aarav"), CREDENTIALS)).toBeNull();
    expect(score(examQ, who("p-aarav"), CREDENTIALS)).toBeNull();
    expect(score(offer, who("p-aarav"), CREDENTIALS)).not.toBeNull();
  });

  it("refuses a CAT scorer on a college question and vice versa", () => {
    expect(score(collegeQ, who("p-vikram"), CREDENTIALS)).toBeNull();
    expect(score(examQ, who("p-rohan"), CREDENTIALS)).toBeNull();
  });

  it("lets somebody verified twice answer in both areas", () => {
    expect(score(offer, who("p-arjun"), CREDENTIALS)).not.toBeNull();
    expect(score(collegeQ, who("p-arjun"), CREDENTIALS)).not.toBeNull();
    expect(score(examQ, who("p-arjun"), CREDENTIALS)).toBeNull();
  });

  it("stops matching the moment proof is removed", () => {
    const without = CREDENTIALS.filter((c) => c.userId !== "p-tanvi");
    expect(score(examQ, who("p-tanvi"), CREDENTIALS)).not.toBeNull();
    expect(score(examQ, who("p-tanvi"), without)).toBeNull();
  });

  it("only ever ranks people cleared in the question's area", () => {
    for (const question of [offer, collegeQ, examQ, ...INBOUND_QUESTIONS]) {
      const ranked = rank(question, PROFESSIONALS, CREDENTIALS);
      expect(ranked.length, question.id).toBeGreaterThan(0);
      for (const candidate of ranked) {
        expect(
          isVerifiedFor(CREDENTIALS, candidate.professional.userId, question.category),
          `${candidate.professional.userId} on ${question.id}`,
        ).toBe(true);
      }
    }
  });

  it("is deterministic and gives every candidate a readable reason", () => {
    const once = rank(offer, PROFESSIONALS, CREDENTIALS).map((c) => c.professional.userId);
    const twice = rank(offer, PROFESSIONALS, CREDENTIALS).map((c) => c.professional.userId);
    expect(once).toEqual(twice);
    for (const candidate of rank(offer, PROFESSIONALS, CREDENTIALS)) {
      expect(candidate.reasons.length).toBeGreaterThan(0);
      expect(candidate.reasons[0]!.length).toBeGreaterThan(10);
    }
  });

  it("never routes a question to more than the cap", () => {
    for (const question of [...SELF_QUESTIONS, ...INBOUND_QUESTIONS]) {
      const created = matchQuestion(question, PROFESSIONALS, CREDENTIALS);
      expect(created.length, question.id).toBeLessThanOrEqual(MAX_MATCHES);
      // Matching is the grant: there is no pending state to forget to clear.
      expect(created.every((m) => !m.revokedAt)).toBe(true);
    }
  });
});

describe("nothing reaches a public surface", () => {
  const all = [...SELF_QUESTIONS, ...INBOUND_QUESTIONS];

  it("shares no id with a topic or a poll", () => {
    const publicIds = new Set([
      ...allTopics().map((t) => t.id),
      ...allPolls().map((p) => p.id),
    ]);
    for (const question of all) {
      expect(publicIds.has(question.id), question.id).toBe(false);
    }
  });

  it("puts no question title or context into the public catalogs", () => {
    const publicText = [
      ...allTopics().map((t) => `${t.name} ${t.summary} ${t.about}`),
      ...allPolls().map((p) => `${p.question} ${p.summary} ${p.about}`),
    ]
      .join(" ")
      .toLowerCase();
    for (const question of all) {
      expect(publicText.includes(question.title.toLowerCase()), question.id).toBe(false);
      expect(
        publicText.includes(question.context.slice(0, 60).toLowerCase()),
        question.id,
      ).toBe(false);
    }
  });

  it("exposes no way to enumerate questions", async () => {
    const readModel = await import("@/lib/ask/read-model");
    for (const name of Object.keys(readModel)) {
      expect(name).not.toMatch(/^(allQuestions|searchQuestions|trendingQuestions)$/);
    }
  });

  it("counts people rather than questions on the public-facing stats", () => {
    for (const stat of categoryStats(PROFESSIONALS, CREDENTIALS)) {
      expect(stat.available, stat.category).toBeGreaterThan(0);
      expect(Object.keys(stat)).not.toContain("questionCount");
      expect(Object.keys(stat)).not.toContain("answerCount");
    }
  });
});

describe("proof records hold outcomes, not evidence", () => {
  it("has no field that could carry a document, address or number", () => {
    for (const credential of CREDENTIALS) {
      const keys = Object.keys(credential);
      for (const forbidden of ["email", "documentUrl", "employeeId", "number", "fileName"]) {
        expect(keys, credential.id).not.toContain(forbidden);
      }
    }
  });

  it("never publishes a bare tick, and always states what it does not establish", () => {
    for (const kind of PROOF_KINDS) {
      expect(kind.publicLabel, kind.id).not.toBe("Verified");
      expect(kind.notVerified.trim().length, kind.id).toBeGreaterThan(20);
      expect(kind.evidenceCategory.trim().length, kind.id).toBeGreaterThan(8);
    }
  });

  it("builds every fixture credential through the catalog, so labels cannot drift", () => {
    for (const credential of CREDENTIALS) {
      const kind = PROOF_KINDS.find((k) => k.id === credential.proofType)!;
      expect(kind, credential.id).toBeDefined();
      expect(credential.publicLabel).toBe(kind.publicLabel);
      expect(credential.evidenceCategory).toBe(kind.evidenceCategory);
      expect(credential.category).toBe(kind.category);
    }
  });
});

describe("assessments follow the asker's own options", () => {
  it("scores on one fixed five-point scale, worst to best", () => {
    expect(VERDICT_LEVELS).toHaveLength(5);
    expect(VERDICT_LEVELS[0]!.tone).toBe("poor");
    expect(VERDICT_LEVELS[4]!.tone).toBe("strong");
  });

  it("pairs each verdict with the option the asker actually wrote", () => {
    const verdicts = verdictsFor(offer, [3, 2], 0);
    expect(verdicts.map((v) => v.option)).toEqual(offer.options);
    expect(verdicts[0]!.level.label).toBe("Good");
    expect(verdicts[0]!.picked).toBe(true);
    expect(verdicts[1]!.picked).toBe(false);
  });

  it("drops an unscored option rather than defaulting it", () => {
    expect(verdictsFor(offer, [3], 0)).toHaveLength(1);
    expect(isComplete(offer, [3], 0)).toBe(false);
    expect(isComplete(offer, [3, 2], 0)).toBe(true);
  });

  it("accepts 'neither' as an honest pick", () => {
    expect(isComplete(offer, [1, 1], NO_PICK)).toBe(true);
    expect(pickLabel(offer, NO_PICK)).toMatch(/neither/i);
    expect(pickLabel(offer, 1)).toBe(offer.options[1]);
  });

  it("rejects a pick that is not one of the options", () => {
    expect(isComplete(offer, [3, 2], 7)).toBe(false);
  });

  it("gives every fixture answer a verdict per option and a valid pick", () => {
    for (const answer of SELF_ANSWERS) {
      const question = SELF_QUESTIONS.find((q) => q.id === answer.questionId)!;
      expect(isComplete(question, answer.verdicts, answer.pick), answer.id).toBe(true);
      expect(answer.verdicts.length, answer.id).toBe(question.options.length);
      for (const value of answer.verdicts) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(VERDICT_LEVELS.length);
      }
    }
  });

  it("collects second opinions that actually differ", () => {
    // Two answers agreeing on everything would mean the compare view has
    // nothing to show, and the fixtures would model a behaviour that does not
    // exist. On both seeded questions the two people pick differently.
    for (const id of ["q-offer", "q-college"]) {
      const [first, second] = SELF_ANSWERS.filter((a) => a.questionId === id);
      expect(first, id).toBeDefined();
      expect(second, id).toBeDefined();
      expect(first!.verdicts, id).not.toEqual(second!.verdicts);
      expect(first!.pick, id).not.toBe(second!.pick);
    }
  });

  it("rates an answer on one private scale", () => {
    expect(RATING_LEVELS.length).toBe(4);
  });
});

describe("questions carry two to four options", () => {
  it("keeps every fixture question inside the bounds", () => {
    for (const question of [...SELF_QUESTIONS, ...INBOUND_QUESTIONS]) {
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(
        MIN_ASK_OPTIONS,
      );
      expect(question.options.length, question.id).toBeLessThanOrEqual(MAX_ASK_OPTIONS);
      const unique = new Set(question.options.map((o) => o.toLowerCase()));
      expect(unique.size, question.id).toBe(question.options.length);
    }
  });
});

describe("status and counting", () => {
  it("says 'finding someone' only when nothing has been routed", () => {
    expect(questionStatus([], [])).toBe("Finding someone");
  });

  it("surfaces the furthest-along open thread", () => {
    expect(
      questionStatus(
        SELF_MATCHES.filter((m) => m.questionId === "q-offer"),
        SELF_THREADS.filter((t) => t.questionId === "q-offer"),
      ),
    ).toBe("Answered");
  });

  it("gives every status a meaning and a side it is waiting on", () => {
    for (const [status, style] of Object.entries(ASK_STATUS_STYLES)) {
      expect(style.meaning.length, status).toBeGreaterThan(10);
      expect(["professional", "you", "nobody"]).toContain(style.waitingOn);
    }
  });

  it("counts replies per side against the cap", () => {
    const counts = countReplies(
      SELF_MESSAGES.filter((m) => m.professionalUserId === "p-aarav"),
    );
    expect(counts.cap).toBe(REPLY_CAP);
    expect(counts.asker).toBe(1);
    expect(counts.professional).toBe(1);
  });

  it("decorates a question without inventing counts", () => {
    const decorated = decorateQuestion(examQ, {
      matches: SELF_MATCHES,
      threads: SELF_THREADS,
      answers: SELF_ANSWERS,
      messages: SELF_MESSAGES,
      readIds: [],
      viewerUserId: SELF_USER_ID,
    });
    expect(decorated.answerCount).toBe(0);
    expect(decorated.status).toBe("Awaiting answer");
    expect(decorated.statusLine).toMatch(/no answer yet/i);
  });

  it("formats relative time without inventing precision", () => {
    const now = new Date("2026-07-31T12:00:00.000Z");
    expect(relativeTime("2026-07-31T11:59:30.000Z", now)).toBe("just now");
    expect(relativeTime("2026-07-31T11:20:00.000Z", now)).toBe("40m ago");
    expect(relativeTime("2026-07-30T12:00:00.000Z", now)).toBe("1 day ago");
  });
});

describe("fixtures", () => {
  const all = [...SELF_QUESTIONS, ...INBOUND_QUESTIONS];

  it("uses unique ids", () => {
    const check = (ids: string[], label: string) =>
      expect(new Set(ids).size, label).toBe(ids.length);
    check(all.map((q) => q.id), "questions");
    check(SELF_MATCHES.map((m) => m.id), "matches");
    check(SELF_ANSWERS.map((a) => a.id), "answers");
    check(SELF_MESSAGES.map((m) => m.id), "messages");
    check(CREDENTIALS.map((c) => c.id), "credentials");
    check(PROFESSIONALS.map((p) => p.userId), "professionals");
  });

  it("only answers questions the person was matched to", () => {
    for (const answer of SELF_ANSWERS) {
      const match = SELF_MATCHES.find(
        (m) =>
          m.questionId === answer.questionId &&
          m.professionalUserId === answer.professionalUserId,
      );
      expect(match, answer.id).toBeDefined();
    }
  });

  it("attaches every thread and message to a matched pair", () => {
    for (const record of [...SELF_THREADS, ...SELF_MESSAGES]) {
      const match = SELF_MATCHES.find(
        (m) =>
          m.questionId === record.questionId &&
          m.professionalUserId === record.professionalUserId,
      );
      expect(match, `${record.questionId}/${record.professionalUserId}`).toBeDefined();
    }
  });

  it("labels every fixture question as simulated and keeps it in scope", () => {
    for (const question of all) {
      expect(question.simulated, question.id).toBe(true);
      expect(ASK_CATEGORIES.map((c) => c.id)).toContain(question.category);
    }
  });
});

describe("stale stored records degrade rather than crash", () => {
  it("survives an answer written before the shape changed", () => {
    // The storage key is bumped on a shape change, but a partial write could
    // still produce this — a missing array must not take the page down.
    expect(verdictsFor(offer, undefined, 0)).toEqual([]);
    expect(isComplete(offer, undefined, 0)).toBe(false);
    expect(verdictsFor(offer, [3], 0)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------ visibility */

/**
 * The hybrid model.
 *
 * Public is the default and private is one checkbox away, so the tests that
 * matter are the ones proving the checkbox still means something — and that
 * publishing a question did not quietly publish the conversation, the ratings
 * or the person who asked.
 */
describe("public and private questions", () => {
  const publicQ = { ...offer, id: "q-public", visibility: "public" as const };
  const privateQ = { ...offer, id: "q-private", visibility: "private" as const };
  const stranger: Viewer = { role: "asker", userId: "u-nobody" };

  it("lets anyone — including a signed-out visitor — read a public question", () => {
    for (const viewer of [guest, stranger, aarav]) {
      const decision = decideAccess(viewer, publicQ, []);
      expect(decision.allowed, viewer.userId || "guest").toBe(true);
    }
  });

  it("still hides a private question from everyone with no part in it", () => {
    for (const viewer of [guest, stranger]) {
      const decision = decideAccess(viewer, privateQ, []);
      expect(decision.allowed).toBe(false);
    }
  });

  it("does not confirm that a private question exists", () => {
    // "No such question", never "forbidden" — the difference is a disclosure.
    const decision = decideAccess(stranger, privateQ, []);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe("No such question.");
  });

  it("keeps the asker's own access whatever the visibility", () => {
    for (const q of [publicQ, privateQ]) {
      const decision = decideAccess(asker, q, []);
      expect(decision.allowed).toBe(true);
      if (decision.allowed) expect(decision.scope).toBe("asker");
    }
  });

  it("ranks a live match above plain public access", () => {
    // A matched professional gets a thread and a reply box; a passer-by on the
    // same public question gets neither.
    const matched = decideAccess(aarav, publicQ, SELF_MATCHES.map((m) => ({
      ...m,
      questionId: m.questionId === "q-offer" ? "q-public" : m.questionId,
    })));
    expect(matched.allowed).toBe(true);
    if (matched.allowed) expect(matched.scope).toBe("professional");
  });

  it("shows a public reader every answer", () => {
    const answers = SELF_ANSWERS.map((a) => ({ ...a, questionId: "q-public" }));
    const visible = visibleAnswers(guest, "public", answers, publicQ);
    expect(visible).toHaveLength(answers.length);
  });

  it("shows a public reader no thread, no messages and no ratings", () => {
    // Publishing a question published the answers. It did not publish the
    // one-to-one conversation, and it did not publish what the asker thought
    // of anybody privately.
    expect(visibleThreads(guest, "public", SELF_THREADS, "q-offer")).toEqual([]);
    expect(visibleMessages(guest, "public", SELF_MESSAGES, "q-offer")).toEqual([]);
    const ratings = [
      { questionId: "q-offer", professionalUserId: "p-aarav", helpfulness: 3, createdAt: "" },
    ];
    expect(visibleRatings(guest, "public", ratings, "q-offer")).toEqual([]);
  });

  it("never shows who asked to a public reader", () => {
    expect(canSeeAsker("public")).toBe(false);
    expect(canSeeAsker("asker")).toBe(true);
    expect(canSeeAsker("professional")).toBe(true);
  });

  it("hides other answers from a professional who has not answered yet", () => {
    // The integrity rule. Making questions public created a way to read three
    // opinions and then write a fourth that claims to be independent.
    const answers = SELF_ANSWERS.map((a) => ({ ...a, questionId: "q-public" }));
    // Somebody matched to it who has not written anything yet — remapping the
    // fixture answers onto one question gave every seeded professional one.
    const notYetAnswered: Viewer = { role: "professional", userId: "p-not-yet" };
    expect(visibleAnswers(notYetAnswered, "professional", answers, publicQ)).toEqual([]);
  });

  it("opens the rest to a professional once their own answer is in", () => {
    const answers = SELF_ANSWERS.map((a) => ({ ...a, questionId: "q-public" }));
    const visible = visibleAnswers(aarav, "professional", answers, publicQ);
    expect(visible.length).toBe(answers.length);
    expect(visible.some((a) => a.professionalUserId === "p-aarav")).toBe(true);
  });

  it("keeps a private question's answers to the professional who wrote them", () => {
    // Even after answering. Those were written for the asker alone.
    const answers = SELF_ANSWERS.map((a) => ({ ...a, questionId: "q-private" }));
    const visible = visibleAnswers(aarav, "professional", answers, privateQ);
    expect(visible).toHaveLength(1);
    expect(visible[0]!.professionalUserId).toBe("p-aarav");
  });

  it("keeps private questions out of the browse list", () => {
    const list = publicQuestions([publicQ, privateQ]);
    expect(list.map((q) => q.id)).toEqual(["q-public"]);
  });

  it("ships at least one seeded question of each visibility", () => {
    // So the prototype demonstrates both without anyone having to create one.
    const seeded = [...SELF_QUESTIONS, ...INBOUND_QUESTIONS];
    expect(seeded.some((q) => q.visibility === "public")).toBe(true);
    expect(seeded.some((q) => q.visibility === "private")).toBe(true);
  });
});

/**
 * The fail-closed rule, tested at the shape level.
 *
 * A stored question written before `visibility` existed has no value for it.
 * Whatever reads that record must resolve the gap to `private` — a question
 * nobody chose to publish must never become public because a field was absent.
 */
describe("missing visibility", () => {
  const normalise = (q: { visibility?: string }) =>
    q.visibility === "public" ? "public" : "private";

  it("resolves an absent visibility to private", () => {
    expect(normalise({})).toBe("private");
    expect(normalise({ visibility: undefined })).toBe("private");
  });

  it("resolves anything unrecognised to private too", () => {
    expect(normalise({ visibility: "" })).toBe("private");
    expect(normalise({ visibility: "PUBLIC" })).toBe("private");
    expect(normalise({ visibility: "unlisted" })).toBe("private");
  });

  it("keeps an explicit public public", () => {
    expect(normalise({ visibility: "public" })).toBe("public");
  });
});

/* --------------------------------------------------------------- comments */

/**
 * The public/private split the answer template now turns on.
 *
 * A comment is a note in the margin of a published answer; the private thread
 * is the consultation. The tests that matter are the ones proving the two
 * cannot leak into each other.
 */
describe("comments on answers", () => {
  const publicQ = { ...offer, id: "q-pub", visibility: "public" as const };
  const privateQ = { ...offer, id: "q-priv", visibility: "private" as const };
  const stranger: Viewer = { role: "asker", userId: "u-stranger" };

  const comment = (questionId: string, professionalUserId: string, id = "c1") => ({
    id,
    questionId,
    professionalUserId,
    authorUserId: "u-stranger",
    authorName: "A Reader",
    authorInitials: "AR",
    body: "Adding what happened to me.",
    createdAt: "2026-08-01T00:00:00.000Z",
  });

  it("shows comments on a public answer to everyone", () => {
    const list = [comment("q-pub", "p-aarav")];
    expect(visibleComments(publicQ, list, "p-aarav")).toHaveLength(1);
  });

  it("never shows a comment on a private question", () => {
    // A private question has no third parties by construction, so a comment on
    // one could only have come from a bug — and it must surface as a missing
    // comment, never as a stranger's text inside somebody's consultation.
    const list = [comment("q-priv", "p-aarav")];
    expect(visibleComments(privateQ, list, "p-aarav")).toEqual([]);
  });

  it("keeps each answer's comments under that answer", () => {
    const list = [
      comment("q-pub", "p-aarav", "c1"),
      comment("q-pub", "p-divya", "c2"),
    ];
    expect(visibleComments(publicQ, list, "p-aarav").map((c) => c.id)).toEqual(["c1"]);
    expect(visibleComments(publicQ, list, "p-divya").map((c) => c.id)).toEqual(["c2"]);
  });

  it("lets any signed-in reader comment on a public answer", () => {
    expect(canComment(publicQ, stranger, "p-aarav")).toBe(true);
    expect(canComment(publicQ, asker, "p-aarav")).toBe(true);
  });

  it("refuses a comment from a guest, or on a private question", () => {
    expect(canComment(publicQ, guest, "p-aarav")).toBe(false);
    expect(canComment(privateQ, stranger, "p-aarav")).toBe(false);
  });

  it("stops the author opening a comment under their own answer", () => {
    // A new note from them belongs in the answer. An author arguing underneath
    // their own assessment is how a considered page becomes a message board.
    expect(canComment(publicQ, aarav, "p-aarav")).toBe(false);
    expect(canComment(publicQ, aarav, "p-divya")).toBe(true);
  });

  it("lets the author reply to a comment on their own answer", () => {
    // Threading changed what the right answer is. A reader who replies to the
    // professional by name has addressed a question to the one person who can
    // answer it, and refusing them the reply box leaves it hanging in public.
    expect(canComment(publicQ, aarav, "p-aarav", "c1")).toBe(true);
    // Still no new top-level comment, whatever else is on the page.
    expect(canComment(publicQ, aarav, "p-aarav", undefined)).toBe(false);
  });

  it("refuses a reply from a guest, and any comment on a private question", () => {
    expect(canComment(publicQ, guest, "p-aarav", "c1")).toBe(false);
    expect(canComment(privateQ, stranger, "p-aarav", "c1")).toBe(false);
    expect(canComment(privateQ, aarav, "p-aarav", "c1")).toBe(false);
  });

  it("lets a signed-in reader vote on somebody else's writing, and not their own", () => {
    // A count that includes the author is a count that means nothing, and this
    // is a product whose whole claim is that its numbers mean what they say.
    expect(canVote(publicQ, stranger, "p-aarav")).toBe(true);
    expect(canVote(publicQ, aarav, "p-aarav")).toBe(false);
    expect(canVote(publicQ, guest, "p-aarav")).toBe(false);
    expect(canVote(privateQ, asker, "p-aarav")).toBe(false);
  });

  it("adds the viewer's own vote to the stored count without writing it in", () => {
    expect(voteCount(12, "like", undefined)).toBe(12);
    expect(voteCount(12, "like", "like")).toBe(13);
    // Their dislike belongs to the other counter, not this one.
    expect(voteCount(12, "like", "dislike")).toBe(12);
    expect(voteCount(3, "dislike", "dislike")).toBe(4);
    expect(voteCount(undefined, "like", undefined)).toBe(0);
    expect(voteCount(undefined, "dislike", "dislike")).toBe(1);
  });

  it("never lets one reader hold a like and a dislike on the same thing", () => {
    // Enforced by the shape of the value rather than by a rule somebody has to
    // remember: there is one vote, so the second press replaces the first.
    expect(nextVote(undefined, "like")).toBe("like");
    expect(nextVote("like", "dislike")).toBe("dislike");
    expect(nextVote("dislike", "like")).toBe("like");
  });

  it("takes a vote back when the same side is pressed again", () => {
    // Nobody should be stuck with a vote they can only change and never
    // withdraw.
    expect(nextVote("like", "like")).toBeUndefined();
    expect(nextVote("dislike", "dislike")).toBeUndefined();
  });

  it("opens the private follow-up to the asker and to nobody else", () => {
    expect(canMessagePrivately(publicQ, asker)).toBe(true);
    expect(canMessagePrivately(publicQ, stranger)).toBe(false);
    expect(canMessagePrivately(publicQ, aarav)).toBe(false);
    expect(canMessagePrivately(publicQ, guest)).toBe(false);
  });

  it("keeps the private follow-up available on a private question too", () => {
    // Publishing added the comment box. It did not change who the private
    // thread belongs to.
    expect(canMessagePrivately(privateQ, asker)).toBe(true);
  });

  it("seeds comments only on public questions", () => {
    const byId = new Map(
      [...SELF_QUESTIONS, ...INBOUND_QUESTIONS].map((q) => [q.id, q]),
    );
    expect(SELF_COMMENTS.length).toBeGreaterThan(0);
    for (const entry of SELF_COMMENTS) {
      const question = byId.get(entry.questionId);
      expect(question, entry.id).toBeDefined();
      expect(question!.visibility, entry.id).toBe("public");
    }
  });

  it("seeds every comment against a real answer, and every reply against a real parent", () => {
    const answers = new Map(
      [...SELF_ANSWERS, ...PUBLIC_ANSWERS].map((a) => [
        `${a.questionId}:${a.professionalUserId}`,
        a,
      ]),
    );
    const byId = new Map(SELF_COMMENTS.map((c) => [c.id, c]));
    for (const entry of SELF_COMMENTS) {
      const key = `${entry.questionId}:${entry.professionalUserId}`;
      expect(answers.has(key), entry.id).toBe(true);
      if (!entry.parentId) continue;
      const parent = byId.get(entry.parentId);
      expect(parent, entry.id).toBeDefined();
      // A reply must hang off a comment on the *same* answer, or the tree
      // would carry it under one answer while it was written under another.
      expect(parent!.questionId, entry.id).toBe(entry.questionId);
      expect(parent!.professionalUserId, entry.id).toBe(entry.professionalUserId);
    }
  });

  it("seeds both counts, and at least one genuinely divided response", () => {
    // Two counters only earn their place if the fixtures ever disagree. A set
    // where every answer is liked and none disliked demonstrates a single
    // number wearing two buttons.
    for (const entry of SELF_COMMENTS) {
      expect(typeof entry.likes, entry.id).toBe("number");
      expect(typeof entry.dislikes, entry.id).toBe("number");
    }
    const divided = PUBLIC_ANSWERS.filter(
      (a) => (a.dislikes ?? 0) > (a.likes ?? 0),
    );
    expect(divided.length).toBeGreaterThan(0);
  });

  it("seeds top-level comments from third parties only", () => {
    // The author may reply — see `canComment` — but never open one. Both
    // halves of that rule have to hold in the fixtures too, or the screen
    // demonstrates something the rule forbids.
    for (const entry of SELF_COMMENTS) {
      if (entry.parentId) continue;
      expect(entry.authorUserId, entry.id).not.toBe(entry.professionalUserId);
    }
  });
});

/* ------------------------------------------------------------ comment tree */

describe("threading", () => {
  const at = (n: number) => `2026-08-0${n}T00:00:00.000Z`;
  const c = (id: string, parentId: string | undefined, day: number) => ({
    id,
    questionId: "q-pub",
    professionalUserId: "p-aarav",
    ...(parentId ? { parentId } : {}),
    authorUserId: `u-${id}`,
    authorName: id,
    authorInitials: "XX",
    body: id,
    createdAt: at(day),
  });

  it("nests a reply under the comment it answers", () => {
    const tree = commentTree([c("a", undefined, 1), c("b", "a", 2)]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.comment.id).toBe("a");
    expect(tree[0]!.replies.map((r) => r.comment.id)).toEqual(["b"]);
  });

  it("orders every level oldest first, whatever order they arrive in", () => {
    // Chronological rather than by score: ranking would reorder a conversation
    // under the reader, and drop a reply posted a second ago several screens
    // below the thing it answers.
    const tree = commentTree([c("c", undefined, 3), c("a", undefined, 1), c("b", undefined, 2)]);
    expect(tree.map((n) => n.comment.id)).toEqual(["a", "b", "c"]);
  });

  it("counts descendants at every depth", () => {
    const tree = commentTree([
      c("a", undefined, 1),
      c("b", "a", 2),
      c("c", "b", 3),
      c("d", undefined, 4),
    ]);
    expect(tree[0]!.total).toBe(2);
    expect(tree[1]!.total).toBe(0);
    expect(countComments(tree)).toBe(4);
  });

  it("stops indenting at the cap without flattening the thread", () => {
    const deep = [c("n0", undefined, 1)];
    for (let i = 1; i <= MAX_COMMENT_DEPTH + 3; i += 1) {
      deep.push(c(`n${i}`, `n${i - 1}`, 1));
    }
    let node = commentTree(deep)[0]!;
    const depths: number[] = [node.depth];
    while (node.replies[0]) {
      node = node.replies[0];
      depths.push(node.depth);
    }
    // Every comment is still in the tree, in order, and parented correctly.
    expect(depths).toHaveLength(MAX_COMMENT_DEPTH + 4);
    expect(Math.max(...depths)).toBe(MAX_COMMENT_DEPTH);
    expect(depths.slice(0, MAX_COMMENT_DEPTH + 1)).toEqual(
      Array.from({ length: MAX_COMMENT_DEPTH + 1 }, (_, i) => i),
    );
  });

  it("keeps an orphaned reply rather than dropping it", () => {
    // Losing the reply because its parent went away would delete somebody's
    // words for a reason that has nothing to do with them.
    const tree = commentTree([c("b", "gone", 2)]);
    expect(tree.map((n) => n.comment.id)).toEqual(["b"]);
  });

  it("survives a record that claims itself as its parent", () => {
    const tree = commentTree([c("a", "a", 1)]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.replies).toEqual([]);
  });

  it("threads the seeded comments rather than describing threading", () => {
    const shreya = SELF_COMMENTS.filter(
      (x) => x.questionId === "iq-ca-articleship" && x.professionalUserId === "p-shreya",
    );
    const tree = commentTree(shreya);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.total).toBeGreaterThanOrEqual(3);
  });
});

/* ------------------------------------------------------- the private door */

/**
 * The rule the asker asked for: a private channel exists because they opened
 * it, and for no other reason. Being matched to a question is permission to
 * answer it, not permission to start a private conversation.
 */
describe("the private channel opens only when the asker opens it", () => {
  const publicQ = { ...offer, id: "q-pub", visibility: "public" as const };
  const stranger: Viewer = { role: "asker", userId: "u-stranger" };
  const thread = (extra: Partial<(typeof SELF_THREADS)[number]> = {}) => ({
    questionId: publicQ.id,
    professionalUserId: "p-aarav",
    status: "Answered" as const,
    updatedAt: at1,
    ...extra,
  });

  it("starts closed on a freshly matched thread", () => {
    expect(isPrivateOpen(thread())).toBe(false);
  });

  it("is open once the asker has opened it", () => {
    expect(isPrivateOpen(thread({ privateOpenedAt: at1 }))).toBe(true);
  });

  it("treats a thread carrying messages as open", () => {
    // Defensive, and it fails in the safe direction: a record written before
    // this field existed must not hide a conversation that already happened
    // from the two people who had it.
    const messages = [
      {
        id: "m1",
        questionId: publicQ.id,
        professionalUserId: "p-aarav",
        senderUserId: SELF_USER_ID,
        senderRole: "asker" as const,
        body: "hello",
        createdAt: at1,
      },
    ];
    expect(isPrivateOpen(thread(), messages)).toBe(true);
    // …and not somebody else's conversation.
    expect(
      isPrivateOpen(thread({ professionalUserId: "p-divya" }), messages),
    ).toBe(false);
  });

  it("lets only the asker open it", () => {
    expect(canOpenPrivate(publicQ, asker, thread())).toBe(true);
    expect(canOpenPrivate(publicQ, aarav, thread())).toBe(false);
    expect(canOpenPrivate(publicQ, stranger, thread())).toBe(false);
    expect(canOpenPrivate(publicQ, guest, thread())).toBe(false);
  });

  it("does not offer to open one that is already open", () => {
    expect(canOpenPrivate(publicQ, asker, thread({ privateOpenedAt: at1 }))).toBe(false);
  });

  it("refuses to reopen a finished thread", () => {
    // Resolving revokes their access. Reopening the channel would quietly undo
    // that, so the answer there is a new question rather than a new message.
    expect(canOpenPrivate(publicQ, asker, thread({ status: "Resolved" }))).toBe(false);
    expect(canOpenPrivate(publicQ, asker, thread({ status: "Closed" }))).toBe(false);
  });

  it("keeps the door available on a private question too", () => {
    expect(canOpenPrivate(offer, asker, thread({ questionId: offer.id }))).toBe(true);
  });

  it("seeds a private channel only where a conversation actually happened", () => {
    for (const seeded of SELF_THREADS) {
      const hasMessages = SELF_MESSAGES.some(
        (m) =>
          m.questionId === seeded.questionId &&
          m.professionalUserId === seeded.professionalUserId,
      );
      expect(Boolean(seeded.privateOpenedAt), `${seeded.questionId}:${seeded.professionalUserId}`)
        .toBe(hasMessages);
    }
    // And at least one of each, or the screen only ever demonstrates one state.
    expect(SELF_THREADS.some((t) => t.privateOpenedAt)).toBe(true);
    expect(SELF_THREADS.some((t) => !t.privateOpenedAt)).toBe(true);
  });
});

describe("sample data depth", () => {
  it("gives most public questions at least one answer", () => {
    // A browse page of "no answers yet" demonstrates the routing and none of
    // the value, which is the whole reason questions became public.
    const answered = new Set(
      [...SELF_ANSWERS, ...PUBLIC_ANSWERS].map((a) => a.questionId),
    );
    const publicOnes = [...SELF_QUESTIONS, ...INBOUND_QUESTIONS].filter(
      (q) => q.visibility === "public",
    );
    const withAnswers = publicOnes.filter((q) => answered.has(q.id));
    expect(withAnswers.length / publicOnes.length).toBeGreaterThanOrEqual(0.5);
  });

  it("covers all three areas with verified people", () => {
    for (const area of ["career", "college", "exam"] as const) {
      const pool = PROFESSIONALS.filter((p) => p.areas.includes(area));
      expect(pool.length, area).toBeGreaterThanOrEqual(3);
    }
  });

  it("attaches every seeded answer to a question and a real person", () => {
    const questions = new Set(
      [...SELF_QUESTIONS, ...INBOUND_QUESTIONS].map((q) => q.id),
    );
    const people = new Set(PROFESSIONALS.map((p) => p.userId));
    for (const answer of [...SELF_ANSWERS, ...PUBLIC_ANSWERS]) {
      expect(questions.has(answer.questionId), answer.id).toBe(true);
      expect(people.has(answer.professionalUserId), answer.id).toBe(true);
    }
  });

  it("scores one verdict per option on every seeded answer", () => {
    const byId = new Map(
      [...SELF_QUESTIONS, ...INBOUND_QUESTIONS].map((q) => [q.id, q]),
    );
    for (const answer of [...SELF_ANSWERS, ...PUBLIC_ANSWERS]) {
      const question = byId.get(answer.questionId)!;
      expect(answer.verdicts.length, answer.id).toBe(question.options.length);
      expect(answer.pick, answer.id).toBeLessThan(question.options.length);
    }
  });
});
