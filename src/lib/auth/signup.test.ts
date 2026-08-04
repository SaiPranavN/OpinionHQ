import { describe, expect, it } from "vitest";

import {
  CODE_LENGTH,
  MAX_CODE_ATTEMPTS,
  MIN_AGE,
  MIN_PASSWORD_LENGTH,
  ageOn,
  checkCode,
  hasErrors,
  newVerificationCode,
  shouldAutoSubmit,
  passwordsMatch,
  scorePassword,
  stepPosition,
  validateDetails,
} from "@/lib/auth/signup";

const TODAY = new Date("2026-08-04T12:00:00");

describe("verification codes", () => {
  it("is always the stated length, including when the number is small", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = newVerificationCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[0-9]+$/);
    }
  });

  it("accepts the right code", () => {
    expect(checkCode("483920", "483920", 0)).toEqual({ ok: true });
  });

  it("will not accept a partial code as correct", () => {
    const verdict = checkCode("4839", "483920", 0);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe("incomplete");
  });

  it("counts down the attempts left", () => {
    const verdict = checkCode("000000", "483920", 0);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.message).toContain(`${MAX_CODE_ATTEMPTS - 1}`);
  });

  it("stops accepting anything once the attempts are spent", () => {
    // The rule that keeps a six-digit code from being brute-forced in a loop.
    const verdict = checkCode("483920", "483920", MAX_CODE_ATTEMPTS);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe("exhausted");
  });
});

describe("auto-submit", () => {
  it("fires when the last box is filled", () => {
    expect(shouldAutoSubmit("48392", "483920", 6)).toBe(true);
  });

  it("does not fire while a full code is being corrected", () => {
    // The bug this exists for: the field never stops being six long while you
    // fix a mistyped digit, so submitting on "is full" spends an attempt per
    // keystroke and five corrections lock you out of your own verification.
    expect(shouldAutoSubmit("483920", "483921", 6)).toBe(false);
  });

  it("fires again after a digit is cleared and retyped", () => {
    expect(shouldAutoSubmit("48392", "483921", 6)).toBe(true);
  });

  it("never fires on an incomplete code", () => {
    expect(shouldAutoSubmit("4839", "48392", 6)).toBe(false);
  });
});

describe("password strength", () => {
  it("rejects anything under the length floor", () => {
    const weak = scorePassword("Ab1!x");
    expect(weak.ok).toBe(false);
    expect(weak.hints[0]).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("accepts a long passphrase with no symbols at all", () => {
    // Length beats composition. A rule that rejected this while accepting
    // "P@ss1!" would be teaching people to write worse passwords.
    const phrase = scorePassword("correct horse battery staple");
    expect(phrase.ok).toBe(true);
    expect(phrase.score).toBeGreaterThanOrEqual(3);
  });

  it("rejects the obvious ones however long they are", () => {
    for (const common of ["password123", "qwertyuiop", "1234567890", "opinionhq"]) {
      const scored = scorePassword(common);
      expect(scored.ok, common).toBe(false);
      expect(scored.score, common).toBeLessThanOrEqual(1);
    }
  });

  it("is case-insensitive about the common list", () => {
    expect(scorePassword("PassWord123").ok).toBe(false);
  });

  it("nudges towards variety without demanding it", () => {
    const plain = scorePassword("aaaaaaaaaaaa");
    expect(plain.ok).toBe(true);
    expect(plain.hints.join(" ")).toContain("number");
  });

  it("reserves the top score for length and variety together", () => {
    expect(scorePassword("Tr0ubador&3xyz!").score).toBe(4);
  });
});

describe("password confirmation", () => {
  it("asks for the second copy before comparing", () => {
    expect(passwordsMatch("a-good-long-one", "")).toContain("second time");
  });

  it("catches a mismatch", () => {
    expect(passwordsMatch("a-good-long-one", "a-good-long-two")).toContain("do not match");
  });

  it("passes when they agree", () => {
    expect(passwordsMatch("a-good-long-one", "a-good-long-one")).toBeNull();
  });
});

describe("age", () => {
  it("counts a birthday that has not happened yet as the younger age", () => {
    expect(ageOn("2000-12-25", TODAY)).toBe(25);
    expect(ageOn("2000-01-25", TODAY)).toBe(26);
  });

  it("handles the birthday itself", () => {
    expect(ageOn("2000-08-04", TODAY)).toBe(26);
  });

  it("returns null on nonsense", () => {
    expect(ageOn("not-a-date", TODAY)).toBeNull();
  });
});

describe("details", () => {
  const complete = {
    dob: "1998-04-12",
    mobile: "+91 9876543210",
    occupation: "Working professional",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
  };

  it("accepts a complete set", () => {
    expect(hasErrors(validateDetails(complete, TODAY))).toBe(false);
  });

  it("requires every field — none of them are optional any more", () => {
    // The point of the change: an optional demographic field produces a chart
    // drawn from whoever felt like answering, which looks like a measurement
    // and is a self-selected sample.
    const errors = validateDetails({}, TODAY);
    expect(Object.keys(errors).sort()).toEqual([
      "city",
      "country",
      "dob",
      "mobile",
      "occupation",
      "state",
    ]);
  });

  it("refuses an account below the age floor", () => {
    const tooYoung = { ...complete, dob: "2020-01-01" };
    expect(validateDetails(tooYoung, TODAY).dob).toContain(String(MIN_AGE));
  });

  it("refuses a date in the future", () => {
    expect(validateDetails({ ...complete, dob: "2030-01-01" }, TODAY).dob).toContain("future");
  });

  it("refuses an implausible year", () => {
    expect(validateDetails({ ...complete, dob: "1850-01-01" }, TODAY).dob).toContain("120");
  });

  it("accepts international phone shapes", () => {
    for (const mobile of ["+91 9876543210", "9876543210", "+1 555-0100", "+44 20 7946 0958"]) {
      expect(validateDetails({ ...complete, mobile }, TODAY).mobile, mobile).toBeUndefined();
    }
  });

  it("rejects a phone number with letters in it", () => {
    expect(validateDetails({ ...complete, mobile: "call me" }, TODAY).mobile).toBeDefined();
  });

  it("treats whitespace as empty", () => {
    expect(validateDetails({ ...complete, city: "   " }, TODAY).city).toBeDefined();
  });
});

describe("step position", () => {
  it("counts four steps on the credential path", () => {
    expect(stepPosition("account", false)).toEqual({ index: 1, total: 4 });
    expect(stepPosition("details", false)).toEqual({ index: 4, total: 4 });
  });

  it("counts two on the Google path", () => {
    // An OAuth address arrives verified and there is no password to set, so
    // showing a four-step bar with two crossed out would be theatre.
    expect(stepPosition("account", true)).toEqual({ index: 1, total: 2 });
    expect(stepPosition("details", true)).toEqual({ index: 2, total: 2 });
  });
});
