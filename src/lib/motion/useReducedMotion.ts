"use client";

/**
 * `prefers-reduced-motion`, as a boolean that tracks changes.
 *
 * Starts `true` — the conservative answer — for the same reason
 * `useAmbientMotion` starts at its most restrictive tier: the server has no
 * media queries, so anything that assumes motion is allowed before the first
 * effect runs will both mismatch hydration and briefly animate at somebody who
 * asked for stillness. Widening after mount is safe; narrowing is not.
 *
 * A hook rather than the copy of this effect that had accumulated in
 * SearchField, RotatingHeadline and SubjectTicker, because the components that
 * still need it now share one primitive and the listener belongs with it.
 */

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}
