import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACCARAT_RULES,
  bankerDraws,
  dealRound,
  handTotal,
  isNatural,
  pointValue,
  settleBet,
} from "@/lib/games/baccarat/engine";
import { createShoe } from "@/lib/games/deck";
import { card, cards } from "./helpers";

describe("card values", () => {
  it("counts tens and faces as zero", () => {
    expect(pointValue(card("10H"))).toBe(0);
    expect(pointValue(card("KD"))).toBe(0);
    expect(pointValue(card("QS"))).toBe(0);
    expect(pointValue(card("JC"))).toBe(0);
  });

  it("counts an ace as one", () => {
    expect(pointValue(card("AH"))).toBe(1);
  });

  it("keeps only the last digit of a total", () => {
    expect(handTotal(cards("7H", "8D"))).toBe(5);
    expect(handTotal(cards("9H", "9D"))).toBe(8);
    expect(handTotal(cards("5H", "5D"))).toBe(0);
    expect(handTotal(cards("KH", "6D"))).toBe(6);
  });

  it("recognises a natural", () => {
    expect(isNatural(cards("9H", "KD"))).toBe(true);
    expect(isNatural(cards("5H", "3D"))).toBe(true);
    expect(isNatural(cards("5H", "2D"))).toBe(false);
    expect(isNatural(cards("5H", "3D", "AC"))).toBe(false);
  });
});

describe("banker third card rule", () => {
  it("draws on zero through two whatever the player showed", () => {
    for (const total of [0, 1, 2]) {
      expect(bankerDraws(total, card("9H"))).toBe(true);
      expect(bankerDraws(total, null)).toBe(true);
    }
  });

  it("stands on three only against an eight", () => {
    expect(bankerDraws(3, card("8H"))).toBe(false);
    expect(bankerDraws(3, card("7H"))).toBe(true);
    expect(bankerDraws(3, card("KH"))).toBe(true);
  });

  it("draws on four against two through seven", () => {
    expect(bankerDraws(4, card("2H"))).toBe(true);
    expect(bankerDraws(4, card("7H"))).toBe(true);
    expect(bankerDraws(4, card("AH"))).toBe(false);
    expect(bankerDraws(4, card("8H"))).toBe(false);
  });

  it("draws on five against four through seven", () => {
    expect(bankerDraws(5, card("4H"))).toBe(true);
    expect(bankerDraws(5, card("3H"))).toBe(false);
    expect(bankerDraws(5, card("8H"))).toBe(false);
  });

  it("draws on six against six or seven only", () => {
    expect(bankerDraws(6, card("6H"))).toBe(true);
    expect(bankerDraws(6, card("7H"))).toBe(true);
    expect(bankerDraws(6, card("5H"))).toBe(false);
  });

  it("always stands on seven", () => {
    for (const rank of ["AH", "5H", "9H", "KH"]) {
      expect(bankerDraws(7, card(rank))).toBe(false);
    }
  });

  it("uses the simple rule when the player stood", () => {
    expect(bankerDraws(5, null)).toBe(true);
    expect(bankerDraws(6, null)).toBe(false);
  });
});

describe("dealing", () => {
  it("produces a legal round from a real shoe", () => {
    let shoe = createShoe(8, 0.85);
    for (let i = 0; i < 200; i++) {
      const result = dealRound(shoe);
      shoe = result.shoe;
      const round = result.round;
      expect(round.playerCards.length).toBeGreaterThanOrEqual(2);
      expect(round.playerCards.length).toBeLessThanOrEqual(3);
      expect(round.bankerCards.length).toBeGreaterThanOrEqual(2);
      expect(round.bankerCards.length).toBeLessThanOrEqual(3);
      expect(round.playerTotal).toBeGreaterThanOrEqual(0);
      expect(round.playerTotal).toBeLessThanOrEqual(9);
      if (round.natural) {
        expect(round.playerCards).toHaveLength(2);
        expect(round.bankerCards).toHaveLength(2);
      }
      expect(round.notes.length).toBeGreaterThan(0);
    }
  });
});

describe("settlement", () => {
  const rules = DEFAULT_BACCARAT_RULES;
  const round = (outcome: "player" | "banker" | "tie") => ({
    playerCards: [],
    bankerCards: [],
    playerTotal: 0,
    bankerTotal: 0,
    outcome,
    notes: [],
    natural: false,
  });

  it("pays the player bet even money", () => {
    expect(settleBet("player", 100, round("player"), rules)).toMatchObject({
      net: 100,
      returned: 200,
    });
  });

  it("takes commission from a banker win", () => {
    expect(settleBet("banker", 100, round("banker"), rules)).toMatchObject({
      net: 95,
      returned: 195,
    });
  });

  it("pays a tie at eight to one", () => {
    expect(settleBet("tie", 100, round("tie"), rules)).toMatchObject({
      net: 800,
      returned: 900,
    });
  });

  it("pushes player and banker bets on a tie", () => {
    expect(settleBet("player", 100, round("tie"), rules)).toMatchObject({
      net: 0,
      returned: 100,
      pushed: true,
    });
  });

  it("loses a tie bet when a side wins", () => {
    expect(settleBet("tie", 100, round("banker"), rules).net).toBe(-100);
  });
});
