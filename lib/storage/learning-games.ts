import { STORAGE_KEYS, Versioned, readStore, writeStore } from "./storage";

/* -------------------------------------------------------------------- poker */

export type PokerAssessmentKey = "strong" | "reasonable" | "questionable" | "likely-mistake";
export type PokerStreet = "preflop" | "flop" | "turn" | "river";

export const POKER_ASSESSMENT_LABEL: Record<PokerAssessmentKey, string> = {
  strong: "Strong decision",
  reasonable: "Reasonable",
  questionable: "Questionable",
  "likely-mistake": "Likely mistake",
};

export interface PokerLearning extends Versioned {
  handsReviewed: number;
  decisions: number;
  assessments: Record<PokerAssessmentKey, number>;
  byStreet: Record<PokerStreet, { decisions: number; issues: number }>;
  topics: Record<string, number>;
  practice: {
    sessions: number;
    answered: number;
    correct: number;
    byTopic: Record<string, { answered: number; correct: number }>;
  };
  updatedAt: number;
}

export const DEFAULT_POKER_LEARNING: PokerLearning = {
  version: 1,
  handsReviewed: 0,
  decisions: 0,
  assessments: { strong: 0, reasonable: 0, questionable: 0, "likely-mistake": 0 },
  byStreet: {
    preflop: { decisions: 0, issues: 0 },
    flop: { decisions: 0, issues: 0 },
    turn: { decisions: 0, issues: 0 },
    river: { decisions: 0, issues: 0 },
  },
  topics: {},
  practice: { sessions: 0, answered: 0, correct: 0, byTopic: {} },
  updatedAt: 0,
};

export function loadPokerLearning(): PokerLearning {
  const stored = readStore<PokerLearning>(STORAGE_KEYS.learning.poker, DEFAULT_POKER_LEARNING);
  return {
    ...stored,
    assessments: { ...DEFAULT_POKER_LEARNING.assessments, ...stored.assessments },
    byStreet: { ...DEFAULT_POKER_LEARNING.byStreet, ...stored.byStreet },
    topics: { ...stored.topics },
    practice: { ...DEFAULT_POKER_LEARNING.practice, ...stored.practice },
  };
}

export function savePokerLearning(value: PokerLearning): void {
  writeStore(STORAGE_KEYS.learning.poker, value);
}

export interface PokerDecisionSummary {
  street: PokerStreet;
  assessment: PokerAssessmentKey;
  topic: string;
}

export function applyPokerDecisions(
  base: PokerLearning,
  decisions: PokerDecisionSummary[],
): PokerLearning {
  if (decisions.length === 0) {
    return { ...base, handsReviewed: base.handsReviewed + 1, updatedAt: Date.now() };
  }
  const assessments = { ...base.assessments };
  const byStreet = { ...base.byStreet };
  const topics = { ...base.topics };

  for (const decision of decisions) {
    assessments[decision.assessment] += 1;
    const street = { ...byStreet[decision.street] };
    street.decisions += 1;
    if (decision.assessment === "questionable" || decision.assessment === "likely-mistake") {
      street.issues += 1;
      topics[decision.topic] = (topics[decision.topic] ?? 0) + 1;
    }
    byStreet[decision.street] = street;
  }

  return {
    ...base,
    handsReviewed: base.handsReviewed + 1,
    decisions: base.decisions + decisions.length,
    assessments,
    byStreet,
    topics,
    updatedAt: Date.now(),
  };
}

export function recordPokerPractice(
  base: PokerLearning,
  topic: string,
  results: Array<{ correct: boolean }>,
): PokerLearning {
  const byTopic = { ...base.practice.byTopic };
  const current = byTopic[topic] ?? { answered: 0, correct: 0 };
  const correct = results.filter((entry) => entry.correct).length;
  byTopic[topic] = {
    answered: current.answered + results.length,
    correct: current.correct + correct,
  };
  return {
    ...base,
    practice: {
      sessions: base.practice.sessions + 1,
      answered: base.practice.answered + results.length,
      correct: base.practice.correct + correct,
      byTopic,
    },
    updatedAt: Date.now(),
  };
}

export function pokerCommonIssue(learning: PokerLearning): string | null {
  const entries = Object.entries(learning.topics);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/* ----------------------------------------------------------------- baccarat */

export interface BaccaratLearning extends Versioned {
  handsPlayed: number;
  bets: { player: number; banker: number; tie: number };
  updatedAt: number;
}

export const DEFAULT_BACCARAT_LEARNING: BaccaratLearning = {
  version: 1,
  handsPlayed: 0,
  bets: { player: 0, banker: 0, tie: 0 },
  updatedAt: 0,
};

export function loadBaccaratLearning(): BaccaratLearning {
  const stored = readStore<BaccaratLearning>(
    STORAGE_KEYS.learning.baccarat,
    DEFAULT_BACCARAT_LEARNING,
  );
  return { ...stored, bets: { ...DEFAULT_BACCARAT_LEARNING.bets, ...stored.bets } };
}

export function saveBaccaratLearning(value: BaccaratLearning): void {
  writeStore(STORAGE_KEYS.learning.baccarat, value);
}

/* ----------------------------------------------------------------- roulette */

export interface RouletteLearning extends Versioned {
  spins: number;
  betsPlaced: number;
  byType: Record<string, number>;
  updatedAt: number;
}

export const DEFAULT_ROULETTE_LEARNING: RouletteLearning = {
  version: 1,
  spins: 0,
  betsPlaced: 0,
  byType: {},
  updatedAt: 0,
};

export function loadRouletteLearning(): RouletteLearning {
  const stored = readStore<RouletteLearning>(
    STORAGE_KEYS.learning.roulette,
    DEFAULT_ROULETTE_LEARNING,
  );
  return { ...stored, byType: { ...stored.byType } };
}

export function saveRouletteLearning(value: RouletteLearning): void {
  writeStore(STORAGE_KEYS.learning.roulette, value);
}
