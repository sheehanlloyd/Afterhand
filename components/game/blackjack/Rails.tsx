"use client";

import { Chip } from "@/components/chips/Chip";
import { useTableAnchor } from "@/lib/motion/table-space";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils/format";
import { PlayerAction } from "@/lib/games/blackjack/types";
import { cn } from "@/lib/utils/cn";

export const CHIP_DENOMINATIONS = [5, 10, 25, 50, 100, 500];

export function RailFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[64rem] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-6 sm:py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Betting rails share one shape: a value block, a chip tray, and the controls.
 * On a phone the value and controls sit on one line with the chips underneath,
 * which keeps the chips in the thumb zone without pushing the rail tall.
 */
export function BetRailLayout({
  value,
  chips,
  controls,
  footnote,
}: {
  value: React.ReactNode;
  chips: React.ReactNode;
  controls: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-3 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-4 sm:contents">
        <div className="flex min-w-0 flex-col sm:order-1 sm:shrink-0">{value}</div>
        <div className="flex shrink-0 items-center gap-2 sm:order-3">{controls}</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:order-2 sm:flex-1 sm:gap-2.5">
        {chips}
      </div>
      {footnote ? (
        <p className="w-full text-center font-mono text-[10px] tracking-[0.12em] text-fg-3 uppercase sm:order-4">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

export function BettingRail({
  bet,
  bankroll,
  minBet,
  maxBet,
  canDeal,
  canRepeat,
  onChip,
  onClear,
  onRepeat,
  onDeal,
  showHints,
}: {
  bet: number;
  bankroll: number;
  minBet: number;
  maxBet: number;
  canDeal: boolean;
  canRepeat: boolean;
  onChip: (value: number) => void;
  onClear: () => void;
  onRepeat: () => void;
  onDeal: () => void;
  showHints: boolean;
}) {
  const chips = CHIP_DENOMINATIONS.filter((value) => value <= maxBet);
  /* The tray is where the player's own money physically lives on this screen,
     so it is the origin every chip that reaches the felt travels from. */
  const railAnchor = useTableAnchor("rail");

  return (
    <BetRailLayout
      value={
        <>
          <span className="label">Bet</span>
          <span className="tabular mt-1 text-[19px] leading-none">{formatMoney(bet)}</span>
        </>
      }
      chips={
        <div
          ref={railAnchor}
          className="flex flex-wrap justify-center gap-2.5 [--chip-w:2.9rem] sm:gap-2.5 sm:[--chip-w:3rem]"
        >
          {chips.map((value) => (
            <Chip
              key={value}
              value={value}
              draggable
              onClick={() => onChip(value)}
              disabled={bet + value > Math.min(maxBet, bankroll + bet)}
            />
          ))}
        </div>
      }
      controls={
        <>
          {canRepeat ? (
            <Button variant="ghost" size="sm" plate onClick={onRepeat}>
              Repeat
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" plate onClick={onClear} disabled={bet === 0}>
            Clear
          </Button>
          <Button variant="primary" size="md" plate onClick={onDeal} disabled={!canDeal}>
            Deal
            {showHints ? <Key>Space</Key> : null}
          </Button>
        </>
      }
      footnote={`Table ${formatMoney(minBet)} to ${formatMoney(maxBet)}`}
    />
  );
}

const ACTION_KEYS: Partial<Record<PlayerAction, string>> = {
  hit: "H",
  stand: "S",
  double: "D",
  split: "P",
  surrender: "R",
};

const ACTION_LABEL: Record<PlayerAction, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender",
};

const ACTION_ORDER: PlayerAction[] = ["hit", "stand", "double", "split", "surrender"];

export function ActionRail({
  available,
  onAction,
  disabled,
  showHints,
  handLabel,
}: {
  available: PlayerAction[];
  onAction: (action: PlayerAction) => void;
  disabled: boolean;
  showHints: boolean;
  handLabel?: string;
}) {
  const primary = ACTION_ORDER.filter(
    (action) => available.includes(action) && (action === "hit" || action === "stand"),
  );
  const secondary = ACTION_ORDER.filter(
    (action) => available.includes(action) && action !== "hit" && action !== "stand",
  );

  const render = (action: PlayerAction, isPrimary: boolean) => (
    <Button
      key={action}
      variant={isPrimary ? "primary" : "secondary"}
      size={isPrimary ? "lg" : "md"}
      plate
      disabled={disabled}
      onClick={() => onAction(action)}
      className="w-full sm:h-12 sm:w-auto sm:min-w-[5.5rem]"
    >
      {ACTION_LABEL[action]}
      {showHints && ACTION_KEYS[action] ? <Key>{ACTION_KEYS[action]}</Key> : null}
    </Button>
  );

  return (
    <RailFrame className="gap-y-2.5">
      <div className="flex w-full min-w-0 items-baseline justify-between gap-3 sm:w-auto sm:shrink-0 sm:flex-col sm:items-start sm:justify-start">
        <span className="label">Your move</span>
        <span className="text-[13px] leading-none text-fg-2 sm:mt-1">
          {handLabel ?? "Your hand"}
        </span>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          {primary.map((action) => render(action, true))}
        </div>
        {secondary.length > 0 ? (
          <div
            className={cn(
              "grid gap-2 sm:flex sm:gap-2",
              secondary.length === 1 ? "grid-cols-1" : secondary.length === 2 ? "grid-cols-2" : "grid-cols-3",
            )}
          >
            {secondary.map((action) => render(action, false))}
          </div>
        ) : null}
      </div>
    </RailFrame>
  );
}

export function SettledRail({
  net,
  onNext,
  onReview,
  reviewOpen,
  hasReview,
  showHints,
  bankrollSpent,
}: {
  net: number;
  onNext: () => void;
  onReview: () => void;
  reviewOpen: boolean;
  hasReview: boolean;
  showHints: boolean;
  bankrollSpent: boolean;
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
          <Button variant="secondary" size="md" plate onClick={onReview} className="flex-1 sm:flex-none">
            Review hand
          </Button>
        ) : null}
        <Button variant="primary" size="lg" plate onClick={onNext} className="flex-1 sm:flex-none">
          {bankrollSpent ? "Session summary" : "Next hand"}
          {showHints ? <Key>Space</Key> : null}
        </Button>
      </div>
    </RailFrame>
  );
}

export function InsuranceRail({
  amount,
  onTake,
  onDecline,
}: {
  amount: number;
  onTake: () => void;
  onDecline: () => void;
}) {
  return (
    <RailFrame>
      <div className="flex w-full min-w-0 flex-col sm:flex-1">
        <span className="label">Dealer shows an ace</span>
        <span className="mt-1 text-[13.5px] leading-snug text-fg-2">
          Insurance costs {formatMoney(amount)} and pays 2 to 1 if the dealer has blackjack.
        </span>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
        <Button variant="secondary" size="md" plate onClick={onTake}>
          Take insurance
        </Button>
        <Button variant="primary" size="md" plate onClick={onDecline}>
          No insurance
        </Button>
      </div>
    </RailFrame>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 hidden border border-current/35 px-1 py-px font-mono text-[10px] leading-none tracking-normal opacity-70 sm:inline-block">
      {children}
    </kbd>
  );
}
