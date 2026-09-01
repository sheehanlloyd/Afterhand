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
    const tone = i % 2 === 0 ? "rgba(232,224,206,0.5)" : "rgba(14,32,26,0.9)";
    parts.push(`${i * 0.5}px ${i * 0.8}px 0 -0.5px ${tone}`);
  }
  parts.push("6px 12px 16px -6px rgba(0,0,0,0.6)");
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
      <span
        className="absolute inset-[10%] rounded-[5%] border"
        style={{
          borderColor: "rgba(194,166,107,0.3)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(194,166,107,0.14) 0 1px, transparent 1px 6px)",
        }}
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
