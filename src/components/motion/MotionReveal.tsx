/**
 * Typed wrapper over the scroll-reveal mechanism.
 *
 * The mechanism itself is unchanged and deliberately so: `RevealOnScroll`
 * already runs one IntersectionObserver for the whole page over `[data-reveal]`
 * elements, which is cheaper and simpler than a component per reveal. This is
 * the typed front door for it, so a caller writes `<MotionReveal delay={80}>`
 * instead of remembering two class names and an attribute.
 *
 * A server component: it emits markup and a class, and the existing client
 * observer releases it. Nothing here needs to run on the client.
 */

import type { ElementType, ReactNode } from "react";

interface MotionRevealProps {
  children: ReactNode;
  /** Stagger, in milliseconds. Kept under ~400ms across a group. */
  delay?: number;
  /** Element to render. Defaults to a div. */
  as?: ElementType;
  className?: string;
}

export function MotionReveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: MotionRevealProps) {
  return (
    <Tag
      data-reveal
      className={`ohq-reveal ${className}`}
      // Inline rather than a Tailwind arbitrary value: the delay is a runtime
      // number, and `delay-[${n}ms]` would not survive the class scanner.
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Stagger helper for a group of siblings.
 *
 * Caps the total so a long list never ends with a card arriving a second and
 * a half after the first — past roughly 400ms a stagger stops reading as
 * choreography and starts reading as a slow page.
 */
export function staggerDelay(index: number, step = 70, max = 420): number {
  return Math.min(index * step, max);
}
