"use client";

/**
 * Ambient drifting dots behind the hero. Generated on the client so the random
 * placement never mismatches server-rendered markup, and skipped entirely when
 * the visitor has asked for reduced motion.
 */

import { useEffect, useState } from "react";

interface Particle {
  left: string;
  top: string;
  size: string;
  color: string;
  opacity: number;
  duration: string;
  delay: string;
}

export function ParticleField({ count = 46 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setParticles(
      Array.from({ length: count }, () => {
        const size = 1 + Math.random() * 2.2;
        const green = Math.random() > 0.62;
        return {
          left: `${(Math.random() * 100).toFixed(2)}%`,
          top: `${(Math.random() * 100).toFixed(2)}%`,
          size: `${size.toFixed(1)}px`,
          color: green ? "rgba(29,185,84,0.55)" : "rgba(255,255,255,0.28)",
          opacity: Number((0.15 + Math.random() * 0.5).toFixed(2)),
          duration: `${(9 + Math.random() * 14).toFixed(1)}s`,
          delay: `${(Math.random() * 6).toFixed(1)}s`,
        };
      }),
    );
  }, [count]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            animation: `ohq-float ${p.duration} ease-in-out ${p.delay} infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
