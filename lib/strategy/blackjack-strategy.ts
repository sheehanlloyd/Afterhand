import { Card } from "@/types";
import { BlackjackRules, PlayerAction, DecisionCategory } from "@/lib/games/blackjack/types";
import { calculateHandValue, strategyRank } from "@/lib/games/blackjack/hand";

/**
 * Deterministic multi-deck basic strategy.
 *
 * Every recommendation comes from a fixed chart plus documented rule variations.
 * Nothing here is estimated, sampled, or generated at runtime.
 */

export type StrategyCode =
  | "H"    // hit
  | "S"    // stand
  | "D"    // double, otherwise hit
  | "Ds"   // double, otherwise stand
  | "P"    // split
  | "Pd"   // split when double after split is allowed, otherwise hit
  | "R"    // surrender, otherwise hit
  | "Rs"   // surrender, otherwise stand
  | "Rp";  // surrender, otherwise split

export type DealerKey = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";

export const DEALER_KEYS: DealerKey[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];

export type PairKey = "A" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export const PAIR_KEYS: PairKey[] = ["A", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

export const HARD_TOTALS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
export const SOFT_TOTALS = [13, 14, 15, 16, 17, 18, 19, 20] as const;

type Row = Record<DealerKey, StrategyCode>;

function row(...codes: StrategyCode[]): Row {
  const out = {} as Row;
  DEALER_KEYS.forEach((key, index) => {
    out[key] = codes[index];
  });
  return out;
}

/** Hard totals, 4 to 8 decks, dealer stands on soft 17. */
const HARD: Record<number, Row> = {
  4:  row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  5:  row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  6:  row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  7:  row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  8:  row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  9:  row("H", "D", "D", "D", "D", "H", "H", "H", "H", "H"),
  10: row("D", "D", "D", "D", "D", "D", "D", "D", "H", "H"),
  11: row("D", "D", "D", "D", "D", "D", "D", "D", "D", "H"),
  12: row("H", "H", "S", "S", "S", "H", "H", "H", "H", "H"),
  13: row("S", "S", "S", "S", "S", "H", "H", "H", "H", "H"),
  14: row("S", "S", "S", "S", "S", "H", "H", "H", "H", "H"),
  15: row("S", "S", "S", "S", "S", "H", "H", "H", "R", "H"),
  16: row("S", "S", "S", "S", "S", "H", "H", "R", "R", "R"),
  17: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  18: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  19: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  20: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  21: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
};

/** Soft totals keyed by the full hand total, dealer stands on soft 17. */
const SOFT: Record<number, Row> = {
  12: row("H", "H", "H", "H", "H", "H", "H", "H", "H", "H"),
  13: row("H", "H", "H", "D", "D", "H", "H", "H", "H", "H"),
  14: row("H", "H", "H", "D", "D", "H", "H", "H", "H", "H"),
  15: row("H", "H", "D", "D", "D", "H", "H", "H", "H", "H"),
  16: row("H", "H", "D", "D", "D", "H", "H", "H", "H", "H"),
  17: row("H", "D", "D", "D", "D", "H", "H", "H", "H", "H"),
  18: row("S", "Ds", "Ds", "Ds", "Ds", "S", "S", "H", "H", "H"),
  19: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  20: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  21: row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
};

/** Pairs, dealer stands on soft 17. Pd cells depend on double after split. */
const PAIRS: Record<PairKey, Row> = {
  A:  row("P", "P", "P", "P", "P", "P", "P", "P", "P", "P"),
  "10": row("S", "S", "S", "S", "S", "S", "S", "S", "S", "S"),
  9:  row("P", "P", "P", "P", "P", "S", "P", "P", "S", "S"),
  8:  row("P", "P", "P", "P", "P", "P", "P", "P", "P", "P"),
  7:  row("P", "P", "P", "P", "P", "P", "H", "H", "H", "H"),
  6:  row("Pd", "P", "P", "P", "P", "H", "H", "H", "H", "H"),
  5:  row("D", "D", "D", "D", "D", "D", "D", "D", "H", "H"),
  4:  row("H", "H", "H", "Pd", "Pd", "H", "H", "H", "H", "H"),
  3:  row("Pd", "Pd", "P", "P", "P", "P", "H", "H", "H", "H"),
  2:  row("Pd", "Pd", "P", "P", "P", "P", "H", "H", "H", "H"),
} as Record<PairKey, Row>;

export function dealerKey(card: Card): DealerKey {
  return strategyRank(card.rank) as DealerKey;
}

export interface ChartLookup {
  code: StrategyCode;
  category: DecisionCategory;
  /** Row label as shown in the strategy grid, for example "16" or "8,8". */
  rowLabel: string;
}

/**
 * Raw chart cell before availability is considered.
 * `pairKey` is only consulted when splitting is still possible.
 */
export function lookupChart(
  cards: Card[],
  dealer: DealerKey,
  rules: BlackjackRules,
  splitAllowed: boolean,
): ChartLookup {
  const value = calculateHandValue(cards);
  const h17 = rules.dealerHitsSoft17;

  if (splitAllowed && cards.length === 2) {
    const a = strategyRank(cards[0].rank);
    const b = strategyRank(cards[1].rank);
    if (a === b) {
      const key = a as PairKey;
      let code = PAIRS[key][dealer];
      if (code === "Pd") code = rules.doubleAfterSplit ? "P" : "H";
      if (h17 && key === "8" && dealer === "A") code = "Rp";
      return { code, category: "pair-split", rowLabel: `${key},${key}` };
    }
  }

  if (value.soft && value.total >= 12 && value.total <= 21) {
    let code = SOFT[value.total][dealer];
    if (h17 && value.total === 18 && dealer === "2") code = "Ds";
    if (h17 && value.total === 19 && dealer === "6") code = "Ds";
    return { code, category: "soft-total", rowLabel: `Soft ${value.total}` };
  }

  const total = Math.min(21, Math.max(4, value.total));
  let code = HARD[total][dealer];
  if (h17 && total === 11 && dealer === "A") code = "D";
  if (h17 && total === 15 && dealer === "A") code = "R";
  if (h17 && total === 17 && dealer === "A") code = "Rs";
  return { code, category: "hard-total", rowLabel: `${total}` };
}

export interface StrategyInput {
  playerCards: Card[];
  dealerUpcard: Card;
  rules: BlackjackRules;
  available: PlayerAction[];
}

export interface StrategyResult {
  /** Best action given what the player can actually do right now. */
  action: PlayerAction;
  /** The chart cell, ignoring availability. */
  code: StrategyCode;
  /** Ideal action if every option were on the table. */
  ideal: PlayerAction;
  category: DecisionCategory;
  rowLabel: string;
  dealerKey: DealerKey;
}

function idealFromCode(code: StrategyCode): PlayerAction {
  switch (code) {
    case "H": return "hit";
    case "S": return "stand";
    case "D":
    case "Ds": return "double";
    case "P":
    case "Pd": return "split";
    case "R":
    case "Rs":
    case "Rp": return "surrender";
  }
}

function fallbackFromCode(code: StrategyCode): PlayerAction {
  switch (code) {
    case "D": return "hit";
    case "Ds": return "stand";
    case "R": return "hit";
    case "Rs": return "stand";
    case "Rp": return "split";
    default: return idealFromCode(code);
  }
}

export function recommendAction(input: StrategyInput): StrategyResult {
  const dealer = dealerKey(input.dealerUpcard);
  const splitAllowed = input.available.includes("split");
  const lookup = lookupChart(input.playerCards, dealer, input.rules, splitAllowed);
  const ideal = idealFromCode(lookup.code);

  let action = ideal;
  if (!input.available.includes(action)) {
    action = fallbackFromCode(lookup.code);
  }
  // A split fallback can still be unavailable, for example at the hand limit.
  if (!input.available.includes(action)) {
    const chartWithoutSplit = lookupChart(input.playerCards, dealer, input.rules, false);
    action = idealFromCode(chartWithoutSplit.code);
    if (!input.available.includes(action)) action = fallbackFromCode(chartWithoutSplit.code);
  }
  if (!input.available.includes(action)) {
    action = input.available.includes("stand") ? "stand" : "hit";
  }

  return {
    action,
    code: lookup.code,
    ideal,
    category: lookup.category,
    rowLabel: lookup.rowLabel,
    dealerKey: dealer,
  };
}

/**
 * Basic strategy never takes insurance, so the recommendation is fixed.
 * Card counting is out of scope for this app.
 */
export function recommendInsurance(): "decline-insurance" {
  return "decline-insurance";
}

export function actionLabel(action: PlayerAction | "insurance" | "decline-insurance"): string {
  switch (action) {
    case "hit": return "Hit";
    case "stand": return "Stand";
    case "double": return "Double";
    case "split": return "Split";
    case "surrender": return "Surrender";
    case "insurance": return "Take insurance";
    case "decline-insurance": return "Decline insurance";
  }
}

export function codeLabel(code: StrategyCode): string {
  switch (code) {
    case "H": return "Hit";
    case "S": return "Stand";
    case "D": return "Double";
    case "Ds": return "Double, else stand";
    case "P": return "Split";
    case "Pd": return "Split";
    case "R": return "Surrender";
    case "Rs": return "Surrender, else stand";
    case "Rp": return "Surrender, else split";
  }
}
