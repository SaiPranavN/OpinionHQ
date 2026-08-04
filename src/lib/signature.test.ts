import { describe, expect, it } from "vitest";

import {
  canonicalTokens,
  checkPollDuplicate,
  NEAR_DUPLICATE,
  optionKey,
  pollSignature,
  pollSignatureParts,
  pollSimilarity,
  signPoll,
  type PollSignatureInput,
} from "@/lib/signature";
import { POLLS } from "@/lib/sample-data/polls";

const SIGNED = POLLS.map(signPoll);

const messiRonaldo: PollSignatureInput = {
  question: "Messi or Ronaldo?",
  options: [{ name: "Messi" }, { name: "Ronaldo" }],
  place: "worldwide",
};

describe("canonicalTokens", () => {
  it("drops punctuation, case and filler", () => {
    expect(canonicalTokens("Messi or Ronaldo?")).toEqual(["messi", "ronaldo"]);
    expect(canonicalTokens("  WHO is  genuinely BETTER — Messi, or Ronaldo?? ")).toEqual([
      "messi",
      "ronaldo",
    ]);
  });

  it("keeps numbers, because they are what distinguishes a model year", () => {
    expect(canonicalTokens("iPhone 18 Pro")).toEqual(["iphone", "18", "pro"]);
    expect(canonicalTokens("iPhone 17 Pro")).toEqual(["iphone", "17", "pro"]);
  });

  it("folds accents", () => {
    expect(canonicalTokens("Café")).toEqual(canonicalTokens("Cafe"));
  });

  it("folds plurals but not words that merely end in s", () => {
    expect(canonicalTokens("delivery fees")).toEqual(["delivery", "fee"]);
    expect(canonicalTokens("universities")).toEqual(["university"]);
    expect(canonicalTokens("chess")).toEqual(["chess"]);
  });

  it("leaves nothing behind when a question is entirely scaffolding", () => {
    expect(canonicalTokens("Which one would you pick?")).toEqual([]);
  });
});

describe("optionKey", () => {
  it("ignores word order inside an option name", () => {
    expect(optionKey("Old tax regime")).toBe(optionKey("Tax regime, old"));
  });

  it("separates genuinely different options", () => {
    expect(optionKey("Old regime")).not.toBe(optionKey("New regime"));
  });
});

describe("pollSignature", () => {
  it("is blind to the order the options were written in", () => {
    expect(
      pollSignature({
        question: "Ronaldo or Messi?",
        options: [{ name: "Ronaldo" }, { name: "Messi" }],
        place: "worldwide",
      }),
    ).toBe(pollSignature(messiRonaldo));
  });

  it("is blind to rewording that adds nothing", () => {
    const rephrasings = [
      "Who is better — Messi or Ronaldo?",
      "Messi vs Ronaldo",
      "messi or ronaldo",
      "The GOAT: Messi or Ronaldo?",
      "Which one would you pick, Ronaldo or Messi?",
    ];
    for (const question of rephrasings) {
      expect(
        pollSignature({ ...messiRonaldo, question }),
        question,
      ).toBe(pollSignature(messiRonaldo));
    }
  });

  it("keeps a question that asks something else apart", () => {
    // Same two people, different question. `captain` survives into the residue.
    const captain = pollSignature({
      ...messiRonaldo,
      question: "Who should captain the side, Messi or Ronaldo?",
    });
    expect(captain).not.toBe(pollSignature(messiRonaldo));
    expect(pollSignatureParts({
      ...messiRonaldo,
      question: "Who should captain the side, Messi or Ronaldo?",
    }).residue).toEqual(["captain"]);
  });

  it("keeps the same choice in two places apart", () => {
    expect(pollSignature({ ...messiRonaldo, place: "india" })).not.toBe(
      pollSignature(messiRonaldo),
    );
  });

  it("ignores the category, so mis-filing does not evade the check", () => {
    // Category is not an input at all — this asserts the shape of the key.
    expect(pollSignature(messiRonaldo).split("::")).toHaveLength(3);
    expect(pollSignature(messiRonaldo).startsWith("worldwide::")).toBe(true);
  });

  it("drops a repeated option rather than counting it twice", () => {
    expect(
      pollSignature({
        question: "Chai or chai?",
        options: [{ name: "Chai" }, { name: "chai " }],
        place: "india",
      }),
    ).toBe(
      pollSignature({ question: "Chai?", options: [{ name: "Chai" }], place: "india" }),
    );
  });
});

