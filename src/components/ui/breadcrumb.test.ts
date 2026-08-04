import { describe, expect, it } from "vitest";

import { parentCrumb, type Crumb } from "@/components/ui/Breadcrumb";

/**
 * The back button's destination.
 *
 * Worth testing rather than eyeballing because the failure is silent: a trail
 * whose parent resolves to null renders no back button at all, and a page with
 * no way back is exactly the thing this was added to prevent.
 */
describe("back button target", () => {
  const trail = (...parts: [string, string?][]): Crumb[] =>
    parts.map(([label, href]) => (href ? { label, href } : { label }));

  it("points at the nearest linked ancestor", () => {
    const parent = parentCrumb(
      trail(["Home", "/"], ["Ask Verified", "/ask"], ["My questions"]),
    );
    expect(parent).toEqual({ label: "Ask Verified", href: "/ask" });
  });

  it("never points at the page you are already on", () => {
    // The last crumb is the current page. Linking back to it would be a
    // button that does nothing, which is worse than no button.
    const parent = parentCrumb(trail(["Home", "/"], ["Polls", "/polls"]));
    expect(parent?.href).toBe("/");
  });

  it("skips ancestors that are labels rather than links", () => {
    const parent = parentCrumb(
      trail(["Home", "/"], ["Explore", "/topics"], ["Entertainment"], ["Kalki 2898 AD"]),
    );
    expect(parent).toEqual({ label: "Explore", href: "/topics" });
  });

  it("returns nothing for a single-crumb trail", () => {
    expect(parentCrumb(trail(["Home", "/"]))).toBeNull();
    expect(parentCrumb([])).toBeNull();
  });

  it("handles a route with no browsable parent segment", () => {
    // `/ask/questions/[id]` has no `/ask/questions` page to strip back to.
    // Reading the parent off the declared trail rather than off the URL is
    // what makes that case ordinary instead of a special case.
    const parent = parentCrumb(
      trail(["Home", "/"], ["Ask Verified", "/ask"], ["Question"]),
    );
    expect(parent?.href).toBe("/ask");
  });
});
