import { DecisionCategory, DecisionQuality, DecisionRecord } from "@/lib/games/blackjack/types";
import { STORAGE_KEYS, Versioned, readStore, writeStore } from "./storage";

export interface CategoryStat {
  seen: number;
  optimal: number;
  acceptable: number;
  mistake: number;
  major: number;
}

export type CellStat = { seen: number; correct: number };

export interface PracticeTopicStat {
  answered: number;
  correct: number;
}

export interface BlackjackLearning extends Versioned {
  handsReviewed: number;
  decisions: number;
  categories: Record<DecisionCategory, CategoryStat>;
  cells: Record<string, CellStat>;
  practice: {
    sessions: number;
    answered: number;
    correct: number;
    byTopic: Record<string, PracticeTopicStat>;
  };
  updatedAt: number;
}

export const BLACKJACK_CATEGORIES: DecisionCategory[] = [
  "hard-total",
  "soft-total",
  "pair-split",
  "double-down",
  "surrender",
  "insurance",
];

export const CATEGORY_LABEL: Record<DecisionCategory, string> = {
  "hard-total": "Hard Totals",
  "soft-total": "Soft Totals",
  "pair-split": "Pair Splitting",
  "double-down": "Double Downs",
  surrender: "Surrender",
  insurance: "Insurance",
};

function emptyCategoryStat(): CategoryStat {
  return { seen: 0, optimal: 0, acceptable: 0, mistake: 0, major: 0 };
}

function emptyCategories(): Record<DecisionCategory, CategoryStat> {
  return BLACKJACK_CATEGORIES.reduce(
    (acc, key) => {
      acc[key] = emptyCategoryStat();
      return acc;
    },
    {} as Record<DecisionCategory, CategoryStat>,
  );
}

export const DEFAULT_BLACKJACK_LEARNING: BlackjackLearning = {
  version: 1,
  handsReviewed: 0,
  decisions: 0,
  categories: emptyCategories(),
  cells: {},
  practice: { sessions: 0, answered: 0, correct: 0, byTopic: {} },
  updatedAt: 0,
};

export function loadBlackjackLearning(): BlackjackLearning {
  const stored = readStore<BlackjackLearning>(
    STORAGE_KEYS.learning.blackjack,
    DEFAULT_BLACKJACK_LEARNING,
  );
  return {
    ...stored,
    categories: { ...emptyCategories(), ...stored.categories },
    cells: { ...stored.cells },
    practice: { ...DEFAULT_BLACKJACK_LEARNING.practice, ...stored.practice },
  };
}

export function saveBlackjackLearning(value: BlackjackLearning): void {
  writeStore(STORAGE_KEYS.learning.blackjack, value);
}

export function cellKey(record: Pick<DecisionRecord, "category" | "rowLabel" | "dealerKey">): string {
  const section =
    record.category === "pair-split"
      ? "pair"
      : record.rowLabel.startsWith("Soft")
        ? "soft"
        : record.category === "insurance"
          ? "insurance"
          : "hard";
  return `${section}|${record.rowLabel}|${record.dealerKey}`;
}

function creditFor(quality: DecisionQuality): number {
  return quality === "optimal" ? 1 : quality === "acceptable" ? 0.5 : 0;
}

export function applyDecisions(
  base: BlackjackLearning,
  records: DecisionRecord[],
  handsPlayed = 1,
): BlackjackLearning {
  if (records.length === 0) return base;
  const categories = { ...base.categories };
  const cells = { ...base.cells };

  for (const record of records) {
    const current = { ...(categories[record.category] ?? emptyCategoryStat()) };
    current.seen += 1;
    if (record.quality === "optimal") current.optimal += 1;
    else if (record.quality === "acceptable") current.acceptable += 1;
    else if (record.quality === "mistake") current.mistake += 1;
    else current.major += 1;
    categories[record.category] = current;

    const key = cellKey(record);
    const cell = cells[key] ?? { seen: 0, correct: 0 };
    cells[key] = {
      seen: cell.seen + 1,
      correct: cell.correct + creditFor(record.quality),
    };
  }

  return {
    ...base,
    handsReviewed: base.handsReviewed + handsPlayed,
    decisions: base.decisions + records.length,
    categories,
    cells,
    updatedAt: Date.now(),
  };
}

export function recordPractice(
  base: BlackjackLearning,
  topic: string,
  results: Array<{ correct: boolean }>,
): BlackjackLearning {
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

export function categoryAccuracy(stat: CategoryStat | undefined): number | null {
  if (!stat || stat.seen === 0) return null;
  return (stat.optimal + stat.acceptable * 0.5) / stat.seen;
}

export interface CategoryRanking {
  strongest: DecisionCategory | null;
  weakest: DecisionCategory | null;
}

/** Only categories with enough samples are ranked, so one hand cannot define a weakness. */
export function rankCategories(
  categories: Record<DecisionCategory, CategoryStat>,
  minimumSamples = 3,
): CategoryRanking {
  const eligible = BLACKJACK_CATEGORIES.map((key) => ({
    key,
    stat: categories[key],
    accuracy: categoryAccuracy(categories[key]),
  })).filter((entry) => entry.accuracy !== null && entry.stat.seen >= minimumSamples);

  if (eligible.length === 0) return { strongest: null, weakest: null };
  const sorted = [...eligible].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  return {
    strongest: sorted[0].key,
    weakest: sorted[sorted.length - 1].key,
  };
}

export type MasteryLevel = "unseen" | "learning" | "improving" | "strong";

export function masteryFor(cell: CellStat | undefined): MasteryLevel {
  if (!cell || cell.seen === 0) return "unseen";
  const accuracy = cell.correct / cell.seen;
  if (cell.seen < 3) return "learning";
  if (accuracy >= 0.9) return "strong";
  if (accuracy >= 0.65) return "improving";
  return "learning";
}

export function overallAccuracy(learning: BlackjackLearning): number | null {
  const totals = BLACKJACK_CATEGORIES.reduce(
    (acc, key) => {
      const stat = learning.categories[key];
      if (!stat) return acc;
      acc.seen += stat.seen;
      acc.credit += stat.optimal + stat.acceptable * 0.5;
      return acc;
    },
    { seen: 0, credit: 0 },
  );
  if (totals.seen === 0) return null;
  return totals.credit / totals.seen;
}