describe("the seeded catalog", () => {
  it("contains no two polls with the same signature", () => {
    const seen = new Map<string, string>();
    for (const poll of SIGNED) {
      const clash = seen.get(poll.parts.signature);
      expect(clash, `${poll.id} collides with ${clash}`).toBeUndefined();
      seen.set(poll.parts.signature, poll.id);
    }
  });

  it("gives every poll a non-empty option set", () => {
    for (const poll of SIGNED) {
      expect(poll.parts.optionKeys.length, poll.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("does not flag any seeded poll as a near-duplicate of another", () => {
    // The false-positive guard, and the reason `GENERIC_SCALES` exists: the six
    // approval polls all offer Approve/Disapprove, so by option set alone they
    // are indistinguishable. If this passes, publishing an approval poll about
    // a seventh person does not report the first six as duplicates.
    for (const a of SIGNED) {
      for (const b of SIGNED) {
        if (a.id === b.id) continue;
        expect(
          pollSimilarity(a.parts, b.parts),
          `${a.id} vs ${b.id}`,
        ).toBeLessThan(NEAR_DUPLICATE);
      }
    }
  });

  it("does not report any seeded poll as a duplicate of another", () => {
    for (const poll of SIGNED) {
      const others = SIGNED.filter((other) => other.id !== poll.id);
      const verdict = checkPollDuplicate(
        { question: poll.question, options: poll.parts.optionKeys.map((name) => ({ name })), place: poll.parts.place },
        others,
      );
      expect(verdict.kind, poll.id).not.toBe("duplicate");
    }
  });

  it("reports each seeded poll as a duplicate of itself", () => {
    // The other half of the guard: the rule has to actually fire.
    for (const poll of POLLS) {
      const verdict = checkPollDuplicate(poll, SIGNED);
      expect(verdict.kind, poll.id).toBe("duplicate");
      if (verdict.kind === "duplicate") expect(verdict.existing.id).toBe(poll.id);
    }
  });
});

describe("checkPollDuplicate", () => {
  it("refuses an exact re-post of an existing poll", () => {
    const verdict = checkPollDuplicate(
      {
        question: "Ronaldo or Messi — who is the GOAT?",
        options: [{ name: "Ronaldo" }, { name: "Messi" }],
        place: "worldwide",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("duplicate");
    if (verdict.kind === "duplicate") expect(verdict.existing.id).toBe("messi-ronaldo");
  });

  it("catches the flood case — one event, many phrasings", () => {
    // The scenario this exists for: a result drops and forty people file the
    // same head-to-head. Every one of these must land on the same poll.
    const floods = [
      "NEET UG or JEE Advanced — which is genuinely harder?",
      "Which is harder: JEE Advanced or NEET UG?",
      "NEET UG vs JEE Advanced (harder)?",
      "Guys, what do you think is harder — neet ug or jee advanced??",
    ];
    for (const question of floods) {
      const verdict = checkPollDuplicate(
        {
          question,
          options: [{ name: "NEET UG" }, { name: "JEE Advanced" }],
          place: "india",
        },
        SIGNED,
      );
      expect(verdict.kind, question).toBe("duplicate");
      if (verdict.kind === "duplicate") expect(verdict.existing.id).toBe("neet-jee");
    }
  });

  it("warns rather than blocks when the options overlap but the question differs", () => {
    const verdict = checkPollDuplicate(
      {
        question: "Chai, coffee, or neither?",
        options: [{ name: "Chai" }, { name: "Coffee" }, { name: "Neither" }],
        place: "india",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("near");
    if (verdict.kind === "near") {
      expect(verdict.matches[0]?.poll.id).toBe("chai-coffee");
      expect(verdict.matches[0]?.score).toBeGreaterThanOrEqual(NEAR_DUPLICATE);
    }
  });

  it("warns when the same choice is filed under a different place", () => {
    const verdict = checkPollDuplicate(
      {
        question: "Chai or coffee?",
        options: [{ name: "Chai" }, { name: "Coffee" }],
        place: "karnataka",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("near");
  });

  it("lets a genuinely new question through", () => {
    expect(
      checkPollDuplicate(
        {
          question: "Night trains or morning flights?",
          options: [{ name: "Night train" }, { name: "Morning flight" }],
          place: "india",
        },
        SIGNED,
      ).kind,
    ).toBe("unique");
  });

  it("does not block next year's model as last year's poll", () => {
    // It does raise it, and should: "there is already an iPhone-vs-Pixel poll,
    // is yours really a new generation?" is a question worth a glance. What it
    // must never do is refuse — the numbers survive into the option key
    // precisely so that two generations cannot be collapsed into one.
    const verdict = checkPollDuplicate(
      {
        question: "iPhone 19 Pro or Pixel 12 Pro?",
        options: [{ name: "iPhone 19 Pro" }, { name: "Pixel 12 Pro" }],
        place: "india",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("near");
    if (verdict.kind === "near") expect(verdict.matches[0]?.poll.id).toBe("iphone-pixel");
  });

  it("abstains on a draft with no usable options", () => {
    // Half-typed drafts must not all collide with each other and with every
    // other empty draft — the composer's own validation covers this case.
    expect(
      checkPollDuplicate({ question: "Anything?", options: [], place: "india" }, SIGNED).kind,
    ).toBe("unique");
  });

  it("recognises an option named at a different length", () => {
    // The seeded poll writes "Lionel Messi" and "Cristiano Ronaldo"; nobody
    // re-posting it will. Containment is what closes that gap.
    const verdict = checkPollDuplicate(messiRonaldo, SIGNED);
    expect(verdict.kind).toBe("duplicate");
    if (verdict.kind === "duplicate") expect(verdict.existing.id).toBe("messi-ronaldo");
  });

  it("does not treat one approval poll as a duplicate of another", () => {
    // Same options, same place, different subject. The question is the poll.
    const verdict = checkPollDuplicate(
      {
        question: "The Election Commission: approve or disapprove?",
        options: [{ name: "Approve" }, { name: "Disapprove" }],
        place: "india",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("unique");
  });

  it("still catches a re-post of the same approval poll", () => {
    const verdict = checkPollDuplicate(
      {
        question: "Do you approve of Narendra Modi as Prime Minister?",
        options: [{ name: "Approve" }, { name: "Disapprove" }],
        place: "india",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("duplicate");
    if (verdict.kind === "duplicate") expect(verdict.existing.id).toBe("approval-modi");
  });

  it("ranks the closest match first and shows at most three", () => {
    const verdict = checkPollDuplicate(
      {
        question: "Chai, coffee, or filter kaapi?",
        options: [{ name: "Chai" }, { name: "Coffee" }, { name: "Filter kaapi" }],
        place: "india",
      },
      SIGNED,
    );
    expect(verdict.kind).toBe("near");
    if (verdict.kind === "near") {
      expect(verdict.matches.length).toBeLessThanOrEqual(3);
      const scores = verdict.matches.map((m) => m.score);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    }
  });
});
