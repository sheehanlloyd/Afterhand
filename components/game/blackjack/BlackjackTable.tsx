"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BlackjackState } from "@/lib/games/blackjack/types";
import { labelForHand } from "@/lib/games/blackjack/engine";
import { CardRow, PlayerHand, TotalPlate } from "./HandDisplay";
import { CHIP_DENOMINATIONS } from "./Rails";
import { cardsRemaining } from "@/lib/games/deck";

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

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(1.25rem,5vh,3rem)] overflow-y-auto px-4 py-10 sm:px-9 sm:py-12">
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

        {/* Dealer line */}
        <div className="flex min-h-[2.5rem] shrink-0 items-center px-4 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={game.dealerMessage + String(resultVisible)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24 }}
              className="display text-[clamp(1rem,2.6vw,1.35rem)] text-[rgba(236,229,216,0.82)] italic"
            >
              {game.dealerMessage}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Player */}
        <div className="flex w-full shrink-0 items-end justify-center gap-6 sm:gap-10">
          {dealing ? (
            game.hands.map((hand, index) => {
              const active =
                game.phase === "player" && index === game.activeHandIndex && !hand.resolved;
              return (
                <div
                  key={hand.id}
                  className="[--card-w:clamp(3.1rem,10vw,5.3rem)]"
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
            <BetSpot bet={game.pendingBet} />
          )}
        </div>
      </div>
    </div>
  );
}

function BetSpot({ bet }: { bet: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid h-[clamp(4rem,12vw,5.5rem)] w-[clamp(4rem,12vw,5.5rem)] place-items-center rounded-full border border-dashed border-[rgba(201,167,94,0.3)]">
        {bet > 0 ? (
          <motion.span
            key={bet}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="tabular text-[15px] text-[rgba(236,229,216,0.9)]"
          >
            ${bet}
          </motion.span>
        ) : (
          <span className="font-mono text-[8.5px] tracking-[0.16em] text-[rgba(236,229,216,0.28)] uppercase">
            Bet
          </span>
        )}
      </div>
      <span className="font-mono text-[9px] tracking-[0.22em] text-[rgba(236,229,216,0.4)] uppercase">
        Place your bet
      </span>
    </div>
  );
}
