"use client";

import { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, SUIT_GLYPH, cardLabel, isRedSuit } from "@/types";
import { cn } from "@/lib/utils/cn";
import { PIP_LAYOUT } from "./pips";

const FACE_RANKS = new Set(["J", "Q", "K"]);

function CardFace({ card }: { card: Card }) {
  const red = isRedSuit(card.suit);
  const glyph = SUIT_GLYPH[card.suit];
  const pips = PIP_LAYOUT[card.rank];
  const color = red ? "var(--color-suit-red)" : "var(--color-suit-black)";

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[7%/5%] bg-[linear-gradient(160deg,var(--color-ivory),var(--color-ivory-dim))]"
      style={{
        boxShadow:
          "0 0 0 1px var(--color-ivory-edge) inset, 0 1px 1px rgba(255,255,255,0.9) inset",
      }}
    >
      {/* Corner indices */}
      <Corner rank={card.rank} glyph={glyph} color={color} />
      <Corner rank={card.rank} glyph={glyph} color={color} flipped />

      {/* Middle field */}
      <div className="absolute inset-x-[25%] inset-y-[13%]">
        {FACE_RANKS.has(card.rank) ? (
          <div
            className="relative flex h-full w-full flex-col items-center justify-center"
            style={{ color }}
          >
            <span
              className="absolute inset-0 border"
              style={{ borderColor: "color-mix(in srgb, currentColor 32%, transparent)" }}
            />
            <span
              className="absolute inset-[7%] border"
              style={{ borderColor: "color-mix(in srgb, currentColor 16%, transparent)" }}
            />
            <span
              className="text-[46cqw] leading-[0.85]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {card.rank}
            </span>
            <span className="mt-[6%] text-[17cqw] leading-none">{glyph}</span>
          </div>
        ) : card.rank === "A" ? (
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{ color }}
          >
            <span className="text-[62cqw] leading-none">{glyph}</span>
          </div>
        ) : (
          <div className="relative h-full w-full" style={{ color }}>
            {pips?.map((entry, index) => (
              <span
                key={index}
                className="absolute text-[24cqw] leading-none"
                style={{
                  left: `${entry.x}%`,
                  top: `${entry.y}%`,
                  transform: `translate(-50%, -50%) rotate(${entry.flipped ? 180 : 0}deg)`,
                }}
              >
                {glyph}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Corner({
  rank,
  glyph,
  color,
  flipped,
}: {
  rank: string;
  glyph: string;
  color: string;
  flipped?: boolean;
}) {
  return (
    <div
      className={
        flipped
          ? "absolute right-[7%] bottom-[4%] flex rotate-180 flex-col items-center leading-none"
          : "absolute top-[4%] left-[7%] flex flex-col items-center leading-none"
      }
      style={{ color }}
    >
      <span className="text-[23cqw] leading-[1.05] font-semibold tracking-[-0.04em]">{rank}</span>
      <span className="text-[16cqw] leading-none">{glyph}</span>
    </div>
  );
}

function CardBack() {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[7%/5%]"
      style={{
        background:
          "linear-gradient(160deg, var(--color-felt-600), var(--color-felt-900))",
        boxShadow:
          "0 0 0 1px rgba(194,166,107,0.35) inset, 0 0 0 4px rgba(0,0,0,0.18) inset",
      }}
    >
      <div
        className="absolute inset-[9%] rounded-[5%] border"
        style={{
          borderColor: "rgba(194,166,107,0.32)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(194,166,107,0.16) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(194,166,107,0.16) 0 1px, transparent 1px 7px)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rotate-45 border"
        style={{ borderColor: "rgba(194,166,107,0.5)" }}
      />
    </div>
  );
}

export interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  /** Deal order, used to stagger the entrance animation. */
  index?: number;
  className?: string;
  /** Disables the entrance animation, for static illustrations. */
  still?: boolean;
}

export function PlayingCard({
  card,
  faceDown = false,
  index = 0,
  className,
  still = false,
}: PlayingCardProps) {
  const reduced = useReducedMotion();
  const label = faceDown ? "Face down card" : cardLabel(card);

  return (
    <motion.div
      role="img"
      aria-label={label}
      className={cn(
        "relative aspect-[5/7] w-[var(--card-w,4rem)] shrink-0 select-none",
        "[container-type:inline-size]",
        className,
      )}
      initial={still || reduced ? false : { opacity: 0, y: -34, x: 26, rotate: -7 }}
      animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      transition={{
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
        delay: still || reduced ? 0 : Math.min(index, 6) * 0.07,
      }}
      style={{
        filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.45))",
      }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: reduced ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <CardFace card={card} />
        </div>
        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A plain back, used for the shoe and for decorative stacks. */
export function CardBackTile({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("relative aspect-[5/7] w-[var(--card-w,4rem)] shrink-0", className)}
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.4))", ...style }}
    >
      <CardBack />
    </div>
  );
}
