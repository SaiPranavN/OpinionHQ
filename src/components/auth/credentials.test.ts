import { describe, expect, it } from "vitest";

// Imported from `lib`, not from the components that render them. `SignInView`
// now reaches a server action, and a test that pulls one in fails on
// `server-only` before it asserts anything.
import { MIN_PASSWORD, checkPassword, nameFrom, readIdentifier } from "@/lib/auth/identifier";
import { safeNext } from "@/lib/auth/redirect";

describe("readIdentifier", () => {
  it("reads an address as an address", () => {
    const read = readIdentifier("  pranav.sai@gmail.com ");
    expect(read).toEqual({
      identifier: "pranav.sai@gmail.com",
      email: "pranav.sai@gmail.com",
      username: "",
    });
  });

  it("reads anything without an @ as a username", () => {
    expect(readIdentifier("pranav_sai")).toEqual({
      identifier: "pranav_sai",
      email: "",
      username: "pranav_sai",
    });
  });

  it("never sets both", () => {
    for (const raw of ["someone@example.com", "someone"]) {
      const read = readIdentifier(raw);
      expect("error" in read).toBe(false);
      if ("error" in read) continue;
      expect(Boolean(read.email) && Boolean(read.username)).toBe(false);
    }
  });

  it("rejects a malformed address rather than treating it as a username", () => {
    // The @ is the whole rule. Falling back to "username" here would accept
    // "me@" and then sign somebody in under a name they did not choose.
    expect(readIdentifier("me@")).toHaveProperty("error");
    expect(readIdentifier("me@nowhere")).toHaveProperty("error");
  });

  it("rejects an empty identifier", () => {
    expect(readIdentifier("   ")).toHaveProperty("error");
  });

  it("rejects a username that is too short or has spaces", () => {
    expect(readIdentifier("ab")).toHaveProperty("error");
    expect(readIdentifier("two words")).toHaveProperty("error");
  });
});

describe("checkPassword", () => {
  it("accepts anything long enough", () => {
    expect(checkPassword("a".repeat(MIN_PASSWORD))).toBeNull();
  });

  it("rejects anything shorter", () => {
    expect(checkPassword("a".repeat(MIN_PASSWORD - 1))).toContain(String(MIN_PASSWORD));
  });
});

describe("nameFrom", () => {
  it("tidies an address local part", () => {
    expect(nameFrom({ identifier: "x", email: "pranav.sai@gmail.com", username: "" })).toBe(
      "Pranav Sai",
    );
  });

  it("tidies a username", () => {
    expect(nameFrom({ identifier: "x", email: "", username: "pranav_sai" })).toBe("Pranav Sai");
  });

  it("falls back rather than producing an empty label", () => {
    expect(nameFrom({ identifier: "", email: "", username: "" })).toBe("You");
  });
});

describe("safeNext", () => {
  it("keeps a same-site path", () => {
    expect(safeNext("/polls/chai-coffee")).toBe("/polls/chai-coffee");
  });

  it("refuses anything that could leave the site", () => {
    // `?next=` is attacker-controlled by definition. Each of these would be an
    // open redirect if honoured.
    for (const hostile of [
      "https://example.com",
      "//example.com",
      "http://example.com/x",
      "javascript:alert(1)",
      "example.com",
    ]) {
      expect(safeNext(hostile), hostile).toBe("/topics");
    }
  });

  it("falls back when absent", () => {
    expect(safeNext(null)).toBe("/topics");
  });
});
