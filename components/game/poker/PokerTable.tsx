"use client";

import { motion } from "framer-motion";
import { PokerPlayer, PokerState } from "@/lib/games/poker/types";
import { CardRow } from "@/components/game/blackjack/HandDisplay";
import { CardBackTile } from "@/components/cards/PlayingCard";
import { evaluateHand } from "@/lib/games/poker/evaluator";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STREET_LABEL: Record<string, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  complete: "Hand over",
};

function lastActionFor(state: PokerState, playerId: string): string | null {
  const relevant = [...state.history]
    .reverse()
    .find((entry) => entry.playerId === playerId && entry.street === state.street);
  if (!relevant) return null;
  switch (relevant.type) {
    case "fold": return "Fold";
    case "check": return "Check";
    case "call": return `Call ${formatMoney(relevant.amount)}`;
    case "bet": return `Bet ${formatMoney(relevant.to)}`;
    case "raise": return `Raise to ${formatMoney(relevant.to)}`;
    case "all-in": return "All in";
  }
}

function Seat({
  player,
  state,
  isTurn,
  isButton,
}: {
  player: PokerPlayer;
  state: PokerState;
  isTurn: boolean;
  isButton: boolean;
}) {
  const action = lastActionFor(state, player.id);
  const showCards = player.revealed && player.hole.length > 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 border px-1.5 py-2.5 transition-colors duration-200 sm:px-3 sm:py-3",
        isTurn
          ? "border-[rgba(201,167,94,0.7)] bg-[rgba(201,167,94,0.07)]"
          : "border-[rgba(236,229,216,0.14)]",
        player.folded && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="truncate font-mono text-[10px] tracking-[0.14em] text-[rgba(236,229,216,0.8)] uppercase">
          {player.name}
        </span>
        {isButton ? (
          <span
            aria-label="Dealer button"
            className="grid h-4 w-4 place-items-center rounded-full border border-[rgba(236,229,216,0.5)] font-mono text-[8px] text-[rgba(236,229,216,0.8)]"
          >
            D
          </span>
        ) : null}
      </div>

      <div className="[--card-w:clamp(1.7rem,4.6vw,2.4rem)]">
        {showCards ? (
          <CardRow cards={player.hole} />
        ) : player.folded ? (
          <div className="h-[calc(clamp(1.7rem,4.6vw,2.4rem)*1.4)]" />
        ) : (
          <div className="flex">
            <CardBackTile />
            <CardBackTile style={{ marginLeft: "calc(var(--card-w) * -0.34)" }} />
          </div>
        )}
      </div>

      <span className="tabular text-[12.5px] text-[rgba(236,229,216,0.92)]">
        {formatMoney(player.stack)}
      </span>

      <span className="flex min-h-[1.1rem] items-center font-mono text-[9px] tracking-[0.12em] text-[rgba(201,167,94,0.85)] uppercase">
        {player.allIn ? "All in" : (action ?? "")}
      </span>

      {player.committed > 0 ? (
        <span className="tabular border border-[rgba(236,229,216,0.2)] px-1.5 py-[2px] text-[11px] text-[rgba(236,229,216,0.75)]">
          {formatMoney(player.committed)}
        </span>
      ) : null}
    </div>
  );
}

export function PokerTable({ state }: { state: PokerState }) {
  const human = state.players.find((player) => player.isHuman)!;
  const opponents = state.players.filter((player) => !player.isHuman);
  const made =
    state.board.length >= 3 && human.hole.length === 2
      ? evaluateHand([...human.hole, ...state.board])
      : null;

  return (
    <div className="felt relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 border border-[rgba(201,167,94,0.14)] sm:inset-4"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 font-mono text-[9px] tracking-[0.18em] text-[rgba(236,229,216,0.34)] uppercase sm:px-9 sm:py-6">
        <span>Hand {String(state.handNumber).padStart(2, "0")}</span>
        <span>
          Blinds {formatMoney(state.smallBlind)} / {formatMoney(state.bigBlind)}
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-y-auto px-3 py-10 sm:px-8 sm:py-12">
        <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-4">
          {opponents.map((player) => (
            <Seat
              key={player.id}
              player={player}
              state={state}
              isTurn={
                state.players[state.toActIndex]?.id === player.id &&
                state.street !== "complete"
              }
              isButton={state.players[state.buttonIndex]?.id === player.id}
            />
          ))}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 py-2">
          <div className="flex items-center gap-4">
            <span className="h-px w-8 bg-[rgba(201,167,94,0.25)]" />
            <span className="font-mono text-[9px] tracking-[0.24em] text-[rgba(236,229,216,0.42)] uppercase">
              {STREET_LABEL[state.street]}
            </span>
            <span className="h-px w-8 bg-[rgba(201,167,94,0.25)]" />
          </div>

          <div className="flex min-h-[calc(clamp(2.6rem,8vw,3.9rem)*1.4)] items-center [--card-w:clamp(2.6rem,8vw,3.9rem)]">
            {state.board.length > 0 ? (
              <div className="flex gap-1 sm:gap-1.5">
                {state.board.map((card) => (
                  <CardRow key={card.id} cards={[card]} />
                ))}
              </div>
            ) : (
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-[rgba(236,229,216,0.22)] uppercase">
                No community cards yet
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] tracking-[0.22em] text-[rgba(236,229,216,0.42)] uppercase">
              Pot
            </span>
            <motion.span
              key={state.pot}
              initial={{ opacity: 0.5, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              className="tabular text-[19px] text-[rgba(236,229,216,0.95)]"
            >
              {formatMoney(state.pot)}
            </motion.span>
          </div>

          {state.message ? (
            <p className="display max-w-md text-center text-[clamp(0.95rem,2.4vw,1.2rem)] text-[rgba(236,229,216,0.82)] italic">
              {state.message}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-end justify-center gap-6">
          <div className="flex flex-col items-center gap-2.5">
            <span
              className={cn(
                "font-mono text-[9px] tracking-[0.22em] uppercase",
                state.players[state.toActIndex]?.isHuman && state.street !== "complete"
                  ? "text-[rgba(201,167,94,0.95)]"
                  : "text-[rgba(236,229,216,0.42)]",
              )}
            >
              You
              {state.players[state.buttonIndex]?.isHuman ? " (dealer)" : ""}
            </span>

            <div className="[--card-w:clamp(3rem,9.5vw,4.6rem)]">
              {human.hole.length > 0 ? (
                <CardRow cards={human.hole} />
              ) : (
                <div className="h-[calc(clamp(3rem,9.5vw,4.6rem)*1.4)]" />
              )}
            </div>

            {made ? (
              <span className="border border-[rgba(236,229,216,0.22)] px-2 py-[3px] font-mono text-[9.5px] tracking-[0.1em] text-[rgba(236,229,216,0.82)] uppercase">
                {made.description}
              </span>
            ) : null}

            <div className="flex items-center gap-3">
              <span className="tabular text-[13px] text-[rgba(236,229,216,0.92)]">
                {formatMoney(human.stack)}
              </span>
              {human.committed > 0 ? (
                <span className="tabular border border-[rgba(236,229,216,0.2)] px-1.5 py-[2px] text-[11px] text-[rgba(236,229,216,0.75)]">
                  {formatMoney(human.committed)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
