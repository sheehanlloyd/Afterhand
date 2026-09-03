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
import { DealerRail } from "@/components/game/table/DealerRail";
import { TableCamera, type CameraFocus } from "@/components/game/table/TableCamera";
import { useTableAnchor } from "@/lib/motion/table-space";
import { useChipFlight } from "@/components/chips/ChipFlight";
import { DURATION, EASE, SPRING } from "@/lib/motion/tokens";
import type { RevealCounts } from "@/lib/motion/deal-order";

/**
 * Cards shrink as the hand count grows. Four split hands of three cards each
 * will not fit across a phone at the single hand size, so the table reflows
 * rather than letting the outer hands fall off the felt.
 */
const CARD_WIDTH_BY_HANDS: Record<number, string> = {
  1: "clamp(3.8rem, 13vw, 5.6rem)",
  2: "clamp(3.1rem, 10vw, 4.8rem)",
  3: "clamp(2.5rem, 7.5vw, 4.1rem)",
  4: "clamp(2.1rem, 6.2vw, 3.6rem)",
};

/** Where the camera looks, given what the table is doing. */
function focusFor(game: BlackjackState, resultVisible: boolean, holeUp: boolean): CameraFocus {
  if (resultVisible) return "result";
  if (game.phase === "settled") return "dealer";
  if (game.phase === "player" || game.phase === "insurance") return "player";
  if (holeUp) return "dealer";
  return "wide";
}

export function BlackjackTable({
  game,
  visible,
  holeUp,
  resultVisible,
  collecting,
}: {
  game: BlackjackState;
  /** How much of the table has physically been dealt. */
  visible: RevealCounts;
  holeUp: boolean;
  resultVisible: boolean;
  /** The dealer is sweeping the finished hands into the tray. */
  collecting: boolean;
}) {
  const dealing = game.hands.length > 0;
  const remaining = cardsRemaining(game.shoe);
  const total = game.shoe.cards.length || 1;
  const decksLeft = Math.max(0, remaining / 52);
  const handCount = Math.max(1, game.hands.length);
  const playerCardWidth = CARD_WIDTH_BY_HANDS[Math.min(handCount, 4)] ?? CARD_WIDTH_BY_HANDS[4];
  const betAnchor = useTableAnchor("bet:main");
  const dealerAnchor = useTableAnchor("dealer");
  const flight = useChipFlight();

  /**
   * Paying the hand.
   *
   * Money moves before any figure changes: a win is chips coming from the
   * dealer's side of the table to the circle, a loss is the wager being taken
   * away. Fired once per round, keyed on the hand number, because the result
   * becoming visible is the moment the dealer settles up.
   */
  const paidFor = useRef<number | null>(null);
  useEffect(() => {
    if (!resultVisible) {
      paidFor.current = null;
      return;
    }
    if (paidFor.current === game.handNumber) return;
    paidFor.current = game.handNumber;

    for (const result of game.results) {
      if (result.net > 0) {
        flight.send({
          from: "dealer",
          to: `bet:${result.handId}`,
          amount: result.net,
          denominations: CHIP_DENOMINATIONS,
        });
      } else if (result.net < 0) {
        flight.send({
          from: `bet:${result.handId}`,
          to: "dealer",
          amount: -result.net,
          denominations: CHIP_DENOMINATIONS,
        });
      }
    }
  }, [resultVisible, game.handNumber, game.results, flight]);

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

      {/* The light over the table. It drifts, very slowly, which is enough to
          stop the felt reading as a flat fill. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.55, 0.78, 0.55], scale: [1, 1.04, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: EASE.drift }}
        style={{
          background:
            "radial-gradient(58% 34% at 50% 4%, rgba(226,240,231,0.09), rgba(226,240,231,0) 70%)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3 font-mono text-[10px] tracking-[0.16em] text-fg-3 uppercase sm:px-9 sm:py-4">
        <span>Hand {String(game.handNumber).padStart(2, "0")}</span>
        <span>{decksLeft.toFixed(1)} decks in shoe</span>
      </div>

      <TableCamera focus={focusFor(game, resultVisible, holeUp)}>
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(1.5rem,6vh,4rem)] overflow-y-auto px-4 py-9 sm:px-9 sm:py-12">
          {/* The dealer's station: shoe, marker and tray along the top edge,
              then the dealer's own hand and total just below it. Nothing here
              is a figure — the cards arriving from the shoe are the dealer's
              presence. */}
          <div className="flex w-full shrink-0 flex-col items-center gap-2.5">
            <DealerRail
              shoeFill={remaining / total}
              trayFill={game.shoe.position / total}
              className="[--card-w:clamp(1.4rem,4vw,1.9rem)]"
            />

            <div ref={dealerAnchor} className="flex min-w-0 flex-col items-center gap-2">
              {visible.dealer > 0 ? (
                <>
                  <div className="[--card-w:clamp(3.2rem,10vw,5rem)]">
                    <CardRow
                      cards={game.dealer.cards}
                      visible={visible.dealer}
                      leaving={collecting}
                      faceDownFrom={holeUp ? undefined : 1}
                    />
                  </div>
                  <TotalPlate
                    cards={game.dealer.cards.slice(0, visible.dealer)}
                    hidden={!holeUp}
                  />
                </>
              ) : (
                <div className="flex h-[calc(clamp(3.2rem,10vw,5rem)*1.4)] items-center">
                  <span className="label text-fg-3">Shoe ready</span>
                </div>
              )}
            </div>
          </div>

          {/* The middle of the table: the house rules, then the dealer's line.
              A real table prints its terms across the felt, which is both what
              fills this space and the thing a new player most needs to read. */}
          <div className="flex shrink-0 flex-col items-center gap-4 self-stretch px-2 text-center">
            <TableLegend rules={game.rules} />

            <div className="flex min-h-[2.25rem] items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={game.dealerMessage + String(resultVisible)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: DURATION.turn, ease: EASE.arrive }}
                  className="display text-[clamp(1.05rem,4vw,1.3rem)] text-fg-2 italic"
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
                      anchor={`bet:${hand.id}`}
                      visible={visible.hands[hand.id] ?? 0}
                      leaving={collecting}
                      bet={hand.bet}
                      active={active}
                      dimmed={game.hands.length > 1 && game.phase === "player" && !active}
                      label={game.hands.length > 1 ? labelForHand(game, hand) : undefined}
                      standing={hand.stood && game.phase === "player"}
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
              <BetSpot
                bet={game.pendingBet}
                denominations={CHIP_DENOMINATIONS}
                anchorRef={betAnchor}
              />
            )}
          </div>
        </div>
      </TableCamera>
    </div>
  );
}

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
        <span className="h-px flex-1 bg-accent-2/25" />
        <span className="font-mono text-[clamp(0.56rem,2.4vw,0.66rem)] tracking-[0.22em] whitespace-nowrap text-accent-2/85 uppercase">
          {payout}
        </span>
        <span className="h-px flex-1 bg-accent-2/25" />
      </div>
      <span className="label text-fg-3">
        Dealer {rules.dealerHitsSoft17 ? "hits" : "stands on"} soft 17
      </span>
    </div>
  );
}

