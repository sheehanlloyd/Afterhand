import { Card, Rank } from "@/types";

/**
 * Seven card hand evaluator.
 *
 * Returns a comparable score array plus a readable description. Scores compare
 * lexicographically: category first, then the tie breaking ranks in order.
 */

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

export const HAND_CATEGORIES = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];

export interface HandValue {
  category: number;
  categoryName: HandCategory;
  /** Category index followed by tie breaking ranks, highest first. */
  score: number[];
  /** The five cards that make the hand. */
  cards: Card[];
  description: string;
}

const RANK_WORD: Record<number, string> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven",
  8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace",
};

const RANK_PLURAL: Record<number, string> = {
  2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens",
  8: "Eights", 9: "Nines", 10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces",
};

function value(card: Card): number {
  return RANK_VALUE[card.rank];
}

/** Highest straight in a set of rank values, or 0. Handles the five high wheel. */
function straightHigh(values: number[]): number {
  const unique = Array.from(new Set(values)).sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === unique[i - 1] - 1) {
      run += 1;
      if (run >= 5) return unique[i] + 4;
    } else {
      run = 1;
    }
  }
  return 0;
}

function pickStraightCards(cards: Card[], high: number): Card[] {
  const wanted = [high, high - 1, high - 2, high - 3, high - 4].map((rank) =>
    rank === 1 ? 14 : rank,
  );
  const out: Card[] = [];
  for (const rank of wanted) {
    const found = cards.find((card) => value(card) === rank && !out.includes(card));
    if (found) out.push(found);
  }
  return out;
}

export function evaluateHand(cards: Card[]): HandValue {
  if (cards.length < 5) throw new Error("evaluateHand needs at least five cards");

  const bySuit = new Map<string, Card[]>();
  for (const card of cards) {
    const list = bySuit.get(card.suit) ?? [];
    list.push(card);
    bySuit.set(card.suit, list);
  }

  const flushSuit = [...bySuit.entries()].find(([, list]) => list.length >= 5);

  if (flushSuit) {
    const suited = [...flushSuit[1]].sort((a, b) => value(b) - value(a));
    const high = straightHigh(suited.map(value));
    if (high > 0) {
      const made = pickStraightCards(suited, high);
      return {
        category: 8,
        categoryName: "Straight flush",
        score: [8, high],
        cards: made,
        description:
          high === 14 ? "Royal flush" : `Straight flush, ${RANK_WORD[high]} high`,
      };
    }
  }

  const counts = new Map<number, Card[]>();
  for (const card of cards) {
    const list = counts.get(value(card)) ?? [];
    list.push(card);
    counts.set(value(card), list);
  }

  const groups = [...counts.entries()]
    .map(([rank, list]) => ({ rank, list, size: list.length }))
    .sort((a, b) => b.size - a.size || b.rank - a.rank);

  const kickersFrom = (used: Card[], count: number): Card[] =>
    [...cards]
      .filter((card) => !used.includes(card))
      .sort((a, b) => value(b) - value(a))
      .slice(0, count);

  if (groups[0].size === 4) {
    const quad = groups[0];
    const kicker = kickersFrom(quad.list, 1);
    return {
      category: 7,
      categoryName: "Four of a kind",
      score: [7, quad.rank, value(kicker[0])],
      cards: [...quad.list, ...kicker],
      description: `Four ${RANK_PLURAL[quad.rank]}`,
    };
  }

  const trips = groups.filter((group) => group.size === 3);
  const pairs = groups.filter((group) => group.size === 2);

  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const three = trips[0];
    const pair = trips.length > 1 && (pairs.length === 0 || trips[1].rank > pairs[0].rank)
      ? { rank: trips[1].rank, list: trips[1].list.slice(0, 2) }
      : { rank: pairs[0].rank, list: pairs[0].list };
    return {
      category: 6,
      categoryName: "Full house",
      score: [6, three.rank, pair.rank],
      cards: [...three.list, ...pair.list],
      description: `Full house, ${RANK_PLURAL[three.rank]} over ${RANK_PLURAL[pair.rank]}`,
    };
  }

  if (flushSuit) {
    const suited = [...flushSuit[1]].sort((a, b) => value(b) - value(a)).slice(0, 5);
    return {
      category: 5,
      categoryName: "Flush",
      score: [5, ...suited.map(value)],
      cards: suited,
      description: `Flush, ${RANK_WORD[value(suited[0])]} high`,
    };
  }

  const high = straightHigh(cards.map(value));
  if (high > 0) {
    return {
      category: 4,
      categoryName: "Straight",
      score: [4, high],
      cards: pickStraightCards([...cards].sort((a, b) => value(b) - value(a)), high),
      description: `Straight, ${RANK_WORD[high]} high`,
    };
  }

  if (trips.length > 0) {
    const three = trips[0];
    const kickers = kickersFrom(three.list, 2);
    return {
      category: 3,
      categoryName: "Three of a kind",
      score: [3, three.rank, ...kickers.map(value)],
      cards: [...three.list, ...kickers],
      description: `Three ${RANK_PLURAL[three.rank]}`,
    };
  }

  if (pairs.length >= 2) {
    const [first, second] = pairs;
    const used = [...first.list, ...second.list];
    const kicker = kickersFrom(used, 1);
    return {
      category: 2,
      categoryName: "Two pair",
      score: [2, first.rank, second.rank, value(kicker[0])],
      cards: [...used, ...kicker],
      description: `Two pair, ${RANK_PLURAL[first.rank]} and ${RANK_PLURAL[second.rank]}`,
    };
  }

  if (pairs.length === 1) {
    const pair = pairs[0];
    const kickers = kickersFrom(pair.list, 3);
    return {
      category: 1,
      categoryName: "Pair",
      score: [1, pair.rank, ...kickers.map(value)],
      cards: [...pair.list, ...kickers],
      description: `Pair of ${RANK_PLURAL[pair.rank]}`,
    };
  }

  const best = [...cards].sort((a, b) => value(b) - value(a)).slice(0, 5);
  return {
    category: 0,
    categoryName: "High card",
    score: [0, ...best.map(value)],
    cards: best,
    description: `${RANK_WORD[value(best[0])]} high`,
  };
}

/** Positive when a beats b, negative when b beats a, zero on a tie. */
export function compareHands(a: HandValue, b: HandValue): number {
  const length = Math.max(a.score.length, b.score.length);
  for (let i = 0; i < length; i++) {
    const left = a.score[i] ?? 0;
    const right = b.score[i] ?? 0;
    if (left !== right) return left - right;
  }
  return 0;
}
