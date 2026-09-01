"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SPRING } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

/**
 * The camera.
 *
 * A table shot from a locked off tripod for an hour is the reason a lot of card
 * games feel like spreadsheets. This moves, but only by two or three per cent,
 * and slowly enough that it registers as attention rather than as motion. If
 * you can see the camera working, the numbers below are too big.
 */
export type CameraFocus = "wide" | "player" | "dealer" | "centre" | "result";

const SHOTS: Record<CameraFocus, { scale: number; y: string }> = {
  /* Everything on the felt, nothing emphasised. */
  wide: { scale: 1, y: "0%" },
  /* A small push down towards the seat that has the decision. */
  player: { scale: 1.03, y: "-1.1%" },
  /* And back up towards the dealer when the hole card comes over. */
  dealer: { scale: 1.025, y: "1.3%" },
  /* Into the middle, for the pot and for an all in. */
  centre: { scale: 1.04, y: "0%" },
  /* Pulled back a hair as the hand resolves and the chips move. */
  result: { scale: 0.992, y: "0%" },
};

export function TableCamera({
  focus,
  children,
  className,
}: {
  focus: CameraFocus;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const shot = SHOTS[focus];

  return (
    <motion.div
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      animate={reduced ? { scale: 1, y: "0%" } : shot}
      transition={SPRING.camera}
      style={{ transformOrigin: "50% 50%", willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}
