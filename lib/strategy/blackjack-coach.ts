import { Card } from "@/types";
import {
  BlackjackRules,
  DecisionCategory,
  DecisionQuality,
  DecisionRecord,
  PlayerAction,
} from "@/lib/games/blackjack/types";
import { calculateHandValue, strategyRank } from "@/lib/games/blackjack/hand";
import {
  StrategyResult,
  actionLabel,
  recommendAction,
} from "./blackjack-strategy";
import {
  bustChanceOnNextCard,
  dealerBustChance,
  standOutlook,
  upcardLabel,
} from "./odds";

export const PROBABILITY_NOTE =
  "Probabilities are calculated with an infinite deck model and ignore cards already dealt, so treat them as close approximations.";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function totalPhrase(cards: Card[]): string {
  const value = calculateHandValue(cards);
  return value.soft ? `soft ${value.total}` : `${value.total}`;
}

function handDescription(cards: Card[]): string {
  return cards.map((card) => strategyRank(card.rank)).join(", ");
}

interface CloseCall {
  matches(context: ClassifyContext): boolean;
}

interface ClassifyContext {
  cards: Card[];
  dealer: Card;
  taken: PlayerAction;
  strategy: StrategyResult;
  rules: BlackjackRules;
  total: number;
  soft: boolean;
  isPairHand: boolean;
}

/**
 * A short, deliberately conservative list of decisions where the chart choice
 * and the alternative are close enough that the app calls the alternative
 * acceptable rather than a mistake.
 */
const CLOSE_CALLS: CloseCall[] = [
  {
    matches: (c) =>
      !c.soft && c.total === 16 && c.strategy.dealerKey === "10" && c.taken === "stand",
  },
  {
    matches: (c) =>
      !c.soft && c.total === 12 && c.strategy.dealerKey === "3" && c.taken === "stand",
  },
  {
    matches: (c) =>
      !c.soft && c.total === 12 && c.strategy.dealerKey === "4" && c.taken === "hit",
  },
  {
    matches: (c) => c.soft && c.total === 18 && c.strategy.dealerKey === "2",
  },
  {
    matches: (c) =>
      c.isPairHand &&
      strategyRank(c.cards[0].rank) === "4" &&
      c.taken === "hit" &&
      (c.strategy.dealerKey === "5" || c.strategy.dealerKey === "6"),
  },
];

function isMajor(context: ClassifyContext): boolean {
  const { taken, total, soft, cards, strategy, isPairHand } = context;
  const value = calculateHandValue(cards);
  if (taken === "hit" && !soft && total >= 17) return true;
  if (taken === "hit" && soft && total >= 20) return true;
  if (taken === "stand" && value.total <= 11) return true;
  if (taken === "double" && !soft && total >= 13) return true;
  if (taken === "split" && isPairHand) {
    const key = strategyRank(cards[0].rank);
    if (key === "10" || key === "5") return true;
  }
  if (strategy.ideal === "split" && taken !== "split") {
    const key = strategyRank(cards[0].rank);
    if (key === "A" || key === "8") return true;
  }
  return false;
}

export function classifyDecision(context: ClassifyContext): DecisionQuality {
  const { taken, strategy } = context;
  if (taken === strategy.action) return "optimal";

  // Directionally correct but leaves value on the table.
  if (strategy.code === "D" && taken === "hit") return "acceptable";
  if (strategy.code === "Ds" && taken === "stand") return "acceptable";
  if (strategy.code === "R" && taken === "hit") return "acceptable";
  if (strategy.code === "Rs" && taken === "stand") return "acceptable";
  if (strategy.code === "Rp" && taken === "split") return "acceptable";
  if (strategy.ideal === "surrender" && taken === strategy.action) return "optimal";

  if (isMajor(context)) return "major-mistake";
  if (CLOSE_CALLS.some((rule) => rule.matches(context))) return "acceptable";
  return "mistake";
}

interface Narrative {
  headline: string;
  explanation: string;
  remember: string;
  detail: string[];
}

function categoryFor(context: ClassifyContext): DecisionCategory {
  if (context.isPairHand && (context.strategy.ideal === "split" || context.taken === "split")) {
    return "pair-split";
  }
  if (context.strategy.ideal === "surrender" || context.taken === "surrender") return "surrender";
  if (context.strategy.ideal === "double" || context.taken === "double") return "double-down";
  return context.soft ? "soft-total" : "hard-total";
}

