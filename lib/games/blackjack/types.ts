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
