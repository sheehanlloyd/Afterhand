"use client";

import { useMemo, useState } from "react";
import { BetLimits, PokerAction, PokerState } from "@/lib/games/poker/types";
import { betLimits, currentPlayer, humanPlayer } from "@/lib/games/poker/engine";
import { Button } from "@/components/ui/Button";
import { RailFrame } from "@/components/game/blackjack/Rails";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const PRESETS: Array<{ label: string; fraction: number }> = [
  { label: "25%", fraction: 0.25 },
  { label: "33%", fraction: 0.33 },
  { label: "50%", fraction: 0.5 },
  { label: "75%", fraction: 0.75 },
  { label: "Pot", fraction: 1 },
];

/** Standard pot sized raise: call first, then bet the pot that would exist. */
function targetFor(state: PokerState, limits: BetLimits, fraction: number): number {
  const player = humanPlayer(state);
  const potAfterCall = state.pot + limits.toCall;
  return Math.round(player.committed + limits.toCall + potAfterCall * fraction);
}

export function PokerActionRail({
  state,
  onAction,
  disabled,
}: {
  state: PokerState;
  onAction: (action: PokerAction) => void;
  disabled: boolean;
}) {
  const limits = betLimits(state);
  const [sizing, setSizing] = useState(false);
  const [amount, setAmount] = useState(limits.minTo);
  const acting = currentPlayer(state);
  const isTurn = Boolean(acting?.isHuman) && state.street !== "complete";

  // Reset the sizing panel whenever the spot changes, adjusted during render
  // rather than in an effect so there is no extra pass.
  const spotKey = `${state.handNumber}:${state.street}:${state.history.length}:${limits.minTo}`;
  const [lastSpot, setLastSpot] = useState(spotKey);
  if (lastSpot !== spotKey) {
    setLastSpot(spotKey);
    setSizing(false);
    setAmount(limits.minTo);
  }

  const clamped = useMemo(
    () => Math.max(limits.minTo, Math.min(amount, limits.maxTo)),
    [amount, limits.minTo, limits.maxTo],
  );

  if (!isTurn) {
    return (
      <RailFrame className="justify-center">
        <span className="font-mono text-[10px] tracking-[0.18em] text-fg-3 uppercase">
          {disabled ? "Opponents are acting" : "Waiting"}
        </span>
      </RailFrame>
    );
  }

  if (sizing && limits.canRaise) {
    return (
      <RailFrame className="flex-col items-stretch gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="label">{state.currentBet === 0 ? "Bet" : "Raise to"}</span>
          <span className="tabular text-[19px] leading-none">{formatMoney(clamped)}</span>
        </div>

        <input
          type="range"
          min={limits.minTo}
          max={limits.maxTo}
          step={Math.max(1, state.bigBlind / 2)}
          value={clamped}
          onChange={(event) => setAmount(Number(event.target.value))}
          aria-label="Bet size"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-none bg-fg/15 accent-[var(--accent-2)]"
        />

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => {
            const target = Math.max(
              limits.minTo,
              Math.min(targetFor(state, limits, preset.fraction), limits.maxTo),
            );
            return (
              <Button
                key={preset.label}
                variant="quiet"
                size="sm"
                plate
                onClick={() => setAmount(target)}
                className={cn(clamped === target && "border-accent-2 text-accent-2")}
              >
                {preset.label}
              </Button>
            );
          })}
          <Button
            variant="quiet"
            size="sm"
            plate
            onClick={() => setAmount(limits.maxTo)}
            className={cn(clamped === limits.maxTo && "border-accent-2 text-accent-2")}
          >
            All in
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" plate onClick={() => setSizing(false)}>
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              plate
              disabled={disabled}
              onClick={() => onAction({ type: "raise", to: clamped })}
            >
              {state.currentBet === 0 ? "Bet" : "Raise"} {formatMoney(clamped)}
            </Button>
          </div>
        </div>
      </RailFrame>
    );
  }

  return (
    <RailFrame className="gap-y-2.5">
      <div className="flex w-full min-w-0 items-baseline justify-between gap-3 sm:w-auto sm:shrink-0 sm:flex-col sm:items-start">
        <span className="label">Your move</span>
        <span className="tabular text-[13px] leading-none text-fg-2 sm:mt-1">
          {limits.toCall > 0 ? `${formatMoney(limits.toCall)} to call` : "No bet to you"}
        </span>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-1 sm:items-center sm:justify-end">
        <Button
          variant="secondary"
          size="lg"
          plate
          disabled={disabled}
          onClick={() => onAction({ type: "fold" })}
          className="sm:min-w-[5rem]"
        >
          Fold
        </Button>
        {limits.canCheck ? (
          <Button
            variant="primary"
            size="lg"
            plate
            disabled={disabled}
            onClick={() => onAction({ type: "check" })}
            className="sm:min-w-[5rem]"
          >
            Check
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            plate
            disabled={disabled}
            onClick={() => onAction({ type: "call" })}
            className="sm:min-w-[7rem]"
          >
            Call {formatMoney(limits.toCall)}
          </Button>
        )}
        {limits.canRaise ? (
          <Button
            variant="secondary"
            size="lg"
            plate
            disabled={disabled}
            onClick={() => setSizing(true)}
            className="col-span-2 sm:col-span-1 sm:min-w-[5rem]"
          >
            {state.currentBet === 0 ? "Bet" : "Raise"}
          </Button>
        ) : null}
      </div>
    </RailFrame>
  );
}

export function PokerHandOverRail({
  net,
  onNext,
  onReview,
  reviewOpen,
  hasReview,
  broke,
}: {
  net: number;
  onNext: () => void;
  onReview: () => void;
  reviewOpen: boolean;
  hasReview: boolean;
  broke: boolean;
}) {
  return (
    <RailFrame>
      <div className="flex min-w-0 shrink-0 flex-col">
        <span className="label">Result</span>
        <span
          className={cn(
            "tabular mt-1 text-[19px] leading-none",
            net > 0 ? "text-positive" : net < 0 ? "text-negative" : "text-fg-2",
          )}
        >
          {net > 0 ? "+" : ""}
          {formatMoney(net)}
        </span>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {hasReview && !reviewOpen ? (
          <Button variant="secondary" size="md" plate onClick={onReview}>
            Review hand
          </Button>
        ) : null}
        <Button variant="primary" size="lg" plate onClick={onNext}>
          {broke ? "Session summary" : "Next hand"}
        </Button>
      </div>
    </RailFrame>
  );
}

export function PokerDealRail({ onDeal }: { onDeal: () => void }) {
  return (
    <RailFrame className="justify-between">
      <span className="font-mono text-[10px] tracking-[0.16em] text-fg-3 uppercase">
        Blinds post automatically
      </span>
      <Button variant="primary" size="lg" plate onClick={onDeal}>
        Deal
      </Button>
    </RailFrame>
  );
}
