"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/**
 * A block of cards seen as an object rather than as a picture of a card back.
 *
 * The thickness is drawn with stacked shadow layers, alternating between the
 * dark of the card backs and the cream of their edges, which is what a deck
 * actually looks like from above. It costs one paint and no extra elements, and
 * it means the shoe can visibly empty as the shoe is dealt down and the discard
 * tray can visibly fill.
 */

/** Layers of visible edge at a full block. More than this reads as mush. */
const MAX_LAYERS = 13;

export function deckThickness(fraction: number): number {
  if (fraction <= 0) return 0;
  return Math.max(1, Math.round(fraction * MAX_LAYERS));
}

function edgeShadow(layers: number): string {
  const parts: string[] = [];
  for (let i = 1; i <= layers; i++) {
    /* Alternating card and edge, which is what a stack looks like from above.
       The offsets are generous because the shoe is drawn small: at thirty
       pixels wide a subtle stack is indistinguishable from a single card, and
       the whole point of the block is that you can see it emptying. */
    const tone = i % 2 === 0 ? "rgba(238,230,212,0.6)" : "rgba(10,26,21,0.95)";
    parts.push(`${i * 0.8}px ${i * 1.15}px 0 -0.4px ${tone}`);
  }
  parts.push(`${layers * 0.8 + 4}px ${layers * 1.15 + 7}px 14px -6px rgba(0,0,0,0.7)`);
  return parts.join(", ");
}

export function DeckBlock({
  /** 0 to 1. How full the block is. */
  fill,
  className,
  empty,
  style,
}: {
  fill: number;
  className?: string;
  /** Rendered when the block has no cards in it at all. */
  empty?: boolean;
  style?: React.CSSProperties;
}) {
  const layers = deckThickness(Math.min(1, Math.max(0, fill)));

  if (empty || layers === 0) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "relative aspect-[5/7] w-[var(--card-w,2rem)] rounded-[7%/5%] border border-dashed",
          className,
        )}
        style={{ borderColor: "rgba(201,167,94,0.22)", ...style }}
      />
    );
  }

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "relative aspect-[5/7] w-[var(--card-w,2rem)] overflow-hidden rounded-[7%/5%]",
        className,
      )}
      style={{
        background: "linear-gradient(158deg, var(--color-felt-600), var(--color-felt-900))",
        ...style,
      }}
      animate={{ boxShadow: edgeShadow(layers) }}
      transition={{ duration: 0.3 }}
    >
      {/* One inset rule and nothing else. A woven pattern at this size is
          noise rather than texture. */}
      <span
        className="absolute inset-[12%] rounded-[5%] border"
        style={{ borderColor: "rgba(194,166,107,0.34)" }}
      />
      <span
        className="absolute inset-0"
        style={{
          background: "linear-gradient(118deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%)",
        }}
      />
    </motion.div>
  );
}
