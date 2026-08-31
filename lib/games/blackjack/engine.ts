import { Card } from "@/types";
import { createShoe, cutCardReached, draw, reshuffle, Shoe } from "@/lib/games/deck";
import {
  BlackjackRules,
  BlackjackState,
  DEFAULT_RULES,
  DecisionRecord,
  Hand,
  HandResult,
  PlayerAction,
} from "./types";
import {
  calculateHandValue,
  createHand,
  isBlackjack,
  isPair,
  strategyRank,
} from "./hand";
import { reviewDecision, reviewInsuranceDecision } from "@/lib/strategy/blackjack-coach";

const HAND_LABELS = ["A", "B", "C", "D", "E", "F"];

let handSequence = 0;
let decisionSequence = 0;

function nextHandId(): string {
  handSequence += 1;
  return `hand-${handSequence}`;
}

function nextDecisionId(): string {
  decisionSequence += 1;
  return `decision-${decisionSequence}`;
}

export interface CreateStateOptions {
  rules?: Partial<BlackjackRules>;
  bankroll: number;
}

export function createInitialState(options: CreateStateOptions): BlackjackState {
  const rules: BlackjackRules = { ...DEFAULT_RULES, ...options.rules };
  return {
    rules,
    shoe: createShoe(rules.decks, rules.penetration),
    phase: "betting",
    bankroll: options.bankroll,
    pendingBet: 0,
    hands: [],
    activeHandIndex: 0,
    dealer: { cards: [], holeRevealed: false },
    insuranceBet: 0,
    insuranceResult: null,
    results: [],
    decisions: [],
    handNumber: 0,
    totalWagered: 0,
    dealerMessage: "Place your bet.",
  };
}

export function labelForHand(state: BlackjackState, hand: Hand): string {
  if (state.hands.length <= 1) return "Your hand";
  const index = state.hands.findIndex((candidate) => candidate.id === hand.id);
  return `Hand ${HAND_LABELS[index] ?? index + 1}`;
}

/* ------------------------------------------------------------------ betting */

export function maxAllowedBet(state: BlackjackState): number {
  return Math.min(state.rules.maxBet, state.bankroll);
}

export function addToBet(state: BlackjackState, amount: number): BlackjackState {
  if (state.phase !== "betting") return state;
  const next = Math.min(state.pendingBet + amount, maxAllowedBet(state));
  if (next === state.pendingBet) return state;
  return { ...state, pendingBet: next };
}

export function setBet(state: BlackjackState, amount: number): BlackjackState {
  if (state.phase !== "betting") return state;
  const next = Math.max(0, Math.min(Math.round(amount), maxAllowedBet(state)));
  return { ...state, pendingBet: next };
}

export function clearBet(state: BlackjackState): BlackjackState {
  if (state.phase !== "betting") return state;
  return { ...state, pendingBet: 0 };
}

export function canDeal(state: BlackjackState): boolean {
  return (
    state.phase === "betting" &&
    state.pendingBet >= state.rules.minBet &&
    state.pendingBet <= maxAllowedBet(state)
  );
}

/* ------------------------------------------------------------------ dealing */

export function deal(state: BlackjackState): BlackjackState {
  if (!canDeal(state)) return state;

  let shoe: Shoe = state.shoe;
  if (shoe.needsShuffle || cutCardReached(shoe)) shoe = reshuffle(shoe);

  const bet = state.pendingBet;
  const result = draw(shoe, 4);
  shoe = result.shoe;
  const [playerOne, dealerUp, playerTwo, dealerHole] = result.cards;

  const hand: Hand = createHand({
    id: nextHandId(),
    bet,
    cards: [playerOne, playerTwo],
  });

  const dealt: BlackjackState = {
    ...state,
    shoe,
    phase: "player",
    bankroll: state.bankroll - bet,
    pendingBet: bet,
    hands: [hand],
    activeHandIndex: 0,
    dealer: { cards: [dealerUp, dealerHole], holeRevealed: false },
    insuranceBet: 0,
    insuranceResult: null,
    results: [],
    decisions: [],
    handNumber: state.handNumber + 1,
    totalWagered: state.totalWagered + bet,
    dealerMessage: "No more bets.",
  };

  const upcard = dealt.dealer.cards[0];
  if (dealt.rules.insurance && upcard.rank === "A") {
    return { ...dealt, phase: "insurance", dealerMessage: "Insurance is open." };
  }

  return resolveNaturals(dealt);
}

function dealerHasBlackjack(state: BlackjackState): boolean {
  return (
    state.dealer.cards.length === 2 &&
    calculateHandValue(state.dealer.cards).total === 21
  );
}

