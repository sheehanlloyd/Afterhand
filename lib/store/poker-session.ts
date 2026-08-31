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
import { playSound } from "@/lib/sound";

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
  /** Runs opponents until it is the human's turn or the hand is over. */
  function pump(table: PokerState) {
    set({ table });

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
      playSound(table.lastNet > 0 ? "win" : table.lastNet < 0 ? "lose" : "click");
      set({
        waiting: false,
        history: [summary, ...state.history].slice(0, 60),
        reviewSummary: summary,
        reviewOpen: state.mode === "learn" && decisions.length > 0,
      });
      return;
    }

    const acting = engine.currentPlayer(table);
    if (!acting || acting.isHuman) {
      set({ waiting: false });
      return;
    }

    set({ waiting: true });
    schedule(() => {
      const current = get().table;
      if (!current) return;
      const action = decideAction(current);
      playSound(action.type === "fold" ? "click" : "chip");
      pump(engine.applyAction(current, action));
    }, thinkingTime());
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
      playSound("deal");
      set({ reviewOpen: false, reviewSummary: null });
      pump(engine.startHand(table));
    },

    act: (action) => {
      const state = get();
      const table = state.table;
      if (!table || state.waiting) return;
      const acting = engine.currentPlayer(table);
      if (!acting?.isHuman) return;
      playSound(action.type === "fold" ? "click" : "chip");
      pump(engine.applyAction(table, action));
    },

    openReview: () => set({ reviewOpen: true }),
    closeReview: () => set({ reviewOpen: false }),

    endSession: () => {
      clearTimers();
      set({ status: "summary", endedAt: Date.now(), reviewOpen: false, waiting: false });
    },

    leaveSession: () => {
      clearTimers();
      set({
        status: "setup",
        table: null,
        history: [],
        endedAt: null,
        reviewOpen: false,
        reviewSummary: null,
        waiting: false,
      });
    },
  };
});
