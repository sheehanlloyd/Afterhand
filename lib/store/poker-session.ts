"use client";

import { create } from "zustand";
import { Card, GameMode } from "@/types";
import * as engine from "@/lib/games/poker/engine";
import { decideAction, thinkingTime } from "@/lib/games/poker/ai";
import { PokerAction, PokerState } from "@/lib/games/poker/types";
import { PokerDecision, reviewPokerDecision } from "@/lib/games/poker/coach";
import {
  applyPokerDecisions,
  loadPokerLearning,
  savePokerLearning,
} from "@/lib/storage/learning-games";
import { playSound, playSoundIn } from "@/lib/sound";
import { useDealer } from "@/lib/store/dealer";
import { moveChips } from "@/lib/motion/chip-bus";
import { applyStep, clampCounts, revealSteps } from "@/lib/motion/deal-order";
import { DURATION, RHYTHM } from "@/lib/motion/tokens";

/** Chip denominations the table pays and takes in. */
export const POKER_CHIPS = [5, 10, 25, 50, 100, 500, 1000];

/**
 * What is physically on the poker table, as opposed to what the engine says.
 *
 * The engine resolves a whole street in one call: it burns a card, turns three
 * over and works out who is first to act. Showing all of that in the same frame
 * is the difference between a hand you can follow and a list of cards you have
 * to read. So the state is diffed against the felt and the difference is
 * performed.
 */
export interface PokerReveal {
  /** Hole cards physically dealt, per player. */
  hole: Record<string, number>;
  /** Community cards on the felt. */
  board: number;
  /** Community cards that have been turned over. */
  faceUp: number;
  /** Players whose hole cards have been shown, in the order they were shown. */
  shown: string[];
  /** Bumped each time a card is burned, so the burn can be animated. */
  burn: number;
}

const EMPTY_REVEAL: PokerReveal = { hole: {}, board: 0, faceUp: 0, shown: [], burn: 0 };

export interface PokerHandSummary {
  number: number;
  net: number;
  board: Card[];
  hole: Card[];
  decisions: PokerDecision[];
  message: string;
}

export interface PokerSessionConfig {
  stack: number;
  smallBlind: number;
  bigBlind: number;
  mode: GameMode;
}

interface PokerSessionStore {
  status: "setup" | "playing" | "summary";
  mode: GameMode;
  startingStack: number;
  startedAt: number;
  endedAt: number | null;
  table: PokerState | null;
  history: PokerHandSummary[];
  reviewOpen: boolean;
  reviewSummary: PokerHandSummary | null;
  waiting: boolean;
  /** What has physically reached the felt. */
  reveal: PokerReveal;
  /** True while the dealer is putting cards out and nobody may act. */
  dealing: boolean;
  /**
   * The pot as displayed. It lags the engine's figure until the chips that
   * changed it have finished crossing the table.
   */
  potShown: number;

  start: (config: PokerSessionConfig) => void;
  deal: () => void;
  act: (action: PokerAction) => void;
  openReview: () => void;
  closeReview: () => void;
  endSession: () => void;
  leaveSession: () => void;
}

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function schedule(fn: () => void, delay: number) {
  timers.push(setTimeout(fn, delay));
}

/** Walks the action log and reviews every decision the human made. */
function buildDecisions(table: PokerState): PokerDecision[] {
  const human = engine.humanPlayer(table);
  const humanIndex = table.players.findIndex((player) => player.isHuman);
  const liveIds = new Set(table.players.map((player) => player.id));
  const decisions: PokerDecision[] = [];

  const boardFor = (street: string): Card[] => {
    if (street === "preflop") return [];
    if (street === "flop") return table.board.slice(0, 3);
    if (street === "turn") return table.board.slice(0, 4);
    return table.board.slice(0, 5);
  };

  const seatCount = table.players.length;
  const cutoff = (table.buttonIndex - 1 + seatCount) % seatCount;
  const inPosition = humanIndex === table.buttonIndex || humanIndex === cutoff;

  for (const record of table.history) {
    if (record.playerId === human.id) {
      const opponents = Math.max(1, liveIds.size - 1);
      decisions.push(
        reviewPokerDecision({
          id: record.id,
          state: table,
          action: record,
          hole: human.hole,
          board: boardFor(record.street),
          opponents,
          inPosition,
        }),
      );
    }
    if (record.type === "fold") liveIds.delete(record.playerId);
  }

  return decisions;
}

