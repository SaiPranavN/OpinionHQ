/**
 * Layer 1 — the animated dark mesh gradient.
 *
 * Three or four soft radial fields, each drifting on its own long period. They
 * are the only thing on the page allowed to carry colour at scale, and they
 * carry very little of it: peak alpha is 16%, over a near-black page, behind a
 * vignette. What a reader should perceive is depth and a slow change of
 * weather, not a gradient.
 *
 * Blurred at source rather than with `filter: blur()`. A filter on a
 * full-viewport element re-rasterises the layer every frame it moves; a
 * radial-gradient with a soft stop is free once painted and only ever
 * transformed afterwards.
 */

import { ALPHA, DURATION, PARALLAX, type MeshBlob } from "@/lib/motion/config";

interface MeshGradientLayerProps {
  blobs: MeshBlob[];
  /** Static renders the same composition with no keyframes attached. */
  animate: boolean;
  /** Pointer pull, desktop only. */
  parallax: boolean;
}

export function MeshGradientLayer({
  blobs,
  animate,
  parallax,
}: MeshGradientLayerProps) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={
        parallax
          ? {
              // Both pulls in one transform so the layer keeps a single
              // compositing context. `--ohq-px/py` are written by the pointer
              // loop; `--ohq-scroll` by the scroll loop. Missing values fall
              // back to 0 via the `calc` defaults set on the host.
              transform: `translate3d(calc(var(--ohq-px, 0) * ${PARALLAX.cursorMesh}px), calc(var(--ohq-py, 0) * ${PARALLAX.cursorMesh}px + var(--ohq-scroll, 0) * ${PARALLAX.mesh}px), 0)`,
              willChange: "transform",
            }
          : undefined
      }
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            width: `${blob.size}vmax`,
            height: `${blob.size}vmax`,
            // Positioned by its centre, so the config reads as "where the
            // light is" rather than "where the box starts".
            marginLeft: `${-blob.size / 2}vmax`,
            marginTop: `${-blob.size / 2}vmax`,
            background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, ${blob.color} ${(
              Math.min(blob.alpha, ALPHA.meshMax) * 100
            ).toFixed(1)}%, transparent), transparent 68%)`,
            animation: animate
              ? `ohq-aurora-${"abcd"[blob.drift % 4]} ${
                  DURATION.mesh[blob.drift % DURATION.mesh.length]
                }s ease-in-out infinite`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
