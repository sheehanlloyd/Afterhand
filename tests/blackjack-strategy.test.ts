import { describe, expect, it } from "vitest";
import { recommendAction } from "@/lib/strategy/blackjack-strategy";
import { DEFAULT_RULES, PlayerAction } from "@/lib/games/blackjack/types";
import { dealerBustChance, bustChanceOnNextCard, standOutlook, dealerOutcomes } from "@/lib/strategy/odds";
import { reviewDecision } from "@/lib/strategy/blackjack-coach";
import { card, cards } from "./helpers";

const ALL: PlayerAction[] = ["hit", "stand", "double", "split", "surrender"];

function advise(
  hand: string[],
  upcard: string,
  available: PlayerAction[] = ALL,
  rules = DEFAULT_RULES,
) {
  return recommendAction({
    playerCards: cards(...hand),
    dealerUpcard: card(upcard),
    rules,
    available,
  }).action;
}

describe("hard totals", () => {
  it("hits small totals", () => {
    expect(advise(["5H", "3C"], "6D")).toBe("hit");
    expect(advise(["10H", "2C"], "10D")).toBe("hit");
  });

  it("doubles nine against three through six only", () => {
    expect(advise(["5H", "4C"], "2D")).toBe("hit");
    expect(advise(["5H", "4C"], "3D")).toBe("double");
    expect(advise(["5H", "4C"], "6D")).toBe("double");
    expect(advise(["5H", "4C"], "7D")).toBe("hit");
  });

  it("doubles ten except against ten or ace", () => {
    expect(advise(["6H", "4C"], "9D")).toBe("double");
    expect(advise(["6H", "4C"], "KD")).toBe("hit");
    expect(advise(["6H", "4C"], "AD")).toBe("hit");
  });

  it("doubles eleven against everything but an ace under stand on soft seventeen", () => {
    expect(advise(["6H", "5C"], "KD")).toBe("double");
    expect(advise(["6H", "5C"], "AD")).toBe("hit");
  });

  it("doubles eleven against an ace when the dealer hits soft seventeen", () => {
    expect(advise(["6H", "5C"], "AD", ALL, { ...DEFAULT_RULES, dealerHitsSoft17: true })).toBe(
      "double",
    );
  });

  it("stands on twelve against four through six", () => {
    expect(advise(["10H", "2C"], "3D")).toBe("hit");
    expect(advise(["10H", "2C"], "4D")).toBe("stand");
    expect(advise(["10H", "2C"], "6D")).toBe("stand");
    expect(advise(["10H", "2C"], "7D")).toBe("hit");
  });

  it("stands on thirteen through sixteen against a weak dealer", () => {
    expect(advise(["10H", "6C"], "2D")).toBe("stand");
    expect(advise(["10H", "6C"], "6D")).toBe("stand");
    expect(advise(["10H", "6C"], "7D")).toBe("hit");
  });

  it("surrenders sixteen against nine, ten, and ace", () => {
    expect(advise(["10H", "6C"], "9D")).toBe("surrender");
    expect(advise(["10H", "6C"], "KD")).toBe("surrender");
    expect(advise(["10H", "6C"], "AD")).toBe("surrender");
  });

  it("surrenders fifteen against a ten only", () => {
    expect(advise(["10H", "5C"], "KD")).toBe("surrender");
    expect(advise(["10H", "5C"], "9D")).toBe("hit");
    expect(advise(["10H", "5C"], "AD")).toBe("hit");
  });

  it("adds the hit soft seventeen surrenders", () => {
    const h17 = { ...DEFAULT_RULES, dealerHitsSoft17: true };
    expect(advise(["10H", "5C"], "AD", ALL, h17)).toBe("surrender");
    expect(advise(["10H", "7C"], "AD", ALL, h17)).toBe("surrender");
    expect(advise(["10H", "7C"], "AD")).toBe("stand");
  });

  it("falls back to hitting when surrender is unavailable", () => {
    expect(advise(["10H", "6C"], "KD", ["hit", "stand"])).toBe("hit");
  });

  it("stands on seventeen and above", () => {
    expect(advise(["10H", "7C"], "AD")).toBe("stand");
    expect(advise(["10H", "10C"], "6D")).toBe("stand");
  });
});

