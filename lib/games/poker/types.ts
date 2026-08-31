import { Card } from "@/types";
import { HandValue } from "./evaluator";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown" | "complete";

export type PokerActionType = "fold" | "check" | "call" | "bet" | "raise" | "all-in";

export type Personality = "tight" | "loose" | "aggressive" | "passive" | "balanced";

export interface PersonalityProfile {
  /** Higher means more hands are played. */
  looseness: number;
  /** Higher means more betting and raising. */
  aggression: number;
  /** Higher means more willing to fire without a hand. */
  bluff: number;
}

export const PERSONALITIES: Record<Personality, PersonalityProfile> = {
  tight: { looseness: 0.34, aggression: 0.42, bluff: 0.1 },
  loose: { looseness: 0.72, aggression: 0.46, bluff: 0.22 },
  aggressive: { looseness: 0.55, aggression: 0.78, bluff: 0.34 },
  passive: { looseness: 0.6, aggression: 0.2, bluff: 0.06 },
  balanced: { looseness: 0.5, aggression: 0.55, bluff: 0.18 },
};

export interface PokerPlayer {
  id: string;
  name: string;
  isHuman: boolean;
  personality: Personality;
  stack: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  /** Chips committed on the current street. */
  committed: number;
  /** Chips committed across the whole hand. */
  invested: number;
  hasActed: boolean;
  /** Set at showdown when the hand is shown. */
  revealed: boolean;
}

export interface ActionRecord {
  id: string;
  street: Street;
  playerId: string;
  playerName: string;
  type: PokerActionType;
  /** Chips added by this action. */
  amount: number;
  /** Total committed on the street after the action. */
  to: number;
  /** What it cost to call before the action. */
  toCall: number;
  potBefore: number;
  potAfter: number;
}

export interface PotAward {
  amount: number;
  winners: string[];
  description: string;
}

export interface ShowdownResult {
  awards: PotAward[];
  hands: Array<{ playerId: string; value: HandValue }>;
  /** True when everyone folded and no cards were shown. */
  uncontested: boolean;
}

export interface PokerState {
  players: PokerPlayer[];
  buttonIndex: number;
  street: Street;
  board: Card[];
  deck: Card[];
  deckPosition: number;
  /** Every chip committed this hand, including the current street. */
  pot: number;
  currentBet: number;
  minRaise: number;
  toActIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  history: ActionRecord[];
  showdown: ShowdownResult | null;
  message: string;
  /** Net change to the human stack for the completed hand. */
  lastNet: number;
}

export interface BetLimits {
  toCall: number;
  /** Minimum total street commitment for a bet or raise. */
  minTo: number;
  /** Maximum total street commitment, which is an all in. */
  maxTo: number;
  canCheck: boolean;
  canRaise: boolean;
}

export type PokerAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; to: number };
