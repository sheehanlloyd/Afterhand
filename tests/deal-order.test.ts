import { describe, expect, it } from "vitest";
import {
  applyStep,
  clampCounts,
  emptyCounts,
  revealSteps,
  type RevealCounts,
} from "@/lib/motion/deal-order";

function run(current: RevealCounts, target: RevealCounts, order: string[]) {
  return revealSteps(current, target, order).map((step) =>
    step.kind === "dealer" ? "D" : step.id,
  );
}

describe("deal order", () => {
  it("goes round the table before coming back for the second card", () => {
    expect(run(emptyCounts(), { dealer: 2, hands: { a: 2 } }, ["a"])).toEqual([
      "a",
      "D",
      "a",
      "D",
    ]);
  });

  it("deals every seat its first card before any seat gets a second", () => {
    expect(
      run(emptyCounts(), { dealer: 2, hands: { a: 2, b: 2, c: 2 } }, ["a", "b", "c"]),
    ).toEqual(["a", "b", "c", "D", "a", "b", "c", "D"]);
  });

  it("owes only the cards that are new", () => {
    const current = { dealer: 2, hands: { a: 2 } };
    expect(run(current, { dealer: 2, hands: { a: 3 } }, ["a"])).toEqual(["a"]);
  });

  it("deals the dealer's draw cards one at a time", () => {
    expect(run({ dealer: 2, hands: { a: 2 } }, { dealer: 4, hands: { a: 2 } }, ["a"])).toEqual([
      "D",
      "D",
    ]);
  });

  it("fills a new split hand alongside the one it came from", () => {
    const current = { dealer: 2, hands: { a: 1 } };
    const target = { dealer: 2, hands: { a: 2, b: 2 } };
    expect(run(current, target, ["a", "b"])).toEqual(["b", "a", "b"]);
  });

  it("applies steps cumulatively", () => {
    let counts = emptyCounts();
    for (const step of revealSteps(counts, { dealer: 1, hands: { a: 2 } }, ["a"])) {
      counts = applyStep(counts, step);
    }
    expect(counts).toEqual({ dealer: 1, hands: { a: 2 } });
  });

  it("clamps counts down when a hand loses a card to a split", () => {
    expect(clampCounts({ dealer: 2, hands: { a: 2 } }, { dealer: 2, hands: { a: 1, b: 1 } })).toEqual(
      { dealer: 2, hands: { a: 1, b: 0 } },
    );
  });
});
