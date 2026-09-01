"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, SUIT_GLYPH, cardLabel, isRedSuit } from "@/types";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE, RHYTHM, SMEAR_MAX } from "@/lib/motion/tokens";
import { restingPose, wobbleOf } from "@/lib/motion/jitter";
import { useFlight, type Flight } from "@/lib/motion/table-space";
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

      {/* Edge highlight. The lit side of a card lifted off the felt. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[7%/5%]"
        style={{
          background:
            "linear-gradient(118deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 26%, rgba(0,0,0,0.05) 92%)",
        }}
      />
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
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(118deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 30%)",
        }}
      />
    </div>
  );
}

/**
 * The shadow the card casts on the felt.
 *
 * Drawn as its own element rather than a box-shadow, because it has to grow
 * while the card is in the air and tighten when it lands, and animating a
 * box-shadow means repainting the card on every frame. This is a pre-blurred
 * gradient moved with transforms only, which costs nothing.
 */
function ContactShadow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-[-14%] -z-10 rounded-[10%]"
      style={{
        background:
          "radial-gradient(closest-side, rgba(0,0,0,0.62), rgba(0,0,0,0.28) 58%, rgba(0,0,0,0) 82%)",
      }}
    />
  );
}

export interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  /** Deal order, used to stagger the entrance when no explicit delay is given. */
  index?: number;
  className?: string;
  /** Disables all entrance animation, for static illustrations. */
  still?: boolean;
  /**
   * The name of the table anchor the card flies in from, usually the shoe.
   * Without one the card still animates, but from just off its own position
   * rather than from anywhere meaningful.
   */
  origin?: string;
  /** Milliseconds to wait before the card leaves the origin. */
  delay?: number;
  /** A hit or a community card travels a shorter distance and arrives firmer. */
  short?: boolean;
  /** Lifts on hover. Used where a card is something you can act on. */
  interactive?: boolean;
  /** Suppresses the resting scatter, for rows that need to read as a neat fan. */
  square?: boolean;
  /**
   * Set when the round is over and the dealer is gathering the cards in. The
   * card leaves for `leaveTo` rather than simply being unmounted, so a hand
   * ends by being collected instead of by disappearing.
   */
  leaving?: boolean;
  /** The anchor a collected card is swept towards, usually the discard tray. */
  leaveTo?: string;
}

/** Where a card comes from when the table has not told us anything better. */
const FROM_NOWHERE: Flight = { dx: 34, dy: -46, angle: -125, distance: 60 };
const TO_NOWHERE: Flight = { dx: 0, dy: -70, angle: 90, distance: 70 };

