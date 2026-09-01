"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/**
 * How long a seat has left.
 *
 * This is only drawn where there is a real deadline to draw. The opponents at
 * this table take a genuine amount of time to decide, and the ring is that
 * amount of time; the human is never on a clock, so the human never gets a
 * ring. A countdown that is not counting down to anything is worse than no
 * countdown, because the next one you show will not be believed either.
 *
 * The ring is a stroked circle whose dash offset is driven from full to empty
 * once, from wherever in the interval the component happens to mount — which
 * matters, because a seat can be re-rendered halfway through a decision.
 */
export function TurnRing({
  /** Wall clock time, in milliseconds, when the decision is due. */
  endsAt,
  /** Wall clock time the decision started, for working out the fraction left. */
  startedAt,
  className,
}: {
  endsAt: number;
  startedAt: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  /* Read once, when the ring appears. The caller keys this on the deadline, so
     a new decision is a new ring rather than this one being asked to restart. */
  const [span] = useState(() => {
    const total = Math.max(1, endsAt - startedAt);
    const left = endsAt - Date.now();
    return left <= 0 ? null : { from: left / total, duration: left / 1000 };
  });

  if (!span || reduced) return null;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full -rotate-90", className)}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(201,167,94,0.14)"
        strokeWidth="1.6"
      />
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(201,167,94,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference * (1 - span.from) }}
        animate={{ strokeDashoffset: circumference }}
        /* Linear, and the one place in the product that is. A clock that eases
           is not telling you the time. */
        transition={{ duration: span.duration, ease: "linear" }}
      />
    </svg>
  );
}
