import { Card, Rank, Suit } from "@/types";

let sequence = 0;

/** Builds cards from a compact notation such as "AS", "10H", "KD". */
export function card(notation: string): Card {
  const suitChar = notation.slice(-1).toUpperCase();
  const rank = notation.slice(0, -1).toUpperCase() as Rank;
  const suits: Record<string, Suit> = {
    S: "spades",
    H: "hearts",
    D: "diamonds",
    C: "clubs",
  };
  sequence += 1;
  return { rank, suit: suits[suitChar], id: `${notation}-${sequence}` };
}

export function cards(...notations: string[]): Card[] {
  return notations.map(card);
}
