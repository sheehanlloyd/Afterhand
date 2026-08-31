import { describe, expect, it } from "vitest";
import {
  AMERICAN_POCKETS,
  EUROPEAN_POCKETS,
  PAYOUTS,
  RouletteBet,
  betWins,
  houseEdge,
  numbersForOutside,
  pocketColour,
  settleBets,
  spin,
  winProbability,
} from "@/lib/games/roulette/engine";

function bet(overrides: Partial<RouletteBet>): RouletteBet {
  return {
    id: "b",
    type: "straight",
    numbers: [17],
    amount: 10,
    label: "Straight 17",
    ...overrides,
  };
}

describe("wheels", () => {
  it("has thirty seven European pockets and thirty eight American", () => {
    expect(EUROPEAN_POCKETS).toHaveLength(37);
    expect(AMERICAN_POCKETS).toHaveLength(38);
  });

  it("holds every number exactly once", () => {
    const numbers = EUROPEAN_POCKETS.filter((entry) => typeof entry === "number");
    expect(new Set(numbers).size).toBe(37);
    for (let i = 0; i <= 36; i++) expect(numbers).toContain(i);
  });

  it("includes a double zero only on the American wheel", () => {
    expect(AMERICAN_POCKETS).toContain("00");
    expect(EUROPEAN_POCKETS).not.toContain("00");
  });

  it("colours zero green", () => {
    expect(pocketColour(0)).toBe("green");
    expect(pocketColour("00")).toBe("green");
    expect(pocketColour(1)).toBe("red");
    expect(pocketColour(2)).toBe("black");
  });

  it("only lands on real pockets", () => {
    for (let i = 0; i < 200; i++) {
      expect(EUROPEAN_POCKETS).toContain(spin("european"));
      expect(AMERICAN_POCKETS).toContain(spin("american"));
    }
  });
});

describe("outside bets", () => {
  it("covers eighteen numbers on the even money bets", () => {
    for (const type of ["red", "black", "odd", "even", "low", "high"] as const) {
      expect(numbersForOutside(type)).toHaveLength(18);
    }
  });

  it("covers twelve numbers on dozens and columns", () => {
    for (let index = 0; index < 3; index++) {
      expect(numbersForOutside("dozen", index)).toHaveLength(12);
      expect(numbersForOutside("column", index)).toHaveLength(12);
    }
  });

  it("never includes zero", () => {
    for (const type of ["red", "black", "odd", "even", "low", "high"] as const) {
      expect(numbersForOutside(type)).not.toContain(0);
    }
  });
});

describe("settlement", () => {
  it("pays a straight up bet thirty five to one", () => {
    const [result] = settleBets([bet({})], 17);
    expect(result.won).toBe(true);
    expect(result.returned).toBe(10 + 350);
    expect(result.net).toBe(350);
  });

  it("loses when the pocket is not covered", () => {
    const [result] = settleBets([bet({})], 18);
    expect(result.net).toBe(-10);
  });

  it("settles even money bets", () => {
    const red = bet({ type: "red", numbers: numbersForOutside("red"), label: "Red" });
    expect(settleBets([red], 1)[0].net).toBe(10);
    expect(settleBets([red], 2)[0].net).toBe(-10);
    expect(settleBets([red], 0)[0].net).toBe(-10);
  });

  it("settles several bets at once", () => {
    const results = settleBets(
      [
        bet({ id: "a", numbers: [7] }),
        bet({ id: "b", type: "even", numbers: numbersForOutside("even"), label: "Even" }),
      ],
      7,
    );
    expect(results[0].won).toBe(true);
    expect(results[1].won).toBe(false);
  });

  it("matches a bet against every covered pocket", () => {
    const corner = bet({ type: "corner", numbers: [1, 2, 4, 5], label: "Corner" });
    for (const pocket of [1, 2, 4, 5]) expect(betWins(corner, pocket)).toBe(true);
    expect(betWins(corner, 3)).toBe(false);
  });
});

describe("probability and edge", () => {
  it("gives a straight up bet one chance in thirty seven", () => {
    expect(winProbability(bet({}), "european")).toBeCloseTo(1 / 37, 10);
    expect(winProbability(bet({}), "american")).toBeCloseTo(1 / 38, 10);
  });

  it("derives the European edge as about 2.7 percent", () => {
    expect(houseEdge(bet({}), "european")).toBeCloseTo(1 / 37, 6);
    const red = bet({ type: "red", numbers: numbersForOutside("red"), label: "Red" });
    expect(houseEdge(red, "european")).toBeCloseTo(1 / 37, 6);
  });

  it("derives the American edge as about 5.26 percent", () => {
    expect(houseEdge(bet({}), "american")).toBeCloseTo(2 / 38, 6);
  });

  it("keeps payouts consistent with the number of pockets covered", () => {
    const combos: Array<[RouletteBet["type"], number]> = [
      ["straight", 1],
      ["split", 2],
      ["street", 3],
      ["corner", 4],
      ["six-line", 6],
      ["dozen", 12],
    ];
    for (const [type, count] of combos) {
      expect((PAYOUTS[type] + 1) * count).toBe(36);
    }
  });
});
