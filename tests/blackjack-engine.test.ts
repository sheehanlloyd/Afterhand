import { describe, expect, it } from "vitest";
import {
  availableActions,
  createInitialState,
  deal,
  declineInsurance,
  doubleDown,
  hit,
  netForRound,
  nextRound,
  setBet,
  settleHand,
  shouldDealerDraw,
  splitHand,
  stand,
  surrender,
  takeInsurance,
} from "@/lib/games/blackjack/engine";
import { BlackjackRules, BlackjackState, DEFAULT_RULES } from "@/lib/games/blackjack/types";
import { createHand } from "@/lib/games/blackjack/hand";
import { cards } from "./helpers";

/** Builds a state whose shoe deals the given cards in order. */
function stacked(
  sequence: string[],
  options: { bankroll?: number; bet?: number; rules?: Partial<BlackjackRules> } = {},
): BlackjackState {
  const base = createInitialState({
    bankroll: options.bankroll ?? 1000,
    rules: options.rules,
  });
  const scripted: BlackjackState = {
    ...base,
    shoe: { ...base.shoe, cards: cards(...sequence), position: 0 },
  };
  return setBet(scripted, options.bet ?? 100);
}

describe("dealing", () => {
  it("deals two cards each and takes the bet from the bankroll", () => {
    const state = deal(stacked(["9H", "7C", "8D", "6S"]));
    expect(state.hands[0].cards.map((c) => c.rank)).toEqual(["9", "8"]);
    expect(state.dealer.cards.map((c) => c.rank)).toEqual(["7", "6"]);
    expect(state.bankroll).toBe(900);
    expect(state.phase).toBe("player");
    expect(state.dealer.holeRevealed).toBe(false);
    expect(state.handNumber).toBe(1);
  });

  it("refuses to deal below the table minimum", () => {
    const state = setBet(stacked(["9H", "7C", "8D", "6S"]), 0);
    expect(deal(state).phase).toBe("betting");
  });

  it("caps the bet at the bankroll", () => {
    const state = setBet(stacked(["9H", "7C", "8D", "6S"], { bankroll: 60 }), 500);
    expect(state.pendingBet).toBe(60);
  });

  it("pays a natural immediately at three to two", () => {
    const state = deal(stacked(["AH", "7C", "KD", "6S"]));
    expect(state.phase).toBe("settled");
    expect(state.results[0].outcome).toBe("blackjack");
    expect(state.bankroll).toBe(1000 + 150);
  });

  it("pushes when both sides hold a natural", () => {
    const state = deal(stacked(["AH", "KC", "KD", "AS"]));
    expect(state.results[0].outcome).toBe("push");
    expect(state.bankroll).toBe(1000);
  });

  it("ends the hand when the dealer peeks into a blackjack", () => {
    const state = deal(stacked(["9H", "KC", "8D", "AS"]));
    expect(state.phase).toBe("settled");
    expect(state.dealer.holeRevealed).toBe(true);
    expect(state.results[0].outcome).toBe("lose");
  });

  it("does not peek behind a small upcard", () => {
    const state = deal(stacked(["9H", "6C", "8D", "5S"]));
    expect(state.phase).toBe("player");
  });
});

describe("available actions", () => {
  it("offers the full opening set on a fresh pair", () => {
    const state = deal(stacked(["8H", "6C", "8D", "5S"]));
    expect(availableActions(state).sort()).toEqual(
      ["double", "hit", "split", "stand", "surrender"].sort(),
    );
  });

  it("drops double and surrender after a hit", () => {
    const state = hit(deal(stacked(["5H", "6C", "4D", "5S", "3C"])));
    expect(availableActions(state).sort()).toEqual(["hit", "stand"]);
  });

  it("hides split when the bankroll cannot cover it", () => {
    const state = deal(stacked(["8H", "6C", "8D", "5S"], { bankroll: 120, bet: 100 }));
    expect(availableActions(state)).not.toContain("split");
    expect(availableActions(state)).not.toContain("double");
  });

  it("hides surrender when the rule is off", () => {
    const state = deal(
      stacked(["9H", "6C", "7D", "5S"], { rules: { surrender: "none" } }),
    );
    expect(availableActions(state)).not.toContain("surrender");
  });
});