function pairNarrative(context: ClassifyContext): string | null {
  const key = strategyRank(context.cards[0].rank);
  const dealer = upcardLabel(context.dealer);
  switch (key) {
    case "A":
      return `Two aces play as a soft 12, which is a weak total that rarely improves. Split them and each ace starts a fresh hand where any ten value card makes 21.`;
    case "8":
      return `Sixteen is the hardest total in the game to play. Splitting turns one bad hand into two hands that each start with an eight.`;
    case "10":
      return `Twenty already wins the large majority of the time. Splitting trades one very strong hand for two ordinary ones.`;
    case "5":
      return `A pair of fives is really a hard 10, one of the best doubling totals in blackjack. Playing it as two hands starting with a five gives that up.`;
    case "9":
      return `Eighteen is good but not safe. Against ${dealer} the chart splits when the dealer is weak or mid strength, and stands against 7, 10, and Ace where 18 is already ahead or the split does not help.`;
    case "4":
      return `A pair of fours is a hard 8, which is a fine hand to hit. Splitting only pays off against the dealer's weakest cards, and only when you can double afterwards.`;
    case "7":
    case "6":
    case "3":
    case "2":
      return `Small pairs split well against weak dealer cards because two live hands beat one bad total. Against a strong upcard you are better off building a single hand.`;
    default:
      return null;
  }
}

export function buildNarrative(context: ClassifyContext, quality: DecisionQuality): Narrative {
  const { cards, dealer, taken, strategy, rules, total, soft } = context;
  const dealerText = upcardLabel(dealer);
  const detail: string[] = [];
  const h17 = rules.dealerHitsSoft17;
  const dealerBust = dealerBustChance(dealer, h17);
  const outlook = standOutlook(Math.min(total, 21), dealer, h17);
  const bustNext = bustChanceOnNextCard(cards);

  const headline =
    quality === "optimal"
      ? `${actionLabel(taken)} was the right call.`
      : quality === "acceptable"
        ? `${actionLabel(taken)} is defensible here.`
        : `${actionLabel(strategy.action)} plays better than ${actionLabel(taken).toLowerCase()}.`;

  let explanation = "";
  const category = categoryFor(context);

  if (category === "pair-split") {
    explanation = pairNarrative(context) ?? "";
  }

  if (!explanation) {
    if (strategy.ideal === "stand") {
      explanation =
        total <= 16
          ? `Standing on ${totalPhrase(cards)} hands the risk over to the dealer. From ${dealerText} they bust about ${pct(dealerBust)} of the time, while drawing again would bust you about ${pct(bustNext)} of the time. Let the weaker hand take the chance.`
          : `A total of ${totalPhrase(cards)} is already strong enough to stand on against ${dealerText}. Drawing again would bust about ${pct(bustNext)} of the time for very little gain.`;
    } else if (strategy.ideal === "hit") {
      if (soft) {
        explanation = `A soft ${total} cannot bust on the next card, so there is nothing to lose by improving it against ${dealerText}.`;
      } else if (total <= 16) {
        explanation = `The dealer has to reach 17, so standing on ${total} only wins when they bust. From ${dealerText} that happens about ${pct(dealerBust)} of the time. Drawing is uncomfortable, but it is the better of two poor options.`;
      } else {
        explanation = `Standing on ${total} against ${dealerText} wins only about ${pct(outlook.win)} of the time. Drawing is the better of two poor options.`;
      }
    } else if (strategy.ideal === "double") {
      explanation = soft
        ? `A soft ${total} cannot bust with one more card, and ${dealerText} is weak enough that putting more money out is worth it.`
        : `A total of ${total} is a strong base against ${dealerText}, which busts about ${pct(dealerBust)} of the time. Doubling puts extra money in exactly when you are ahead.`;
    } else if (strategy.ideal === "surrender") {
      explanation = `A ${total} against ${dealerText} wins only about ${pct(outlook.win)} of the time however you play it. Late surrender gives back half the bet instead of losing the whole thing more often than not.`;
    } else if (strategy.ideal === "split") {
      explanation = `Splitting is the chart play for this pair against ${dealerText}.`;
    }
  }

  if (quality !== "optimal") {
    if (taken === "double" && strategy.ideal !== "double") {
      explanation += ` Doubling also locks you into exactly one more card, which is a real cost on a hand that may need two.`;
    }
    if (taken === "stand" && strategy.ideal === "hit" && !soft) {
      explanation += ` Standing feels safer because you cannot bust doing it, which is exactly why it is the trap.`;
    }
  }

  let remember = "";
  if (category === "pair-split") {
    remember = "Always split aces and eights. Never split tens or fives.";
  } else if (soft) {
    remember = "Soft hands cannot bust on one card, so be more willing to draw or double than the total suggests.";
  } else if (strategy.ideal === "stand" && total >= 12 && total <= 16) {
    remember = "Against a dealer 2 through 6, let the dealer take the risk.";
  } else if (strategy.ideal === "hit" && total >= 12 && total <= 16) {
    remember = "Against a dealer 7 through Ace, a stiff total has to improve to win.";
  } else if (strategy.ideal === "double") {
    remember = "Double when your hand is strong and the dealer's card is weak, not just when you feel lucky.";
  } else if (strategy.ideal === "surrender") {
    remember = "Surrender is rare. It applies to a small set of very poor totals against strong dealer cards.";
  } else {
    remember = "Play the total against the upcard, not the feeling of the hand.";
  }

  detail.push(
    `Your hand: ${handDescription(cards)} (${totalPhrase(cards)}). Dealer upcard: ${strategyRank(dealer.rank)}.`,
  );
  detail.push(
    `Standing on ${Math.min(total, 21)} against this upcard wins about ${pct(outlook.win)}, pushes about ${pct(outlook.push)}, and loses about ${pct(outlook.lose)}.`,
  );
  if (!soft && total <= 21) {
    detail.push(`Taking one more card busts this hand about ${pct(bustNext)} of the time.`);
  }
  detail.push(
    `The dealer busts about ${pct(dealerBust)} of the time showing ${dealerText}, using this table's ${h17 ? "hit" : "stand"} on soft 17 rule.`,
  );
  detail.push(
    `Basic strategy row ${strategy.rowLabel} against ${strategy.dealerKey}: ${actionLabel(strategy.ideal)}.`,
  );
  detail.push(PROBABILITY_NOTE);

  return { headline, explanation: explanation.trim(), remember, detail };
}

