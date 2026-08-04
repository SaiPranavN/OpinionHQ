import { describe, expect, it } from "vitest";

import {
  ALPHA,
  DENSITY,
  deviceTierFor,
  resolveLayers,
  VARIANTS,
  variantForPath,
  type AmbientVariant,
} from "@/lib/motion/config";
import { contourBands, contourPath } from "@/lib/motion/contours";

const VARIANT_IDS = Object.keys(VARIANTS) as AmbientVariant[];

describe("route → variant", () => {
  it("gives each public section its own personality", () => {
    expect(variantForPath("/")).toBe("landing");
    expect(variantForPath("/topics")).toBe("topics");
    expect(variantForPath("/topics/kalki2")).toBe("topics");
    expect(variantForPath("/polls")).toBe("polls");
    expect(variantForPath("/polls/work-setup")).toBe("polls");
    expect(variantForPath("/ask")).toBe("ask");
    expect(variantForPath("/ask/questions/q-offer")).toBe("ask");
  });

  it("treats composers and verification as internal, not as their section", () => {
    // These are forms. They get the quiet variant — and the faint grid — even
    // though their path would otherwise claim a public personality.
    expect(variantForPath("/topics/new")).toBe("minimal");
    expect(variantForPath("/polls/new")).toBe("minimal");
    expect(variantForPath("/ask/new")).toBe("minimal");
    expect(variantForPath("/ask/verify")).toBe("minimal");
    expect(variantForPath("/admin/anything")).toBe("minimal");
  });

  it("falls back rather than throwing on an unknown route", () => {
    expect(VARIANT_IDS).toContain(variantForPath("/nonsense"));
  });
});

describe("device tiers", () => {
  it("splits at the layout breakpoints", () => {
    expect(deviceTierFor(375)).toBe("mobile");
    expect(deviceTierFor(767)).toBe("mobile");
    expect(deviceTierFor(768)).toBe("tablet");
    expect(deviceTierFor(1179)).toBe("tablet");
    expect(deviceTierFor(1280)).toBe("desktop");
  });

  it("reduces density monotonically as the device shrinks", () => {
    expect(DENSITY.desktop.count).toBeGreaterThan(DENSITY.tablet.count);
    expect(DENSITY.tablet.count).toBeGreaterThan(DENSITY.mobile.count);
    expect(DENSITY.desktop.maxLinks).toBeGreaterThan(DENSITY.mobile.maxLinks);
  });
});

describe("reduced motion", () => {
  it("stops everything, on every variant and every device", () => {
    for (const variant of VARIANT_IDS) {
      for (const device of ["mobile", "tablet", "desktop"] as const) {
        const layers = resolveLayers({
          variant,
          motion: "reduced",
          device,
          pointerFine: true,
        });
        expect(layers.variant, variant).toBe("static");
        expect(layers.meshAnimates, variant).toBe(false);
        expect(layers.contoursAnimate, variant).toBe(false);
        expect(layers.nodes, variant).toBe(false);
        expect(layers.cursor, variant).toBe(false);
        expect(layers.parallax, variant).toBe(false);
      }
    }
  });

  it("still paints a background — colour and contours remain", () => {
    // The promise is stillness, not blankness. A reduced-motion visitor gets
    // the same page, holding its breath.
    const still = VARIANTS.static;
    expect(still.mesh.length).toBeGreaterThan(0);
    expect(still.contours).toBeGreaterThan(0);
  });
});

describe("mobile budget", () => {
  it("drops the canvas, parallax and pointer work but keeps the gradient", () => {
    const layers = resolveLayers({
      variant: "landing",
      motion: "full",
      device: "mobile",
      pointerFine: true,
    });
    expect(layers.nodes).toBe(false);
    expect(layers.cursor).toBe(false);
    expect(layers.parallax).toBe(false);
    expect(layers.contoursAnimate).toBe(false);
    expect(layers.meshAnimates).toBe(true);
  });

  it("never runs pointer effects without a fine pointer", () => {
    for (const variant of VARIANT_IDS) {
      const layers = resolveLayers({
        variant,
        motion: "full",
        device: "desktop",
        pointerFine: false,
      });
      expect(layers.cursor, variant).toBe(false);
    }
  });
});

