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
import { playSound, playSoundIn } from "@/lib/sound";
import { readSession, removeSession, writeSession } from "@/lib/storage/storage";
import { cutCardReached } from "@/lib/games/deck";
import { useDealer } from "@/lib/store/dealer";
import {
  applyStep,
  clampCounts,
  emptyCounts,
  revealSteps,
  type RevealCounts,
} from "@/lib/motion/deal-order";
import { DURATION, RHYTHM } from "@/lib/motion/tokens";

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
  /** Reveal choreography: how much of the table has physically been dealt. */
  visible: RevealCounts;
  holeUp: boolean;
  /** True while the dealer is sweeping the finished hands into the tray. */
  collecting: boolean;
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

  function countsFor(game: BlackjackState): RevealCounts {
    const hands: Record<string, number> = {};
    for (const hand of game.hands) hands[hand.id] = hand.cards.length;
    return { dealer: game.dealer.cards.length, hands };
  }

  /**
   * Puts the cards the game says are on the table onto the table, in the order
   * a dealer would put them there.
   *
   * The engine hands us a finished position: both of the player's cards and
   * both of the dealer's, all at once. Showing them all at once is what makes
   * software tables feel like software. So the state is diffed against what is
   * physically on the felt and the difference is dealt out on a rhythm.
   *
   * Returns the time, in milliseconds from now, at which the last card lands.
   */
  function runReveal(game: BlackjackState, startAt: number): number {
    const target = countsFor(game);
    const base = clampCounts(get().visible, target);
    set({ visible: base });

    const steps = revealSteps(base, target, game.hands.map((hand) => hand.id));
    if (steps.length === 0) return startAt;

    let counts = base;
    let at = startAt;
    for (const step of steps) {
      counts = applyStep(counts, step);
      const snapshot = counts;
      schedule(() => {
        set({ visible: snapshot });
        playSound("deal");
        /* The card lands about four fifths of the way through its flight, and
           the felt should be heard at that moment rather than at the flick. */
        playSoundIn("land", Math.round(DURATION.deal * 780));
      }, at);
      at += RHYTHM.betweenCards + (step.kind === "dealer" ? RHYTHM.beforeDealer : 0);
    }

    return at - RHYTHM.betweenCards + DURATION.deal * 1000;
  }

  /** Runs the dealer reveal, then shows the outcome and stores the review. */
  function runSettleSequence(game: BlackjackState) {
    clearTimers();
    const target = countsFor(game);
    set({
      visible: clampCounts(get().visible, target),
      holeUp: false,
      resultVisible: false,
      revealing: true,
    });
    useDealer.getState().enter("revealing");

    /* The hole card is turned before the dealer draws to it, which is both what
       happens at a table and what gives the reveal its beat. */
    schedule(() => {
      set({ holeUp: true });
      playSound("flip");
    }, RHYTHM.beforeReveal);

    const drawn = runReveal(game, RHYTHM.beforeReveal + DURATION.flip * 1000 + 140);

    schedule(() => {
      const state = get();
      const summary = buildSummary(game, state.startingBankroll);
      if (state.mode === "learn" && summary.decisions.length > 0) {
        saveBlackjackLearning(applyDecisions(loadBlackjackLearning(), summary.decisions));
      }
      const blackjack = summary.results.some((entry) => entry.outcome === "blackjack");
      playSound(
        blackjack ? "bigWin" : summary.net > 0 ? "win" : summary.net < 0 ? "lose" : "click",
      );
      useDealer.getState().enter("idle");
      set({
        resultVisible: true,
        revealing: false,
        history: [summary, ...state.history].slice(0, 60),
        reviewSummary: summary,
        reviewOpen: state.mode === "learn" && summary.decisions.length > 0,
      });
      persistRecovery({});
    }, drawn + 300);
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
      holeUp: next.dealer.holeRevealed,
      resultVisible: false,
    });

    const lands = runReveal(next, 0);
    if (lands <= 0) {
      set({ revealing: false });
      return;
    }

    /* The controls stay locked until the last card is down. A hand you can act
       on before the dealer has finished dealing it is not a hand. */
    useDealer.getState().enter("dealing");
    set({ revealing: true });
    schedule(() => {
      set({ revealing: false });
      useDealer.getState().enter("waiting");
    }, lands);
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
    visible: emptyCounts(),
    holeUp: false,
    collecting: false,
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
        visible: emptyCounts(),
        holeUp: false,
        collecting: false,
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
      if (!game || state.revealing || state.collecting || !engine.canDeal(game)) return;

      /* The engine reshuffles silently when the cut card has come out. If that
         is about to happen, the dealer performs the shuffle first and the deal
         waits for it, because a shoe that reloads itself between one hand and
         the next is the least believable thing a card game can do. */
      const shuffling = game.shoe.needsShuffle || cutCardReached(game.shoe);
      const wait = shuffling ? useDealer.getState().shuffleSequence() : 0;

      if (shuffling) {
        set({ revealing: true });
        schedule(() => {
          const current = get().game;
          if (!current) return;
          useDealer.getState().enter("dealing");
          playSound("deal");
          applyGame(engine.deal(current), current);
          persistRecovery({});
        }, wait + 120);
        return;
      }

      useDealer.getState().enter("dealing");
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
      /* The dealer gathers the cards and pushes them into the tray. The next
         round does not begin until the felt is actually clear. */
      useDealer.getState().enter("collecting");
      playSound("sweep");
      set({ collecting: true, reviewOpen: false });

      const cards =
        game.dealer.cards.length +
        game.hands.reduce((total, hand) => total + hand.cards.length, 0);
      const sweep = DURATION.deal * 1000 + cards * RHYTHM.betweenCollect;

      schedule(() => {
        useDealer.getState().enter("idle");
        set({
          game: engine.nextRound(game),
          collecting: false,
          resultVisible: false,
          holeUp: false,
          visible: emptyCounts(),
        });
        persistRecovery({});
      }, sweep);
    },

    openReview: () => set({ reviewOpen: true }),
    closeReview: () => set({ reviewOpen: false }),

    endSession: () => {
      clearTimers();
      useDealer.getState().reset();
      removeSession(RECOVERY_KEY);
      set({
        status: "summary",
        endedAt: Date.now(),
        reviewOpen: false,
        revealing: false,
        collecting: false,
      });
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
      useDealer.getState().reset();
      removeSession(RECOVERY_KEY);
      set({
        status: "setup",
        game: null,
        visible: emptyCounts(),
        collecting: false,
        revealing: false,
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
