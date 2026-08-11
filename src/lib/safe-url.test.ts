import { describe, expect, it } from "vitest";

import { safeExternalUrl, urlHost } from "@/lib/safe-url";

/**
 * These are the cases that matter, and they are not hypothetical: the string
 * under test is typed by an editor into a form and rendered as an `href` for
 * every reader of the topic. Anything that survives this function executes or
 * navigates on somebody else's browser.
 */
describe("safeExternalUrl", () => {
  it("accepts ordinary http and https links", () => {
    expect(safeExternalUrl("https://thehindu.com/story")).toBe("https://thehindu.com/story");
    expect(safeExternalUrl("http://example.org/a?b=c")).toBe("http://example.org/a?b=c");
  });

  it("assumes https for a bare host, rather than dropping it", () => {
    // "thehindu.com/x" is a plausible thing to type. Without this it would be
    // parsed as a relative path and resolve against our own domain.
    expect(safeExternalUrl("thehindu.com/x")).toBe("https://thehindu.com/x");
  });

  it("refuses javascript:", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    // Whitespace and case are the classic bypasses for a naive check.
    expect(safeExternalUrl("  JavaScript:alert(1)")).toBeNull();
    expect(safeExternalUrl("java\nscript:alert(1)")).toBeNull();
  });

  it("refuses data: and other schemes", () => {
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeExternalUrl("file:///etc/passwd")).toBeNull();
    expect(safeExternalUrl("ftp://example.com")).toBeNull();
  });

  it("treats blank and missing input as no link", () => {
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl("   ")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it("does not let a scheme hide behind a fragment or userinfo", () => {
    // Parses as https with a username, which is safe but ugly; the point is it
    // is not silently treated as a javascript URL.
    const parsed = safeExternalUrl("https://user@example.com/x");
    expect(parsed).not.toBeNull();
    expect(parsed?.startsWith("https://")).toBe(true);
  });
});

describe("urlHost", () => {
  it("strips www so the label reads as the publisher", () => {
    expect(urlHost("https://www.thehindu.com/story")).toBe("thehindu.com");
    expect(urlHost("https://indianexpress.com/a/b")).toBe("indianexpress.com");
  });

  it("returns nothing for a link that was refused", () => {
    expect(urlHost("javascript:alert(1)")).toBeNull();
    expect(urlHost("")).toBeNull();
  });
});
