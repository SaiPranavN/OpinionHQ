"use client";

/**
 * Layers 3 and 4 — opinion nodes and the connections between them.
 *
 * Each dot is one signal. They sit still enough to read as individuals, drift
 * a few pixels around a fixed home rather than wandering, and occasionally
 * link to a neighbour for a few seconds before the link fades. That is the
 * whole metaphor: individual signals, briefly agreeing, forming something
 * collective and then dispersing.
 *
 * WHY CANVAS, when everything else here is CSS or SVG: connections are curves
 * between two moving points, redrawn every frame. There is no CSS expression
 * of that, and doing it with SVG would mean mutating dozens of `d` attributes
 * per frame — far more expensive than one `2d` context drawing forty circles
 * and seven quadratics. It is the only canvas in the system and it is capped,
 * paused when hidden, and never mounted at all under reduced motion.
 *
 * Nodes drift on sines of elapsed time rather than by integrating velocity.
 * Bounded by construction, so a node can never escape its cluster or pile up
 * in a corner over a long session, and identical on every frame rate.
 */

import { useEffect, useRef } from "react";

import {
  ALPHA,
  DENSITY,
  PARALLAX,
  TONE_COLOR,
  type DeviceTier,
  type NodeTone,
  type VariantConfig,
} from "@/lib/motion/config";

interface OpinionNodeFieldProps {
  config: VariantConfig;
  device: DeviceTier;
  /** Normalised pointer, -1..1 from viewport centre. Null disables the pull. */
  pointer: React.RefObject<{ x: number; y: number }> | null;
  /** Loops stop entirely when false. */
  running: boolean;
}

interface Node {
  /** Anchor. The node orbits this and never leaves its neighbourhood. */
  hx: number;
  hy: number;
  /** Orbit radii, in pixels — single digits, per the brief. */
  ax: number;
  ay: number;
  /** Orbit rate and phase. */
  fx: number;
  fy: number;
  px: number;
  py: number;
  r: number;
  tone: NodeTone;
  /** Pulse phase, so the field never breathes in unison. */
  pulse: number;
  /** -1 left field, +1 right field. Only meaningful when `opposing`. */
  side: number;
  /** Resolved once per theme, not per frame. */
  rgb: [number, number, number];
}

/** Deterministic PRNG. Same layout every mount, so it can be reasoned about. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Resolves a `var(--x)` reference to rgb by asking the document once. */
function resolveVar(css: string): [number, number, number] {
  const name = css.match(/var\((--[^)]+)\)/)?.[1];
  const raw = name
    ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    : css.trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : "";
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const nums = raw.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
  }
  return [160, 160, 160];
}

/** Expands the variant's tone weights into a sampling table. */
function tonePool(config: VariantConfig): NodeTone[] {
  const pool: NodeTone[] = [];
  for (const [tone, weight] of Object.entries(config.tones)) {
    for (let i = 0; i < (weight ?? 0); i++) pool.push(tone as NodeTone);
  }
  return pool.length > 0 ? pool : ["neutral"];
}

