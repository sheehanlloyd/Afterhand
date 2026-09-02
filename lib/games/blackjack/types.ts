import { Card } from "@/types";
import { Shoe } from "@/lib/games/deck";

export type SurrenderRule = "none" | "late";

export interface BlackjackRules {
  decks: number;
  /** True means the dealer draws to soft 17 (H17). */
  dealerHitsSoft17: boolean;
  /** 1.5 for 3:2, 1.2 for 6:5. */
  blackjackPayout: number;
  doubleAfterSplit: boolean;
  surrender: SurrenderRule;
  insurance: boolean;
  /** Total player hands allowed after splitting, including the original. */
  maxSplitHands: number;
  resplitAces: boolean;
  hitSplitAces: boolean;
  minBet: number;
  maxBet: number;
  penetration: number;
}

export const DEFAULT_RULES: BlackjackRules = {
  decks: 6,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  doubleAfterSplit: true,
  surrender: "late",
  insurance: true,
  maxSplitHands: 4,
  resplitAces: false,
  hitSplitAces: false,
  minBet: 5,
  maxBet: 500,
  penetration: 0.75,
};

/**
 * Rebuilds a rule set out of untrusted input.
 *
 * Rules reach the engine from localStorage and from the session recovery
 * payload, both of which are text a reader can edit and neither of which is
 * guaranteed to still hold what this version wrote. Only values that are the
 * type and range they claim to be are adopted; anything else falls back to the
 * house rule. `decks` matters most: `createShoe` builds its cards with
 * `i < count`, so a shoe of "x" decks is a shoe of no cards, and a table that
 * takes a bet and then deals nothing is worse than one that quietly resets to
 * six decks.
 */
export function sanitiseRules(input: unknown): BlackjackRules {
  const rules = { ...DEFAULT_RULES };
  if (typeof input !== "object" || input === null || Array.isArray(input)) return rules;
  const raw = input as Record<string, unknown>;

  const positive = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;
  const whole = (value: unknown, min: number, max: number): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

  if (whole(raw.decks, 1, 8)) rules.decks = raw.decks;
  if (whole(raw.maxSplitHands, 1, 8)) rules.maxSplitHands = raw.maxSplitHands;
  if (positive(raw.blackjackPayout)) rules.blackjackPayout = raw.blackjackPayout;
  if (positive(raw.minBet)) rules.minBet = Math.round(raw.minBet);
  if (positive(raw.maxBet)) rules.maxBet = Math.round(raw.maxBet);
  if (typeof raw.penetration === "number" && raw.penetration > 0.1 && raw.penetration <= 0.95) {
    rules.penetration = raw.penetration;
  }
  for (const flag of [
    "dealerHitsSoft17",
    "doubleAfterSplit",
    "insurance",
    "resplitAces",
    "hitSplitAces",
  ] as const) {
    if (typeof raw[flag] === "boolean") rules[flag] = raw[flag];
  }
  if (raw.surrender === "none" || raw.surrender === "late") rules.surrender = raw.surrender;

  /* A table whose maximum sits under its minimum cannot take a bet at all. */
  if (rules.maxBet < rules.minBet) {
    rules.minBet = DEFAULT_RULES.minBet;
    rules.maxBet = DEFAULT_RULES.maxBet;
  }
  return rules;
}

export type PlayerAction =
  | "hit"
  | "stand"
  | "double"
  | "split"
  | "surrender";

export interface Hand {
  id: string;
  cards: Card[];
  bet: number;
  doubled: boolean;
  surrendered: boolean;
  stood: boolean;
  /** True once the hand can take no further action. */
  resolved: boolean;
  /** Number of splits that produced this hand. */
  splitDepth: number;
  fromSplit: boolean;
  fromSplitAces: boolean;
}

export interface DealerState {
  cards: Card[];
  holeRevealed: boolean;
}

export type HandOutcome =
  | "blackjack"
  | "win"
  | "lose"
  | "push"
  | "bust"
  | "dealer-bust"
  | "surrender";

export interface HandResult {
  handId: string;
  outcome: HandOutcome;
  /** Amount returned to the bankroll, including the original wager. */
  returned: number;
  /** Profit or loss for this hand. */
  net: number;
  playerTotal: number;
  dealerTotal: number;
}

export type BlackjackPhase =
  | "betting"
  | "dealing"
  | "insurance"
  | "player"
  | "dealer"
  | "settled";

export type DecisionCategory =
  | "hard-total"
  | "soft-total"
  | "pair-split"
  | "double-down"
  | "surrender"
  | "insurance";

export type DecisionQuality =
  | "optimal"
  | "acceptable"
  | "mistake"
  | "major-mistake";

export interface DecisionRecord {
  id: string;
  handId: string;
  handLabel: string;
  playerCards: Card[];
  dealerUpcard: Card;
  total: number;
  soft: boolean;
  isPair: boolean;
  available: PlayerAction[];
  taken: PlayerAction | "insurance" | "decline-insurance";
  recommended: PlayerAction | "insurance" | "decline-insurance";
  quality: DecisionQuality;
  category: DecisionCategory;
  /** Strategy chart coordinates, used by the mastery grid. */
  rowLabel: string;
  dealerKey: string;
  headline: string;
  explanation: string;
  remember: string;
  detail: string[];
}

export interface BlackjackState {
  rules: BlackjackRules;
  shoe: Shoe;
  phase: BlackjackPhase;
  bankroll: number;
  /** Bet being assembled during the betting phase. */
  pendingBet: number;
  hands: Hand[];
  activeHandIndex: number;
  dealer: DealerState;
  insuranceBet: number;
  insuranceResult: "won" | "lost" | null;
  results: HandResult[];
  decisions: DecisionRecord[];
  handNumber: number;
  /** Total wagered across the session, used for session reporting. */
  totalWagered: number;
  dealerMessage: string;
}
