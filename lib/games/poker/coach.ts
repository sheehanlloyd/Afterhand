import { Card } from "@/types";
import { estimateEquity } from "./equity";
import { evaluateHand } from "./evaluator";
import { ActionRecord, PokerActionType, PokerState, Street } from "./types";
import { PokerAssessmentKey } from "@/lib/storage/learning-games";

/**
 * Poker coaching.
 *
 * Poker rarely has a single correct answer, so the review never claims one. It
 * states the price the pot was offering, the equity actually measured by
 * simulation against random holdings, and how the two compare.
 */

export const POKER_EQUITY_NOTE =
  "Equity is measured by simulating the hand against random opponent holdings. Real opponents do not play random hands, so treat it as a reference point rather than a verdict.";

export interface PokerDecision {
  id: string;
  street: Street;
  /** What the player did. */
  action: PokerActionType;
  amount: number;
  toCall: number;
  potBefore: number;
  /** Break even share of the pot needed to call, zero when checking or betting. */
  requiredEquity: number;
  equity: number;
  hole: Card[];
  board: Card[];
  opponents: number;
  position: "early" | "late";
  assessment: PokerAssessmentKey;
  topic: string;
  headline: string;
  explanation: string;
  detail: string[];
}

const STREET_LABEL: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  complete: "Hand",
};

