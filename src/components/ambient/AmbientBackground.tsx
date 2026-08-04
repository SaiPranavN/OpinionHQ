"use client";

/**
 * The ambient background system.
 *
 * One component, mounted once in the root layout, that composes four layers
 * and decides how much of each a given page and device may have:
 *
 *   1  MeshGradientLayer   slow dark colour fields
 *   2  ContourField        organic bands — what replaced the square grid
 *   3  OpinionNodeField    sparse signals and the links between them
 *   4  CursorGlow          a trailing light, desktop pointers only
 *
 * There is deliberately no way for a page to render its own background. A
 * second implementation is how two pages end up with different weather, and
 * the point of the system is that OpinionHQ feels like one place.
 *
 * Variant is derived from the route rather than passed as a prop, so adding a
 * page needs no wiring and no page file imports anything from here.
 */

import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";

import { ContourField } from "@/components/ambient/ContourField";
import { CursorGlow } from "@/components/ambient/CursorGlow";
import { MeshGradientLayer } from "@/components/ambient/MeshGradientLayer";
import { OpinionNodeField } from "@/components/ambient/OpinionNodeField";
import {
  useAmbientMotion,
  usePointerVars,
  useScrollVar,
} from "@/components/ambient/useAmbientMotion";
import {
  resolveLayers,
  VARIANTS,
  variantForPath,
  type AmbientVariant,
} from "@/lib/motion/config";

interface AmbientBackgroundProps {
  /** Overrides the route-derived variant. Mainly for review and testing. */
  variant?: AmbientVariant;
}

export function AmbientBackground({ variant }: AmbientBackgroundProps) {
  const pathname = usePathname();
  const hostRef = useRef<HTMLDivElement>(null);
  const { motion, device, visible, ready, pointerFine } = useAmbientMotion();

  // Every "how much runs" decision lives in one pure function so it can be
  // tested without mounting React — see resolveLayers in lib/motion/config.
  const layers = resolveLayers({
    variant: variant ?? variantForPath(pathname ?? "/"),
    motion,
    device,
    pointerFine,
  });
  const config = VARIANTS[layers.variant];

  const pointer = usePointerVars(hostRef, layers.cursor);
  useScrollVar(hostRef, layers.parallax);

  // Config objects are stable per variant, but the node field takes one as a
  // dependency; memoising keeps a re-render from tearing down the canvas.
  const nodeConfig = useMemo(() => config, [config]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      // `-z-10` puts this behind content but above the canvas background. The
      // page colour lives on <html> — see the note in globals.css about why it
      // must not also live on <body>.
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink"
    >
      <MeshGradientLayer
        blobs={config.mesh}
        animate={layers.meshAnimates}
        parallax={layers.parallax}
      />

      <ContourField
        count={config.contours}
        animate={layers.contoursAnimate}
        parallax={layers.parallax}
        grid={config.grid}
      />

      {/* Canvas is client-only and never server-rendered: `ready` gates it so
          the first paint matches the server exactly and hydration is clean. */}
      {ready && layers.nodes ? (
        <OpinionNodeField
          config={nodeConfig}
          device={device}
          pointer={layers.cursor ? pointer : null}
          running={visible}
        />
      ) : null}

      {ready && layers.cursor ? <CursorGlow /> : null}

      {/* Vignette, always last. Keeps the corners from glowing and guarantees
          the contrast floor under content wherever a mesh field drifts. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 130% 90% at 50% 40%, transparent 52%, color-mix(in oklab, var(--color-ink) 72%, transparent) 100%)",
        }}
      />
    </div>
  );
}