/** The dealer peeks at the hole card when showing an ace or a ten value card. */
function resolveNaturals(state: BlackjackState): BlackjackState {
  const upcard = state.dealer.cards[0];
  const peeks = upcard.rank === "A" || strategyRank(upcard.rank) === "10";
  const dealerNatural = peeks && dealerHasBlackjack(state);
  const playerNatural = isBlackjack(state.hands[0]);

  if (dealerNatural || playerNatural) {
    const revealed: BlackjackState = {
      ...state,
      dealer: { ...state.dealer, holeRevealed: true },
      insuranceResult: state.insuranceBet > 0 ? (dealerNatural ? "won" : "lost") : null,
    };
    return settle({ ...revealed, phase: "dealer" });
  }

  return {
    ...state,
    phase: "player",
    insuranceResult: state.insuranceBet > 0 ? "lost" : null,
    dealerMessage: "Your move.",
  };
}

/* ---------------------------------------------------------------- insurance */

export function takeInsurance(state: BlackjackState): BlackjackState {
  if (state.phase !== "insurance") return state;
  const amount = Math.floor(state.hands[0].bet / 2);
  if (amount > state.bankroll) return declineInsurance(state);
  const record = reviewInsuranceDecision({
    id: nextDecisionId(),
    handId: state.hands[0].id,
    handLabel: "Insurance",
    cards: state.hands[0].cards,
    dealerUpcard: state.dealer.cards[0],
    took: true,
  });
  return resolveNaturals({
    ...state,
    bankroll: state.bankroll - amount,
    insuranceBet: amount,
    decisions: [...state.decisions, record],
  });
}

export function declineInsurance(state: BlackjackState): BlackjackState {
  if (state.phase !== "insurance") return state;
  const record = reviewInsuranceDecision({
    id: nextDecisionId(),
    handId: state.hands[0].id,
    handLabel: "Insurance",
    cards: state.hands[0].cards,
    dealerUpcard: state.dealer.cards[0],
    took: false,
  });
  return resolveNaturals({ ...state, decisions: [...state.decisions, record] });
}

/* ------------------------------------------------------------ player action */

export function activeHand(state: BlackjackState): Hand | undefined {
  return state.hands[state.activeHandIndex];
}

export function availableActions(state: BlackjackState): PlayerAction[] {
  if (state.phase !== "player") return [];
  const hand = activeHand(state);
  if (!hand || hand.resolved) return [];

  const value = calculateHandValue(hand.cards);
  if (value.total >= 21) return [];
  if (hand.fromSplitAces && !state.rules.hitSplitAces) return [];

  const actions: PlayerAction[] = ["hit", "stand"];
  const twoCards = hand.cards.length === 2;
  const canAfford = state.bankroll >= hand.bet;

  if (twoCards && canAfford && (!hand.fromSplit || state.rules.doubleAfterSplit)) {
    actions.push("double");
  }

  if (
    twoCards &&
    canAfford &&
    isPair(hand.cards) &&
    state.hands.length < state.rules.maxSplitHands &&
    (!hand.fromSplitAces || state.rules.resplitAces)
  ) {
    actions.push("split");
  }

  if (
    state.rules.surrender === "late" &&
    twoCards &&
    !hand.fromSplit &&
    state.hands.length === 1
  ) {
    actions.push("surrender");
  }

  return actions;
}

function recordDecision(state: BlackjackState, taken: PlayerAction): DecisionRecord {
  const hand = activeHand(state)!;
  return reviewDecision({
    id: nextDecisionId(),
    handId: hand.id,
    handLabel: labelForHand(state, hand),
    cards: hand.cards,
    dealerUpcard: state.dealer.cards[0],
    available: availableActions(state),
    taken,
    rules: state.rules,
  });
}

function replaceHand(state: BlackjackState, index: number, hand: Hand): Hand[] {
  const hands = [...state.hands];
  hands[index] = hand;
  return hands;
}

/** Moves to the next unresolved hand, or to the dealer when the player is done. */
function advance(state: BlackjackState): BlackjackState {
  const nextIndex = state.hands.findIndex((hand, index) => index > state.activeHandIndex && !hand.resolved);
  if (nextIndex !== -1) {
    return { ...state, activeHandIndex: nextIndex, dealerMessage: "Next hand." };
  }
  const stillUnresolved = state.hands.findIndex((hand) => !hand.resolved);
  if (stillUnresolved !== -1) {
    return { ...state, activeHandIndex: stillUnresolved };
  }
  return playDealer({ ...state, phase: "dealer" });
}

function resolveActive(state: BlackjackState, patch: Partial<Hand>): BlackjackState {
  const hand = activeHand(state)!;
  const updated: Hand = { ...hand, ...patch, resolved: true };
  return advance({ ...state, hands: replaceHand(state, state.activeHandIndex, updated) });
}

