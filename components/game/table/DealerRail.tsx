"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useDealer, type ShuffleVariant } from "@/lib/store/dealer";
import { useTableAnchor } from "@/lib/motion/table-space";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { DURATION, EASE, SPRING } from "@/lib/motion/tokens";
import { playSound } from "@/lib/sound";
import { DeckBlock } from "./DeckBlock";
import { cn } from "@/lib/utils/cn";

/**
 * The dealer's station.
 *
 * There is no dealer figure, because a rendered person on a felt this
 * stylised would be the only literal thing in the product. What there is
 * instead is everything a dealer's presence actually consists of at the
 * table: the shoe, the discard tray, a line of status when their hands are
 * busy, and a small brass marker that stands in for "someone is running this
 * game" without ever drawing a face. The shoe empties as the shoe is dealt
 * down, the tray fills, and the shuffle is performed in the shoe's own
 * footprint rather than announced with a caption.
 */

/**
 * The shuffles.
 *
 * Each entry says what the two halves of the deck do. Every value is a
 * keyframe array on a transform, so the whole sequence is composited and none
 * of it touches layout.
 */
const SHUFFLES: Record<
  ShuffleVariant,
  {
    duration: number;
    /** The half that stays roughly put. */
    left: Record<string, number[]>;
    /** The half that is lifted and worked. */
    right: Record<string, number[]>;
    times?: number[];
    /** Sounds, as [name, fraction of the sequence]. */
    cues: Array<[Parameters<typeof playSound>[0], number]>;
  }
> = {
  riffle: {
    duration: 0.9,
    times: [0, 0.24, 0.52, 0.78, 1],
    left: { x: [0, -13, -11, -1, 0], rotate: [0, -5, -3, 0.5, 0], y: [0, -2, -1, 0, 0] },
    right: { x: [0, 13, 11, 1, 0], rotate: [0, 5, 3, -0.5, 0], y: [0, -2, -1, 0, 0] },
    cues: [
      ["cut", 0.2],
      ["riffle", 0.5],
      ["square", 0.82],
    ],
  },
  "table-riffle": {
    duration: 1,
    times: [0, 0.22, 0.46, 0.74, 1],
    left: { x: [0, -15, -14, -2, 0], rotate: [0, -2, -1.5, 0, 0], scaleY: [1, 1, 0.99, 1, 1] },
    right: { x: [0, 15, 14, 2, 0], rotate: [0, 2, 1.5, 0, 0], scaleY: [1, 1, 0.99, 1, 1] },
    cues: [
      ["cut", 0.18],
      ["riffle", 0.46],
      ["square", 0.86],
    ],
  },
  strip: {
    duration: 0.82,
    times: [0, 0.2, 0.38, 0.56, 0.74, 1],
    left: { y: [0, 0, 0, 0, 0, 0] },
    right: { y: [0, -11, -2, -10, -2, 0], x: [0, 5, 1, 4, 1, 0], rotate: [0, 3, 0, 2.5, 0, 0] },
    cues: [
      ["cut", 0.22],
      ["cut", 0.42],
      ["cut", 0.6],
      ["square", 0.85],
    ],
  },
  "running-cuts": {
    duration: 0.88,
    times: [0, 0.18, 0.36, 0.54, 0.72, 1],
    left: { x: [0, 2, 0, 2, 0, 0] },
    right: { x: [0, 14, 0, 12, 0, 0], y: [0, -6, 0, -5, 0, 0], rotate: [0, 6, 0, 5, 0, 0] },
    cues: [
      ["cut", 0.2],
      ["cut", 0.4],
      ["cut", 0.58],
      ["square", 0.86],
    ],
  },
  wash: {
    duration: 1.2,
    times: [0, 0.3, 0.55, 0.8, 1],
    left: { x: [0, -18, -6, -12, 0], y: [0, 5, -3, 2, 0], rotate: [0, -9, 4, -5, 0] },
    right: { x: [0, 17, 7, 13, 0], y: [0, -4, 4, -2, 0], rotate: [0, 8, -5, 6, 0] },
    cues: [
      ["sweep", 0.1],
      ["riffle", 0.55],
      ["square", 0.88],
    ],
  },
};