export const ASSESSMENT_COPY: Record<PokerAssessmentKey, string> = {
  strong: "Strong decision",
  reasonable: "Reasonable",
  questionable: "Questionable",
  "likely-mistake": "Likely mistake",
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** Plain language notes about what the board makes possible. */
export function describeBoard(board: Card[]): string[] {
  if (board.length === 0) return [];
  const notes: string[] = [];
  const suits = new Map<string, number>();
  const ranks = new Map<string, number>();
  for (const card of board) {
    suits.set(card.suit, (suits.get(card.suit) ?? 0) + 1);
    ranks.set(card.rank, (ranks.get(card.rank) ?? 0) + 1);
  }
  const flushCount = Math.max(...suits.values());
  if (flushCount >= 4) notes.push("Four cards of one suit are out, so a flush is very live.");
  else if (flushCount === 3) notes.push("Three cards of one suit are out, so a flush draw is possible.");
  if ([...ranks.values()].some((count) => count >= 3)) notes.push("The board is tripled.");
  else if ([...ranks.values()].some((count) => count === 2)) notes.push("The board is paired, which brings full houses into range.");

  const values = board
    .map((card) => ("23456789".includes(card.rank) ? Number(card.rank) : card.rank === "10" ? 10 : card.rank === "J" ? 11 : card.rank === "Q" ? 12 : card.rank === "K" ? 13 : 14))
    .sort((a, b) => a - b);
  const span = values[values.length - 1] - values[0];
  if (board.length >= 3 && span <= 4) notes.push("The cards are close together, which favours straights.");
  return notes;
}

export interface EvaluateDecisionInput {
  id: string;
  state: PokerState;
  action: ActionRecord;
  hole: Card[];
  board: Card[];
  opponents: number;
  /** True when the player acts on or near the button for this street. */
  inPosition: boolean;
}

export function reviewPokerDecision(input: EvaluateDecisionInput): PokerDecision {
  const { action, hole, board, opponents } = input;
  const equity = estimateEquity(hole, board, Math.max(1, opponents), 700).equity;
  const requiredEquity =
    action.toCall > 0 ? action.toCall / (action.potBefore + action.toCall) : 0;
  const made = board.length >= 3 ? evaluateHand([...hole, ...board]) : null;

  let assessment: PokerAssessmentKey = "reasonable";
  let topic = "General";
  let headline = "";
  let explanation = "";

  const margin = equity - requiredEquity;

  if (action.type === "fold") {
    topic = "Folding";
    if (action.toCall === 0) {
      assessment = "likely-mistake";
      headline = "Folding for nothing.";
      explanation = "Checking was free here, so folding gave up the pot at no charge.";
    } else if (margin > 0.16) {
      assessment = "questionable";
      headline = "That fold looks tight.";
      explanation = `You needed about ${pct(requiredEquity)} to break even and the hand was worth roughly ${pct(equity)} against random holdings.`;
    } else if (margin > 0.05) {
      assessment = "reasonable";
      headline = "A close fold.";
      explanation = `The price asked for about ${pct(requiredEquity)} and the hand measured near ${pct(equity)}. Folding gives up a thin edge, which is defensible against players who bet strong hands.`;
    } else {
      assessment = "strong";
      headline = "Good discipline.";
      explanation = `Calling needed about ${pct(requiredEquity)} and the hand was worth roughly ${pct(equity)}. Letting it go is the cheap option.`;
    }
  } else if (action.type === "call") {
    topic = "Calling";
    if (margin < -0.15) {
      assessment = "likely-mistake";
      headline = "That call was expensive relative to the pot.";
      explanation = `You called ${money(action.amount)} into a pot of ${money(action.potBefore)}, which needed about ${pct(requiredEquity)} equity. The hand measured closer to ${pct(equity)}.`;
    } else if (margin < -0.05) {
      assessment = "questionable";
      headline = "A thin call.";
      explanation = `The pot asked for about ${pct(requiredEquity)} and the hand was worth roughly ${pct(equity)}. It is close enough to be a leak if it happens often.`;
    } else if (margin > 0.18) {
      assessment = "strong";
      headline = "Good price, easy call.";
      explanation = `Calling needed about ${pct(requiredEquity)} and the hand measured near ${pct(equity)}. Raising may even have been available.`;
    } else {
      assessment = "reasonable";
      headline = "Fair price.";
      explanation = `You needed about ${pct(requiredEquity)} and had roughly ${pct(equity)}. That is a call.`;
    }
  } else if (action.type === "check") {
    topic = "Checking";
    if (equity > 0.78 && input.inPosition) {
      assessment = "questionable";
      headline = "There was value on the table.";
      explanation = `The hand was worth about ${pct(equity)} here. Checking a hand this strong gives up a bet that worse hands would often pay.`;
    } else {
      assessment = "reasonable";
      headline = "Checking is fine.";
      explanation = `With roughly ${pct(equity)} equity, keeping the pot small is a normal way to play this spot.`;
    }
  } else {
    topic = action.type === "raise" ? "Raising" : "Betting";
    const sizeShare = action.potBefore > 0 ? action.amount / action.potBefore : 1;
    if (equity > 0.68) {
      assessment = "strong";
      headline = "Betting with the best of it.";
      explanation = `Around ${pct(equity)} equity is the right shape for putting money in. You bet ${money(action.amount)} into ${money(action.potBefore)}, about ${pct(sizeShare)} of the pot.`;
    } else if (equity < 0.32 && sizeShare > 0.6) {
      assessment = "questionable";
      headline = "A large bet with a weak hand.";
      explanation = `The hand measured about ${pct(equity)}. A bet that size has to make better hands fold often to be worth it, which is a lot to ask.`;
    } else if (equity < 0.28) {
      assessment = "reasonable";
      headline = "A bluff, and a reasonably sized one.";
      explanation = `With about ${pct(equity)} equity this only wins by folding out better hands. The sizing keeps the price of being wrong sensible.`;
    } else {
      assessment = "reasonable";
      headline = "A workable bet.";
      explanation = `About ${pct(equity)} equity, betting ${money(action.amount)} into ${money(action.potBefore)}.`;
    }
  }

  const detail: string[] = [];
  detail.push(`${STREET_LABEL[action.street]}, pot ${money(action.potBefore)}, ${opponents} opponent${opponents === 1 ? "" : "s"} still in.`);
  if (action.toCall > 0) {
    detail.push(
      `Calling ${money(action.toCall)} into ${money(action.potBefore)} means risking ${money(action.toCall)} to win ${money(action.potBefore + action.toCall)}, so the break even point is about ${pct(requiredEquity)}.`,
    );
  }
  detail.push(`Simulated equity against random holdings: about ${pct(equity)}.`);
  if (made) detail.push(`Your hand at that point: ${made.description}.`);
  detail.push(...describeBoard(board));
  detail.push(`Position: ${input.inPosition ? "acting late in the order" : "acting early in the order"}.`);
  detail.push(POKER_EQUITY_NOTE);

  return {
    id: input.id,
    street: action.street,
    action: action.type,
    amount: action.amount,
    toCall: action.toCall,
    potBefore: action.potBefore,
    requiredEquity,
    equity,
    hole,
    board,
    opponents,
    position: input.inPosition ? "late" : "early",
    assessment,
    topic,
    headline,
    explanation,
    detail,
  };
}

const SEVERITY: Record<PokerAssessmentKey, number> = {
  "likely-mistake": 0,
  questionable: 1,
  reasonable: 2,
  strong: 3,
};

export function primaryPokerDecision(decisions: PokerDecision[]): PokerDecision | null {
  if (decisions.length === 0) return null;
  return [...decisions].sort((a, b) => SEVERITY[a.assessment] - SEVERITY[b.assessment])[0];
}
