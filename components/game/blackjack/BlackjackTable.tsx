"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BlackjackState } from "@/lib/games/blackjack/types";
import { labelForHand } from "@/lib/games/blackjack/engine";
import { CardRow, PlayerHand, TotalPlate } from "./HandDisplay";
import { ChipFace, chipBreakdown } from "@/components/chips/Chip";
import { CHIP_DROP_ATTRIBUTE, useChipDrag } from "@/components/chips/chip-drag";
import { formatMoney } from "@/lib/utils/format";
import { CHIP_DENOMINATIONS } from "./Rails";
import { cardsRemaining } from "@/lib/games/deck";

/**
 * Cards shrink as the hand count grows. Four split hands of three cards each
 * will not fit across a phone at the single hand size, so the table reflows
 * rather than letting the outer hands fall off the felt.
 */
const CARD_WIDTH_BY_HANDS: Record<number, string> = {
  1: "clamp(3.1rem, 10vw, 5.3rem)",
  2: "clamp(2.7rem, 8.5vw, 4.6rem)",
  3: "clamp(2.3rem, 7vw, 4rem)",
  4: "clamp(2rem, 6vw, 3.5rem)",
};

export function BlackjackTable({
  game,
  dealerShown,
  holeUp,
  resultVisible,
}: {
  game: BlackjackState;
  dealerShown: number;
  holeUp: boolean;
  resultVisible: boolean;
}) {
  const dealerCards = game.dealer.cards.slice(0, Math.max(0, dealerShown));
  const dealing = game.hands.length > 0;
  const remaining = cardsRemaining(game.shoe);
  const decksLeft = Math.max(0, remaining / 52);
  const handCount = Math.max(1, game.hands.length);
  const playerCardWidth = CARD_WIDTH_BY_HANDS[Math.min(handCount, 4)] ?? CARD_WIDTH_BY_HANDS[4];

  /* Keep whichever hand is being played in view when the row has to scroll. */
  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [game.activeHandIndex, game.hands.length]);

  return (
    <div className="felt relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 border border-[rgba(201,167,94,0.14)] sm:inset-4"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 font-mono text-[9px] tracking-[0.18em] text-[rgba(236,229,216,0.34)] uppercase sm:px-9 sm:py-6">
        <span>Hand {String(game.handNumber).padStart(2, "0")}</span>
        <span>{decksLeft.toFixed(1)} decks in shoe</span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between gap-[clamp(1rem,4vh,2.5rem)] overflow-y-auto px-4 pt-12 pb-7 sm:px-9 sm:pt-14 sm:pb-10">
        {/* Dealer */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <span className="font-mono text-[9px] tracking-[0.26em] text-[rgba(236,229,216,0.42)] uppercase">
            Dealer
          </span>
          {dealerCards.length > 0 ? (
            <>
              <div className="[--card-w:clamp(3rem,9.5vw,4.9rem)]">
                <CardRow cards={dealerCards} faceDownFrom={holeUp ? undefined : 1} />
              </div>
              <TotalPlate cards={holeUp ? dealerCards : dealerCards.slice(0, 1)} hidden={!holeUp} />
            </>
          ) : (
            <div className="flex h-[calc(clamp(3rem,9.5vw,4.9rem)*1.4)] items-center">
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-[rgba(236,229,216,0.22)] uppercase">
                Shoe ready
              </span>
            </div>
          )}
        </div>

        {/* The middle of the table: the house rules, then the dealer's line.
            A real table prints its terms across the felt, which is both what
            fills this space and the thing a new player most needs to read. */}
        <div className="flex shrink-0 flex-col items-center gap-5 self-stretch px-2 text-center">
          <TableLegend rules={game.rules} />

          <div className="flex min-h-[2.5rem] items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={game.dealerMessage + String(resultVisible)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
                className="display text-[clamp(1.15rem,4.4vw,1.4rem)] text-[rgba(236,229,216,0.88)] italic"
              >
                {game.dealerMessage}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Player */}
        <div
          className={
            "flex w-full shrink-0 items-end justify-center gap-3 overflow-x-auto " +
            "px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-10"
          }
        >
          {dealing ? (
            game.hands.map((hand, index) => {
              const active =
                game.phase === "player" && index === game.activeHandIndex && !hand.resolved;
              return (
                <div
                  key={hand.id}
                  ref={active ? activeRef : undefined}
                  className="shrink-0"
                  style={{ ["--card-w" as string]: playerCardWidth }}
                >
                  <PlayerHand
                    cards={hand.cards}
                    bet={hand.bet}
                    active={active}
                    dimmed={game.hands.length > 1 && game.phase === "player" && !active}
                    label={game.hands.length > 1 ? labelForHand(game, hand) : undefined}
                    result={
                      resultVisible
                        ? game.results.find((entry) => entry.handId === hand.id)
                        : undefined
                    }
                    denominations={CHIP_DENOMINATIONS}
                    doubled={hand.doubled}
                  />
                </div>
              );
            })
          ) : (
            <BetSpot bet={game.pendingBet} denominations={CHIP_DENOMINATIONS} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The betting circle, and the target a dragged chip is aimed at.
 *
 * It is deliberately large on a phone. It is the only thing to press on this
 * screen, and the old size left it floating in the middle of a lot of empty
 * felt with nothing drawing the eye to it.
 */
/** The house terms, set across the felt the way a table prints them. */
function TableLegend({ rules }: { rules: BlackjackState["rules"] }) {
  const payout =
    rules.blackjackPayout === 1.5
      ? "Blackjack pays 3 to 2"
      : rules.blackjackPayout === 1.2
        ? "Blackjack pays 6 to 5"
        : `Blackjack pays ${rules.blackjackPayout} to 1`;

  return (
    <div aria-hidden="true" className="flex w-full flex-col items-center gap-2.5">
      <div className="flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
        <span className="font-mono text-[clamp(0.5rem,2.4vw,0.62rem)] tracking-[0.28em] whitespace-nowrap text-[rgba(201,167,94,0.5)] uppercase">
          {payout}
        </span>
        <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
      </div>
      <span className="font-mono text-[9px] tracking-[0.2em] text-[rgba(236,229,216,0.26)] uppercase">
        Dealer {rules.dealerHitsSoft17 ? "hits" : "stands on"} soft 17
      </span>
    </div>
  );
}

function BetSpot({ bet, denominations }: { bet: number; denominations: number[] }) {
  const { dragging, over } = useChipDrag();
  const isOver = over === "bet";
  const stack = bet > 0 ? chipBreakdown(bet, denominations) : [];

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        {...{ [CHIP_DROP_ATTRIBUTE]: "bet" }}
        animate={{
          scale: isOver ? 1.08 : 1,
          borderColor: isOver
            ? "rgba(201,167,94,0.95)"
            : dragging
              ? "rgba(201,167,94,0.6)"
              : "rgba(201,167,94,0.3)",
        }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="relative grid h-[clamp(6.5rem,28vw,8rem)] w-[clamp(6.5rem,28vw,8rem)] place-items-center rounded-full border border-dashed"
        style={{
          boxShadow: isOver ? "0 0 0 8px rgba(201,167,94,0.10)" : "none",
        }}
      >
        {/* The chips actually wagered, stacked in the circle. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center [--chip-w:2.6rem]">
          <AnimatePresence>
            {stack.slice(0, 6).map((value, index) => (
              <motion.span
                key={`${value}-${index}`}
                initial={{ opacity: 0, y: -26, scale: 0.8 }}
                animate={{ opacity: 1, y: index * -4, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="absolute"
              >
                <ChipFace value={value} />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {bet > 0 ? (
          <motion.span
            key={bet}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="tabular absolute -bottom-7 text-[15px] text-[rgba(236,229,216,0.92)]"
          >
            {formatMoney(bet)}
          </motion.span>
        ) : (
          <span className="font-mono text-[9px] tracking-[0.16em] text-[rgba(236,229,216,0.3)] uppercase">
            Bet
          </span>
        )}
      </motion.div>

      <span className="mt-4 font-mono text-[9px] tracking-[0.22em] text-[rgba(236,229,216,0.4)] uppercase">
        {dragging ? "Drop to add" : "Tap or drag a chip"}
      </span>
    </div>
  );
}