export function hit(state: BlackjackState): BlackjackState {
  if (!availableActions(state).includes("hit")) return state;
  const decision = recordDecision(state, "hit");
  const hand = activeHand(state)!;
  const { shoe, cards } = draw(state.shoe, 1);
  const cardsAfter = [...hand.cards, cards[0]];
  const value = calculateHandValue(cardsAfter);

  const withCard: BlackjackState = {
    ...state,
    shoe,
    decisions: [...state.decisions, decision],
    hands: replaceHand(state, state.activeHandIndex, { ...hand, cards: cardsAfter }),
  };

  if (value.total >= 21) {
    return resolveActive(withCard, { cards: cardsAfter, stood: value.total === 21 });
  }
  return withCard;
}

export function stand(state: BlackjackState): BlackjackState {
  if (!availableActions(state).includes("stand")) return state;
  const decision = recordDecision(state, "stand");
  return resolveActive(
    { ...state, decisions: [...state.decisions, decision] },
    { stood: true },
  );
}

export function doubleDown(state: BlackjackState): BlackjackState {
  if (!availableActions(state).includes("double")) return state;
  const decision = recordDecision(state, "double");
  const hand = activeHand(state)!;
  const { shoe, cards } = draw(state.shoe, 1);
  const cardsAfter = [...hand.cards, cards[0]];

  return resolveActive(
    {
      ...state,
      shoe,
      bankroll: state.bankroll - hand.bet,
      totalWagered: state.totalWagered + hand.bet,
      decisions: [...state.decisions, decision],
      hands: replaceHand(state, state.activeHandIndex, { ...hand, cards: cardsAfter }),
    },
    { cards: cardsAfter, bet: hand.bet * 2, doubled: true },
  );
}

export function splitHand(state: BlackjackState): BlackjackState {
  if (!availableActions(state).includes("split")) return state;
  const decision = recordDecision(state, "split");
  const hand = activeHand(state)!;
  const splittingAces = hand.cards[0].rank === "A";

  const drawResult = draw(state.shoe, 2);
  const [firstCard, secondCard] = drawResult.cards;

  const left: Hand = {
    ...hand,
    cards: [hand.cards[0], firstCard],
    fromSplit: true,
    fromSplitAces: splittingAces,
    splitDepth: hand.splitDepth + 1,
  };
  const right: Hand = createHand({
    id: nextHandId(),
    bet: hand.bet,
    cards: [hand.cards[1], secondCard],
    fromSplit: true,
    fromSplitAces: splittingAces,
    splitDepth: hand.splitDepth + 1,
  });

  const hands = [...state.hands];
  hands.splice(state.activeHandIndex, 1, left, right);

  let next: BlackjackState = {
    ...state,
    shoe: drawResult.shoe,
    bankroll: state.bankroll - hand.bet,
    totalWagered: state.totalWagered + hand.bet,
    decisions: [...state.decisions, decision],
    hands,
    dealerMessage: "Splitting.",
  };

  // Split aces normally receive exactly one card each.
  if (splittingAces && !next.rules.hitSplitAces) {
    next = {
      ...next,
      hands: next.hands.map((candidate) =>
        candidate.fromSplitAces ? { ...candidate, resolved: true, stood: true } : candidate,
      ),
    };
    return advance(next);
  }

  // A hand that reached 21 from the split needs no further action.
  next = {
    ...next,
    hands: next.hands.map((candidate) =>
      calculateHandValue(candidate.cards).total === 21 && !candidate.resolved
        ? { ...candidate, resolved: true, stood: true }
        : candidate,
    ),
  };

  if (next.hands[next.activeHandIndex]?.resolved) return advance(next);
  return next;
}

export function surrender(state: BlackjackState): BlackjackState {
  if (!availableActions(state).includes("surrender")) return state;
  const decision = recordDecision(state, "surrender");
  return resolveActive(
    { ...state, decisions: [...state.decisions, decision] },
    { surrendered: true },
  );
}

/* ------------------------------------------------------------------- dealer */

export function shouldDealerDraw(cards: Card[], hitsSoft17: boolean): boolean {
  const value = calculateHandValue(cards);
  if (value.total < 17) return true;
  if (value.total === 17 && value.soft && hitsSoft17) return true;
  return false;
}

