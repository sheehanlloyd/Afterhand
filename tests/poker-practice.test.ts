import { describe, expect, it } from "vitest";
import {
  bracketFor,
  createPokerScenario,
  createPokerSession,
} from "@/lib/games/poker/practice";
import { estimateEquity } from "@/lib/games/poker/equity";

describe("equity brackets", () => {
  it("splits at twenty five and fifty percent", () => {
    expect(bracketFor(0.1)).toBe("under-25");
    expect(bracketFor(0.24)).toBe("under-25");
    expect(bracketFor(0.3)).toBe("25-to-50");
    expect(bracketFor(0.5)).toBe("25-to-50");
    expect(bracketFor(0.62)).toBe("over-50");
  });
});

describe("pot odds drills", () => {
  it("builds legal scenarios with a clear answer", () => {
    for (let i = 0; i < 12; i++) {
      const scenario = createPokerScenario("pot-odds");
      expect(scenario.hole).toHaveLength(2);
      expect(scenario.board.length).toBeGreaterThanOrEqual(3);
      expect(scenario.board.length).toBeLessThanOrEqual(5);
      expect(scenario.toCall).toBeGreaterThan(0);
      expect(scenario.requiredEquity).toBeCloseTo(
        scenario.toCall / (scenario.pot + scenario.toCall),
        10,
      );
      // The answer follows from the price, never from a judgement call.
      expect(scenario.correct).toBe(
        scenario.equity > scenario.requiredEquity ? "call" : "fold",
      );
    }
  });

  it("never uses cards twice in one scenario", () => {
    for (let i = 0; i < 12; i++) {
      const scenario = createPokerScenario("pot-odds");
      const seen = [...scenario.hole, ...scenario.board].map(
        (card) => `${card.rank}${card.suit}`,
      );
      expect(new Set(seen).size).toBe(seen.length);
    }
  });

  it("keeps a margin away from the break even point", () => {
    for (let i = 0; i < 12; i++) {
      const scenario = createPokerScenario("pot-odds");
      expect(Math.abs(scenario.equity - scenario.requiredEquity)).toBeGreaterThan(0.06);
    }
  });
});

describe("equity drills", () => {
  it("labels the bracket that the simulation actually produced", () => {
    for (let i = 0; i < 12; i++) {
      const scenario = createPokerScenario("equity");
      expect(scenario.correct).toBe(bracketFor(scenario.equity));
    }
  });

  it("stays clear of the bracket edges", () => {
    for (let i = 0; i < 12; i++) {
      const scenario = createPokerScenario("equity");
      const distance = Math.min(
        Math.abs(scenario.equity - 0.25),
        Math.abs(scenario.equity - 0.5),
      );
      expect(distance).toBeGreaterThan(0.03);
    }
  });

  it("reports an equity close to an independent simulation", () => {
    const scenario = createPokerScenario("equity");
    const check = estimateEquity(scenario.hole, scenario.board, 1, 4000).equity;
    expect(Math.abs(check - scenario.equity)).toBeLessThan(0.06);
  });
});

describe("sessions", () => {
  it("builds the requested number of scenarios", () => {
    expect(createPokerSession("pot-odds", 5)).toHaveLength(5);
    expect(createPokerSession("equity", 5)).toHaveLength(5);
  });
});
