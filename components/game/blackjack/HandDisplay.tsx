"use client";

import { motion } from "framer-motion";
import { Card } from "@/types";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { calculateHandValue } from "@/lib/games/blackjack/hand";
import { HandResult } from "@/lib/games/blackjack/types";
import { formatMoney } from "@/lib/utils/format";
import { BetStack } from "@/components/chips/Chip";
import { cn } from "@/lib/utils/cn";

export function TotalPlate({
  cards,
  hidden,
  tone = "default",
  className,
}: {
  cards: Card[];
  /** True while the dealer hole card is still face down. */
  hidden?: boolean;
  tone?: "default" | "bust" | "win";
  className?: string;
}) {
  const value = calculateHandValue(cards);
  const label = hidden ? calculateHandValue(cards.slice(0, 1)).total : value.total;

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 border px-2 py-[3px] backdrop-blur-[2px]",
        tone === "bust"
          ? "border-negative/60 bg-negative/12 text-negative"
          : tone === "win"
            ? "border-positive/60 bg-positive/12 text-positive"
            : "border-[rgba(236,229,216,0.22)] bg-[rgba(6,10,9,0.4)] text-[rgba(236,229,216,0.92)]",
        className,
      )}
    >
      <span className="tabular text-[13px] leading-none font-medium">{label}</span>
      {!hidden && value.soft && !value.busted ? (
        <span className="font-mono text-[8.5px] tracking-[0.12em] uppercase opacity-70">Soft</span>
      ) : null}
      {hidden ? (
        <span className="font-mono text-[8.5px] tracking-[0.12em] uppercase opacity-70">
          Showing
        </span>
      ) : null}
    </span>
  );
}

export function CardRow({
  cards,
  faceDownFrom,
  className,
}: {
  cards: Card[];
  /** Index from which cards are shown face down. */
  faceDownFrom?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start", className)}>
      {cards.map((card, index) => (
        <div
          key={card.id}
          style={{
            marginLeft: index === 0 ? 0 : "calc(var(--card-w) * -0.34)",
            zIndex: index,
          }}
        >
          <PlayingCard
            card={card}
            index={index}
            faceDown={faceDownFrom !== undefined && index >= faceDownFrom}
            className={index === 0 ? undefined : "rotate-[2deg]"}
          />
        </div>
      ))}
    </div>
  );
}

const OUTCOME_COPY: Record<HandResult["outcome"], { text: string; tone: "win" | "lose" | "push" }> =
  {
    blackjack: { text: "Blackjack", tone: "win" },
    win: { text: "Win", tone: "win" },
    "dealer-bust": { text: "Dealer busts", tone: "win" },
    lose: { text: "Lose", tone: "lose" },
    bust: { text: "Bust", tone: "lose" },
    push: { text: "Push", tone: "push" },
    surrender: { text: "Surrendered", tone: "push" },
  };

export function PlayerHand({
  cards,
  bet,
  active,
  dimmed,
  label,
  result,
  denominations,
  doubled,
}: {
  cards: Card[];
  bet: number;
  active: boolean;
  dimmed: boolean;
  label?: string;
  result?: HandResult;
  denominations: number[];
  doubled?: boolean;
}) {
  const value = calculateHandValue(cards);
  const outcome = result ? OUTCOME_COPY[result.outcome] : null;

  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col items-center gap-2.5 transition-opacity duration-300",
        dimmed && "opacity-45",
      )}
    >
      {label ? (
        <span
          className={cn(
            "font-mono text-[9px] tracking-[0.2em] uppercase transition-colors",
            active ? "text-accent-2" : "text-[rgba(236,229,216,0.38)]",
          )}
        >
          {label}
        </span>
      ) : null}

      <div className="relative">
        <CardRow cards={cards} />
        {active ? (
          <motion.span
            layoutId="active-hand-marker"
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 h-[2px] w-[62%] -translate-x-1/2 bg-accent-2"
          />
        ) : null}
      </div>

      <TotalPlate cards={cards} tone={value.busted ? "bust" : "default"} />

      <div className="flex flex-col items-center gap-1.5">
        <div className="[--chip-w:2rem]">
          <BetStack amount={bet} denominations={denominations} />
        </div>
        <span className="tabular text-[11px] text-[rgba(236,229,216,0.6)]">
          {formatMoney(bet)}
          {doubled ? (
            <span className="ml-1.5 font-mono text-[8.5px] tracking-[0.12em] uppercase opacity-70">
              Doubled
            </span>
          ) : null}
        </span>
      </div>

      {outcome ? (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className={cn(
            "border px-2 py-[3px] font-mono text-[9.5px] tracking-[0.14em] uppercase",
            outcome.tone === "win"
              ? "border-positive/60 text-positive"
              : outcome.tone === "lose"
                ? "border-negative/55 text-negative"
                : "border-[rgba(236,229,216,0.3)] text-[rgba(236,229,216,0.75)]",
          )}
        >
          {outcome.text}
          {result && result.net !== 0 ? (
            <span className="tabular ml-1.5">
              {result.net > 0 ? "+" : ""}
              {formatMoney(result.net)}
            </span>
          ) : null}
        </motion.span>
      ) : null}
    </motion.div>
  );
}