describe("player actions", () => {
  it("busts and loses the bet", () => {
    let state = deal(stacked(["10H", "6C", "6D", "5S", "10C", "9D"]));
    state = hit(state);
    expect(state.phase).toBe("settled");
    expect(state.results[0].outcome).toBe("bust");
    expect(state.bankroll).toBe(900);
  });

  it("stops automatically on twenty one", () => {
    let state = deal(stacked(["10H", "6C", "6D", "5S", "5C", "9D", "8H"]));
    state = hit(state);
    expect(state.hands[0].resolved).toBe(true);
    expect(state.phase).toBe("settled");
  });

  it("doubles for one card and doubles the wager", () => {
    let state = deal(stacked(["6H", "6C", "5D", "5S", "9C", "10D"]));
    state = doubleDown(state);
    expect(state.hands[0].bet).toBe(200);
    expect(state.hands[0].cards).toHaveLength(3);
    expect(state.phase).toBe("settled");
    // Player 20, dealer 6 then 5 then 10 makes 21.
    expect(state.results[0].outcome).toBe("lose");
    expect(state.bankroll).toBe(800);
  });

  it("returns half the bet on surrender", () => {
    const state = surrender(deal(stacked(["10H", "10C", "6D", "7S"])));
    expect(state.results[0].outcome).toBe("surrender");
    expect(state.bankroll).toBe(950);
    expect(netForRound(state)).toBe(-50);
  });

  it("splits into two hands and deals one card to each", () => {
    let state = deal(stacked(["8H", "6C", "8D", "5S", "3C", "2D", "10H", "10C"]));
    state = splitHand(state);
    expect(state.hands).toHaveLength(2);
    expect(state.hands[0].cards.map((c) => c.rank)).toEqual(["8", "3"]);
    expect(state.hands[1].cards.map((c) => c.rank)).toEqual(["8", "2"]);
    expect(state.bankroll).toBe(800);
    expect(state.activeHandIndex).toBe(0);
  });

  it("gives split aces exactly one card each", () => {
    const state = splitHand(deal(stacked(["AH", "6C", "AD", "5S", "9C", "7D", "10H"])));
    expect(state.hands.every((hand) => hand.cards.length === 2)).toBe(true);
    expect(state.hands.every((hand) => hand.resolved)).toBe(true);
    expect(state.phase).toBe("settled");
  });

  it("moves to the second hand after the first stands", () => {
    let state = deal(stacked(["8H", "6C", "8D", "5S", "3C", "2D", "10H", "10C"]));
    state = splitHand(state);
    state = stand(state);
    expect(state.activeHandIndex).toBe(1);
    expect(state.phase).toBe("player");
  });

  it("respects the split hand limit", () => {
    let state = deal(
      stacked(
        ["8H", "6C", "8D", "5S", "8C", "8S", "8H", "8D", "8C", "8S", "2H", "3D"],
        { rules: { maxSplitHands: 2 } },
      ),
    );
    state = splitHand(state);
    expect(availableActions(state)).not.toContain("split");
  });
});

describe("insurance", () => {
  it("offers insurance against an ace", () => {
    const state = deal(stacked(["9H", "AC", "8D", "5S"]));
    expect(state.phase).toBe("insurance");
  });

  it("pays two to one when the dealer has blackjack", () => {
    let state = deal(stacked(["9H", "AC", "8D", "KS"]));
    state = takeInsurance(state);
    expect(state.insuranceResult).toBe("won");
    // Lost 100 on the hand, staked 50 on insurance and got back 150.
    expect(state.bankroll).toBe(1000 - 100 - 50 + 150);
    expect(netForRound(state)).toBe(0);
  });

  it("loses the side bet when the dealer has no blackjack", () => {
    let state = deal(stacked(["9H", "AC", "8D", "5S"]));
    state = takeInsurance(state);
    expect(state.phase).toBe("player");
    expect(state.insuranceResult).toBe("lost");
    expect(state.bankroll).toBe(850);
  });

  it("records a decision when insurance is declined", () => {
    const state = declineInsurance(deal(stacked(["9H", "AC", "8D", "5S"])));
    expect(state.decisions[0].category).toBe("insurance");
    expect(state.decisions[0].quality).toBe("optimal");
  });
});

describe("dealer play", () => {
  it("stands on soft seventeen by default", () => {
    expect(shouldDealerDraw(cards("AH", "6C"), false)).toBe(false);
    expect(shouldDealerDraw(cards("AH", "6C"), true)).toBe(true);
  });

  it("draws below seventeen", () => {
    expect(shouldDealerDraw(cards("10H", "6C"), false)).toBe(true);
    expect(shouldDealerDraw(cards("10H", "7C"), false)).toBe(false);
  });

  it("does not draw when every player hand is dead", () => {
    let state = deal(stacked(["10H", "5C", "6D", "2S", "10C", "9D"]));
    state = hit(state);
    expect(state.dealer.cards).toHaveLength(2);
  });

  it("draws to seventeen when a hand is live", () => {
    let state = deal(stacked(["10H", "5C", "8D", "2S", "9C", "6D"]));
    state = stand(state);
    // Dealer 5 and 2 makes 7, draws a 9 for 16, draws a 6 for 22.
    expect(state.dealer.cards).toHaveLength(4);
    expect(state.results[0].outcome).toBe("dealer-bust");
    expect(state.bankroll).toBe(1100);
  });
});

describe("settlement", () => {
  const rules = DEFAULT_RULES;

  it("pushes on equal totals", () => {
    const hand = createHand({ id: "h", bet: 50, cards: cards("10H", "9C") });
    expect(settleHand(hand, cards("10D", "9S"), rules)).toMatchObject({
      outcome: "push",
      returned: 50,
      net: 0,
    });
  });

  it("pays six to five when configured", () => {
    const hand = createHand({ id: "h", bet: 100, cards: cards("AH", "KC") });
    const result = settleHand(hand, cards("9D", "7S"), { ...rules, blackjackPayout: 1.2 });
    expect(result.net).toBe(120);
  });

  it("loses to a dealer natural even with twenty", () => {
    const hand = createHand({ id: "h", bet: 100, cards: cards("10H", "KC") });
    expect(settleHand(hand, cards("AD", "QS"), rules).outcome).toBe("lose");
  });
});

describe("round lifecycle", () => {
  it("returns to betting and keeps the last wager", () => {
    let state = deal(stacked(["10H", "10C", "9D", "9S"]));
    state = stand(state);
    const next = nextRound(state);
    expect(next.phase).toBe("betting");
    expect(next.hands).toHaveLength(0);
    expect(next.pendingBet).toBe(100);
    expect(next.handNumber).toBe(1);
  });
});
