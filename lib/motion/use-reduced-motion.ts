"use client";

import { useEffect, useState } from "react";

/**
 * The one place that asks the OS whether motion should be reduced.
 *
 * Framer Motion's `MotionConfig reducedMotion="user"` already gates every
 * `motion.*` component, and a blanket CSS rule in globals.css collapses plain
 * transitions/animations. Neither of those reaches code that has to make a
 * decision in JS before rendering anything animated at all (an SVG rebuilt
 * per frame, a `setTimeout` chain, a canvas draw). This hook is for that case.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}
