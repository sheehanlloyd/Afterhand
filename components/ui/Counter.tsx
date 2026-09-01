"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

/**
 * A number that travels to its new value instead of being replaced by it.
 *
 * A bankroll that snaps from 1,000 to 1,150 tells you the number changed. One
 * that runs up to 1,150 tells you that you won, which is the thing you actually
 * wanted to know, and it does it in the same beat as the chips arriving.
 */
export function Counter({
  value,
  format = (n) => String(Math.round(n)),
  duration = DURATION.reveal,
  className,
  /** Held back until the chips that caused the change have landed. */
  delay = 0,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const current = useMotionValue(value);
  const text = useTransform(current, (n) => format(n));

  useEffect(() => {
    if (reduced) {
      current.set(value);
      return;
    }
    const controls = animate(current, value, {
      duration,
      delay,
      ease: EASE.arrive,
    });
    return () => controls.stop();
  }, [value, duration, delay, reduced, current]);

  return (
    <motion.span className={cn("tabular", className)} aria-label={format(value)}>
      {text}
    </motion.span>
  );
}
