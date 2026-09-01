/**
 * The order cards come off the deck.
 *
 * A dealer goes round the table once and then goes round again: first card to
 * every seat, then the dealer's, then the second card to every seat, then the
 * dealer's. Dealing a player both cards before moving on is the single clearest
 * tell that a table is software rather than a table.
 *
 * This works out the difference between what is on the felt and what the game
 * says should be on the felt, and returns the cards still owed in the order a
 * dealer would put them out. It is pure, so the choreography can be tested
 * without rendering anything.
 */

export interface RevealCounts {
  dealer: number;
  hands: Record<string, number>;
}

export type RevealStep = { kind: "hand"; id: string } | { kind: "dealer" };

export function emptyCounts(): RevealCounts {
  return { dealer: 0, hands: {} };
}

export function revealSteps(
  current: RevealCounts,
  target: RevealCounts,
  /** Seat order, left to right. */
  handOrder: string[],
): RevealStep[] {
  const steps: RevealStep[] = [];
  const depth = Math.max(
    target.dealer,
    ...handOrder.map((id) => target.hands[id] ?? 0),
    0,
  );

  for (let level = 0; level < depth; level++) {
    for (const id of handOrder) {
      const have = current.hands[id] ?? 0;
      const want = target.hands[id] ?? 0;
      if (level >= have && level < want) steps.push({ kind: "hand", id });
    }
    if (level >= current.dealer && level < target.dealer) steps.push({ kind: "dealer" });
  }

  return steps;
}

/** Applies one step to a set of counts, returning a new set. */
export function applyStep(counts: RevealCounts, step: RevealStep): RevealCounts {
  if (step.kind === "dealer") return { ...counts, dealer: counts.dealer + 1 };
  return {
    ...counts,
    hands: { ...counts.hands, [step.id]: (counts.hands[step.id] ?? 0) + 1 },
  };
}

/**
 * Counts clamped to what actually exists.
 *
 * A split takes a card away from a hand that already had two, so the visible
 * count has to be able to go down as well as up, and it does so instantly
 * because the card has not gone anywhere: it is in the other hand.
 */
export function clampCounts(counts: RevealCounts, target: RevealCounts): RevealCounts {
  const hands: Record<string, number> = {};
  for (const id of Object.keys(target.hands)) {
    hands[id] = Math.min(counts.hands[id] ?? 0, target.hands[id]);
  }
  return { dealer: Math.min(counts.dealer, target.dealer), hands };
}
