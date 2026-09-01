"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion/tokens";
import { wobbleOf } from "@/lib/motion/jitter";
import { cn } from "@/lib/utils/cn";

/**
 * The people in the other seats.
 *
 * Drawn from the same parts as the dealer and deliberately smaller and quieter:
 * an avatar that moves as much as the dealer does would compete with the only
 * thing on the table that actually matters, which is where the cards are going.
 * So these breathe, and once in a while glance up, and otherwise sit still.
 *
 * Everything that varies between one seat and the next — build, colouring, the
 * phase of the breath — is derived from the player's id, so a given opponent
 * looks the same all session and different from the seat beside them without
 * anything being stored.
 */

/** Enough range to tell four people apart, none of it a caricature. */
const SKINS = ["#c19169", "#8d6242", "#dcb392", "#6f4a30", "#a97b52"];
const CLOTHES = ["#1d2b33", "#2c2430", "#22302a", "#332a22", "#26262e"];
const HAIRS = ["#1a1411", "#2e2119", "#4a3626", "#15161a", "#5c4a38"];

export type AvatarMood = "idle" | "thinking" | "folded" | "won";

function pick<T>(list: T[], seed: string, channel: string): T {
  const index = Math.floor(((wobbleOf(seed, channel) + 1) / 2) * list.length);
  return list[Math.min(list.length - 1, Math.max(0, index))];
}

export function PlayerAvatar({
  seed,
  mood = "idle",
  className,
}: {
  /** The player's id. Everything about their appearance comes from it. */
  seed: string;
  mood?: AvatarMood;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const skin = pick(SKINS, seed, "skin");
  const cloth = pick(CLOTHES, seed, "cloth");
  const hair = pick(HAIRS, seed, "hair");
  /* Nobody breathes in time with anybody else. */
  const period = 4.6 + wobbleOf(seed, "rate") * 1.1;
  const offset = (wobbleOf(seed, "phase") + 1) * 2.2;
  const wide = wobbleOf(seed, "build") * 2.4;

  /* Folding is the one time an avatar changes posture: they sit back. */
  const posture =
    mood === "folded"
      ? { y: 1.6, opacity: 0.45 }
      : mood === "thinking"
        ? { y: -0.8, opacity: 1 }
        : { y: 0, opacity: mood === "won" ? 1 : 0.92 };

  return (
    <motion.svg
      viewBox="0 0 64 52"
      aria-hidden="true"
      className={cn("block h-auto w-full", className)}
      animate={posture}
      transition={{ duration: 0.34, ease: EASE.arrive }}
    >
      <motion.g
        animate={
          reduced
            ? undefined
            : {
                /* The breath. A shoulder line that rises a fraction of a unit
                   and a head that follows it a beat later. */
                y: mood === "folded" ? 0 : [0, -0.55, 0],
                scaleY: mood === "folded" ? 1 : [1, 1.012, 1],
              }
        }
        transition={{
          duration: mood === "thinking" ? period * 0.72 : period,
          repeat: Infinity,
          ease: EASE.drift,
          delay: offset,
        }}
        style={{ transformOrigin: "32px 52px" }}
      >
        {/* Shoulders. */}
        <path
          d={`M 32 26 C ${44 + wide} 27, ${50 + wide} 34, ${52 + wide} 52 L ${12 - wide} 52 C ${14 - wide} 34, ${20 - wide} 27, 32 26 Z`}
          fill={cloth}
        />
        <path
          d={`M 32 26 C ${39 + wide} 27, ${43 + wide} 30, ${45 + wide} 36 L 32 40 Z`}
          fill="rgba(255,255,255,0.05)"
        />

        <motion.g
          animate={
            reduced
              ? undefined
              : {
                  /* A glance down the table, then back. Rare enough that it
                     registers as a person rather than as a loop. */
                  rotate: mood === "folded" ? -4 : [0, 0, -4.5, 0, 3, 0],
                }
          }
          transition={{
            duration: period * 2.6,
            repeat: Infinity,
            ease: EASE.drift,
            delay: offset * 1.7,
            times: [0, 0.42, 0.5, 0.62, 0.74, 1],
          }}
          style={{ transformOrigin: "32px 28px" }}
        >
          <path d="M 28 20 L 36 20 L 36 28 L 28 28 Z" fill={skin} opacity="0.72" />
          <ellipse cx="32" cy="15" rx="10.5" ry="12" fill={skin} />
          <path
            d="M 21.5 14 C 21.5 5, 26 2, 32 2 C 38 2, 42.5 5, 42.5 14 C 40.6 9.6, 37.6 8.2, 32 8.2 C 26.4 8.2, 23.4 9.6, 21.5 14 Z"
            fill={hair}
          />
          {/* Eyes only. At twenty-odd pixels across, a mouth is a smudge. */}
          <ellipse cx="28.2" cy="15.4" rx="1.1" ry="1.3" fill="rgba(20,14,10,0.85)" />
          <ellipse cx="35.8" cy="15.4" rx="1.1" ry="1.3" fill="rgba(20,14,10,0.85)" />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}
