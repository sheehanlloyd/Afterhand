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
  /**
   * The figure counts in whole units when it is heading for a whole number.
   *
   * The value passing through the animation is a plain interpolation, so a pot
   * being swept from $690 to nothing spent the whole count reading things like
   * "$690.60": `formatMoney` shows two decimals for anything that is not an
   * integer, and every intermediate frame is a fraction. Cents that appear only
   * while a number is moving are noise, and on a money table they read as an
   * error.
   *
   * The target's own precision decides it, so a bankroll that genuinely holds
   * $1,007.50 after a three to two blackjack still counts through cents.
   */
  const step = Number.isInteger(value) ? 1 : 100;
  const text = useTransform(current, (n) => format(Math.round(n * step) / step));

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
