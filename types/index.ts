export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export type Rank =
  | "A" | "2" | "3" | "4" | "5" | "6" | "7"
  | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
  /** Stable identity so React keys survive shuffles and reshuffles. */
  id: string;
}

export type GameId = "blackjack" | "poker" | "baccarat" | "roulette";

export type GameMode = "play" | "learn";

export type DecisionQuality = "optimal" | "acceptable" | "mistake" | "major-mistake";

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export const RANKS: Rank[] = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
];

export const SUIT_GLYPH: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export const SUIT_NAME: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

export const RANK_NAME: Record<Rank, string> = {
  A: "Ace",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",
  J: "Jack",
  Q: "Queen",
  K: "King",
};

export function cardLabel(card: Card): string {
  return `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}
