import { Card, Rank, Suit, SUITS } from "@/types";
import { BlackjackRules, PlayerAction } from "./types";
import { calculateHandValue, strategyRank } from "./hand";
import { randomInt, pick } from "@/lib/utils/rng";
import { recommendAction } from "@/lib/strategy/blackjack-strategy";

export type PracticeTopic =
  | "pairs"
  | "soft"
  | "hard"
  | "doubles"
  | "weak-dealer"
  | "strong-dealer"
  | "mixed";

export interface PracticeTopicMeta {
  id: PracticeTopic;
  label: string;
  description: string;
}

export const PRACTICE_TOPICS: PracticeTopicMeta[] = [
  {
    id: "pairs",
    label: "Pair Splitting",
    description: "Every hand starts as a pair. Decide whether to split it.",
  },
  {
    id: "soft",
    label: "Soft Hands",
    description: "Hands holding an ace that can count as eleven.",
  },
  {
    id: "hard",
    label: "Hard Hands",
    description: "Totals with no usable ace, including the awkward 12 to 16 range.",
  },
  {
    id: "doubles",
    label: "Double Downs",
    description: "Totals where doubling is on the table.",
  },
  {
    id: "weak-dealer",
    label: "Weak Dealer Cards",
    description: "The dealer shows 2 through 6.",
  },
  {
    id: "strong-dealer",
    label: "Strong Dealer Cards",
    description: "The dealer shows 7 through Ace.",
  },
  {
    id: "mixed",
    label: "Mixed Practice",
    description: "Everything, drawn at random.",
  },
];

export const PRACTICE_SIZES = [10, 20, 50] as const;

let counter = 0;

function makeCard(rank: Rank, suit?: Suit): Card {
  counter += 1;
  return { rank, suit: suit ?? pick(SUITS), id: `practice-${rank}-${counter}` };
}

const NUMBER_RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const PAIR_RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const ALL_RANKS: Rank[] = ["A", ...NUMBER_RANKS];
const WEAK_UPCARDS: Rank[] = ["2", "3", "4", "5", "6"];
const STRONG_UPCARDS: Rank[] = ["7", "8", "9", "10", "J", "Q", "K", "A"];

export interface PracticeScenario {
  id: string;
  playerCards: Card[];
  dealerUpcard: Card;
  available: PlayerAction[];
  correct: PlayerAction;
  topic: PracticeTopic;
}

function pairHand(): Card[] {
  const rank = pick(PAIR_RANKS);
  const [first, second] = [SUITS[randomInt(4)], SUITS[randomInt(4)]];
  return [makeCard(rank, first), makeCard(rank, second === first ? SUITS[(SUITS.indexOf(first) + 1) % 4] : second)];
}

function softHand(): Card[] {
  const partner = pick(["2", "3", "4", "5", "6", "7", "8", "9"] as Rank[]);
  return [makeCard("A"), makeCard(partner)];
}

function hardHand(): Card[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const first = pick(NUMBER_RANKS);
    const second = pick(NUMBER_RANKS);
    if (strategyRank(first) === strategyRank(second)) continue;
    const cards = [makeCard(first), makeCard(second)];
    const total = calculateHandValue(cards).total;
    if (total >= 5 && total <= 20) return cards;
  }
  return [makeCard("10"), makeCard("6")];
}

function doubleHand(): Card[] {
  if (randomInt(2) === 0) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const cards = hardHand();
      const total = calculateHandValue(cards).total;
      if (total >= 8 && total <= 11) return cards;
    }
    return [makeCard("6"), makeCard("5")];
  }
  const partner = pick(["2", "3", "4", "5", "6", "7"] as Rank[]);
  return [makeCard("A"), makeCard(partner)];
}

function handForTopic(topic: PracticeTopic): Card[] {
  switch (topic) {
    case "pairs": return pairHand();
    case "soft": return softHand();
    case "hard": return hardHand();
    case "doubles": return doubleHand();
    default: {
      const roll = randomInt(10);
      if (roll < 2) return pairHand();
      if (roll < 5) return softHand();
      return hardHand();
    }
  }
}

function upcardForTopic(topic: PracticeTopic): Card {
  if (topic === "weak-dealer") return makeCard(pick(WEAK_UPCARDS));
  if (topic === "strong-dealer") return makeCard(pick(STRONG_UPCARDS));
  return makeCard(pick(ALL_RANKS));
}

/**
 * Builds one drill. Surrender is left out so the drill stays to the four
 * everyday choices, and the answer is taken from the same strategy engine the
 * table uses.
 */
export function createScenario(topic: PracticeTopic, rules: BlackjackRules): PracticeScenario {
  const playerCards = handForTopic(topic);
  const dealerUpcard = upcardForTopic(topic);
  const isPair = strategyRank(playerCards[0].rank) === strategyRank(playerCards[1].rank);

  const available: PlayerAction[] = ["hit", "stand", "double"];
  if (isPair) available.push("split");

  const correct = recommendAction({ playerCards, dealerUpcard, rules, available }).action;
  counter += 1;

  return {
    id: `scenario-${counter}`,
    playerCards,
    dealerUpcard,
    available,
    correct,
    topic,
  };
}

export function createSession(
  topic: PracticeTopic,
  size: number,
  rules: BlackjackRules,
): PracticeScenario[] {
  return Array.from({ length: size }, () => createScenario(topic, rules));
}

/** Maps a scenario to the category used by the learning profile. */
export function scenarioCategory(scenario: PracticeScenario): PracticeTopic {
  const isPair =
    strategyRank(scenario.playerCards[0].rank) === strategyRank(scenario.playerCards[1].rank);
  if (isPair) return "pairs";
  return calculateHandValue(scenario.playerCards).soft ? "soft" : "hard";
}