/** The cut: a packet lifted off, set beside the deck, and completed. */
const CUT = {
  duration: 0.62,
  times: [0, 0.34, 0.66, 1],
  frames: { x: [0, 20, 20, 0], y: [0, -9, -1, 0], rotate: [0, 4, 1, 0] },
};

export function Shoe({
  /** Cards left in the shoe as a fraction of a full one. */
  fill,
  className,
  /** Hides the "Shoe" caption, for tables too tight on height to spare it. */
  compact,
}: {
  fill: number;
  className?: string;
  compact?: boolean;
}) {
  const anchor = useTableAnchor("shoe");
  const reduced = usePrefersReducedMotion();
  const { state, variant, beat, flourish } = useDealer();
  const left = useAnimationControls();
  const right = useAnimationControls();
  const cues = useRef<number[]>([]);

  useEffect(() => {
    cues.current.forEach(clearTimeout);
    cues.current = [];
    if (reduced) return;

    if (state === "shuffling") {
      const spec = SHUFFLES[variant];
      void left.start({
        ...spec.left,
        transition: { duration: spec.duration, times: spec.times, ease: EASE.drift },
      });
      void right.start({
        ...spec.right,
        transition: { duration: spec.duration, times: spec.times, ease: EASE.drift },
      });
      spec.cues.forEach(([name, at]) => {
        cues.current.push(
          window.setTimeout(() => playSound(name), at * spec.duration * 1000),
        );
      });
      return;
    }

    if (state === "cutting") {
      void right.start({
        ...CUT.frames,
        transition: { duration: CUT.duration, times: CUT.times, ease: EASE.arrive },
      });
      cues.current.push(window.setTimeout(() => playSound("cut"), 120));
      cues.current.push(window.setTimeout(() => playSound("square"), 500));
      return;
    }

    if (state === "preparing") {
      void left.start({
        x: [0, -2, 0],
        rotate: [0, -1, 0],
        transition: { duration: 0.32, ease: EASE.arriveShort },
      });
      void right.start({
        x: [0, 2, 0],
        rotate: [0, 1, 0],
        transition: { duration: 0.32, ease: EASE.arriveShort },
      });
      cues.current.push(window.setTimeout(() => playSound("square"), 60));
      return;
    }

    if (state === "dealing") {
      void right.start({ y: [0, -3, 0], transition: { duration: 0.22, ease: EASE.arriveShort } });
      return;
    }

    if (state === "idle" && flourish) {
      void right.start({
        rotate: [0, 0, 14, -6, 0],
        x: [0, 0, 9, -2, 0],
        y: [0, 0, -7, 1, 0],
        transition: { duration: 1.1, times: [0, 0.3, 0.55, 0.8, 1], ease: EASE.drift },
      });
      cues.current.push(window.setTimeout(() => playSound("cut"), 340));
      cues.current.push(window.setTimeout(() => playSound("square"), 900));
    }

    return () => {
      cues.current.forEach(clearTimeout);
      cues.current = [];
    };
    // `beat` is the trigger: re-entering the same state has to replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, state, variant, reduced]);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div ref={anchor} className="relative aspect-[5/7] w-[var(--card-w,2.1rem)]">
        <motion.div
          className="absolute inset-0"
          animate={reduced ? undefined : { y: [0, -0.9, 0], rotate: [0, -0.35, 0] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: EASE.drift }}
        >
          <motion.div className="absolute inset-0" animate={left} initial={false}>
            <DeckBlock fill={fill} />
          </motion.div>
          {/* The worked half sits exactly on the other one, so the deck reads as
              a single block until it is split. */}
          <motion.div className="absolute inset-0" animate={right} initial={false}>
            <DeckBlock fill={fill * 0.55} />
          </motion.div>
        </motion.div>
      </div>
      {compact ? null : <span className="label text-fg-3">Shoe</span>}
    </div>
  );
}

export function DiscardTray({
  /** Cards in the tray as a fraction of a full shoe. */
  fill,
  className,
  /** Hides the "Tray" caption, for tables too tight on height to spare it. */
  compact,
}: {
  fill: number;
  className?: string;
  compact?: boolean;
}) {
  const anchor = useTableAnchor("discard");

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div
        ref={anchor}
        className="relative grid aspect-[5/7] w-[var(--card-w,2.1rem)] place-items-center rounded-[7%/5%] border"
        style={{
          borderColor: "rgba(201,167,94,0.24)",
          background: "rgba(0,0,0,0.22)",
          boxShadow: "0 2px 10px -4px rgba(0,0,0,0.7) inset",
        }}
      >
        <AnimatePresence>
          {fill > 0.01 ? (
            <motion.div
              key="tray"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={SPRING.ui}
            >
              <DeckBlock fill={fill} className="opacity-90" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {compact ? null : <span className="label text-fg-3">Tray</span>}
    </div>
  );
}

const STATUS_COPY: Record<string, string> = {
  idle: "",
  preparing: "Squaring the deck",
  shuffling: "Shuffling",
  cutting: "Cutting",
  dealing: "Dealing",
  waiting: "",
  revealing: "",
  collecting: "Collecting",
};

/** A quiet line that says what the dealer's hands are doing, when they are busy. */
export function DealerActivity({ className }: { className?: string }) {
  const state = useDealer((store) => store.state);
  const copy = STATUS_COPY[state] ?? "";

  return (
    <div className={cn("flex h-4 items-center justify-center", className)}>
      <AnimatePresence mode="wait">
        {copy ? (
          <motion.span
            key={copy}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: DURATION.tooltip }}
            className="label text-accent-2"
          >
            {copy}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * The marker.
 *
 * A small brass plate — the one abstract stand-in for "someone is dealing
 * this game." It brightens a fraction while the dealer's hands are busy and
 * sits dim and steady otherwise. Never a face, never a gesture.
 */
export function DealerMarker({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const state = useDealer((store) => store.state);
  const active = state !== "idle" && state !== "waiting";

  return (
    <div
      aria-hidden="true"
      className={cn("relative h-1.5 w-1.5 shrink-0 rounded-full", className)}
      style={{ background: "var(--color-brass)" }}
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: "var(--color-brass)" }}
        animate={
          reduced
            ? { opacity: active ? 0.9 : 0.45 }
            : { opacity: active ? [0.55, 0.95, 0.55] : 0.45 }
        }
        transition={
          reduced
            ? { duration: DURATION.tooltip }
            : { duration: 2.2, repeat: active ? Infinity : 0, ease: EASE.drift }
        }
      />
    </div>
  );
}

/**
 * The rail itself: marker, status line, and — where the game has cards — the
 * shoe and discard tray either side. Games without cards (roulette) pass
 * `withCards={false}` and get the marker and status only.
 */
export function DealerRail({
  withCards = true,
  shoeFill = 0,
  trayFill = 0,
  label,
  compact,
  className,
}: {
  withCards?: boolean;
  shoeFill?: number;
  trayFill?: number;
  /** Fallback text shown when the dealer has nothing to report. */
  label?: string;
  /** Drops the "Shoe"/"Tray" captions, for tables too tight on height to spare them. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-4 sm:gap-6", className)}>
      {withCards ? <Shoe fill={shoeFill} compact={compact} /> : null}
      <div className="flex flex-col items-center gap-1">
        <DealerMarker />
        <DealerActivity />
        {label ? <span className="label text-fg-3">{label}</span> : null}
      </div>
      {withCards ? <DiscardTray fill={trayFill} compact={compact} /> : null}
    </div>
  );
}
