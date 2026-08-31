"use client";

import { create } from "zustand";
import { Card, GameMode } from "@/types";
import {
  BlackjackRules,
  BlackjackState,
  DecisionRecord,
  HandResult,
} from "@/lib/games/blackjack/types";
import * as engine from "@/lib/games/blackjack/engine";
import { calculateHandValue } from "@/lib/games/blackjack/hand";
import { bettingNote } from "@/lib/strategy/blackjack-coach";
import { applyDecisions, loadBlackjackLearning, saveBlackjackLearning } from "@/lib/storage/learning";
import { playSound } from "@/lib/sound";
import { readSession, removeSession, writeSession } from "@/lib/storage/storage";

const RECOVERY_KEY = "afterhand.session.blackjack";

export interface HandSummary {
  number: number;
  dealerCards: Card[];
  playerHands: Array<{ id: string; cards: Card[]; bet: number; total: number }>;
  results: HandResult[];
  decisions: DecisionRecord[];
  net: number;
  note: string | null;
}

export interface SessionConfig {
  bankroll: number;
  mode: GameMode;
  rules: BlackjackRules;
}

interface RecoveryPayload {
  bankroll: number;
  startingBankroll: number;
  mode: GameMode;
  rules: BlackjackRules;
  startedAt: number;
  handNumber: number;
}

type Status = "setup" | "playing" | "summary";

interface BlackjackSessionStore {
  status: Status;
  mode: GameMode;
  rules: BlackjackRules;
  startingBankroll: number;
  startedAt: number;
  endedAt: number | null;
  game: BlackjackState | null;
  history: HandSummary[];
  /** Reveal choreography. */
  dealerShown: number;
  holeUp: boolean;
  resultVisible: boolean;
  revealing: boolean;
  reviewOpen: boolean;
  reviewSummary: HandSummary | null;
  recoveryAvailable: RecoveryPayload | null;

