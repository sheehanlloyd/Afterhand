import { randomFloat } from "@/lib/utils/rng";
import { estimateEquity } from "./equity";
import { betLimits, currentPlayer } from "./engine";
import { PERSONALITIES, PokerAction, PokerState } from "./types";

/**
 * Opponent decisions.
 *
 * The opponents look at three things: how often their hand wins against random
 * holdings, what the pot is offering them, and how many players are still in.
 * A personality shifts the thresholds and adds noise so the table does not play
 * the same way every hand.
 */

const SAMPLES = 220;

function roundToBlind(amount: number, blind: number): number {
  return Math.max(blind, Math.round(amount / blind) * blind);
}

export function decideAction(state: PokerState): PokerAction {
  const player = currentPlayer(state);
  if (!player || player.isHuman) return { type: "check" };

  const profile = PERSONALITIES[player.personality];
  const limits = betLimits(state);
  const opponents = state.players.filter(
    (entry) => entry.id !== player.id && !entry.folded,
  ).length;

  const equity = estimateEquity(player.hole, state.board, Math.max(1, opponents), SAMPLES).equity;
  const noise = (randomFloat() - 0.5) * 0.09;
  const effective = equity + noise;

  const potOdds = limits.toCall > 0 ? limits.toCall / (state.pot + limits.toCall) : 0;
  const stackShare = limits.toCall / Math.max(1, player.stack);

  // Nothing to call: check or take the initiative.
  if (limits.canCheck) {
    const betThreshold = 0.58 + (1 - profile.aggression) * 0.16;
    if (effective > betThreshold && limits.canRaise) {
      const size = state.pot * (0.42 + profile.aggression * 0.38);
      return { type: "raise", to: clampRaise(state, roundToBlind(size, state.bigBlind)) };
    }
    const bluffing =
      state.board.length >= 3 &&
      limits.canRaise &&
      randomFloat() < profile.bluff * 0.4 &&
      effective < 0.45;
    if (bluffing) {
      const size = state.pot * 0.38;
      return { type: "raise", to: clampRaise(state, roundToBlind(size, state.bigBlind)) };
    }
    return { type: "check" };
  }

  // Facing a bet.
  const looseSlack = (profile.looseness - 0.5) * 0.14;
  const required = potOdds - looseSlack;

  if (effective < required - 0.02) return { type: "fold" };
  if (stackShare > 0.45 && effective < 0.58 && randomFloat() > profile.looseness * 0.35) {
    return { type: "fold" };
  }

  const raiseThreshold = 0.7 + (1 - profile.aggression) * 0.14;
  if (effective > raiseThreshold && limits.canRaise && randomFloat() < 0.55 + profile.aggression * 0.35) {
    const size = (state.pot + limits.toCall) * (0.55 + profile.aggression * 0.4);
    const target = state.currentBet + roundToBlind(size, state.bigBlind);
    return { type: "raise", to: clampRaise(state, target) };
  }

  return { type: "call" };
}

function clampRaise(state: PokerState, to: number): number {
  const limits = betLimits(state);
  return Math.max(limits.minTo, Math.min(to, limits.maxTo));
}

/** A small pause so the table does not resolve instantly. */
export function thinkingTime(): number {
  return 480 + Math.round(randomFloat() * 620);
}
