import { Card, RANKS, SUITS } from "@/types";
import { evaluateHand, compareHands } from "./evaluator";
import { randomInt } from "@/lib/utils/rng";

/**
 * Monte Carlo equity against random opponent hands.
 *
 * This is a real simulation rather than a quoted figure, but it assumes every
 * opponent holds a uniformly random hand. The app always presents the result as
 * an approximation against random holdings, never as a solver output.
 */

function fullDeck(): Card[] {
  const cards: Card[] = [];
  let index = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      index += 1;
      cards.push({ rank, suit, id: `eq-${index}` });
    }
  }
  return cards;
}

const DECK = fullDeck();

function key(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export interface EquityResult {
  /** Win share including split pots. */
  equity: number;
  win: number;
  tie: number;
  samples: number;
}

export function estimateEquity(
  hole: Card[],
  board: Card[],
  opponents: number,
  samples = 400,
): EquityResult {
  if (opponents <= 0) return { equity: 1, win: 1, tie: 0, samples: 0 };

  const used = new Set([...hole, ...board].map(key));
  const available = DECK.filter((card) => !used.has(key(card)));
  const needed = 5 - board.length;

  let win = 0;
  let tie = 0;

  for (let sample = 0; sample < samples; sample++) {
    // Partial Fisher-Yates over a copy: only the cards we need get shuffled.
    const pool = available.slice();
    const drawCount = needed + opponents * 2;
    for (let i = 0; i < drawCount; i++) {
      const j = i + randomInt(pool.length - i);
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }

    const runout = pool.slice(0, needed);
    const finalBoard = [...board, ...runout];
    const mine = evaluateHand([...hole, ...finalBoard]);

    let best = 0;
    let tied = 0;
    for (let opponent = 0; opponent < opponents; opponent++) {
      const offset = needed + opponent * 2;
      const theirs = evaluateHand([pool[offset], pool[offset + 1], ...finalBoard]);
      const comparison = compareHands(mine, theirs);
      if (comparison < 0) {
        best = -1;
        break;
      }
      if (comparison === 0) tied += 1;
    }

    if (best === 0) {
      if (tied === 0) win += 1;
      else tie += 1 / (tied + 1);
    }
  }

  return {
    equity: (win + tie) / samples,
    win: win / samples,
    tie: tie / samples,
    samples,
  };
}