export const usePokerSession = create<PokerSessionStore>((set, get) => {
  /**
   * Deals the hole cards round the table.
   *
   * Two cards each, one seat at a time, starting left of the button, then round
   * again. Nobody may act until the last one is down. Returns when the deal is
   * finished so the rest of the hand can be scheduled behind it.
   */
  function dealHoleCards(table: PokerState): number {
    const order = table.players.map((player) => player.id);
    const target = {
      dealer: 0,
      hands: Object.fromEntries(table.players.map((p) => [p.id, p.hole.length])),
    };
    const base = clampCounts({ dealer: 0, hands: get().reveal.hole }, target);
    const steps = revealSteps(base, target, order);
    if (steps.length === 0) return 0;

    useDealer.getState().enter("dealing");
    set({ dealing: true, reveal: { ...get().reveal, hole: base.hands } });

    let counts = base;
    let at = 0;
    for (const step of steps) {
      counts = applyStep(counts, step);
      const snapshot = counts.hands;
      schedule(() => {
        set({ reveal: { ...get().reveal, hole: snapshot } });
        playSound("deal");
        playSoundIn("land", Math.round(DURATION.dealShort * 780));
      }, at);
      at += RHYTHM.betweenCards * 0.7;
    }

    const done = at + DURATION.deal * 1000;
    schedule(() => {
      set({ dealing: false });
      useDealer.getState().enter("waiting");
    }, done);
    return done;
  }

  /**
   * Puts new community cards out.
   *
   * A card is burned first, the new cards travel face down, they settle, and
   * then they are turned. The flop fans outward with a beat between each card;
   * the turn and the river get a moment of their own before they come over,
   * because a single card that decides a hand deserves the pause.
   */
  function dealBoard(table: PokerState, startAt: number): number {
    const reveal = get().reveal;
    const target = table.board.length;
    if (target <= reveal.board) return startAt;

    const fresh = target - reveal.board;
    let at = startAt;

    /* The burn. One card off the top, face down, into the muck. */
    schedule(() => {
      set({ reveal: { ...get().reveal, burn: get().reveal.burn + 1 } });
      playSound("deal");
    }, at);
    at += 260;

    useDealer.getState().enter("dealing");

    for (let index = 0; index < fresh; index++) {
      const shown = reveal.board + index + 1;
      schedule(() => {
        set({ reveal: { ...get().reveal, board: shown } });
        playSound("deal");
        playSoundIn("land", Math.round(DURATION.dealShort * 780));
      }, at);
      at += RHYTHM.betweenCommunity;
    }

    /* Settle, then turn them over one at a time. */
    at += RHYTHM.beforeReveal;
    for (let index = 0; index < fresh; index++) {
      const up = reveal.board + index + 1;
      schedule(() => {
        set({ reveal: { ...get().reveal, faceUp: up } });
        playSound("flip");
      }, at);
      at += 90;
    }

    const done = at + DURATION.flip * 1000;
    schedule(() => useDealer.getState().enter("waiting"), done);
    return done;
  }

  /**
   * Moves the chips an action put in, then updates the pot.
   *
   * This ordering is the whole point. A raise is chips leaving a stack and
   * landing in the middle; the number in the middle changing is the consequence,
   * not the event.
   */
  function moveCommitted(table: PokerState) {
    const last = table.history[table.history.length - 1];
    const pot = table.pot;
    if (!last || last.amount <= 0) {
      set({ potShown: pot });
      return;
    }
    moveChips({
      from: `seat:${last.playerId}`,
      to: "pot",
      amount: last.amount,
      denominations: POKER_CHIPS,
      onArrive: () => set({ potShown: pot }),
    });
  }

  /** Turns each contested hand over in sequence rather than all at once. */
  function runShowdown(table: PokerState, startAt: number): number {
    const contested = table.players.filter((player) => player.revealed);
    if (contested.length === 0) {
      set({ reveal: { ...get().reveal, shown: [] } });
      return startAt;
    }

    let at = startAt;
    const shown: string[] = [];
    for (const player of contested) {
      shown.push(player.id);
      const snapshot = [...shown];
      schedule(() => {
        set({ reveal: { ...get().reveal, shown: snapshot } });
        playSound("flip");
      }, at);
      at += RHYTHM.beforeReveal;
    }
    return at;
  }

  /** Pushes the pot to whoever won it, in stacks, before the stacks update. */
  function payOut(table: PokerState, startAt: number) {
    const awards = table.showdown?.awards ?? [];
    for (const award of awards) {
      for (const winner of award.winners) {
        schedule(() => {
          moveChips({
            from: "pot",
            to: `seat:${winner}`,
            amount: Math.round(award.amount / award.winners.length),
            denominations: POKER_CHIPS,
            max: 9,
          });
        }, startAt);
      }
    }
    schedule(() => set({ potShown: 0 }), startAt + DURATION.chip * 1000);
  }

  /** Runs opponents until it is the human's turn or the hand is over. */
  function pump(table: PokerState) {
    const previous = get().table;
    set({ table });

    /* A new hand: reset the felt, then deal. */
    if (!previous || previous.handNumber !== table.handNumber) {
      set({ reveal: EMPTY_REVEAL, potShown: 0 });
    }

    const wait = dealHoleCards(table);
    const afterBoard = dealBoard(table, wait);
    if (previous && table.pot !== previous.pot) moveCommitted(table);
    else if (table.pot !== get().potShown && table.street !== "complete") {
      set({ potShown: table.pot });
    }

    if (table.street === "complete") {
      const human = engine.humanPlayer(table);
      const decisions = buildDecisions(table);
      const summary: PokerHandSummary = {
        number: table.handNumber,
        net: table.lastNet,
        board: table.board,
        hole: human.hole,
        decisions,
        message: table.message,
      };
      const state = get();
      if (state.mode === "learn") {
        savePokerLearning(
          applyPokerDecisions(
            loadPokerLearning(),
            decisions.map((decision) => ({
              street: decision.street === "showdown" || decision.street === "complete"
                ? "river"
                : decision.street,
              assessment: decision.assessment,
              topic: decision.topic,
            })),
          ),
        );
      }
      /* The hands come over one at a time, then the pot is pushed, and only
         then does the result read out. */
      const shownBy = runShowdown(table, afterBoard);
      payOut(table, shownBy + 200);

      schedule(() => {
        playSound(table.lastNet > 0 ? "win" : table.lastNet < 0 ? "lose" : "click");
        set({
          waiting: false,
          history: [summary, ...get().history].slice(0, 60),
          reviewSummary: summary,
          reviewOpen: state.mode === "learn" && decisions.length > 0,
        });
        useDealer.getState().enter("idle");
      }, shownBy + 320);

      set({ waiting: true });
      return;
    }

    const acting = engine.currentPlayer(table);
    if (!acting || acting.isHuman) {
      /* The human may act as soon as the cards for this street are down. */
      if (afterBoard > 0) {
        set({ waiting: true });
        schedule(() => set({ waiting: false }), afterBoard);
      } else {
        set({ waiting: false });
      }
      return;
    }

    set({ waiting: true });
    schedule(() => {
      const current = get().table;
      if (!current) return;
      const action = decideAction(current);
      playSound(action.type === "fold" ? "click" : "chip");
      pump(engine.applyAction(current, action));
    }, afterBoard + thinkingTime());
  }

  return {
    status: "setup",
    mode: "learn",
    startingStack: 0,
    startedAt: 0,
    endedAt: null,
    table: null,
    history: [],
    reviewOpen: false,
    reviewSummary: null,
    waiting: false,
    reveal: EMPTY_REVEAL,
    dealing: false,
    potShown: 0,

    start: (config) => {
      clearTimers();
      const table = engine.createTable({
        stack: config.stack,
        smallBlind: config.smallBlind,
        bigBlind: config.bigBlind,
        opponents: engine.DEFAULT_OPPONENTS,
      });
      set({
        status: "playing",
        mode: config.mode,
        startingStack: config.stack,
        startedAt: Date.now(),
        endedAt: null,
        table,
        history: [],
        reviewOpen: false,
        reviewSummary: null,
        waiting: false,
        reveal: EMPTY_REVEAL,
        dealing: false,
        potShown: 0,
      });
    },

    deal: () => {
      const table = get().table;
      if (!table || get().waiting) return;
      clearTimers();
      const human = engine.humanPlayer(table);
      if (human.stack <= 0) {
        set({ status: "summary", endedAt: Date.now(), reviewOpen: false });
        return;
      }
      useDealer.getState().enter("preparing");
      set({ reviewOpen: false, reviewSummary: null, reveal: EMPTY_REVEAL, potShown: 0 });
      pump(engine.startHand(table));
    },

    act: (action) => {
      const state = get();
      const table = state.table;
      if (!table || state.waiting || state.dealing) return;
      const acting = engine.currentPlayer(table);
      if (!acting?.isHuman) return;
      playSound(action.type === "fold" ? "click" : "chip");
      pump(engine.applyAction(table, action));
    },

    openReview: () => set({ reviewOpen: true }),
    closeReview: () => set({ reviewOpen: false }),

    endSession: () => {
      clearTimers();
      useDealer.getState().reset();
      set({
        status: "summary",
        endedAt: Date.now(),
        reviewOpen: false,
        waiting: false,
        dealing: false,
      });
    },

    leaveSession: () => {
      clearTimers();
      useDealer.getState().reset();
      set({
        status: "setup",
        table: null,
        history: [],
        endedAt: null,
        reviewOpen: false,
        reviewSummary: null,
        waiting: false,
        reveal: EMPTY_REVEAL,
        dealing: false,
        potShown: 0,
      });
    },
  };
});
