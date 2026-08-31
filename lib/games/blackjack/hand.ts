import { Card, Rank } from "@/types";
import { Hand } from "./types";

/** Blackjack value of a rank, counting an ace high. Ace softness is handled separately. */
export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

/** Rank key used by the strategy tables: ten-value cards collapse to "10". */
export function strategyRank(rank: Rank): "A" | "10" | Rank {
  if (rank === "J" || rank === "Q" || rank === "K") return "10";
  return rank;
}

export interface HandValue {
  /** Best total that does not bust, or the minimum total once busted. */
  total: number;
  /** True when an ace is still counted as 11. */
  soft: boolean;
  busted: boolean;
  /** Total with every ace counted as one. */
  hardTotal: number;
}

export function calculateHandValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const value = cardValue(card.rank);
    total += value;
    if (card.rank === "A") aces += 1;
  }
  const hardTotal = total - aces * 10;
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  soft = aces > 0;
  return { total, soft, busted: total > 21, hardTotal };
}

/** A natural: exactly two cards totalling 21, and not the product of a split. */
export function isBlackjack(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.fromSplit) return false;
  return calculateHandValue(hand.cards).total === 21;
}

export function isPair(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return strategyRank(cards[0].rank) === strategyRank(cards[1].rank);
}

/** A subtle secondary label, for example "Soft 15". Returns null for hard hands. */
export function softLabel(cards: Card[]): string | null {
  const value = calculateHandValue(cards);
  if (!value.soft || value.busted) return null;
  return `Soft ${value.total}`;
}

export function createHand(params: Partial<Hand> & { id: string; bet: number }): Hand {
  return {
    cards: [],
    doubled: false,
    surrendered: false,
    stood: false,
    resolved: false,
    splitDepth: 0,
    fromSplit: false,
    fromSplitAces: false,
    ...params,
  };
}