export interface ReviewDecisionInput {
  id: string;
  handId: string;
  handLabel: string;
  cards: Card[];
  dealerUpcard: Card;
  available: PlayerAction[];
  taken: PlayerAction;
  rules: BlackjackRules;
}

export function reviewDecision(input: ReviewDecisionInput): DecisionRecord {
  const strategy = recommendAction({
    playerCards: input.cards,
    dealerUpcard: input.dealerUpcard,
    rules: input.rules,
    available: input.available,
  });
  const value = calculateHandValue(input.cards);
  const isPairHand =
    input.cards.length === 2 &&
    strategyRank(input.cards[0].rank) === strategyRank(input.cards[1].rank);

  const context: ClassifyContext = {
    cards: input.cards,
    dealer: input.dealerUpcard,
    taken: input.taken,
    strategy,
    rules: input.rules,
    total: value.total,
    soft: value.soft,
    isPairHand,
  };

  const quality = classifyDecision(context);
  const narrative = buildNarrative(context, quality);

  return {
    id: input.id,
    handId: input.handId,
    handLabel: input.handLabel,
    playerCards: input.cards,
    dealerUpcard: input.dealerUpcard,
    total: value.total,
    soft: value.soft,
    isPair: isPairHand,
    available: input.available,
    taken: input.taken,
    recommended: strategy.action,
    quality,
    category: categoryFor(context),
    rowLabel: strategy.rowLabel,
    dealerKey: strategy.dealerKey,
    headline: narrative.headline,
    explanation: narrative.explanation,
    remember: narrative.remember,
    detail: narrative.detail,
  };
}

export function reviewInsuranceDecision(params: {
  id: string;
  handId: string;
  handLabel: string;
  cards: Card[];
  dealerUpcard: Card;
  took: boolean;
}): DecisionRecord {
  const quality: DecisionQuality = params.took ? "mistake" : "optimal";
  return {
    id: params.id,
    handId: params.handId,
    handLabel: params.handLabel,
    playerCards: params.cards,
    dealerUpcard: params.dealerUpcard,
    total: calculateHandValue(params.cards).total,
    soft: calculateHandValue(params.cards).soft,
    isPair: false,
    available: [],
    taken: params.took ? "insurance" : "decline-insurance",
    recommended: "decline-insurance",
    quality,
    category: "insurance",
    rowLabel: "Insurance",
    dealerKey: "A",
    headline: params.took
      ? "Insurance is a side bet that loses money over time."
      : "Declining insurance was correct.",
    explanation:
      "Insurance pays 2 to 1 and wins only when the dealer's hole card is a ten value card. Roughly 4 of every 13 cards are ten values, which is under one in three, so the payout does not cover the risk. Basic strategy declines insurance every time, including even money on a blackjack.",
    remember: "Skip insurance. It is a separate bet with a worse edge than the hand you are playing.",
    detail: [
      "About 30.8% of cards are ten values, so the dealer completes a blackjack a little under one third of the time.",
      "A bet that wins under one third of the time needs better than 2 to 1 to break even.",
      PROBABILITY_NOTE,
    ],
  };
}

/** Optional bet sizing note, kept educational and never encouraging bigger bets. */
export function bettingNote(bet: number, startingBankroll: number): string | null {
  if (startingBankroll <= 0) return null;
  const share = bet / startingBankroll;
  if (share >= 0.25) {
    return `This bet was ${Math.round(share * 100)}% of your starting bankroll, which creates very high swing from a single hand.`;
  }
  return null;
}
