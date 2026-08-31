import { describe, expect, it } from "vitest";
import {
  applyAction,
  betLimits,
  buildPots,
  createTable,
  currentPlayer,
  legalActions,
  startHand,
} from "@/lib/games/poker/engine";
import { PokerPlayer, PokerState } from "@/lib/games/poker/types";

function table(stack = 1000): PokerState {
  return startHand(
    createTable({
      stack,
      smallBlind: 5,
      bigBlind: 10,
      opponents: [
        { name: "A", personality: "tight" },
        { name: "B", personality: "loose" },
        { name: "C", personality: "balanced" },
      ],
    }),
  );
}

function player(overrides: Partial<PokerPlayer>): PokerPlayer {
  return {
    id: "p",
    name: "P",
    isHuman: false,
    personality: "balanced",
    stack: 0,
    hole: [],
    folded: false,
    allIn: false,
    committed: 0,
    invested: 0,
    hasActed: false,
    revealed: false,
    ...overrides,
  };
}

describe("hand setup", () => {
  it("deals two cards to everyone and posts the blinds", () => {
    const state = table();
    expect(state.players.every((entry) => entry.hole.length === 2)).toBe(true);
    expect(state.pot).toBe(15);
    expect(state.currentBet).toBe(10);
    expect(state.street).toBe("preflop");
  });

  it("deals unique cards", () => {
    const state = table();
    const ids = state.players.flatMap((entry) => entry.hole).map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("starts the action to the left of the big blind", () => {
    const state = table();
    const acting = currentPlayer(state)!;
    expect(acting.committed).toBe(0);
    expect(acting.folded).toBe(false);
  });

  it("moves the button each hand", () => {
    const first = table();
    const second = startHand({ ...first, street: "complete" });
    expect(second.buttonIndex).not.toBe(first.buttonIndex);
    expect(second.handNumber).toBe(2);
  });
});

describe("legal actions and limits", () => {
  it("offers fold, call, and raise when facing a bet", () => {
    const state = table();
    expect(legalActions(state).sort()).toEqual(["call", "fold", "raise"]);
  });

  it("prices the call at the difference", () => {
    const state = table();
    expect(betLimits(state).toCall).toBe(10);
    expect(betLimits(state).minTo).toBe(20);
  });

  it("caps a raise at the stack", () => {
    const state = table(60);
    expect(betLimits(state).maxTo).toBe(60);
  });
});

describe("betting rounds", () => {
  it("moves to the flop once everyone has acted", () => {
    let state = table();
    state = applyAction(state, { type: "call" });
    state = applyAction(state, { type: "call" });
    state = applyAction(state, { type: "call" });
    expect(state.street).toBe("preflop");
    // Big blind still has the option.
    state = applyAction(state, { type: "check" });
    expect(state.street).toBe("flop");
    expect(state.board).toHaveLength(3);
    expect(state.pot).toBe(40);
    expect(state.currentBet).toBe(0);
  });

  it("reopens the action after a raise", () => {
    let state = table();
    state = applyAction(state, { type: "raise", to: 30 });
    expect(state.currentBet).toBe(30);
    expect(state.players.filter((entry) => entry.hasActed)).toHaveLength(1);
  });

  it("awards the pot when everyone folds", () => {
    let state = table();
    state = applyAction(state, { type: "fold" });
    state = applyAction(state, { type: "fold" });
    state = applyAction(state, { type: "fold" });
    expect(state.street).toBe("complete");
    expect(state.showdown?.uncontested).toBe(true);
    const winner = state.players.find(
      (entry) => entry.id === state.showdown!.awards[0].winners[0],
    )!;
    expect(winner.stack).toBeGreaterThan(1000);
  });

  it("runs the board out when everyone is all in", () => {
    let state = table(40);
    for (let i = 0; i < 10 && state.street !== "complete"; i++) {
      const limits = betLimits(state);
      state = limits.canRaise
        ? applyAction(state, { type: "raise", to: limits.maxTo })
        : applyAction(state, { type: "call" });
    }
    expect(state.street).toBe("complete");
    expect(state.board).toHaveLength(5);
    expect(state.showdown).not.toBeNull();
  });

  it("keeps chips conserved through a full hand", () => {
    let state = table();
    const before = state.players.reduce((sum, entry) => sum + entry.stack, 0) + state.pot;
    let guard = 0;
    while (state.street !== "complete" && guard < 80) {
      guard += 1;
      const actions = legalActions(state);
      state = applyAction(state, actions.includes("check") ? { type: "check" } : { type: "call" });
    }
    const after = state.players.reduce((sum, entry) => sum + entry.stack, 0);
    expect(after).toBe(before);
  });
});

describe("side pots", () => {
  it("splits contributions into a main pot and side pots", () => {
    const pots = buildPots([
      player({ id: "a", invested: 50 }),
      player({ id: "b", invested: 200 }),
      player({ id: "c", invested: 200 }),
    ]);
    expect(pots).toEqual([
      { amount: 150, eligible: ["a", "b", "c"] },
      { amount: 300, eligible: ["b", "c"] },
    ]);
  });

  it("excludes folded players from eligibility but keeps their chips", () => {
    const pots = buildPots([
      player({ id: "a", invested: 100, folded: true }),
      player({ id: "b", invested: 100 }),
      player({ id: "c", invested: 100 }),
    ]);
    expect(pots).toEqual([{ amount: 300, eligible: ["b", "c"] }]);
  });
});
