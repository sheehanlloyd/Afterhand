import { describe, expect, it } from "vitest";
import {
  calculateHandValue,
  isBlackjack,
  isPair,
  softLabel,
  createHand,
} from "@/lib/games/blackjack/hand";
import { cards } from "./helpers";

describe("calculateHandValue", () => {
  it("adds number cards at face value", () => {
    expect(calculateHandValue(cards("5H", "9C")).total).toBe(14);
  });

  it("counts face cards as ten", () => {
    expect(calculateHandValue(cards("KH", "QC")).total).toBe(20);
    expect(calculateHandValue(cards("JH", "3C")).total).toBe(13);
  });

  it("counts a single ace as eleven when it fits", () => {
    const value = calculateHandValue(cards("AH", "4C"));
    expect(value.total).toBe(15);
    expect(value.soft).toBe(true);
    expect(value.hardTotal).toBe(5);
  });

  it("demotes the ace when eleven would bust", () => {
    const value = calculateHandValue(cards("AH", "9C", "5D"));
    expect(value.total).toBe(15);
    expect(value.soft).toBe(false);
  });

  it("handles multiple aces", () => {
    expect(calculateHandValue(cards("AH", "AC")).total).toBe(12);
    expect(calculateHandValue(cards("AH", "AC", "AD")).total).toBe(13);
    expect(calculateHandValue(cards("AH", "AC", "AD", "AS")).total).toBe(14);
    expect(calculateHandValue(cards("AH", "AC", "9D")).total).toBe(21);
    expect(calculateHandValue(cards("AH", "AC", "9D", "5S")).total).toBe(16);
  });

  it("keeps exactly one ace soft", () => {
    const value = calculateHandValue(cards("AH", "AC", "5D"));
    expect(value.total).toBe(17);
    expect(value.soft).toBe(true);
  });

  it("reports a bust", () => {
    const value = calculateHandValue(cards("KH", "QC", "5D"));
    expect(value.busted).toBe(true);
    expect(value.total).toBe(25);
  });
});

describe("blackjack detection", () => {
  it("recognises a two card twenty one", () => {
    const hand = createHand({ id: "h", bet: 10, cards: cards("AH", "KC") });
    expect(isBlackjack(hand)).toBe(true);
  });

  it("rejects three card twenty one", () => {
    const hand = createHand({ id: "h", bet: 10, cards: cards("7H", "4C", "KD") });
    expect(isBlackjack(hand)).toBe(false);
  });

  it("rejects twenty one made from a split", () => {
    const hand = createHand({
      id: "h",
      bet: 10,
      cards: cards("AH", "KC"),
      fromSplit: true,
    });
    expect(isBlackjack(hand)).toBe(false);
  });
});

describe("pairs and labels", () => {
  it("treats any two ten value cards as a pair", () => {
    expect(isPair(cards("KH", "10C"))).toBe(true);
    expect(isPair(cards("QH", "JC"))).toBe(true);
    expect(isPair(cards("9H", "10C"))).toBe(false);
  });

  it("labels soft hands only", () => {
    expect(softLabel(cards("AH", "4C"))).toBe("Soft 15");
    expect(softLabel(cards("9H", "4C"))).toBeNull();
  });
});
