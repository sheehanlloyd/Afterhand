import { Card } from "@/types";
import { createShoe } from "@/lib/games/deck";
import { evaluateHand, compareHands, HandValue } from "./evaluator";
import {
  ActionRecord,
  BetLimits,
  PokerAction,
  PokerPlayer,
  PokerState,
  PotAward,
  Street,
} from "./types";

let actionSequence = 0;

function nextActionId(): string {
  actionSequence += 1;
  return `action-${actionSequence}`;
}

export interface TableSetup {
  humanName?: string;
  stack: number;
  smallBlind: number;
  bigBlind: number;
  opponents: Array<{ name: string; personality: PokerPlayer["personality"] }>;
}

export const DEFAULT_OPPONENTS: TableSetup["opponents"] = [
  { name: "Vance", personality: "tight" },
  { name: "Rosa", personality: "aggressive" },
  { name: "Ibrahim", personality: "loose" },
];

function makePlayer(
  id: string,
  name: string,
  isHuman: boolean,
  stack: number,
  personality: PokerPlayer["personality"],
): PokerPlayer {
  return {
    id,
    name,
    isHuman,
    personality,
    stack,
    hole: [],
    folded: false,
    allIn: false,
    committed: 0,
    invested: 0,
    hasActed: false,
    revealed: false,
  };
}

export function createTable(setup: TableSetup): PokerState {
  const players: PokerPlayer[] = [
    makePlayer("you", setup.humanName ?? "You", true, setup.stack, "balanced"),
    ...setup.opponents.map((opponent, index) =>
      makePlayer(`ai-${index}`, opponent.name, false, setup.stack, opponent.personality),
    ),
  ];

  const shoe = createShoe(1, 1);
  return {
    players,
    buttonIndex: players.length - 1,
    street: "complete",
    board: [],
    deck: shoe.cards,
    deckPosition: 0,
    pot: 0,
    currentBet: 0,
    minRaise: setup.bigBlind,
    toActIndex: 0,
    smallBlind: setup.smallBlind,
    bigBlind: setup.bigBlind,
    handNumber: 0,
    history: [],
    showdown: null,
    message: "Ready to deal.",
    lastNet: 0,
  };
}

function nextIndex(state: PokerState, from: number): number {
  const count = state.players.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step) % count;
    const player = state.players[index];
    if (!player.folded && !player.allIn) return index;
  }
  return from;
}

export function startHand(state: PokerState): PokerState {
  const shoe = createShoe(1, 1);
  let deckPosition = 0;
  const take = (count: number): Card[] => {
    const cards = shoe.cards.slice(deckPosition, deckPosition + count);
    deckPosition += count;
    return cards;
  };

  const eligible = state.players.filter((player) => player.stack > 0);
  if (eligible.length < 2) {
    return { ...state, street: "complete", message: "Not enough chips left to deal." };
  }

  // Move the button to the next player who still has chips.
  let buttonIndex = state.buttonIndex;
  for (let step = 1; step <= state.players.length; step++) {
    const candidate = (state.buttonIndex + step) % state.players.length;
    if (state.players[candidate].stack > 0) {
      buttonIndex = candidate;
      break;
    }
  }

  const players = state.players.map((player) => ({
    ...player,
    hole: player.stack > 0 ? take(2) : [],
    folded: player.stack <= 0,
    allIn: false,
    committed: 0,
    invested: 0,
    hasActed: false,
    revealed: false,
  }));

  const withChips = players
    .map((player, index) => ({ player, index }))
    .filter((entry) => entry.player.stack > 0)
    .map((entry) => entry.index);

  const order = (offset: number) => {
    const position = withChips.indexOf(buttonIndex);
    return withChips[(position + offset) % withChips.length];
  };

  const headsUp = withChips.length === 2;
  const smallIndex = headsUp ? buttonIndex : order(1);
  const bigIndex = headsUp ? order(1) : order(2);

  let pot = 0;
  const post = (index: number, amount: number) => {
    const player = players[index];
    const paid = Math.min(amount, player.stack);
    players[index] = {
      ...player,
      stack: player.stack - paid,
      committed: paid,
      invested: paid,
      allIn: player.stack - paid === 0,
    };
    pot += paid;
    return paid;
  };

  post(smallIndex, state.smallBlind);
  const bigPaid = post(bigIndex, state.bigBlind);

  const firstToAct = (() => {
    const position = withChips.indexOf(bigIndex);
    for (let step = 1; step <= withChips.length; step++) {
      const index = withChips[(position + step) % withChips.length];
      if (!players[index].allIn) return index;
    }
    return bigIndex;
  })();

  return {
    ...state,
    players,
    buttonIndex,
    street: "preflop",
    board: [],
    deck: shoe.cards,
    deckPosition,
    pot,
    currentBet: Math.max(bigPaid, state.bigBlind),
    minRaise: state.bigBlind,
    toActIndex: firstToAct,
    handNumber: state.handNumber + 1,
    history: [],
    showdown: null,
    message: "Blinds are in.",
    lastNet: 0,
  };
}

