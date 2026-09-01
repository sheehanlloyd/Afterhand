"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChipFace, chipBreakdown } from "./Chip";
import { useTableSpace } from "@/lib/motion/table-space";
import { DURATION, EASE, SPRING } from "@/lib/motion/tokens";
import { wobbleOf } from "@/lib/motion/jitter";
import { playSound, playSoundIn } from "@/lib/sound";
import { registerChipSender } from "@/lib/motion/chip-bus";

/**
 * Chips crossing the table.
 *
 * The rule this exists to enforce is that money never teleports. A raise is
 * chips leaving a stack, travelling, and landing; the pot's number only changes
 * once they have arrived. Everything here is drawn in a fixed layer above the
 * table so a chip can leave the rail, cross the felt and land in a betting
 * circle without any of those three components knowing about each other.
 *
 * Chips travel as little stacks rather than as one sprite, and each chip in a
 * stack is given its own speed, so a big pot arrives as a scatter of clay
 * instead of a single object.
 */

interface FlightRequest {
  /** Anchor the chips leave from. */
  from: string;
  /** Anchor the chips arrive at. */
  to: string;
  /** Total value being moved. It is broken into chips for display. */
  amount: number;
  denominations: number[];
  /** Called once the last chip has landed, for updating the number. */
  onArrive?: () => void;
  /** Caps how many chips are drawn, for very large pots. */
  max?: number;
}

interface ActiveChip {
  key: string;
  value: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: string;
  delay: number;
  spin: number;
}

interface ChipFlightValue {
  send: (request: FlightRequest) => number;
}

const ChipFlightContext = createContext<ChipFlightValue | null>(null);

const INERT: ChipFlightValue = { send: () => 0 };

export function useChipFlight(): ChipFlightValue {
  return useContext(ChipFlightContext) ?? INERT;
}

export function ChipFlightLayer({ children }: { children: ReactNode }) {
  const { rectOf } = useTableSpace();
  const reduced = useReducedMotion();
  const [chips, setChips] = useState<ActiveChip[]>([]);
  const counter = useRef(0);

  const send = useCallback(
    ({ from, to, amount, denominations, onArrive, max = 7 }: FlightRequest) => {
      const origin = rectOf(from);
      const destination = rectOf(to);
      const stack = chipBreakdown(amount, denominations).slice(0, max);

      /* Nothing to fly from or to, or motion is turned down: the caller still
         gets its callback, just immediately. */
      if (!origin || !destination || stack.length === 0 || reduced) {
        onArrive?.();
        return 0;
      }

      const startX = origin.left + origin.width / 2;
      const startY = origin.top + origin.height / 2;
      const endX = destination.left + destination.width / 2;
      const endY = destination.top + destination.height / 2;

      const built = stack.map((value, index) => {
        const key = `chip-${counter.current++}`;
        return {
          key,
          value,
          /* A stack does not leave as one piece. Each chip starts a few pixels
             off the last and arrives a few milliseconds later. */
          x: startX + wobbleOf(key, "sx") * 5,
          y: startY - index * 3,
          dx: endX - startX + wobbleOf(key, "ex") * 7,
          dy: endY - startY - index * 3.5 + wobbleOf(key, "ey") * 4,
          size: "2.15rem",
          delay: index * 0.045,
          spin: wobbleOf(key, "spin") * 130,
        };
      });

      setChips((current) => [...current, ...built]);
      playSound("chip");

      const travel = DURATION.chip + built[built.length - 1].delay;
      /* The impact is heard when the clay actually lands, not when it left. */
      playSoundIn("chipStack", Math.round(travel * 1000 * 0.92));

      window.setTimeout(
        () => {
          const keys = new Set(built.map((chip) => chip.key));
          setChips((current) => current.filter((chip) => !keys.has(chip.key)));
          onArrive?.();
        },
        Math.round(travel * 1000) + 40,
      );

      return Math.round(travel * 1000);
    },
    [rectOf, reduced],
  );

  /* Games drive chips from their stores, which are outside React. */
  useEffect(() => {
    registerChipSender(send);
    return () => registerChipSender(null);
  }, [send]);

  const value = useMemo(() => ({ send }), [send]);

  return (
    <ChipFlightContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
        style={{ contain: "layout style" }}
      >
        <AnimatePresence>
          {chips.map((chip) => (
            <motion.span
              key={chip.key}
              className="absolute"
              style={{
                left: chip.x,
                top: chip.y,
                ["--chip-w" as string]: chip.size,
                translateX: "-50%",
                translateY: "-50%",
              }}
              initial={{ x: 0, y: 0, rotate: 0, scale: 0.94, opacity: 0 }}
              animate={{
                x: chip.dx,
                /* Chips are pushed across a felt, so they rise a little in the
                   middle of the journey rather than travelling flat. */
                y: [0, chip.dy * 0.45 - 16, chip.dy],
                rotate: chip.spin,
                scale: [0.94, 1.06, 1],
                opacity: 1,
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              transition={{
                delay: chip.delay,
                duration: DURATION.chip,
                ease: EASE.arrive,
                opacity: { duration: 0.08, delay: chip.delay },
                y: { delay: chip.delay, duration: DURATION.chip, times: [0, 0.55, 1], ease: EASE.arrive },
              }}
            >
              <motion.span
                className="block"
                /* The wobble as it settles onto whatever is already there. */
                animate={{ rotate: [0, wobbleOf(chip.key, "wob") * 8, 0] }}
                transition={{
                  delay: chip.delay + DURATION.chip * 0.86,
                  duration: 0.2,
                  ...SPRING.wobble,
                }}
              >
                <ChipFace value={chip.value} />
              </motion.span>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </ChipFlightContext.Provider>
  );
}
