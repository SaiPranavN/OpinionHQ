/**
 * What Pro gates, and — more importantly — what it does not.
 *
 * A pricing rule is the easiest thing in a product to break by accident,
 * because breaking it in the generous direction is invisible and breaking it in
 * the mean direction only shows up as somebody quietly leaving. These pin both
 * ends.
 */

import { describe, expect, it } from "vitest";

import {
  askAllowanceLine,
  canAsk,
  canBuildRich,
  freeAsksLeft,
  FREE_ASKS,
  PRO_PLAN,
} from "@/lib/entitlements";

describe("the free allowance", () => {
  it("gives every account two questions before asking for money", () => {
    expect(FREE_ASKS).toBe(2);
    expect(freeAsksLeft(0)).toBe(2);
    expect(freeAsksLeft(1)).toBe(1);
    expect(freeAsksLeft(2)).toBe(0);
  });

  it("never goes negative, however many were asked", () => {
    // A Pro account that asked forty questions and then cancelled must land on
    // zero, not on minus thirty-eight.
    expect(freeAsksLeft(40)).toBe(0);
    expect(freeAsksLeft(-3)).toBe(FREE_ASKS);
  });

  it("lets a free account ask until the allowance is spent", () => {
    expect(canAsk(false, 0)).toBe(true);
    expect(canAsk(false, 1)).toBe(true);
    expect(canAsk(false, 2)).toBe(false);
  });

  it("never stops a Pro account, whatever they have asked", () => {
    expect(canAsk(true, 0)).toBe(true);
    expect(canAsk(true, 500)).toBe(true);
  });

  it("says how many are left before they are gone", () => {
    // A limit you discover by hitting it feels like a trap; one you can see
    // coming is a price.
    expect(askAllowanceLine(false, 2)).toContain("2 of 2");
    expect(askAllowanceLine(false, 1)).toContain("1 of 2");
    expect(askAllowanceLine(false, 1)).toContain("question left");
    expect(askAllowanceLine(false, 0)).toContain("No free questions left");
    expect(askAllowanceLine(true, 99)).toContain("unlimited");
  });
});

describe("what stays free", () => {
  it("gates only the two paid actions", () => {
    // Reading, voting, replying, ordinary opinions and *answering* are not
    // represented here at all, and that absence is the point: gating the
    // supply side would starve the section the subscription funds.
    expect(canBuildRich(false)).toBe(false);
    expect(canBuildRich(true)).toBe(true);
  });

  it("says on the sheet what the free tier covers", () => {
    // A subscribe sheet that only lists what you are missing is selling the
    // fear. This one has to name the free tier, in the plan itself.
    //
    // IT USED TO REQUIRE "answering" AND THE FREE-ASK COUNT. Both described
    // Ask Verified, which is parked and not reachable in the product — so the
    // sheet listing them was advertising something nobody can use. The three
    // below are the free actions that actually exist.
    expect(PRO_PLAN.freeForever.length).toBeGreaterThanOrEqual(3);
    const text = PRO_PLAN.freeForever.join(" ").toLowerCase();
    expect(text).toContain("reading");
    expect(text).toContain("voting");
    expect(text).toContain("replying");
  });

  it("promises cancellation leaves published work alone", () => {
    // Retracting somebody's contributions because they stopped paying would
    // make the archive a function of the billing state.
    expect(PRO_PLAN.includes.join(" ").toLowerCase()).toContain("cancel any time");
  });
});
