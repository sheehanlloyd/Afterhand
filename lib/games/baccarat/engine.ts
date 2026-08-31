import { Card } from "@/types";
import { createShoe, cutCardReached, draw, reshuffle, Shoe } from "@/lib/games/deck";

/**
 * Baccarat. Punto banco drawing rules, which leave no decisions to the player
 * once the bet is placed.
 */

export type BaccaratBet = "player" | "banker" | "tie";
export type BaccaratOutcome = "player" | "banker" | "tie";

export interface BaccaratRules {
  decks: number;
  /** Commission taken from a winning Banker bet. */
  bankerCommission: number;
  tiePayout: number;
  minBet: number;
  maxBet: number;
}

export const DEFAULT_BACCARAT_RULES: BaccaratRules = {
  decks: 8,
  bankerCommission: 0.05,
  tiePayout: 8,
  minBet: 5,
  maxBet: 500,
};

/** Baccarat point value: aces are one, tens and faces are zero. */
export function pointValue(card: Card): number {
  if (card.rank === "A") return 1;
  if (card.rank === "10" || card.rank === "J" || card.rank === "Q" || card.rank === "K") return 0;
  return Number(card.rank);
}

export function handTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + pointValue(card), 0) % 10;
}

export function isNatural(cards: Card[]): boolean {
  return cards.length === 2 && (handTotal(cards) === 8 || handTotal(cards) === 9);
}

export interface DrawingNote {
  actor: "player" | "banker";
  drew: boolean;
  reason: string;
}

export interface BaccaratRound {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: BaccaratOutcome;
  notes: DrawingNote[];
  natural: boolean;
}

/** True when the banker draws, given its total and the player's third card. */
export function bankerDraws(bankerTotal: number, playerThird: Card | null): boolean {
  if (playerThird === null) return bankerTotal <= 5;
  const third = pointValue(playerThird);
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return third !== 8;
    case 4:
      return third >= 2 && third <= 7;
    case 5:
      return third >= 4 && third <= 7;
    case 6:
      return third === 6 || third === 7;
    default:
      return false;
  }
}

export function dealRound(shoe: Shoe): { shoe: Shoe; round: BaccaratRound } {
  let working = shoe.needsShuffle || cutCardReached(shoe) ? reshuffle(shoe) : shoe;
  const initial = draw(working, 4);
  working = initial.shoe;

  const playerCards = [initial.cards[0], initial.cards[2]];
  const bankerCards = [initial.cards[1], initial.cards[3]];
  const notes: DrawingNote[] = [];

  const playerNatural = isNatural(playerCards);
  const bankerNatural = isNatural(bankerCards);

  if (playerNatural || bankerNatural) {
    const round = finish(playerCards, bankerCards, [
      {
        actor: playerNatural ? "player" : "banker",
        drew: false,
        reason: `A two card total of ${playerNatural ? handTotal(playerCards) : handTotal(bankerCards)} is a natural, so the round ends immediately.`,
      },
    ]);
    return { shoe: { ...working, needsShuffle: cutCardReached(working) }, round };
  }

  let playerThird: Card | null = null;
  const playerTotal = handTotal(playerCards);

  if (playerTotal <= 5) {
    const result = draw(working, 1);
    working = result.shoe;
    playerThird = result.cards[0];
    playerCards.push(playerThird);
    notes.push({
      actor: "player",
      drew: true,
      reason: `Player held ${playerTotal}, and the rule is to draw on 0 through 5.`,
    });
  } else {
    notes.push({
      actor: "player",
      drew: false,
      reason: `Player held ${playerTotal}, and the rule is to stand on 6 or 7.`,
    });
  }

  const bankerTotal = handTotal(bankerCards);
  if (bankerDraws(bankerTotal, playerThird)) {
    const result = draw(working, 1);
    working = result.shoe;
    bankerCards.push(result.cards[0]);
    notes.push({
      actor: "banker",
      drew: true,
      reason: bankerReason(bankerTotal, playerThird, true),
    });
  } else {
    notes.push({
      actor: "banker",
      drew: false,
      reason: bankerReason(bankerTotal, playerThird, false),
    });
  }

  return {
    shoe: { ...working, needsShuffle: cutCardReached(working) },
    round: finish(playerCards, bankerCards, notes),
  };
}

function bankerReason(total: number, playerThird: Card | null, drew: boolean): string {
  if (playerThird === null) {
    return `Player stood, so the banker follows the simple rule and ${drew ? "draws on 0 through 5" : "stands on 6 or 7"} with ${total}.`;
  }
  const third = pointValue(playerThird);
  return `Banker held ${total} and the player's third card was a ${third}. The table rule says ${drew ? "draw" : "stand"} in that spot.`;
}

function finish(playerCards: Card[], bankerCards: Card[], notes: DrawingNote[]): BaccaratRound {
  const playerTotal = handTotal(playerCards);
  const bankerTotal = handTotal(bankerCards);
  const outcome: BaccaratOutcome =
    playerTotal > bankerTotal ? "player" : bankerTotal > playerTotal ? "banker" : "tie";
  return {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    outcome,
    notes,
    natural: isNatural(playerCards) || isNatural(bankerCards),
  };
}

export interface BaccaratSettlement {
  /** Chips returned to the bankroll, including the stake on a win or push. */
  returned: number;
  net: number;
  won: boolean;
  pushed: boolean;
}

export function settleBet(
  bet: BaccaratBet,
  amount: number,
  round: BaccaratRound,
  rules: BaccaratRules,
): BaccaratSettlement {
  if (round.outcome === "tie") {
    if (bet === "tie") {
      const win = amount * rules.tiePayout;
      return { returned: amount + win, net: win, won: true, pushed: false };
    }
    return { returned: amount, net: 0, won: false, pushed: true };
  }

  if (bet === "tie") return { returned: 0, net: -amount, won: false, pushed: false };

  if (bet === round.outcome) {
    const win = bet === "banker" ? amount * (1 - rules.bankerCommission) : amount;
    return { returned: amount + win, net: win, won: true, pushed: false };
  }

  return { returned: 0, net: -amount, won: false, pushed: false };
}

/** Published house edge figures for an eight deck game with a 5% commission. */
export const BACCARAT_EDGE: Record<BaccaratBet, number> = {
  banker: 0.0106,
  player: 0.0124,
  tie: 0.1436,
};

export function createBaccaratShoe(rules: BaccaratRules) {
  return createShoe(rules.decks, 0.85);
}