/**
 * The betting circle, and the target a dragged chip is aimed at.
 *
 * It is deliberately large on a phone. It is the only thing to press on this
 * screen, and a small circle left it floating in the middle of a lot of empty
 * felt with nothing drawing the eye to it.
 */
function BetSpot({
  bet,
  denominations,
  anchorRef,
}: {
  bet: number;
  denominations: number[];
  anchorRef: (element: HTMLElement | null) => void;
}) {
  const { dragging, over } = useChipDrag();
  const isOver = over === "bet";
  const stack = bet > 0 ? chipBreakdown(bet, denominations) : [];

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        ref={anchorRef}
        {...{ [CHIP_DROP_ATTRIBUTE]: "bet" }}
        animate={{
          scale: isOver ? 1.08 : 1,
          borderColor: isOver
            ? "rgba(201,167,94,0.95)"
            : dragging
              ? "rgba(201,167,94,0.6)"
              : "rgba(201,167,94,0.35)",
        }}
        transition={SPRING.ui}
        className="relative grid h-[clamp(6.5rem,28vw,8rem)] w-[clamp(6.5rem,28vw,8rem)] place-items-center rounded-full border border-dashed"
        style={{
          boxShadow: isOver ? "0 0 0 8px rgba(201,167,94,0.10)" : "none",
        }}
      >
        {/* The chips actually wagered, stacked in the circle. They arrive from
            the rail, so the stack that builds here is the same clay that just
            crossed the felt rather than a fresh one appearing. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center [--chip-w:2.6rem]">
          <AnimatePresence>
            {stack.slice(0, 6).map((value, index) => (
              <motion.span
                key={`${value}-${index}`}
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, y: index * -4, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING.wobble}
                className="absolute"
              >
                <ChipFace value={value} />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {bet > 0 ? (
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: DURATION.tooltip }}
            className="tabular absolute -bottom-7 text-[15px] font-medium text-fg"
          >
            {formatMoney(bet)}
          </motion.span>
        ) : (
          <span className="label text-fg-3">Bet</span>
        )}
      </motion.div>

      <span className="label text-fg-3">
        {dragging ? "Drop to add" : "Tap or drag a chip"}
      </span>
    </div>
  );
}