export function currentPlayer(state: PokerState): PokerPlayer | undefined {
  return state.players[state.toActIndex];
}

export function betLimits(state: PokerState): BetLimits {
  const player = currentPlayer(state);
  if (!player) {
    return { toCall: 0, minTo: 0, maxTo: 0, canCheck: false, canRaise: false };
  }
  const toCall = Math.max(0, state.currentBet - player.committed);
  const maxTo = player.committed + player.stack;
  const minTo = Math.min(maxTo, Math.max(state.currentBet + state.minRaise, state.bigBlind));
  return {
    toCall: Math.min(toCall, player.stack),
    minTo,
    maxTo,
    canCheck: toCall === 0,
    canRaise: maxTo > state.currentBet,
  };
}

export function legalActions(state: PokerState): PokerAction["type"][] {
  if (state.street === "showdown" || state.street === "complete") return [];
  const limits = betLimits(state);
  const actions: PokerAction["type"][] = ["fold"];
  if (limits.canCheck) actions.push("check");
  else actions.push("call");
  if (limits.canRaise) actions.push("raise");
  return actions;
}

function record(
  state: PokerState,
  player: PokerPlayer,
  type: ActionRecord["type"],
  amount: number,
  to: number,
  toCall: number,
): ActionRecord {
  return {
    id: nextActionId(),
    street: state.street,
    playerId: player.id,
    playerName: player.name,
    type,
    amount,
    to,
    toCall,
    potBefore: state.pot,
    potAfter: state.pot + amount,
  };
}

export function applyAction(state: PokerState, action: PokerAction): PokerState {
  const index = state.toActIndex;
  const player = state.players[index];
  if (!player || player.folded || player.allIn) return state;
  if (state.street === "showdown" || state.street === "complete") return state;

  const limits = betLimits(state);
  const players = [...state.players];
  let pot = state.pot;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;
  let entry: ActionRecord;

  if (action.type === "fold") {
    players[index] = { ...player, folded: true, hasActed: true };
    entry = record(state, player, "fold", 0, player.committed, limits.toCall);
  } else if (action.type === "check") {
    if (!limits.canCheck) return state;
    players[index] = { ...player, hasActed: true };
    entry = record(state, player, "check", 0, player.committed, 0);
  } else if (action.type === "call") {
    const amount = Math.min(limits.toCall, player.stack);
    const nextStack = player.stack - amount;
    players[index] = {
      ...player,
      stack: nextStack,
      committed: player.committed + amount,
      invested: player.invested + amount,
      allIn: nextStack === 0,
      hasActed: true,
    };
    pot += amount;
    entry = record(
      state,
      player,
      nextStack === 0 && amount > 0 ? "all-in" : "call",
      amount,
      player.committed + amount,
      limits.toCall,
    );
  } else {
    if (!limits.canRaise) return state;
    const target = Math.max(limits.minTo, Math.min(action.to, limits.maxTo));
    const capped = Math.min(target, limits.maxTo);
    const amount = capped - player.committed;
    if (amount <= 0) return state;
    const nextStack = player.stack - amount;
    const wasBet = state.currentBet === 0;
    players[index] = {
      ...player,
      stack: nextStack,
      committed: capped,
      invested: player.invested + amount,
      allIn: nextStack === 0,
      hasActed: true,
    };
    pot += amount;
    if (capped > currentBet) {
      minRaise = Math.max(state.bigBlind, capped - currentBet);
      currentBet = capped;
      // A raise reopens the action for everyone still in the hand.
      for (let i = 0; i < players.length; i++) {
        if (i !== index && !players[i].folded && !players[i].allIn) {
          players[i] = { ...players[i], hasActed: false };
        }
      }
    }
    entry = record(
      state,
      player,
      nextStack === 0 ? "all-in" : wasBet ? "bet" : "raise",
      amount,
      capped,
      limits.toCall,
    );
  }

  const next: PokerState = {
    ...state,
    players,
    pot,
    currentBet,
    minRaise,
    history: [...state.history, entry],
  };

  return advance(next);
}

function bettingComplete(state: PokerState): boolean {
  const live = state.players.filter((player) => !player.folded);
  if (live.length <= 1) return true;
  const actionable = live.filter((player) => !player.allIn);
  if (actionable.length === 0) return true;
  return actionable.every((player) => player.hasActed && player.committed >= state.currentBet);
}

function advance(state: PokerState): PokerState {
  const live = state.players.filter((player) => !player.folded);
  if (live.length === 1) return finishUncontested(state, live[0]);

  if (!bettingComplete(state)) {
    return { ...state, toActIndex: nextIndex(state, state.toActIndex) };
  }
  return nextStreet(state);
}

const STREET_ORDER: Street[] = ["preflop", "flop", "turn", "river", "showdown"];

