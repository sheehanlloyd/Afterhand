import { describe, expect, it } from "vitest";
import { compareHands, evaluateHand } from "@/lib/games/poker/evaluator";
import { estimateEquity } from "@/lib/games/poker/equity";
import { cards } from "./helpers";

function evalOf(...notations: string[]) {
  return evaluateHand(cards(...notations));
}

describe("hand categories", () => {
  it("finds a royal flush", () => {
    const hand = evalOf("AS", "KS", "QS", "JS", "10S", "2H", "3D");
    expect(hand.categoryName).toBe("Straight flush");
    expect(hand.description).toBe("Royal flush");
  });

  it("finds a wheel straight flush", () => {
    const hand = evalOf("AS", "2S", "3S", "4S", "5S", "KH", "QD");
    expect(hand.categoryName).toBe("Straight flush");
    expect(hand.score[1]).toBe(5);
  });

  it("finds four of a kind with the right kicker", () => {
    const hand = evalOf("9S", "9H", "9D", "9C", "KS", "2H", "3D");
    expect(hand.categoryName).toBe("Four of a kind");
    expect(hand.score).toEqual([7, 9, 13]);
  });

  it("finds a full house and prefers the higher trips", () => {
    const hand = evalOf("8S", "8H", "8D", "3C", "3S", "2H", "2D");
    expect(hand.description).toBe("Full house, Eights over Threes");
  });

  it("builds a full house from two sets of trips", () => {
    const hand = evalOf("8S", "8H", "8D", "5C", "5S", "5H", "2D");
    expect(hand.score).toEqual([6, 8, 5]);
  });

  it("finds a flush and keeps the top five", () => {
    const hand = evalOf("AH", "9H", "7H", "4H", "2H", "KS", "QD");
    expect(hand.categoryName).toBe("Flush");
    expect(hand.score).toEqual([5, 14, 9, 7, 4, 2]);
  });

  it("finds a wheel straight", () => {
    const hand = evalOf("AS", "2H", "3D", "4C", "5S", "KH", "QD");
    expect(hand.categoryName).toBe("Straight");
    expect(hand.score[1]).toBe(5);
  });

  it("prefers the higher straight when both are present", () => {
    const hand = evalOf("6S", "7H", "8D", "9C", "10S", "JH", "2D");
    expect(hand.score[1]).toBe(11);
  });

  it("finds three of a kind", () => {
    const hand = evalOf("QS", "QH", "QD", "9C", "5S", "3H", "2D");
    expect(hand.score).toEqual([3, 12, 9, 5]);
  });

  it("finds two pair with the best two pairs", () => {
    const hand = evalOf("QS", "QH", "9D", "9C", "5S", "5H", "KD");
    expect(hand.score).toEqual([2, 12, 9, 13]);
  });

  it("finds one pair", () => {
    const hand = evalOf("QS", "QH", "9D", "7C", "5S", "3H", "2D");
    expect(hand.score).toEqual([1, 12, 9, 7, 5]);
  });

  it("falls back to high card", () => {
    const hand = evalOf("AS", "JH", "9D", "7C", "5S", "3H", "2D");
    expect(hand.categoryName).toBe("High card");
    expect(hand.score).toEqual([0, 14, 11, 9, 7, 5]);
  });

  it("always returns five cards", () => {
    for (const hand of [
      evalOf("AS", "KS", "QS", "JS", "10S", "2H", "3D"),
      evalOf("9S", "9H", "9D", "9C", "KS", "2H", "3D"),
      evalOf("AS", "2H", "3D", "4C", "5S", "KH", "QD"),
      evalOf("QS", "QH", "9D", "9C", "5S", "5H", "KD"),
    ]) {
      expect(hand.cards).toHaveLength(5);
    }
  });
});

describe("comparisons", () => {
  it("ranks categories in the right order", () => {
    const order = [
      evalOf("AS", "KS", "QS", "JS", "10S", "2H", "3D"),
      evalOf("9S", "9H", "9D", "9C", "KS", "2H", "3D"),
      evalOf("8S", "8H", "8D", "3C", "3S", "2H", "7D"),
      evalOf("AH", "9H", "7H", "4H", "2H", "KS", "QD"),
      evalOf("6S", "7H", "8D", "9C", "10S", "2H", "3D"),
      evalOf("QS", "QH", "QD", "9C", "5S", "3H", "2D"),
      evalOf("QS", "QH", "9D", "9C", "5S", "3H", "2D"),
      evalOf("QS", "QH", "9D", "7C", "5S", "3H", "2D"),
      evalOf("AS", "JH", "9D", "7C", "5S", "3H", "2D"),
    ];
    for (let i = 0; i < order.length - 1; i++) {
      expect(compareHands(order[i], order[i + 1])).toBeGreaterThan(0);
    }
  });

  it("splits identical hands", () => {
    const a = evalOf("AS", "KH", "QD", "JC", "10S", "3H", "2D");
    const b = evalOf("AH", "KS", "QC", "JD", "10H", "4H", "5D");
    expect(compareHands(a, b)).toBe(0);
  });

  it("breaks a flush tie on the fifth card", () => {
    const a = evalOf("AH", "9H", "7H", "4H", "3H", "KS", "QD");
    const b = evalOf("AH", "9H", "7H", "4H", "2H", "KS", "QD");
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });
});

describe("equity", () => {
  it("gives aces a large edge against one random hand", () => {
    const result = estimateEquity(cards("AS", "AH"), [], 1, 1200);
    expect(result.equity).toBeGreaterThan(0.78);
    expect(result.equity).toBeLessThan(0.92);
  });

  it("gives a weak hand less than half", () => {
    const result = estimateEquity(cards("7S", "2H"), [], 1, 1200);
    expect(result.equity).toBeLessThan(0.42);
  });

  it("drops equity as opponents are added", () => {
    const heads = estimateEquity(cards("KS", "KH"), [], 1, 800).equity;
    const three = estimateEquity(cards("KS", "KH"), [], 3, 800).equity;
    expect(three).toBeLessThan(heads);
  });

  it("recognises a locked hand on the river", () => {
    const result = estimateEquity(
      cards("AS", "KS"),
      cards("QS", "JS", "10S", "2H", "3D"),
      1,
      300,
    );
    expect(result.equity).toBe(1);
  });
});
