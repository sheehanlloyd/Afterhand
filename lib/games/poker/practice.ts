import { Card, RANKS, SUITS } from "@/types";
import { estimateEquity } from "./equity";
import { evaluateHand } from "./evaluator";
import { pick, shuffle } from "@/lib/utils/rng";

/**
 * Poker drills.
 *
 * Only two topics, and both have answers that fall out of arithmetic rather
 * than convention: the price the pot is offering, and how much equity a hand
 * actually has. Nothing here pretends there is one correct way to play a hand.
 */

export type PokerPracticeTopic = "pot-odds" | "equity";

export interface PokerPracticeTopicMeta {
  id: PokerPracticeTopic;
  label: string;
  description: string;
}

export const POKER_PRACTICE_TOPICS: PokerPracticeTopicMeta[] = [
  {
    id: "pot-odds",
    label: "Pot Odds",
    description:
      "You are facing a bet. Decide whether the price the pot is offering covers your hand.",
  },
  {
    id: "equity",
    label: "Reading Equity",
    description:
      "Look at your hand and the board, then judge roughly how often it wins from here.",
  },
];

export const POKER_PRACTICE_SIZES = [10, 20] as const;

const SAMPLES = 1600;
let counter = 0;

function freshDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      counter += 1;
      cards.push({ rank, suit, id: `pp-${counter}` });
    }
  }
  return shuffle(cards);
}

export type EquityBracket = "under-25" | "25-to-50" | "over-50";

export const EQUITY_BRACKETS: Array<{ id: EquityBracket; label: string }> = [
  { id: "under-25", label: "Under 25%" },
  { id: "25-to-50", label: "25% to 50%" },
  { id: "over-50", label: "Over 50%" },
];

export function bracketFor(equity: number): EquityBracket {
  if (equity < 0.25) return "under-25";
  if (equity <= 0.5) return "25-to-50";
  return "over-50";
}

export interface PokerScenario {
  id: string;
  topic: PokerPracticeTopic;
  hole: Card[];
  board: Card[];
  street: "flop" | "turn" | "river";
  equity: number;
  /** Pot odds drills only. */
  pot: number;
  toCall: number;
  requiredEquity: number;
  correct: string;
  madeHand: string;
}

const BOARD_SIZES: Array<{ count: 3 | 4 | 5; street: PokerScenario["street"] }> = [
  { count: 3, street: "flop" },
  { count: 4, street: "turn" },
  { count: 5, street: "river" },
];

const BET_FRACTIONS = [0.33, 0.5, 0.66, 1];
const POT_SIZES = [60, 80, 120, 160, 200, 240];

/**
 * Builds one drill, rejecting anything too close to the decision boundary so a
 * correct read is never punished by simulation noise.
 */
export function createPokerScenario(topic: PokerPracticeTopic): PokerScenario {
  for (let attempt = 0; attempt < 60; attempt++) {
    const deck = freshDeck();
    const shape = pick(BOARD_SIZES);
    const hole = deck.slice(0, 2);
    const board = deck.slice(2, 2 + shape.count);
    const equity = estimateEquity(hole, board, 1, SAMPLES).equity;
    counter += 1;

    if (topic === "equity") {
      const distance = Math.min(Math.abs(equity - 0.25), Math.abs(equity - 0.5));
      if (distance < 0.04) continue;
      return {
        id: `pp-scenario-${counter}`,
        topic,
        hole,
        board,
        street: shape.street,
        equity,
        pot: 0,
        toCall: 0,
        requiredEquity: 0,
        correct: bracketFor(equity),
        madeHand: evaluateHand([...hole, ...board]).description,
      };
    }

    const pot = pick(POT_SIZES);
    const toCall = Math.round((pot * pick(BET_FRACTIONS)) / 5) * 5;
    if (toCall <= 0) continue;
    const requiredEquity = toCall / (pot + toCall);
    if (Math.abs(equity - requiredEquity) < 0.07) continue;

    return {
      id: `pp-scenario-${counter}`,
      topic,
      hole,
      board,
      street: shape.street,
      equity,
      pot,
      toCall,
      requiredEquity,
      correct: equity > requiredEquity ? "call" : "fold",
      madeHand: evaluateHand([...hole, ...board]).description,
    };
  }

  // Fallback that always satisfies the margin rule.
  const deck = freshDeck();
  const hole = deck.slice(0, 2);
  const board = deck.slice(2, 5);
  const equity = estimateEquity(hole, board, 1, SAMPLES).equity;
  counter += 1;
  return {
    id: `pp-scenario-${counter}`,
    topic,
    hole,
    board,
    street: "flop",
    equity,
    pot: 100,
    toCall: 100,
    requiredEquity: 0.5,
    correct: topic === "equity" ? bracketFor(equity) : equity > 0.5 ? "call" : "fold",
    madeHand: evaluateHand([...hole, ...board]).description,
  };
}

export function createPokerSession(
  topic: PokerPracticeTopic,
  size: number,
): PokerScenario[] {
  return Array.from({ length: size }, () => createPokerScenario(topic));
}

export function explainScenario(scenario: PokerScenario): string {
  const equity = `${Math.round(scenario.equity * 100)}%`;
  if (scenario.topic === "equity") {
    return `Against one random hand this holding wins about ${equity} of the time from here. Right now it is ${scenario.madeHand.toLowerCase()}, and the rest of the value is in the cards still to come.`;
  }
  const required = `${Math.round(scenario.requiredEquity * 100)}%`;
  const total = scenario.pot + scenario.toCall;
  return `Calling $${scenario.toCall} into a pot of $${scenario.pot} means risking $${scenario.toCall} to win $${total}, so you need about ${required} to break even. This hand is worth roughly ${equity} against one random holding, which makes it ${scenario.correct === "call" ? "a call" : "a fold"} on price alone.`;
}
