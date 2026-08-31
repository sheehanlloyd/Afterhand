import { randomInt } from "@/lib/utils/rng";

/**
 * Roulette. European by default, with the American double zero wheel available
 * as a rule set so the cost of that extra pocket is visible.
 */

export type RouletteVariant = "european" | "american";

export type Pocket = number | "00";

export const EUROPEAN_POCKETS: Pocket[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
  14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const AMERICAN_POCKETS: Pocket[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, "00", 27, 10, 25, 29, 12,
  8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function pocketsFor(variant: RouletteVariant): Pocket[] {
  return variant === "american" ? AMERICAN_POCKETS : EUROPEAN_POCKETS;
}

export function isRed(pocket: Pocket): boolean {
  return typeof pocket === "number" && RED_NUMBERS.has(pocket);
}

export function isBlack(pocket: Pocket): boolean {
  return typeof pocket === "number" && pocket !== 0 && !RED_NUMBERS.has(pocket);
}

export type RouletteBetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "six-line"
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high"
  | "dozen"
  | "column";

export interface RouletteBet {
  id: string;
  type: RouletteBetType;
  /** Pockets covered by the bet. */
  numbers: Pocket[];
  amount: number;
  label: string;
}

/** Payout is stated as "to one", so a straight up bet returns the stake plus 35. */
export const PAYOUTS: Record<RouletteBetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  "six-line": 5,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
  dozen: 2,
  column: 2,
};

export const BET_LABEL: Record<RouletteBetType, string> = {
  straight: "Straight",
  split: "Split",
  street: "Street",
  corner: "Corner",
  "six-line": "Six line",
  red: "Red",
  black: "Black",
  odd: "Odd",
  even: "Even",
  low: "Low",
  high: "High",
  dozen: "Dozen",
  column: "Column",
};

export function numbersForOutside(type: RouletteBetType, index = 0): Pocket[] {
  const all = Array.from({ length: 36 }, (_, i) => i + 1);
  switch (type) {
    case "red": return all.filter((n) => RED_NUMBERS.has(n));
    case "black": return all.filter((n) => !RED_NUMBERS.has(n));
    case "odd": return all.filter((n) => n % 2 === 1);
    case "even": return all.filter((n) => n % 2 === 0);
    case "low": return all.filter((n) => n <= 18);
    case "high": return all.filter((n) => n >= 19);
    case "dozen": return all.filter((n) => Math.ceil(n / 12) === index + 1);
    case "column": return all.filter((n) => (n - 1) % 3 === index);
    default: return [];
  }
}

export function spin(variant: RouletteVariant): Pocket {
  const pockets = pocketsFor(variant);
  return pockets[randomInt(pockets.length)];
}

export function betWins(bet: RouletteBet, pocket: Pocket): boolean {
  return bet.numbers.some((entry) => entry === pocket);
}

export interface BetSettlement {
  bet: RouletteBet;
  won: boolean;
  returned: number;
  net: number;
}

export function settleBets(bets: RouletteBet[], pocket: Pocket): BetSettlement[] {
  return bets.map((bet) => {
    const won = betWins(bet, pocket);
    const returned = won ? bet.amount + bet.amount * PAYOUTS[bet.type] : 0;
    return { bet, won, returned, net: returned - bet.amount };
  });
}

/** Chance the bet wins on this wheel, computed from the pockets it covers. */
export function winProbability(bet: RouletteBet, variant: RouletteVariant): number {
  return bet.numbers.length / pocketsFor(variant).length;
}

/**
 * House edge for a bet, derived from its own probability and payout.
 * Nothing is quoted: the number falls out of the arithmetic.
 */
export function houseEdge(bet: RouletteBet, variant: RouletteVariant): number {
  const probability = winProbability(bet, variant);
  const expected = probability * PAYOUTS[bet.type] - (1 - probability);
  return -expected;
}

export function pocketLabel(pocket: Pocket): string {
  return typeof pocket === "number" ? String(pocket) : pocket;
}

export function pocketColour(pocket: Pocket): "red" | "black" | "green" {
  if (pocket === 0 || pocket === "00") return "green";
  return isRed(pocket) ? "red" : "black";
}