describe("soft totals", () => {
  it("doubles soft thirteen and fourteen against five and six", () => {
    expect(advise(["AH", "2C"], "4D")).toBe("hit");
    expect(advise(["AH", "2C"], "5D")).toBe("double");
    expect(advise(["AH", "3C"], "6D")).toBe("double");
  });

  it("doubles soft fifteen and sixteen against four through six", () => {
    expect(advise(["AH", "4C"], "3D")).toBe("hit");
    expect(advise(["AH", "4C"], "4D")).toBe("double");
    expect(advise(["AH", "5C"], "6D")).toBe("double");
  });

  it("doubles soft seventeen against three through six", () => {
    expect(advise(["AH", "6C"], "2D")).toBe("hit");
    expect(advise(["AH", "6C"], "3D")).toBe("double");
  });

  it("plays soft eighteen by the chart", () => {
    expect(advise(["AH", "7C"], "2D")).toBe("stand");
    expect(advise(["AH", "7C"], "3D")).toBe("double");
    expect(advise(["AH", "7C"], "7D")).toBe("stand");
    expect(advise(["AH", "7C"], "9D")).toBe("hit");
  });

  it("doubles soft eighteen against a two when the dealer hits soft seventeen", () => {
    expect(advise(["AH", "7C"], "2D", ALL, { ...DEFAULT_RULES, dealerHitsSoft17: true })).toBe(
      "double",
    );
  });

  it("stands soft eighteen when doubling is not available", () => {
    expect(advise(["AH", "3C", "4D"], "5S", ["hit", "stand"])).toBe("stand");
  });

  it("doubles soft nineteen against a six only under hit soft seventeen", () => {
    expect(advise(["AH", "8C"], "6D")).toBe("stand");
    expect(advise(["AH", "8C"], "6D", ALL, { ...DEFAULT_RULES, dealerHitsSoft17: true })).toBe(
      "double",
    );
  });
});

describe("pairs", () => {
  it("always splits aces and eights", () => {
    for (const up of ["2D", "6D", "9D", "KD", "AD"]) {
      expect(advise(["AH", "AC"], up)).toBe("split");
      expect(advise(["8H", "8C"], up)).toBe("split");
    }
  });

  it("never splits tens or fives", () => {
    expect(advise(["KH", "10C"], "6D")).toBe("stand");
    expect(advise(["5H", "5C"], "6D")).toBe("double");
    expect(advise(["5H", "5C"], "KD")).toBe("hit");
  });

  it("splits nines except against seven, ten, and ace", () => {
    expect(advise(["9H", "9C"], "6D")).toBe("split");
    expect(advise(["9H", "9C"], "7D")).toBe("stand");
    expect(advise(["9H", "9C"], "9D")).toBe("split");
    expect(advise(["9H", "9C"], "KD")).toBe("stand");
  });

  it("splits sevens against two through seven", () => {
    expect(advise(["7H", "7C"], "7D")).toBe("split");
    expect(advise(["7H", "7C"], "8D")).toBe("hit");
  });

  it("splits low pairs only with double after split against a two", () => {
    expect(advise(["3H", "3C"], "2D")).toBe("split");
    expect(advise(["3H", "3C"], "2D", ALL, { ...DEFAULT_RULES, doubleAfterSplit: false })).toBe(
      "hit",
    );
    expect(advise(["6H", "6C"], "2D", ALL, { ...DEFAULT_RULES, doubleAfterSplit: false })).toBe(
      "hit",
    );
  });

  it("splits fours only against five and six with double after split", () => {
    expect(advise(["4H", "4C"], "4D")).toBe("hit");
    expect(advise(["4H", "4C"], "5D")).toBe("split");
  });

  it("surrenders eight eight against an ace when the dealer hits soft seventeen", () => {
    expect(advise(["8H", "8C"], "AD", ALL, { ...DEFAULT_RULES, dealerHitsSoft17: true })).toBe(
      "surrender",
    );
  });

  it("uses the non pair chart once splitting is unavailable", () => {
    expect(advise(["8H", "8C"], "6D", ["hit", "stand"])).toBe("stand");
    expect(advise(["AH", "AC"], "6D", ["hit", "stand"])).toBe("hit");
  });
});