  checkRecovery: () => void;
  resumeRecovered: () => void;
  discardRecovery: () => void;
  start: (config: SessionConfig) => void;
  addChip: (amount: number) => void;
  setBet: (amount: number) => void;
  clearBet: () => void;
  repeatBet: () => void;
  deal: () => void;
  act: (action: "hit" | "stand" | "double" | "split" | "surrender") => void;
  insurance: (take: boolean) => void;
  nextHand: () => void;
  openReview: () => void;
  closeReview: () => void;
  endSession: () => void;
  restartSession: () => void;
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

function buildSummary(game: BlackjackState, startingBankroll: number): HandSummary {
  const largestBet = game.hands.reduce((max, hand) => Math.max(max, hand.bet), 0);
  return {
    number: game.handNumber,
    dealerCards: game.dealer.cards,
    playerHands: game.hands.map((hand) => ({
      id: hand.id,
      cards: hand.cards,
      bet: hand.bet,
      total: calculateHandValue(hand.cards).total,
    })),
    results: game.results,
    decisions: game.decisions,
    net: engine.netForRound(game),
    note: bettingNote(largestBet, startingBankroll),
  };
}

export const useBlackjackSession = create<BlackjackSessionStore>((set, get) => {
  function persistRecovery(state: Partial<BlackjackSessionStore> & { game?: BlackjackState | null }) {
    const current = { ...get(), ...state };
    if (current.status !== "playing" || !current.game) return;
    const payload: RecoveryPayload = {
      bankroll: current.game.bankroll,
      startingBankroll: current.startingBankroll,
      mode: current.mode,
      rules: current.rules,
      startedAt: current.startedAt,
      handNumber: current.game.handNumber,
    };
    writeSession(RECOVERY_KEY, payload);
  }

  /** Runs the dealer reveal, then shows the outcome and stores the review. */
  function runSettleSequence(game: BlackjackState) {
    clearTimers();
    const extras = Math.max(0, game.dealer.cards.length - 2);
    set({ dealerShown: 2, holeUp: false, resultVisible: false, revealing: true });

    let elapsed = 320;
    schedule(() => {
      set({ holeUp: true });
      playSound("flip");
    }, elapsed);

    for (let index = 0; index < extras; index++) {
      elapsed += 420;
      const shown = 3 + index;
      schedule(() => {
        set({ dealerShown: shown });
        playSound("deal");
      }, elapsed);
    }

    elapsed += 430;
    schedule(() => {
      const state = get();
      const summary = buildSummary(game, state.startingBankroll);
      if (state.mode === "learn" && summary.decisions.length > 0) {
        saveBlackjackLearning(applyDecisions(loadBlackjackLearning(), summary.decisions));
      }
      playSound(summary.net > 0 ? "win" : summary.net < 0 ? "lose" : "click");
      set({
        resultVisible: true,
        revealing: false,
        history: [summary, ...state.history].slice(0, 60),
        reviewSummary: summary,
        reviewOpen: state.mode === "learn" && summary.decisions.length > 0,
      });
      persistRecovery({});
    }, elapsed);
  }

  function applyGame(next: BlackjackState, previous: BlackjackState | null) {
    if (next === previous) return;
    if (next.phase === "settled") {
      set({ game: next });
      runSettleSequence(next);
      return;
    }
    set({
      game: next,
      dealerShown: next.dealer.cards.length,
      holeUp: next.dealer.holeRevealed,
      resultVisible: false,
      revealing: false,
    });
  }

  return {
    status: "setup",
    mode: "learn",
    rules: {} as BlackjackRules,
    startingBankroll: 0,
    startedAt: 0,
    endedAt: null,
    game: null,
    history: [],
    dealerShown: 0,
    holeUp: false,
    resultVisible: false,
    revealing: false,
    reviewOpen: false,
    reviewSummary: null,
    recoveryAvailable: null,

    checkRecovery: () => {
      if (get().status !== "setup") return;
      const payload = readSession<RecoveryPayload>(RECOVERY_KEY);
      if (payload && typeof payload.bankroll === "number" && payload.bankroll > 0) {
        set({ recoveryAvailable: payload });
      }
    },

    resumeRecovered: () => {
      const payload = get().recoveryAvailable;
      if (!payload) return;
      const game = engine.createInitialState({
        bankroll: payload.bankroll,
        rules: payload.rules,
      });
      set({
        status: "playing",
        mode: payload.mode,
        rules: payload.rules,
        startingBankroll: payload.startingBankroll,
        startedAt: payload.startedAt,
        endedAt: null,
        game: { ...game, handNumber: payload.handNumber },
        history: [],
        recoveryAvailable: null,
        reviewOpen: false,
        reviewSummary: null,
      });
    },

    discardRecovery: () => {
      removeSession(RECOVERY_KEY);
      set({ recoveryAvailable: null });
    },

    start: (config) => {
      clearTimers();
      const game = engine.createInitialState({ bankroll: config.bankroll, rules: config.rules });
      set({
        status: "playing",
        mode: config.mode,
        rules: game.rules,
        startingBankroll: config.bankroll,
        startedAt: Date.now(),
        endedAt: null,
        game,
        history: [],
        dealerShown: 0,
        holeUp: false,
        resultVisible: false,
        revealing: false,
        reviewOpen: false,
        reviewSummary: null,
        recoveryAvailable: null,
      });
      persistRecovery({});
    },

    addChip: (amount) => {
      const game = get().game;
      if (!game) return;
      const next = engine.addToBet(game, amount);
      if (next !== game) playSound("chip");
      set({ game: next });
    },

    setBet: (amount) => {
      const game = get().game;
      if (!game) return;
      set({ game: engine.setBet(game, amount) });
    },

    clearBet: () => {
      const game = get().game;
      if (!game) return;
      playSound("click");
      set({ game: engine.clearBet(game) });
    },

    repeatBet: () => {
      const state = get();
      const game = state.game;
      if (!game) return;
      const last = state.history[0];
      if (!last) return;
      const amount = last.playerHands[0]?.bet ?? 0;
      set({ game: engine.setBet(game, amount) });
      playSound("chip");
    },

    deal: () => {
      const state = get();
      const game = state.game;
      if (!game || state.revealing || !engine.canDeal(game)) return;
      playSound("deal");
      applyGame(engine.deal(game), game);
      persistRecovery({});
    },

    act: (action) => {
      const state = get();
      const game = state.game;
      if (!game || state.revealing || game.phase !== "player") return;
      const map = {
        hit: engine.hit,
        stand: engine.stand,
        double: engine.doubleDown,
        split: engine.splitHand,
        surrender: engine.surrender,
      } as const;
      const next = map[action](game);
      if (next === game) return;
      playSound(action === "stand" || action === "surrender" ? "click" : "deal");
      applyGame(next, game);
    },

    insurance: (take) => {
      const state = get();
      const game = state.game;
      if (!game || game.phase !== "insurance") return;
      playSound("click");
      applyGame(take ? engine.takeInsurance(game) : engine.declineInsurance(game), game);
    },

    nextHand: () => {
      const state = get();
      const game = state.game;
      if (!game || state.revealing) return;
      clearTimers();
      if (game.bankroll < game.rules.minBet) {
        set({ status: "summary", endedAt: Date.now(), reviewOpen: false });
        removeSession(RECOVERY_KEY);
        return;
      }
      set({
        game: engine.nextRound(game),
        reviewOpen: false,
        resultVisible: false,
        holeUp: false,
        dealerShown: 0,
      });
      persistRecovery({});
    },

    openReview: () => set({ reviewOpen: true }),
    closeReview: () => set({ reviewOpen: false }),

    endSession: () => {
      clearTimers();
      removeSession(RECOVERY_KEY);
      set({ status: "summary", endedAt: Date.now(), reviewOpen: false, revealing: false });
    },

    restartSession: () => {
      const state = get();
      clearTimers();
      state.start({
        bankroll: state.startingBankroll,
        mode: state.mode,
        rules: state.rules,
      });
    },

    leaveSession: () => {
      clearTimers();
      removeSession(RECOVERY_KEY);
      set({
        status: "setup",
        game: null,
        history: [],
        endedAt: null,
        reviewOpen: false,
        reviewSummary: null,
        recoveryAvailable: null,
      });
    },
  };
});

export function sessionNet(store: {
  game: BlackjackState | null;
  startingBankroll: number;
}): number {
  if (!store.game) return 0;
  return store.game.bankroll - store.startingBankroll;
}
