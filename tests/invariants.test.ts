import { describe, expect, it } from "vitest";
import * as bj from "@/lib/games/blackjack/engine";
import { BlackjackState, PlayerAction } from "@/lib/games/blackjack/types";
import { calculateHandValue, isBlackjack } from "@/lib/games/blackjack/hand";
import { recommendAction } from "@/lib/strategy/blackjack-strategy";
import * as poker from "@/lib/games/poker/engine";
import { decideAction } from "@/lib/games/poker/ai";
import { dealRound, settleBet, DEFAULT_BACCARAT_RULES, createBaccaratShoe } from "@/lib/games/baccarat/engine";
import { settleBets, spin, RouletteBet, numbersForOutside, PAYOUTS } from "@/lib/games/roulette/engine";

/**
 * Randomised invariant tests.
 *
 * These play a large number of real rounds through each engine and assert the
 * properties that must hold no matter which cards come out: money is conserved,
 * bankrolls never go negative, and every round terminates.
 */

const ROUNDS = 400;

function pickAction(actions: PlayerAction[], roll: number): PlayerAction {
  return actions[Math.floor(roll * actions.length) % actions.length];
}

describe("blackjack money conservation", () => {
  it("keeps the bankroll consistent with the net of every settled round", () => {
    const start = 10_000;
    let state = bj.createInitialState({ bankroll: start, rules: { minBet: 5, maxBet: 200 } });
    let netTotal = 0;
    let rounds = 0;

    for (let round = 0; round < ROUNDS; round++) {
      if (state.bankroll < state.rules.minBet) break;

      const bet = Math.min(
        state.rules.minBet + Math.floor(Math.random() * 4) * 25,
        Math.min(state.rules.maxBet, state.bankroll),
      );
      state = bj.setBet(state, bet);
      if (!bj.canDeal(state)) break;
      state = bj.deal(state);

      // Insurance decision, when offered.
      if (state.phase === "insurance") {
        state = Math.random() < 0.5 ? bj.takeInsurance(state) : bj.declineInsurance(state);
      }

      // Play out every player hand with a hard step cap to catch non-termination.
      let steps = 0;
      while (state.phase === "player") {
        const actions = bj.availableActions(state);
        expect(actions.length).toBeGreaterThan(0);
        state = bj[
          ({
            hit: "hit",
            stand: "stand",
            double: "doubleDown",
            split: "splitHand",
            surrender: "surrender",
          } as const)[pickAction(actions, Math.random())]
        ](state);
        steps += 1;
        expect(steps).toBeLessThan(80);
      }

      expect(state.phase).toBe("settled");
      expect(state.bankroll).toBeGreaterThanOrEqual(0);

      netTotal += bj.netForRound(state);
      rounds += 1;
      state = bj.nextRound(state);
    }

    expect(rounds).toBeGreaterThan(20);
    expect(state.bankroll).toBeCloseTo(start + netTotal, 6);
  });

  it("never leaves a hand unresolved or a dealer hand short of the drawing rule", () => {
    for (let round = 0; round < 200; round++) {
      let state = bj.createInitialState({
        bankroll: 5_000,
        rules: { dealerHitsSoft17: round % 2 === 0 },
      });
      state = bj.setBet(state, 25);
      state = bj.deal(state);
      if (state.phase === "insurance") state = bj.declineInsurance(state);

      let steps = 0;
      while (state.phase === "player") {
        const actions = bj.availableActions(state);
        // Play basic strategy so split-heavy branches get real coverage.
        const hand = bj.activeHand(state)!;
        const recommended = recommendAction({
          playerCards: hand.cards,
          dealerUpcard: state.dealer.cards[0],
          rules: state.rules,
          available: actions,
        }).action;
        state = bj[
          ({
            hit: "hit",
            stand: "stand",
            double: "doubleDown",
            split: "splitHand",
            surrender: "surrender",
          } as const)[recommended]
        ](state);
        steps += 1;
        expect(steps).toBeLessThan(80);
      }

      expect(state.hands.every((hand) => hand.resolved)).toBe(true);
      expect(state.results).toHaveLength(state.hands.length);

      // The dealer only plays out a hand when something is still live and not
      // already settled as a natural. A player blackjack pays immediately, so
      // the dealer never draws behind it.
      const anyContested = state.hands.some(
        (hand) =>
          !hand.surrendered &&
          !calculateHandValue(hand.cards).busted &&
          !isBlackjack(hand),
      );
      if (anyContested) {
        expect(bj.shouldDealerDraw(state.dealer.cards, state.rules.dealerHitsSoft17)).toBe(false);
      }
    }
  });

  it("never offers an action the player cannot pay for", () => {
    for (let round = 0; round < 150; round++) {
      let state: BlackjackState = bj.createInitialState({
        bankroll: 60,
        rules: { minBet: 5, maxBet: 500 },
      });
      state = bj.setBet(state, 50);
      state = bj.deal(state);
      if (state.phase === "insurance") state = bj.declineInsurance(state);

      let steps = 0;
      while (state.phase === "player") {
        const actions = bj.availableActions(state);
        const hand = bj.activeHand(state)!;
        if (actions.includes("double") || actions.includes("split")) {
          expect(state.bankroll).toBeGreaterThanOrEqual(hand.bet);
        }
        state = bj[
          ({
            hit: "hit",
            stand: "stand",
            double: "doubleDown",
            split: "splitHand",
            surrender: "surrender",
          } as const)[pickAction(actions, Math.random())]
        ](state);
        steps += 1;
        expect(steps).toBeLessThan(80);
      }
      expect(state.bankroll).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("poker chip conservation", () => {
  it("conserves total chips across a full hand and empties the pot", () => {
    let state = poker.createTable({
      stack: 1_000,
      smallBlind: 5,
      bigBlind: 10,
      opponents: poker.DEFAULT_OPPONENTS,
    });
    const totalChips = state.players.reduce((sum, player) => sum + player.stack, 0);

    for (let hand = 0; hand < 120; hand++) {
      const eligible = state.players.filter((player) => player.stack > 0);
      if (eligible.length < 2) break;

      state = poker.startHand(state);
      if (state.street === "complete") break;

      let steps = 0;
      while (state.street !== "complete") {
        const actor = poker.currentPlayer(state)!;
        const limits = poker.betLimits(state);
        const legal = poker.legalActions(state);
        expect(legal.length).toBeGreaterThan(0);

        // Bet sizing must always be inside the legal band.
        if (legal.includes("raise")) {
          expect(limits.minTo).toBeLessThanOrEqual(limits.maxTo);
        }

        if (actor.isHuman) {
          const roll = Math.random();
          if (roll < 0.15) state = poker.applyAction(state, { type: "fold" });
          else if (roll < 0.75) {
            state = poker.applyAction(state, {
              type: limits.canCheck ? "check" : "call",
            });
          } else if (legal.includes("raise")) {
            const to = Math.min(
              limits.maxTo,
              limits.minTo + Math.floor(Math.random() * state.bigBlind * 4),
            );
            state = poker.applyAction(state, { type: "raise", to });
          } else {
            state = poker.applyAction(state, { type: limits.canCheck ? "check" : "call" });
          }
        } else {
          state = poker.applyAction(state, decideAction(state));
        }

        steps += 1;
        expect(steps).toBeLessThan(400);
      }

      const after = state.players.reduce((sum, player) => sum + player.stack, 0);
      expect(after).toBe(totalChips);
      expect(state.players.every((player) => player.stack >= 0)).toBe(true);
    }
  });

  it("awards every chip in the pot at showdown", () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      let state = poker.createTable({
        stack: 200,
        smallBlind: 5,
        bigBlind: 10,
        opponents: poker.DEFAULT_OPPONENTS,
      });
      state = poker.startHand(state);

      let steps = 0;
      while (state.street !== "complete") {
        const limits = poker.betLimits(state);
        const legal = poker.legalActions(state);
        // Everyone jams, which forces main pot and side pot construction.
        // Once a player is priced in for their whole stack, raising is no
        // longer legal and calling is the all-in.
        state = legal.includes("raise")
          ? poker.applyAction(state, { type: "raise", to: limits.maxTo })
          : poker.applyAction(state, { type: limits.canCheck ? "check" : "call" });
        steps += 1;
        if (steps > 400) throw new Error("hand did not terminate");
      }

      const distributed = (state.showdown?.awards ?? []).reduce(
        (sum, award) => sum + award.amount,
        0,
      );
      expect(distributed).toBe(state.pot);
      expect(state.players.reduce((sum, player) => sum + player.stack, 0)).toBe(800);
    }
  });
});

describe("baccarat", () => {
  it("never deals more than three cards a side and settles consistently", () => {
    let shoe = createBaccaratShoe(DEFAULT_BACCARAT_RULES);
    for (let round = 0; round < 600; round++) {
      const result = dealRound(shoe);
      shoe = result.shoe;
      const { round: hand } = result;

      expect(hand.playerCards.length).toBeGreaterThanOrEqual(2);
      expect(hand.playerCards.length).toBeLessThanOrEqual(3);
      expect(hand.bankerCards.length).toBeGreaterThanOrEqual(2);
      expect(hand.bankerCards.length).toBeLessThanOrEqual(3);
      expect(hand.playerTotal).toBeGreaterThanOrEqual(0);
      expect(hand.playerTotal).toBeLessThanOrEqual(9);
      expect(hand.bankerTotal).toBeLessThanOrEqual(9);

      // A natural always ends the round on two cards a side.
      if (hand.natural) {
        expect(hand.playerCards).toHaveLength(2);
        expect(hand.bankerCards).toHaveLength(2);
      }

      for (const bet of ["player", "banker", "tie"] as const) {
        const settlement = settleBet(bet, 100, hand, DEFAULT_BACCARAT_RULES);
        expect(settlement.returned).toBeGreaterThanOrEqual(0);
        expect(settlement.net).toBeCloseTo(settlement.returned - 100, 6);
        if (hand.outcome === "tie" && bet !== "tie") expect(settlement.pushed).toBe(true);
      }
    }
  });
});

describe("roulette", () => {
  it("settles every bet type against the pocket that actually landed", () => {
    const outsides = ["red", "black", "odd", "even", "low", "high"] as const;

    for (const variant of ["european", "american"] as const) {
      for (let round = 0; round < 300; round++) {
        const pocket = spin(variant);
        const bets: RouletteBet[] = [
          ...outsides.map((type, index) => ({
            id: `o-${index}`,
            type,
            numbers: numbersForOutside(type),
            amount: 10,
            label: type,
          })),
          { id: "s", type: "straight" as const, numbers: [17], amount: 10, label: "17" },
          {
            id: "d",
            type: "dozen" as const,
            numbers: numbersForOutside("dozen", 0),
            amount: 10,
            label: "1st 12",
          },
        ];

        const settlements = settleBets(bets, pocket);
        for (const settlement of settlements) {
          if (settlement.won) {
            expect(settlement.returned).toBe(10 + 10 * PAYOUTS[settlement.bet.type]);
          } else {
            expect(settlement.returned).toBe(0);
            expect(settlement.net).toBe(-10);
          }
        }

        // Zero and double zero must lose every outside bet.
        if (pocket === 0 || pocket === "00") {
          const outsideResults = settlements.filter((entry) =>
            (outsides as readonly string[]).includes(entry.bet.type),
          );
          expect(outsideResults.every((entry) => !entry.won)).toBe(true);
        } else {
          // Red and black are mutually exclusive and exhaustive on a number.
          const red = settlements.find((entry) => entry.bet.type === "red")!;
          const black = settlements.find((entry) => entry.bet.type === "black")!;
          expect(red.won !== black.won).toBe(true);
        }
      }
    }
  });
});