export function PlayingCard({
  card,
  faceDown = false,
  index = 0,
  className,
  still = false,
  origin,
  delay,
  short = false,
  interactive = false,
  square = false,
  leaving = false,
  leaveTo = "discard",
}: PlayingCardProps) {
  const reduced = useReducedMotion();
  const label = faceDown ? "Face down card" : cardLabel(card);
  const inert = still || reduced;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const measure = useFlight();

  /**
   * The card's journey.
   *
   * It cannot be known during the first render, because it depends on where
   * this card has been laid out and where the shoe currently is. So the frame
   * is rendered empty, the two rectangles are measured before the browser
   * paints, and then the card itself is mounted already knowing where it came
   * from. The gap is one frame, during which the card would have been sitting
   * in the shoe anyway.
   */
  const [from, setFrom] = useState<Flight | null>(null);
  useLayoutEffect(() => {
    if (inert) return;
    setFrom(measure(rootRef.current, origin) ?? FROM_NOWHERE);
    // Measured once. A card makes one journey to its seat and then stays there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* And a second journey, into the tray, once the hand is over. */
  const [exit, setExit] = useState<Flight | null>(null);
  useEffect(() => {
    if (!leaving || inert || exit) return;
    setExit(measure(rootRef.current, leaveTo) ?? TO_NOWHERE);
  }, [leaving, inert, exit, measure, leaveTo]);

  const ready = inert || from !== null;

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={label}
      className={cn(
        "relative aspect-[5/7] w-[var(--card-w,4rem)] shrink-0 select-none",
        "[container-type:inline-size]",
        className,
      )}
      style={{ perspective: 1000 }}
    >
      {ready ? (
        <CardBody
          card={card}
          faceDown={faceDown}
          index={index}
          inert={Boolean(inert)}
          from={inert ? null : from}
          exit={leaving ? (exit ?? TO_NOWHERE) : null}
          delay={delay}
          short={short}
          square={square}
          interactive={interactive}
        />
      ) : null}
    </div>
  );
}

function CardBody({
  card,
  faceDown,
  index,
  inert,
  from,
  exit,
  delay,
  short,
  square,
  interactive,
}: {
  card: Card;
  faceDown: boolean;
  index: number;
  inert: boolean;
  from: Flight | null;
  exit: Flight | null;
  delay?: number;
  short: boolean;
  square: boolean;
  interactive: boolean;
}) {
  const rest = square ? { rotate: 0, offsetX: 0, offsetY: 0 } : restingPose(card.id, index);
  const wait = (delay ?? Math.min(index, 6) * RHYTHM.betweenCards) / 1000;
  const duration = short ? DURATION.dealShort : DURATION.deal;
  const ease = short ? EASE.arriveShort : EASE.arrive;
  const spin = wobbleOf(card.id, "spin") * 9 - 6;

  /* How far the card stretches along its path is capped, so a long journey
     across a desktop table does not turn the card into a streak. */
  const travelling = exit ?? from;
  const stretch = from ? Math.min(SMEAR_MAX, from.distance / 2600 + 0.05) : 0;

  const arriving = {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: rest.rotate,
    /* Fast in, a hair past the resting size as it meets the felt, then a soft
       settle onto it. This is the landing, and it is what stops a card that has
       stopped moving from looking like a card that was placed there. */
    scale: [0.9, 1.05, 0.994, 1],
  };

  const leavingTo = exit
    ? {
        opacity: [1, 1, 0],
        x: exit.dx,
        y: exit.dy,
        rotate: rest.rotate + wobbleOf(card.id, "sweep") * 16,
        scale: 0.86,
      }
    : null;

  return (
    <motion.div
      className="absolute inset-0"
      initial={
        inert || !from
          ? false
          : { opacity: 0, x: from.dx, y: from.dy, rotate: rest.rotate + spin, scale: 0.9 }
      }
      animate={leavingTo ?? arriving}
      transition={
        leavingTo
          ? {
              duration: DURATION.deal,
              ease: EASE.leave,
              opacity: { duration: DURATION.deal, times: [0, 0.62, 1] },
            }
          : {
              delay: wait,
              duration,
              ease,
              opacity: { delay: wait, duration: 0.1 },
              scale: {
                delay: wait,
                duration: duration + RHYTHM.landing / 1000,
                times: [0, 0.66, 0.86, 1],
                ease,
              },
            }
      }
    >
      {/* The shadow the card casts on the felt: wide and soft while it is in the
          air, tight when it lands. Drawn as its own pre-blurred element and
          moved with transforms, because animating a box-shadow would repaint
          the card on every frame of the deal. */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={inert || !from ? false : { opacity: 0, scale: 1.5, y: "24%" }}
        animate={
          exit
            ? { opacity: 0, scale: 1.3 }
            : { opacity: [0, 0.2, 0.34], scale: [1.5, 1.2, 0.9], y: ["24%", "14%", "6%"] }
        }
        transition={
          exit
            ? { duration: DURATION.dealShort }
            : { delay: wait, duration, times: [0, 0.72, 1], ease }
        }
      >
        <ContactShadow />
      </motion.span>

      {/* Smear frame. Rotating into the direction of travel, stretching along
          it, then rotating back is a free approximation of motion blur: it is
          all transforms, so nothing is re-rasterised mid flight. At rest the
          two rotations cancel exactly, so the frame costs nothing once the card
          has landed. */}
      <div
        className="h-full w-full"
        style={{ transform: `rotate(${travelling?.angle ?? 0}deg)` }}
      >
        <motion.div
          className="h-full w-full"
          initial={inert || !from ? false : { scaleX: 1 + stretch, scaleY: 1 - stretch * 0.4 }}
          animate={{
            scaleX: exit ? 1.06 : [1 + stretch, 1 + stretch * 0.35, 1],
            scaleY: exit ? 0.97 : [1 - stretch * 0.4, 1 - stretch * 0.12, 1],
          }}
          transition={
            exit
              ? { duration: DURATION.dealShort }
              : { delay: wait, duration: duration * 0.92, times: [0, 0.45, 1], ease }
          }
        >
          <div
            className="h-full w-full"
            style={{ transform: `rotate(${-(travelling?.angle ?? 0)}deg)` }}
          >
            {/* A flicked card bows very slightly across its short edge in
                flight, and flattens as it lands. */}
            <motion.div
              className="h-full w-full"
              initial={inert || !from ? false : { rotateX: 13 }}
              animate={{ rotateX: 0 }}
              transition={{ delay: wait, duration: duration + 0.06, ease }}
              whileHover={interactive && !inert ? { y: -7, scale: 1.035 } : undefined}
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                initial={false}
                animate={{ rotateY: faceDown ? 180 : 0 }}
                transition={{ duration: inert ? 0 : DURATION.flip, ease: EASE.arrive }}
              >
                {/* The face is only in the document when the card is face up.
                    Backface visibility hides it on screen, but a hole card whose
                    rank can be read out of the DOM or by a screen reader is not
                    a hole card. It mounts as the card turns, behind its own
                    back, so the reveal is unaffected. */}
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  {faceDown ? null : <CardFace card={card} />}
                </div>
                <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                  <CardBack />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
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
      style={style}
    >
      <CardBack />
    </div>
  );
}
