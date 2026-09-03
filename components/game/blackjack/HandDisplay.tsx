"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/types";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { calculateHandValue } from "@/lib/games/blackjack/hand";
import { HandResult } from "@/lib/games/blackjack/types";
import { formatMoney } from "@/lib/utils/format";
import { BetStack } from "@/components/chips/Chip";
import { DURATION, EASE, SPRING } from "@/lib/motion/tokens";
import { wobbleOf } from "@/lib/motion/jitter";
import { useTableAnchor } from "@/lib/motion/table-space";
import { WinBurst } from "@/components/game/table/WinBurst";
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
            : "border-line-2 bg-surface-3/60 text-fg",
        className,
      )}
    >
      {/* The total counts rather than jumps, so a hit reads as the hand
          changing value and not as a different number appearing. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: -7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 7 }}
          transition={{ duration: DURATION.turn, ease: EASE.arrive }}
          className="tabular text-[13px] leading-none font-medium"
        >
          {label}
        </motion.span>
      </AnimatePresence>
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
  /**
   * How many of these cards have physically been dealt. Anything beyond this is
   * still in the shoe and is not rendered at all.
   */
  visible,
  /** Table anchor the cards fly in from. */
  origin = "shoe",
  /** True while the dealer is sweeping the hand into the discard tray. */
  leaving = false,
  /** Short flights, for hit cards and community cards. */
  short = false,
  /** A neat fan rather than a scattered pile. */
  square = false,
  /** Lifts on hover, for cards that belong to the person holding the mouse. */
  interactive = false,
}: {
  cards: Card[];
  faceDownFrom?: number;
  className?: string;
  visible?: number;
  origin?: string;
  leaving?: boolean;
  short?: boolean;
  square?: boolean;
  interactive?: boolean;
}) {
  const shown = visible === undefined ? cards : cards.slice(0, Math.max(0, visible));

  return (
    <div className={cn("flex items-start", className)}>
      {shown.map((card, index) => (
        <motion.div
          key={card.id}
          layout
          transition={SPRING.ui}
          style={{
            /* Cards overlap by roughly a third, but not by exactly a third:
               a hand where every card sits at the same offset looks printed. */
            marginLeft:
              index === 0
                ? 0
                : `calc(var(--card-w) * ${(-0.34 + wobbleOf(card.id, "lap") * 0.035).toFixed(3)})`,
            zIndex: index,
          }}
        >
          <PlayingCard
            card={card}
            index={index}
            delay={0}
            origin={origin}
            short={short || index > 1}
            square={square}
            interactive={interactive}
            leaving={leaving}
            faceDown={faceDownFrom !== undefined && index >= faceDownFrom}
          />
        </motion.div>
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
  visible,
  leaving,
  standing,
  anchor,
}: {
  cards: Card[];
  bet: number;
  active: boolean;
  dimmed: boolean;
  label?: string;
  result?: HandResult;
  denominations: number[];
  doubled?: boolean;
  visible?: number;
  leaving?: boolean;
  /** The hand has been stood on and is waiting for the dealer. */
  standing?: boolean;
  /** Table anchor name for this hand's wager, so winnings can be paid to it. */
  anchor?: string;
}) {
  const value = calculateHandValue(cards);
  const outcome = result ? OUTCOME_COPY[result.outcome] : null;
  const isBlackjack = result?.outcome === "blackjack";
  const busted = value.busted;
  const betAnchor = useTableAnchor(anchor ?? "bet:unattached");

  return (
    <motion.div
      layout
      className={cn(
        "relative flex flex-col items-center gap-2.5 transition-opacity duration-300",
        dimmed && "opacity-45",
      )}
    >
      {label ? (
        <span
          className={cn(
            "label transition-colors",
            active ? "text-accent-2" : "text-fg-3",
          )}
        >
          {label}
        </span>
      ) : null}

      <div className="relative">
        {/* The seat itself brightens when it is your turn: a steady pool of
            light on the felt under the hand rather than a pulsing border. It
            lights once, on arrival, and then holds — an active hand should be
            unmistakable at a glance, not blinking for attention. */}
        <AnimatePresence>
          {active ? (
            <motion.span
              key="seat-light"
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.reveal, ease: EASE.arrive }}
              style={{
                background:
                  "radial-gradient(closest-side, rgba(201,167,94,0.18), rgba(201,167,94,0) 78%)",
              }}
            />
          ) : null}
        </AnimatePresence>

        {/* A blackjack gets a slow sweep of light across the cards. It is the
            best hand in the game and it should look like it, without the
            screen doing anything a room full of adults would find embarrassing. */}
        <AnimatePresence>
          {isBlackjack ? (
            <motion.span
              key="bj-sweep"
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.reveal }}
              style={{
                background:
                  "radial-gradient(closest-side, rgba(201,167,94,0.3), rgba(201,167,94,0) 76%)",
              }}
            />
          ) : null}
        </AnimatePresence>

        <WinBurst active={Boolean(isBlackjack)} seed={cards[0]?.id ?? "hand"} />

        <motion.div
          animate={{
            /* A bust hand is pushed back rather than flashed red. */
            opacity: busted && result ? 0.62 : 1,
            filter: busted && result ? "saturate(0.45)" : "saturate(1)",
          }}
          transition={{ duration: DURATION.reveal, ease: EASE.arrive }}
        >
          <CardRow cards={cards} visible={visible} leaving={leaving} />
        </motion.div>

        {active ? (
          <motion.span
            layoutId="active-hand-marker"
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 h-[2px] w-[62%] -translate-x-1/2 bg-accent-2"
          />
        ) : null}
      </div>

      <TotalPlate cards={cards} tone={busted ? "bust" : "default"} />

      <div className="flex flex-col items-center gap-1.5">
        <div ref={betAnchor} className="[--chip-w:2rem]">
          <BetStack amount={bet} denominations={denominations} />
        </div>
        <span className="tabular text-[11px] text-fg-2">
          {formatMoney(bet)}
          {doubled ? (
            <span className="ml-1.5 font-mono text-[8.5px] tracking-[0.12em] uppercase opacity-70">
              Doubled
            </span>
          ) : null}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {outcome ? (
          <motion.span
            key="outcome"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRING.ui}
            className={cn(
              "border px-2 py-[3px] font-mono text-[9.5px] tracking-[0.14em] uppercase",
              isBlackjack && "border-accent-2 text-accent-2 shadow-[0_0_18px_-4px_rgba(201,167,94,0.7)]",
              !isBlackjack && outcome.tone === "win"
                ? "border-positive/60 text-positive"
                : !isBlackjack && outcome.tone === "lose"
                  ? "border-negative/55 text-negative"
                  : !isBlackjack
                    ? "border-line-2 text-fg-2"
                    : "",
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
        ) : standing ? (
          <motion.span
            key="standing"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DURATION.turn, ease: EASE.arrive }}
            className="border border-line-2 px-2 py-[3px] font-mono text-[10px] tracking-[0.14em] text-fg-2 uppercase"
          >
            Stand
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