export function OpinionNodeField({
  config,
  device,
  pointer,
  running,
}: OpinionNodeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const budget = DENSITY[device];
    const count = Math.round(budget.count * config.nodeScale);
    if (count <= 0) return;

    let nodes: Node[] = [];
    let width = 0;
    let height = 0;
    const pool = tonePool(config);

    /** Places the field. Re-run on resize so density tracks the viewport. */
    const build = () => {
      // Capped at 2: a 3x device gains nothing visible from a field of dots
      // and triples the fill cost.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fixed seed: the field looks the same on every mount, so a layout that
      // reads well is not a lucky draw that a reload can take away.
      const rand = rng(20260801);
      nodes = Array.from({ length: count }, (_, i) => {
        let hx: number;
        let hy: number;
        let side = 0;

        if (config.opposing) {
          // Two fields, one per side. They reach most of the way to the centre
          // line — far enough that a link can span the gap, since a cross-side
          // link *is* the poll's argument, and a field where the two camps
          // never touch would just be two unrelated clouds.
          side = i % 2 === 0 ? -1 : 1;
          const edge = 0.05 + rand() * 0.42;
          hx = side < 0 ? edge * width : (1 - edge) * width;
          hy = (0.08 + rand() * 0.84) * height;
        } else if (config.enclosed) {
          // A soft disc rather than a rectangle: the field has a boundary, and
          // a bounded field is what "confidential" looks like in this grammar.
          const a = rand() * Math.PI * 2;
          const rad = Math.sqrt(rand()) * 0.36;
          hx = (0.5 + Math.cos(a) * rad) * width;
          hy = (0.5 + Math.sin(a) * rad * 1.15) * height;
        } else {
          hx = rand() * width;
          hy = rand() * height;
          // Thin the field through the middle, where the content column and the
          // headline live. Pushed outward rather than deleted, so the edges stay
          // populated and the count is honest.
          //
          // The corridor is per-device (see DENSITY): a desktop has margins to
          // push into, a phone does not, and pushing a phone's nodes out by a
          // fifth of a 390px viewport just lines them up against the bezels.
          const cx = hx / width - 0.5;
          if (Math.abs(cx) < budget.corridor) {
            hx += Math.sign(cx || 1) * budget.corridorPush * width;
          }
        }

        // In an opposing field the tone follows the side, so the left camp
        // reads green and the right purple. Sampling tone independently made
        // the two clouds identically speckled, which loses the whole point —
        // a poll is two positions, not one crowd split down the middle. Every
        // fifth node stays neutral: nobody's camp is unanimous.
        const tone: NodeTone = config.opposing
          ? i % 5 === 2
            ? "neutral"
            : side < 0
              ? "positive"
              : "poll"
          : (pool[Math.floor(rand() * pool.length)] ?? "neutral");
        return {
          hx,
          hy,
          ax: 3 + rand() * 5,
          ay: 3 + rand() * 5,
          fx: 0.05 + rand() * 0.07,
          fy: 0.04 + rand() * 0.07,
          px: rand() * Math.PI * 2,
          py: rand() * Math.PI * 2,
          r: (0.9 + rand() * 1.15) * budget.scale,
          tone,
          pulse: rand() * Math.PI * 2,
          side,
          rgb: resolveVar(TONE_COLOR[tone]),
        };
      });
    };

    /** Theme flips change every tone's colour; re-resolve rather than reload. */
    const recolour = () => {
      const cache = new Map<NodeTone, [number, number, number]>();
      for (const node of nodes) {
        let c = cache.get(node.tone);
        if (!c) {
          c = resolveVar(TONE_COLOR[node.tone]);
          cache.set(node.tone, c);
        }
        node.rgb = c;
      }
    };

    build();

    const start = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const t = (now - start) / 1000;

      ctx.clearRect(0, 0, width, height);

      const p = pointer?.current ?? { x: 0, y: 0 };
      // Pointer position in pixels, for the per-node proximity test.
      const pxPix = ((p.x + 1) / 2) * width;
      const pyPix = ((p.y + 1) / 2) * height;

      // Two opposing fields breathe toward the centre and back over ~40s. The
      // convergence is the poll: two positions leaning at each other, never
      // meeting. Amplitude is small enough that it reads as a tide.
      const converge = config.opposing ? Math.sin(t * 0.157) * 0.5 + 0.5 : 0;

      // Resolved positions, reused by the connection pass so the curves attach
      // to exactly where the dots were drawn.
      const xs = new Float32Array(nodes.length);
      const ys = new Float32Array(nodes.length);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        let x = n.hx + Math.sin(t * n.fx + n.px) * n.ax;
        let y = n.hy + Math.cos(t * n.fy + n.py) * n.ay;

        if (config.opposing) {
          x += -n.side * converge * width * 0.045;
        }

        if (pointer) {
          const dx = pxPix - x;
          const dy = pyPix - y;
          const d2 = dx * dx + dy * dy;
          const reach = 240;
          if (d2 < reach * reach && d2 > 1) {
            // A one-or-two pixel lean, never a magnet. The falloff is squared
            // so only the handful of nodes right under the cursor respond.
            const pull = (1 - Math.sqrt(d2) / reach) ** 2 * PARALLAX.cursorNodes;
            const d = Math.sqrt(d2);
            x += (dx / d) * pull;
            y += (dy / d) * pull;
          }
        }

        xs[i] = x;
        ys[i] = y;

        // Slow pulse. A full breath takes ~13s, which is under the threshold
        // at which the eye reads it as blinking.
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.48 + n.pulse);
        const alpha = ALPHA.nodeDim + (ALPHA.node - ALPHA.nodeDim) * pulse;
        const [r, g, b] = n.rgb;

        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.fill();
      }

      /*
       * Connections.
       *
       * Every close pair gets a slow oscillator of its own; a link is only
       * drawn while its oscillator is positive, which makes connections
       * appear, hold for a few seconds and dissolve rather than forming a
       * permanent lattice. The strongest few are kept and the rest dropped,
       * so the count is bounded no matter how the nodes happen to cluster —
       * this is what stops it looking like a neural-network diagram.
       */
      const candidates: { i: number; j: number; a: number }[] = [];
      const reach = budget.linkRadius;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          // In an opposing field, only cross-side links are interesting: a
          // link within one camp is not consensus, it is agreement.
          if (config.opposing && nodes[i]!.side === nodes[j]!.side) continue;
          const dx = xs[i]! - xs[j]!;
          const dy = ys[i]! - ys[j]!;
          const d2 = dx * dx + dy * dy;
          if (d2 > reach * reach) continue;

          const window_ = Math.sin(t * 0.085 + (i * 7 + j * 13) * 0.7);
          if (window_ <= 0) continue;

          const proximity = 1 - Math.sqrt(d2) / reach;
          candidates.push({ i, j, a: proximity * window_ });
        }
      }

      candidates.sort((m, n) => n.a - m.a);
      const links = Math.min(candidates.length, budget.maxLinks);
      for (let k = 0; k < links; k++) {
        const { i, j, a } = candidates[k]!;
        const x1 = xs[i]!;
        const y1 = ys[i]!;
        const x2 = xs[j]!;
        const y2 = ys[j]!;

        // Curved, not straight. A quadratic bowed perpendicular to the chord
        // keeps the network organic; straight lines between dots is the exact
        // cyberpunk-diagram look the brief rules out.
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const bow = 0.16;
        const cx = mx + (y2 - y1) * bow;
        const cy = my - (x2 - x1) * bow;

        const [r1, g1, b1] = nodes[i]!.rgb;
        const [r2, g2, b2] = nodes[j]!.rgb;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        const alpha = (a * ALPHA.link).toFixed(3);
        grad.addColorStop(0, `rgba(${r1},${g1},${b1},${alpha})`);
        grad.addColorStop(1, `rgba(${r2},${g2},${b2},${alpha})`);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.strokeStyle = grad;
        // Scaled with the dots, for the same reason: a sub-pixel hairline is
        // what a phone throws away first.
        ctx.lineWidth = 0.9 * budget.scale;
        ctx.stroke();
      }
    };

    frame = requestAnimationFrame(draw);

    let resizeFrame = 0;
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        build();
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    const themeWatcher = new MutationObserver(recolour);
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelAnimationFrame(frame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", onResize);
      themeWatcher.disconnect();
    };
    // `running` gates whether this effect exists at all: when the tab is
    // hidden the loop is torn down rather than left spinning on a throttled
    // timer, and remounts from scratch when the tab comes back.
  }, [config, device, pointer, running]);

  if (!running) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
      style={{
        transform: `translate3d(0, calc(var(--ohq-scroll, 0) * ${-PARALLAX.nodes}px), 0)`,
        willChange: "transform",
      }}
    />
  );
}
