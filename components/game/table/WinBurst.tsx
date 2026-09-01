"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { wobbleOf } from "@/lib/motion/jitter";

/**
 * Particles, held back for hands that deserve them.
 *
 * A table that throws confetti at a twenty dollar win has nothing left for a
 * hand that matters. This is a short scatter of brass motes thrown out from the
 * cards and gone inside a second and a half, and it is only ever mounted for a
 * blackjack or a genuinely large pot.
 */
export function WinBurst({
  active,
  /** Seed, so two hands on screen do not throw identical patterns. */
  seed,
  count = 16,
}: {
  active: boolean;
  seed: string;
  count?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  const motes = Array.from({ length: count }, (_, index) => {
    const key = `${seed}:${index}`;
    /* Thrown wide and flat rather than in a circle, because the cards are
       wider than they are tall and the scatter should follow them. */
    const angle = (index / count) * Math.PI * 2 + wobbleOf(key, "a") * 0.4;
    const reach = 46 + wobbleOf(key, "r") * 26;
    return {
      key,
      x: Math.cos(angle) * reach * 1.5,
      y: Math.sin(angle) * reach * 0.72,
      size: 2 + Math.abs(wobbleOf(key, "s")) * 2.4,
      delay: Math.abs(wobbleOf(key, "d")) * 0.16,
      life: DURATION.celebrate * (0.55 + Math.abs(wobbleOf(key, "l")) * 0.4),
    };
  });

  return (
    <AnimatePresence>
      {active ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          {motes.map((mote) => (
            <motion.span
              key={mote.key}
              className="absolute rounded-full"
              style={{
                width: mote.size,
                height: mote.size,
                background: "var(--color-brass)",
                boxShadow: "0 0 6px 1px rgba(201,167,94,0.55)",
              }}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                x: mote.x,
                /* They rise, slow, and fall, which is the only part of this
                   that stops it looking like a screensaver. */
                y: [0, mote.y - 14, mote.y + 16],
                scale: [0.4, 1, 0.6],
              }}
              exit={{ opacity: 0 }}
              transition={{
                delay: mote.delay,
                duration: mote.life,
                ease: EASE.arrive,
                opacity: { delay: mote.delay, duration: mote.life, times: [0, 0.22, 1] },
                y: { delay: mote.delay, duration: mote.life, times: [0, 0.44, 1], ease: EASE.drift },
              }}
            />
          ))}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