describe("computed odds", () => {
  it("produces a dealer distribution that sums to one", () => {
    for (const up of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      const outcomes = dealerOutcomes(up, false);
      const total =
        outcomes[17] + outcomes[18] + outcomes[19] + outcomes[20] + outcomes[21] + outcomes.bust;
      expect(total).toBeCloseTo(1, 8);
    }
  });

  it("makes a six the dealer's worst card and an ace the best", () => {
    expect(dealerBustChance(6, false)).toBeGreaterThan(dealerBustChance(2, false));
    expect(dealerBustChance(6, false)).toBeGreaterThan(0.4);
    expect(dealerBustChance(11, false)).toBeLessThan(0.2);
  });

  it("busts more often when the dealer hits soft seventeen", () => {
    expect(dealerBustChance(6, true)).toBeGreaterThan(dealerBustChance(6, false));
  });

  it("never busts a soft hand on one card", () => {
    expect(bustChanceOnNextCard(cards("AH", "5C"))).toBe(0);
    expect(bustChanceOnNextCard(cards("10H", "6C"))).toBeCloseTo(8 / 13, 8);
    expect(bustChanceOnNextCard(cards("10H", "AC"))).toBe(0);
    expect(bustChanceOnNextCard(cards("AH", "AC", "10D"))).toBeCloseTo(4 / 13, 8);
  });

  it("gives a stand outlook that sums to one", () => {
    const outlook = standOutlook(16, 10, false);
    expect(outlook.win + outlook.push + outlook.lose).toBeCloseTo(1, 8);
    expect(outlook.win).toBeLessThan(0.3);
  });
});

describe("decision review", () => {
  it("marks the chart play optimal", () => {
    const record = reviewDecision({
      id: "d1",
      handId: "h1",
      handLabel: "Your hand",
      cards: cards("10H", "6C"),
      dealerUpcard: card("7D"),
      available: ["hit", "stand"],
      taken: "hit",
      rules: DEFAULT_RULES,
    });
    expect(record.quality).toBe("optimal");
    expect(record.category).toBe("hard-total");
    expect(record.explanation.length).toBeGreaterThan(20);
  });

  it("treats hitting instead of doubling as acceptable", () => {
    const record = reviewDecision({
      id: "d2",
      handId: "h1",
      handLabel: "Your hand",
      cards: cards("6H", "5C"),
      dealerUpcard: card("5D"),
      available: ["hit", "stand", "double"],
      taken: "hit",
      rules: DEFAULT_RULES,
    });
    expect(record.quality).toBe("acceptable");
    expect(record.category).toBe("double-down");
  });

  it("flags standing on a low total as a major mistake", () => {
    const record = reviewDecision({
      id: "d3",
      handId: "h1",
      handLabel: "Your hand",
      cards: cards("6H", "5C"),
      dealerUpcard: card("5D"),
      available: ["hit", "stand", "double"],
      taken: "stand",
      rules: DEFAULT_RULES,
    });
    expect(record.quality).toBe("major-mistake");
  });

  it("flags not splitting eights as a major mistake", () => {
    const record = reviewDecision({
      id: "d4",
      handId: "h1",
      handLabel: "Your hand",
      cards: cards("8H", "8C"),
      dealerUpcard: card("KD"),
      available: ["hit", "stand", "double", "split"],
      taken: "hit",
      rules: DEFAULT_RULES,
    });
    expect(record.quality).toBe("major-mistake");
    expect(record.category).toBe("pair-split");
  });

  it("calls standing on sixteen against a ten acceptable", () => {
    const record = reviewDecision({
      id: "d5",
      handId: "h1",
      handLabel: "Your hand",
      cards: cards("10H", "6C"),
      dealerUpcard: card("KD"),
      available: ["hit", "stand"],
      taken: "stand",
      rules: DEFAULT_RULES,
    });
    expect(record.quality).toBe("acceptable");
  });
});
