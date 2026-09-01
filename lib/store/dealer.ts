"use client";

import { create } from "zustand";

/**
 * The dealer, as a state machine.
 *
 * A table that replays one animation every round starts to look like a screen
 * saver after about five hands. So the dealer has a small number of states, and
 * several ways of performing most of them, chosen at the moment the state is
 * entered:
 *
 *   idle → preparing → shuffling → cutting → dealing → waiting
 *        → revealing → collecting → idle
 *
 * Games drive this. They do not have to: a game that never calls `enter` simply
 * gets a dealer sitting quietly with their hands on the felt, which is the
 * correct behaviour for a table that is not doing anything.
 */

export type DealerState =
  | "idle"
  | "preparing"
  | "shuffling"
  | "cutting"
  | "dealing"
  | "waiting"
  | "revealing"
  | "collecting";

/** The ways a deck gets mixed. Each has its own animation and its own sound. */
export type ShuffleVariant = "riffle" | "strip" | "table-riffle" | "running-cuts" | "wash";

const SHUFFLE_VARIANTS: ShuffleVariant[] = [
  "riffle",
  "riffle",
  "table-riffle",
  "strip",
  "running-cuts",
];

/** Roughly how long each shuffle takes to perform, in milliseconds. */
export const SHUFFLE_DURATION: Record<ShuffleVariant, number> = {
  riffle: 900,
  "table-riffle": 1000,
  strip: 820,
  "running-cuts": 880,
  wash: 1200,
};

/**
 * How often the dealer does something decorative between rounds.
 *
 * Deliberately rare. A dealer who performs a flourish on every hand looks like
 * a magician, and the whole effect depends on it being unexpected.
 */
const FLOURISH_CHANCE = 0.07;

interface DealerStore {
  state: DealerState;
  variant: ShuffleVariant;
  /** Bumped on every transition, so an animation can restart on a repeat state. */
  beat: number;
  /** True for the one round in fourteen where the dealer shows off a little. */
  flourish: boolean;
  enter: (state: DealerState) => void;
  /** Runs preparing → shuffling → cutting → idle, and reports the total time. */
  shuffleSequence: () => number;
  reset: () => void;
}

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export const useDealer = create<DealerStore>((set, get) => ({
  state: "idle",
  variant: "riffle",
  beat: 0,
  flourish: false,

  enter: (state) => {
    set((current) => ({
      state,
      beat: current.beat + 1,
      variant: state === "shuffling" ? pick(SHUFFLE_VARIANTS) : current.variant,
      flourish: state === "idle" ? Math.random() < FLOURISH_CHANCE : current.flourish,
    }));
  },

  shuffleSequence: () => {
    clearTimers();
    const variant = pick(SHUFFLE_VARIANTS);
    /* Two passes, the way a dealer actually does it, then the cut. */
    const first = SHUFFLE_DURATION[variant];
    const second = SHUFFLE_DURATION.riffle;
    const cut = 620;

    set((current) => ({ state: "preparing", variant, beat: current.beat + 1 }));
    timers.push(
      setTimeout(() => {
        set((current) => ({ state: "shuffling", beat: current.beat + 1 }));
      }, 340),
    );
    timers.push(
      setTimeout(
        () => {
          set((current) => ({
            state: "shuffling",
            variant: "riffle",
            beat: current.beat + 1,
          }));
        },
        340 + first,
      ),
    );
    timers.push(
      setTimeout(
        () => {
          set((current) => ({ state: "cutting", beat: current.beat + 1 }));
        },
        340 + first + second,
      ),
    );
    timers.push(
      setTimeout(
        () => {
          get().enter("idle");
        },
        340 + first + second + cut,
      ),
    );

    return 340 + first + second + cut;
  },

  reset: () => {
    clearTimers();
    set({ state: "idle", beat: 0, flourish: false });
  },
}));
