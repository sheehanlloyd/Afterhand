import { Card } from "@/types";
import { cardValue, calculateHandValue, strategyRank } from "@/lib/games/blackjack/hand";

/**
 * Dealer and player probabilities computed from first principles.
 *
 * Every number here comes from an exhaustive recursion over an infinite-deck
 * model, so it is real arithmetic rather than a quoted figure. The model ignores
 * cards already on the table, which is why the app always describes these values
 * as approximate.
 */

export interface DealerOutcomeDistribution {
  17: number;
  18: number;
  19: number;
  20: number;
  21: number;
  bust: number;
}

const ONE = 1 / 13;
const TEN = 4 / 13;

/** Draw weights for an infinite shoe: ace, 2 through 9, and the ten-value group. */
const DRAWS: Array<{ value: number; ace: boolean; weight: number }> = [
  { value: 11, ace: true, weight: ONE },
  { value: 2, ace: false, weight: ONE },
  { value: 3, ace: false, weight: ONE },
  { value: 4, ace: false, weight: ONE },
  { value: 5, ace: false, weight: ONE },
  { value: 6, ace: false, weight: ONE },
  { value: 7, ace: false, weight: ONE },
  { value: 8, ace: false, weight: ONE },
  { value: 9, ace: false, weight: ONE },
  { value: 10, ace: false, weight: TEN },
];

function emptyDistribution(): DealerOutcomeDistribution {
  return { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0 };
}

function addScaled(
  target: DealerOutcomeDistribution,
  source: DealerOutcomeDistribution,
  scale: number,
): void {
  target[17] += source[17] * scale;
  target[18] += source[18] * scale;
  target[19] += source[19] * scale;
  target[20] += source[20] * scale;
  target[21] += source[21] * scale;
  target.bust += source.bust * scale;
}

/**
 * Hands are tracked as a hard total plus a flag for whether an ace is present.
 * Only one ace can ever count as eleven, so a single flag is enough.
 */
interface Partial {
  hard: number;
  hasAce: boolean;
}

function applyCard(state: Partial, value: number, ace: boolean): Partial {
  return {
    hard: state.hard + (ace ? 1 : value),
    hasAce: state.hasAce || ace,
  };
}

function bestTotal(state: Partial): number {
  return state.hasAce && state.hard + 10 <= 21 ? state.hard + 10 : state.hard;
}

function isSoft(state: Partial): boolean {
  return state.hasAce && state.hard + 10 <= 21;
}

function dealerFrom(
  state: Partial,
  hitsSoft17: boolean,
  memo: Map<string, DealerOutcomeDistribution>,
): DealerOutcomeDistribution {
  const key = `${state.hard}:${state.hasAce ? 1 : 0}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const result = emptyDistribution();
  const total = bestTotal(state);
  const soft = isSoft(state);

  if (state.hard > 21) {
    result.bust = 1;
  } else if (total >= 17 && !(hitsSoft17 && soft && total === 17)) {
    result[total as 17 | 18 | 19 | 20 | 21] = 1;
  } else {
    for (const draw of DRAWS) {
      const next = applyCard(state, draw.value, draw.ace);
      addScaled(result, dealerFrom(next, hitsSoft17, memo), draw.weight);
    }
  }
  memo.set(key, result);
  return result;
}

const dealerCache = new Map<string, DealerOutcomeDistribution>();

/**
 * Distribution of dealer final totals given an upcard.
 * Includes hands where the dealer would have had a natural.
 */
export function dealerOutcomes(
  upcard: Card | number,
  hitsSoft17: boolean,
): DealerOutcomeDistribution {
  const value = typeof upcard === "number" ? upcard : cardValue(upcard.rank);
  const cacheKey = `${value}:${hitsSoft17 ? 1 : 0}`;
  const cached = dealerCache.get(cacheKey);
  if (cached) return cached;
  const memo = new Map<string, DealerOutcomeDistribution>();
  const start: Partial = value === 11 ? { hard: 1, hasAce: true } : { hard: value, hasAce: false };
  const distribution = dealerFrom(start, hitsSoft17, memo);
  dealerCache.set(cacheKey, distribution);
  return distribution;
}

export function dealerBustChance(upcard: Card | number, hitsSoft17: boolean): number {
  return dealerOutcomes(upcard, hitsSoft17).bust;
}

/** Chance the very next card busts this hand. A soft hand always returns zero. */
export function bustChanceOnNextCard(cards: Card[]): number {
  const value = calculateHandValue(cards);
  if (value.busted) return 1;
  const state: Partial = {
    hard: value.hardTotal,
    hasAce: cards.some((entry) => entry.rank === "A"),
  };
  let bust = 0;
  for (const draw of DRAWS) {
    const next = applyCard(state, draw.value, draw.ace);
    if (next.hard > 21) bust += draw.weight;
  }
  return bust;
}

export interface StandOutlook {
  win: number;
  push: number;
  lose: number;
}

/** Outcome split if the player stands on `total` against this upcard. */
export function standOutlook(
  total: number,
  upcard: Card | number,
  hitsSoft17: boolean,
): StandOutlook {
  const distribution = dealerOutcomes(upcard, hitsSoft17);
  let win = distribution.bust;
  let push = 0;
  let lose = 0;
  for (const key of [17, 18, 19, 20, 21] as const) {
    const probability = distribution[key];
    if (key > total) lose += probability;
    else if (key === total) push += probability;
    else win += probability;
  }
  return { win, push, lose };
}

export function upcardLabel(card: Card): string {
  const rank = strategyRank(card.rank);
  return rank === "A" ? "an Ace" : `a ${rank}`;
}