export function playDealer(state: BlackjackState): BlackjackState {
  const anyLive = state.hands.some(
    (hand) => !hand.surrendered && !calculateHandValue(hand.cards).busted,
  );

  let shoe = state.shoe;
  let cards = [...state.dealer.cards];

  if (anyLive) {
    while (shouldDealerDraw(cards, state.rules.dealerHitsSoft17)) {
      const result = draw(shoe, 1);
      shoe = result.shoe;
      cards = [...cards, result.cards[0]];
    }
  }

  return settle({
    ...state,
    shoe,
    dealer: { cards, holeRevealed: true },
    phase: "dealer",
  });
}

/* ---------------------------------------------------------------- settlement */

export function settleHand(
  hand: Hand,
  dealerCards: Card[],
  rules: BlackjackRules,
): HandResult {
  const player = calculateHandValue(hand.cards);
  const dealer = calculateHandValue(dealerCards);
  const dealerNatural = dealerCards.length === 2 && dealer.total === 21;
  const playerNatural = isBlackjack(hand);

  const base = {
    handId: hand.id,
    playerTotal: player.total,
    dealerTotal: dealer.total,
  };

  if (hand.surrendered) {
    const returned = hand.bet / 2;
    return { ...base, outcome: "surrender", returned, net: returned - hand.bet };
  }
  if (player.busted) {
    return { ...base, outcome: "bust", returned: 0, net: -hand.bet };
  }
  if (playerNatural && dealerNatural) {
    return { ...base, outcome: "push", returned: hand.bet, net: 0 };
  }
  if (playerNatural) {
    const win = hand.bet * rules.blackjackPayout;
    return { ...base, outcome: "blackjack", returned: hand.bet + win, net: win };
  }
  if (dealerNatural) {
    return { ...base, outcome: "lose", returned: 0, net: -hand.bet };
  }
  if (dealer.busted) {
    return { ...base, outcome: "dealer-bust", returned: hand.bet * 2, net: hand.bet };
  }
  if (player.total > dealer.total) {
    return { ...base, outcome: "win", returned: hand.bet * 2, net: hand.bet };
  }
  if (player.total === dealer.total) {
    return { ...base, outcome: "push", returned: hand.bet, net: 0 };
  }
  return { ...base, outcome: "lose", returned: 0, net: -hand.bet };
}

export function settle(state: BlackjackState): BlackjackState {
  const results = state.hands.map((hand) => settleHand(hand, state.dealer.cards, state.rules));
  let bankroll = state.bankroll + results.reduce((sum, result) => sum + result.returned, 0);

  let insuranceResult = state.insuranceResult;
  if (state.insuranceBet > 0) {
    const dealerNatural =
      state.dealer.cards.length === 2 && calculateHandValue(state.dealer.cards).total === 21;
    insuranceResult = dealerNatural ? "won" : "lost";
    if (dealerNatural) bankroll += state.insuranceBet * 3;
  }

  return {
    ...state,
    phase: "settled",
    bankroll,
    results,
    insuranceResult,
    dealer: { ...state.dealer, holeRevealed: true },
    shoe: { ...state.shoe, needsShuffle: cutCardReached(state.shoe) },
    dealerMessage: outcomeMessage(results, state.dealer.cards),
  };
}

function outcomeMessage(results: HandResult[], dealerCards: Card[]): string {
  const dealer = calculateHandValue(dealerCards);
  if (results.length === 1) {
    const result = results[0];
    switch (result.outcome) {
      case "blackjack": return "Blackjack.";
      case "bust": return "Too many.";
      case "dealer-bust": return "Dealer busts.";
      case "push": return "Push.";
      case "surrender": return "Half back.";
      case "win": return `Dealer shows ${dealer.total}. Player wins.`;
      case "lose": return `Dealer shows ${dealer.total}. Dealer wins.`;
    }
  }
  const net = results.reduce((sum, result) => sum + result.net, 0);
  if (net > 0) return "Player takes it.";
  if (net < 0) return "Dealer takes it.";
  return "Even money across the hands.";
}

export function netForRound(state: BlackjackState): number {
  const handNet = state.results.reduce((sum, result) => sum + result.net, 0);
  const insuranceNet =
    state.insuranceBet === 0
      ? 0
      : state.insuranceResult === "won"
        ? state.insuranceBet * 2
        : -state.insuranceBet;
  return handNet + insuranceNet;
}

export function nextRound(state: BlackjackState): BlackjackState {
  const shoe = state.shoe.needsShuffle ? reshuffle(state.shoe) : state.shoe;
  const pendingBet = Math.min(state.pendingBet, Math.min(state.rules.maxBet, state.bankroll));
  return {
    ...state,
    shoe,
    phase: "betting",
    hands: [],
    activeHandIndex: 0,
    dealer: { cards: [], holeRevealed: false },
    insuranceBet: 0,
    insuranceResult: null,
    results: [],
    decisions: [],
    pendingBet,
    dealerMessage: "Place your bet.",
  };
}