describe("variant intent", () => {
  it("keeps the square grid off every public page", () => {
    // The whole point of the redesign: the grid survives only where a page is
    // a form, and never where a visitor is reading.
    for (const variant of ["landing", "topics", "polls", "ask"] as const) {
      expect(VARIANTS[variant].grid, variant).toBeFalsy();
    }
    expect(VARIANTS.minimal.grid).toBe(true);
  });

  it("puts no negative sentiment anywhere in Ask Verified", () => {
    // A private guidance screen must never carry a sentiment signal, and red
    // is the one colour that would read as one.
    expect(VARIANTS.ask.tones.negative).toBeUndefined();
    const hasRed = VARIANTS.ask.mesh.some((b) => b.color.includes("negative"));
    expect(hasRed).toBe(false);
  });

  it("makes Ask Verified the calmest field and the landing page the richest", () => {
    expect(VARIANTS.ask.nodeScale).toBeLessThan(VARIANTS.landing.nodeScale);
    expect(VARIANTS.ask.contours).toBeLessThan(VARIANTS.landing.contours);
    expect(VARIANTS.ask.enclosed).toBe(true);
  });

  it("gives Polls two opposing fields", () => {
    expect(VARIANTS.polls.opposing).toBe(true);
    const xs = VARIANTS.polls.mesh.map((b) => b.x);
    expect(Math.min(...xs)).toBeLessThan(20);
    expect(Math.max(...xs)).toBeGreaterThan(80);
  });

  it("keeps red rare wherever it appears at all", () => {
    for (const variant of VARIANT_IDS) {
      const tones = VARIANTS[variant].tones;
      const negative = tones.negative ?? 0;
      if (negative === 0) continue;
      const total = Object.values(tones).reduce((s, w) => s + (w ?? 0), 0);
      // A field where one dot in six is red stops reading as an accent and
      // starts reading as an alarm.
      expect(negative / total, variant).toBeLessThan(0.18);
    }
  });

  it("keeps every ambient alpha below the point it would compete with text", () => {
    expect(ALPHA.meshMax).toBeLessThanOrEqual(0.2);
    expect(ALPHA.contourLine).toBeLessThanOrEqual(0.08);
    expect(ALPHA.link).toBeLessThanOrEqual(0.2);
    expect(ALPHA.cursorGlow).toBeLessThanOrEqual(0.08);
    for (const variant of VARIANT_IDS) {
      for (const blob of VARIANTS[variant].mesh) {
        expect(blob.alpha, variant).toBeLessThanOrEqual(ALPHA.meshMax);
      }
    }
  });
});

describe("contour geometry", () => {
  it("is deterministic, so the server and client agree", () => {
    // Any randomness here is a hydration mismatch waiting to happen: the
    // paths are server-rendered and must survive being generated twice.
    expect(contourPath(3, 7)).toBe(contourPath(3, 7));
    expect(contourBands(6).map((b) => b.d)).toEqual(
      contourBands(6).map((b) => b.d),
    );
  });

  it("produces a distinct path per band", () => {
    const ds = contourBands(7).map((b) => b.d);
    expect(new Set(ds).size).toBe(ds.length);
  });

  it("draws the middle bands faintest, where the content column sits", () => {
    const bands = contourBands(7);
    const middle = bands[3]!;
    expect(middle.weight).toBeLessThan(bands[0]!.weight);
    expect(middle.weight).toBeLessThan(bands[6]!.weight);
  });

  it("returns nothing rather than throwing when a variant disables it", () => {
    expect(contourBands(0)).toEqual([]);
    expect(contourBands(-1)).toEqual([]);
  });

  it("emits a parseable path with no NaN", () => {
    for (const band of contourBands(7)) {
      expect(band.d.startsWith("M")).toBe(true);
      expect(band.d).not.toContain("NaN");
    }
  });
});