function nextStreet(state: PokerState): PokerState {
  const position = STREET_ORDER.indexOf(state.street);
  const upcoming = STREET_ORDER[position + 1] ?? "showdown";

  const players = state.players.map((player) => ({
    ...player,
    committed: 0,
    hasActed: false,
  }));

  let board = state.board;
  let deckPosition = state.deckPosition;
  const burnAndDeal = (count: number) => {
    deckPosition += 1; // burn
    const cards = state.deck.slice(deckPosition, deckPosition + count);
    deckPosition += count;
    return cards;
  };

  if (upcoming === "flop") board = burnAndDeal(3);
  else if (upcoming === "turn") board = [...board, ...burnAndDeal(1)];
  else if (upcoming === "river") board = [...board, ...burnAndDeal(1)];

  if (upcoming === "showdown") {
    return resolveShowdown({ ...state, players, board, deckPosition, street: "showdown" });
  }

  const actionable = players.filter((player) => !player.folded && !player.allIn);
  const base: PokerState = {
    ...state,
    players,
    board,
    deckPosition,
    street: upcoming,
    currentBet: 0,
    minRaise: state.bigBlind,
    message: streetMessage(upcoming),
  };

  // With nobody left to act, run the remaining cards and go to showdown.
  if (actionable.length <= 1) {
    const stillOwed = actionable.some((player) => player.committed < base.currentBet);
    if (!stillOwed) return nextStreet(base);
  }

  return { ...base, toActIndex: nextIndex(base, base.buttonIndex) };
}

function streetMessage(street: Street): string {
  switch (street) {
    case "flop": return "The flop.";
    case "turn": return "The turn.";
    case "river": return "The river.";
    default: return "";
  }
}

function finishUncontested(state: PokerState, winner: PokerPlayer): PokerState {
  const players = state.players.map((player) =>
    player.id === winner.id ? { ...player, stack: player.stack + state.pot } : player,
  );
  const human = state.players.find((player) => player.isHuman);
  const lastNet = human ? (winner.id === human.id ? state.pot - human.invested : -human.invested) : 0;

  return {
    ...state,
    players,
    street: "complete",
    showdown: {
      awards: [
        {
          amount: state.pot,
          winners: [winner.id],
          description: `${winner.name} takes the pot uncontested`,
        },
      ],
      hands: [],
      uncontested: true,
    },
    message: `${winner.name} takes it.`,
    lastNet,
  };
}

/** Splits the pot into a main pot and any side pots, in ascending order. */
export function buildPots(players: PokerPlayer[]): Array<{ amount: number; eligible: string[] }> {
  const levels = Array.from(
    new Set(players.filter((player) => player.invested > 0).map((player) => player.invested)),
  ).sort((a, b) => a - b);

  const pots: Array<{ amount: number; eligible: string[] }> = [];
  let previous = 0;
  for (const level of levels) {
    const contributors = players.filter((player) => player.invested >= level);
    const amount = (level - previous) * contributors.length;
    const eligible = contributors.filter((player) => !player.folded).map((player) => player.id);
    if (amount > 0) pots.push({ amount, eligible });
    previous = level;
  }
  return pots;
}

export function resolveShowdown(state: PokerState): PokerState {
  const contenders = state.players.filter((player) => !player.folded);
  const hands: Array<{ playerId: string; value: HandValue }> = contenders.map((player) => ({
    playerId: player.id,
    value: evaluateHand([...player.hole, ...state.board]),
  }));

  const pots = buildPots(state.players);
  const payouts = new Map<string, number>();
  const awards: PotAward[] = [];

  pots.forEach((pot, index) => {
    const eligible = hands.filter((entry) => pot.eligible.includes(entry.playerId));
    if (eligible.length === 0) return;
    const best = eligible.reduce((top, entry) =>
      compareHands(entry.value, top.value) > 0 ? entry : top,
    );
    const winners = eligible.filter((entry) => compareHands(entry.value, best.value) === 0);
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;

    winners.forEach((winner) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      payouts.set(winner.playerId, (payouts.get(winner.playerId) ?? 0) + share + extra);
    });

    awards.push({
      amount: pot.amount,
      winners: winners.map((winner) => winner.playerId),
      description:
        (index === 0 ? "Main pot" : `Side pot ${index}`) + `: ${best.value.description}`,
    });
  });

  const players = state.players.map((player) => ({
    ...player,
    stack: player.stack + (payouts.get(player.id) ?? 0),
    revealed: !player.folded,
  }));

  const human = state.players.find((player) => player.isHuman);
  const humanPayout = human ? (payouts.get(human.id) ?? 0) : 0;
  const lastNet = human ? humanPayout - human.invested : 0;

  const headline = awards[0];
  const winnerNames = headline
    ? headline.winners
        .map((id) => state.players.find((player) => player.id === id)?.name ?? "")
        .join(" and ")
    : "";

  return {
    ...state,
    players,
    street: "complete",
    showdown: { awards, hands, uncontested: false },
    message: headline ? `${winnerNames} wins with ${headline.description.split(": ")[1]}.` : "",
    lastNet,
  };
}

export function humanPlayer(state: PokerState): PokerPlayer {
  return state.players.find((player) => player.isHuman)!;
}

export function activeOpponentCount(state: PokerState): number {
  return state.players.filter((player) => !player.isHuman && !player.folded).length;
}
