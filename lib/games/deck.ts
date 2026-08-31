import { Card, Rank, Suit, RANKS, SUITS } from "@/types";
import { shuffle } from "@/lib/utils/rng";

let sequence = 0;

function nextId(rank: Rank, suit: Suit): string {
  sequence += 1;
  return `${rank}${suit[0]}-${sequence}`;
}

/** A fresh, ordered single deck of 52 cards. */
export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit, id: nextId(rank, suit) });
    }
  }
  return cards;
}

/** A shoe of `count` decks, unshuffled. */
export function createShoeCards(count: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) cards.push(...createDeck());
  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  return shuffle([...cards]);
}

export interface Shoe {
  cards: Card[];
  /** Index of the next card to be dealt. */
  position: number;
  deckCount: number;
  /** Fraction of the shoe dealt before it is reshuffled. */
  penetration: number;
  /** Set when the cut card was passed during the last completed round. */
  needsShuffle: boolean;
}

export function createShoe(deckCount: number, penetration = 0.75): Shoe {
  return {
    cards: shuffleDeck(createShoeCards(deckCount)),
    position: 0,
    deckCount,
    penetration,
    needsShuffle: false,
  };
}

export function reshuffle(shoe: Shoe): Shoe {
  return {
    ...shoe,
    cards: shuffleDeck(createShoeCards(shoe.deckCount)),
    position: 0,
    needsShuffle: false,
  };
}

export function cardsRemaining(shoe: Shoe): number {
  return shoe.cards.length - shoe.position;
}

export function cutCardReached(shoe: Shoe): boolean {
  return shoe.position >= shoe.cards.length * shoe.penetration;
}

/**
 * Draws `count` cards. Reshuffles mid-draw if the shoe physically runs out,
 * which keeps the engine total rather than throwing during a hand.
 */
export function draw(shoe: Shoe, count = 1): { shoe: Shoe; cards: Card[] } {
  let next: Shoe = { ...shoe };
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (next.position >= next.cards.length) next = reshuffle(next);
    drawn.push(next.cards[next.position]);
    next = { ...next, position: next.position + 1 };
  }
  return { shoe: next, cards: drawn };
}
