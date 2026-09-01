"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/types";
import { PokerPlayer, PokerState } from "@/lib/games/poker/types";
import type { PokerReveal } from "@/lib/store/poker-session";
import { CardRow } from "@/components/game/blackjack/HandDisplay";
import { CardBackTile, PlayingCard } from "@/components/cards/PlayingCard";
import { evaluateHand } from "@/lib/games/poker/evaluator";
import { buildPots } from "@/lib/games/poker/engine";
import { ChipFace, chipBreakdown } from "@/components/chips/Chip";
import { POKER_CHIPS } from "@/lib/store/poker-session";
import { formatMoney } from "@/lib/utils/format";
import { Counter } from "@/components/ui/Counter";
import { DealerActivity, DiscardTray, Shoe } from "@/components/game/table/DealerStation";
import { Dealer } from "@/components/game/table/Dealer";
import { TableCamera, type CameraFocus } from "@/components/game/table/TableCamera";
import { WinBurst } from "@/components/game/table/WinBurst";
import { PlayerAvatar } from "@/components/game/table/PlayerAvatar";
import { TurnRing } from "@/components/game/table/TurnRing";
import { useTableAnchor } from "@/lib/motion/table-space";
import { DURATION, EASE, SPRING } from "@/lib/motion/tokens";
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

/** Where the camera looks, given where the hand has got to. */
function focusFor(state: PokerState, humanTurn: boolean): CameraFocus {
  if (state.street === "complete") return "result";
  if (state.street === "showdown") return "centre";
  if (state.players.some((player) => player.allIn)) return "centre";
  if (state.street === "river") return "centre";
  if (humanTurn) return "player";
  return "wide";
}

function Seat({
  player,
  state,
  isTurn,
  isButton,
  reveal,
  winners,
  handName,
  thinking,
}: {
  player: PokerPlayer;
  state: PokerState;
  isTurn: boolean;
  isButton: boolean;
  reveal: PokerReveal;
  winners: Set<string>;
  handName?: string;
  /** Set only while this seat is actually deciding, and only for opponents. */
  thinking?: { startedAt: number; endsAt: number };
}) {
  const action = lastActionFor(state, player.id);
  const anchor = useTableAnchor(`seat:${player.id}`);
  const dealt = reveal.hole[player.id] ?? 0;
  const shown = player.revealed && reveal.shown.includes(player.id);
  const won = winners.has(player.id);

  return (
    <motion.div
      ref={anchor}
      className={cn(
        "relative flex min-w-0 flex-col items-center gap-2 border px-1.5 py-2.5 sm:px-3 sm:py-3",
        isTurn
          ? "border-[rgba(201,167,94,0.7)]"
          : won
            ? "border-positive/60"
            : "border-[rgba(236,229,216,0.14)]",
      )}
      animate={{
        opacity: player.folded ? 0.4 : 1,
        backgroundColor: isTurn
          ? "rgba(201,167,94,0.07)"
          : won
            ? "rgba(127,177,149,0.08)"
            : "rgba(201,167,94,0)",
      }}
      transition={{ duration: DURATION.turn, ease: EASE.arrive }}
    >
      {/* The seat with the decision breathes. It is the only thing on the table
          that is allowed to, which is what makes it findable at a glance. */}
      <AnimatePresence>
        {isTurn ? (
          <motion.span
            key="turn-glow"
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 2.6, repeat: Infinity, ease: EASE.drift } }}
            style={{
              background:
                "radial-gradient(closest-side, rgba(201,167,94,0.16), rgba(201,167,94,0) 76%)",
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* The person in the seat. They breathe, they glance up, and when they
          fold they sit back — and that is the whole of it, because an avatar
          that moves as much as the dealer does competes with the cards. */}
      <div className="relative w-[clamp(2.5rem,7vw,3.4rem)]">
        <PlayerAvatar
          seed={player.id}
          mood={
            player.folded
              ? "folded"
              : winners.has(player.id)
                ? "won"
                : isTurn
                  ? "thinking"
                  : "idle"
          }
        />
        {/* The clock, drawn only where there is a real one: these opponents
            take a genuine amount of time to decide, and this is it. */}
        {thinking ? (
          <TurnRing
            key={thinking.endsAt}
            startedAt={thinking.startedAt}
            endsAt={thinking.endsAt}
            className="scale-[1.5]"
          />
        ) : null}
      </div>

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

      <div className="relative [--card-w:clamp(1.7rem,4.6vw,2.4rem)]">
        {won ? <WinBurst active seed={player.id} count={12} /> : null}
        {shown ? (
          <CardRow cards={player.hole} origin={`seat:${player.id}`} short square />
        ) : player.folded ? (
          /* Folding is a push, not a deletion: the cards go towards the muck
             and the seat is left empty behind them. */
          <motion.div
            className="h-[calc(clamp(1.7rem,4.6vw,2.4rem)*1.4)]"
            initial={{ opacity: 0.7, y: 0 }}
            animate={{ opacity: 0, y: -14 }}
            transition={{ duration: DURATION.deal, ease: EASE.leave }}
          >
            <CardRow cards={player.hole} faceDownFrom={0} square />
          </motion.div>
        ) : dealt > 0 ? (
          <CardRow
            cards={player.hole}
            visible={dealt}
            faceDownFrom={0}
            square
          />
        ) : (
          <div className="h-[calc(clamp(1.7rem,4.6vw,2.4rem)*1.4)]" />
        )}
      </div>

      <Counter
        value={player.stack}
        format={formatMoney}
        delay={0.2}
        className="text-[12.5px] text-[rgba(236,229,216,0.92)]"
      />

      {/* What they just did, said beside them rather than only in the log. */}
      <div className="flex min-h-[1.1rem] items-center">
        <AnimatePresence mode="wait">
          {player.allIn || action ? (
            <motion.span
              key={player.allIn ? "all-in" : (action ?? "")}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION.turn, ease: EASE.arrive }}
              className="font-mono text-[9px] tracking-[0.12em] whitespace-nowrap text-[rgba(201,167,94,0.85)] uppercase"
            >
              {player.allIn ? "All in" : action}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {player.committed > 0 ? (
        <span className="tabular border border-[rgba(236,229,216,0.2)] px-1.5 py-[2px] text-[11px] text-[rgba(236,229,216,0.75)]">
          {formatMoney(player.committed)}
        </span>
      ) : null}

      <AnimatePresence>
        {handName ? (
          <motion.span
            key={handName}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING.ui}
            className="border border-positive/60 px-1.5 py-[2px] font-mono text-[8.5px] tracking-[0.12em] whitespace-nowrap text-positive uppercase"
          >
            {handName}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * The pot, as clay.
 *
 * A number in the middle of the felt tells you the size of the pot. A pile of
 * chips tells you there is a pot, which is the thing you register without
 * reading. And when someone is all in for less than a full bet the engine
 * splits the money into a main pot and side pots — so the pile splits too,
 * because "you can only win part of that" is a fact about the table that ought
 * to be visible on the table.
 */
function PotStack({ state, shown }: { state: PokerState; shown: number }) {
  const pots = buildPots(state.players);
  /* `shown` lags the engine while the chips are still crossing the felt, so the
     pile is scaled to what has actually landed rather than to what is owed. */
  const engineTotal = pots.reduce((sum, pot) => sum + pot.amount, 0);
  const ratio = engineTotal > 0 ? Math.min(1, shown / engineTotal) : 0;

  /**
   * The engine splits the pot at every level anyone has invested to, which
   * happens on the blinds alone. That is the right way to *settle* a pot and
   * the wrong way to *show* one: to a player there is only a side pot when
   * somebody is all in for less than the bet, and nobody wants to see the small
   * blind called a main pot. So the piles are only separated once a short all
   * in has actually made one of them unwinnable by someone.
   */
  const shortAllIn = state.players.some(
    (player) =>
      player.allIn &&
      !player.folded &&
      state.players.some((other) => !other.folded && other.invested > player.invested),
  );

  const amounts = shortAllIn
    ? pots.map((pot) => pot.amount)
    : [pots.reduce((sum, pot) => sum + pot.amount, 0)];
  const visible = amounts
    .map((amount) => Math.round(amount * ratio))
    .filter((amount) => amount > 0);

  if (visible.length === 0) return <div className="h-6" />;

  return (
    <div className="flex min-h-[2.9rem] items-end justify-center gap-4 [--chip-w:1.55rem]">
      {visible.map((amount, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <Pile amount={amount} />
          {visible.length > 1 ? (
            <span className="font-mono text-[7.5px] tracking-[0.14em] text-[rgba(236,229,216,0.38)] uppercase">
              {index === 0 ? "Main" : `Side ${index}`}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Chips of a value stack up; past five they start a new stack beside it. */
const STACK_HEIGHT = 5;

function Pile({ amount }: { amount: number }) {
  const chips = chipBreakdown(amount, POKER_CHIPS);
  const stacks: number[][] = [];
  for (const value of chips) {
    const last = stacks[stacks.length - 1];
    /* Chips of one value go on one another; a different value starts its own
       stack, which is how a real pot sorts itself as it is pushed together. */
    if (last && last[0] === value && last.length < STACK_HEIGHT) last.push(value);
    else stacks.push([value]);
  }

  return (
    <div className="flex items-end gap-[3px]">
      {stacks.map((stack, column) => (
        <span
          key={column}
          className="relative block"
          style={{
            width: "var(--chip-w)",
            height: `calc(var(--chip-w) + ${(stack.length - 1) * 3.5}px)`,
          }}
        >
          {stack.map((value, row) => (
            <motion.span
              /* Keyed by what the chip is rather than where it sits, so a pot
                 that grows keeps the clay already in it and only drops the new
                 chips in. When the composition genuinely changes — four
                 hundreds becoming a thousand — the pile re-forms, which is what
                 a dealer sizing up a pot actually does. */
              key={`${value}:${row}`}
              className="absolute left-0"
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.16,
                ease: EASE.arriveShort,
                delay: Math.min(0.16, (column * STACK_HEIGHT + row) * 0.016),
              }}
              style={{ bottom: row * 3.5 }}
            >
              <ChipFace value={value} />
            </motion.span>
          ))}
        </span>
      ))}
    </div>
  );
}

/**
 * The burn.
 *
 * Before every street a card comes off the top of the deck and goes face down
 * into the muck. Nobody ever sees it, which is exactly why it has to be shown:
 * it is the beat that tells you a new card is coming.
 */
function BurnCard({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;
  /* Keyed on the burn, so each one is a fresh card rather than the same
     element being sent round the table again. */
  return <BurnRun key={trigger} trigger={trigger} />;
}

function BurnRun({ trigger }: { trigger: number }) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const away = window.setTimeout(() => setPhase("out"), 240);
    const gone = window.setTimeout(() => setPhase("gone"), 900);
    return () => {
      window.clearTimeout(away);
      window.clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;

  const card: Card = { rank: "2", suit: "spades", id: `burn-${trigger}` };

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center [--card-w:clamp(2rem,5vw,2.6rem)]">
      <PlayingCard
        card={card}
        faceDown
        origin="shoe"
        leaving={phase === "out"}
        leaveTo="discard"
        delay={0}
        short
        square
      />
    </div>
  );
}

export function PokerTable({
  state,
  reveal,
  potShown,
  thinking,
}: {
  state: PokerState;
  reveal: PokerReveal;
  /** The pot as the table shows it, which lags the chips crossing the felt. */
  potShown: number;
  /** The opponent currently deciding, and how long they have. */
  thinking?: { playerId: string; startedAt: number; endsAt: number } | null;
}) {
  const human = state.players.find((player) => player.isHuman)!;
  const opponents = state.players.filter((player) => !player.isHuman);
  const potAnchor = useTableAnchor("pot");
  const humanSeat = useTableAnchor(`seat:${human.id}`);
  const humanTurn =
    state.players[state.toActIndex]?.isHuman && state.street !== "complete";

  const humanDealt = reveal.hole[human.id] ?? 0;
  const made =
    reveal.faceUp >= 3 && human.hole.length === 2
      ? evaluateHand([...human.hole, ...state.board.slice(0, reveal.faceUp)])
      : null;

  const winners = new Set(
    (state.showdown?.awards ?? []).flatMap((award) => award.winners),
  );
  const handNames = new Map(
    (state.showdown?.hands ?? []).map((entry) => [entry.playerId, entry.value.description]),
  );

  const deckSize = state.deck.length || 1;
  /* A table nobody has dealt at yet has not had a hand end on it, so the fresh
     table says nothing rather than announcing that the hand is over. */
  const street =
    state.handNumber === 0 && state.street === "complete" ? "" : STREET_LABEL[state.street];

  return (
    <div className="felt relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 border border-[rgba(201,167,94,0.14)] sm:inset-4"
      />

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

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 font-mono text-[9px] tracking-[0.18em] text-[rgba(236,229,216,0.34)] uppercase sm:px-9 sm:py-6">
        <span>Hand {String(state.handNumber).padStart(2, "0")}</span>
        <span>
          Blinds {formatMoney(state.smallBlind)} / {formatMoney(state.bigBlind)}
        </span>
      </div>

      {/* The dealer's furniture, tucked into the top corners so it does not
          compete with the seats but is visibly the source of every card. */}
      <div className="pointer-events-none absolute inset-x-0 top-9 z-10 flex items-start justify-between px-4 sm:top-12 sm:px-8 [--card-w:clamp(1.4rem,3.8vw,1.9rem)]">
        <DiscardTray fill={state.deckPosition / deckSize} />
        <Shoe fill={(deckSize - state.deckPosition) / deckSize} />
      </div>

      <TableCamera focus={focusFor(state, Boolean(humanTurn))}>
        <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-y-auto px-3 py-10 sm:px-8 sm:py-12">
          <div className="grid shrink-0 grid-cols-3 gap-2 pt-6 sm:gap-4 sm:pt-8">
            {opponents.map((player) => (
              <Seat
                key={player.id}
                player={player}
                state={state}
                reveal={reveal}
                winners={winners}
                handName={
                  winners.has(player.id) ? handNames.get(player.id) : undefined
                }
                isTurn={
                  state.players[state.toActIndex]?.id === player.id &&
                  state.street !== "complete"
                }
                isButton={state.players[state.buttonIndex]?.id === player.id}
                thinking={thinking?.playerId === player.id ? thinking : undefined}
              />
            ))}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-4 py-2">
            {/* The dealer stands at the top of the table with the board laid
                out in front of them, which is both where a dealer is and the
                thing that makes the burn and the flop read as one gesture. */}
            <Dealer className="-mb-1 w-[clamp(5rem,17vw,7.5rem)]" />

            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-[rgba(201,167,94,0.25)]" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={street}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: DURATION.turn, ease: EASE.arrive }}
                  className="font-mono text-[9px] tracking-[0.24em] text-[rgba(236,229,216,0.42)] uppercase"
                >
                  {street}
                </motion.span>
              </AnimatePresence>
              <span className="h-px w-8 bg-[rgba(201,167,94,0.25)]" />
            </div>

            {/* The board. Cards travel from the shoe face down, settle, and are
                then turned, which is the order it happens at a table and the
                reason the turn and the river are worth waiting for. */}
            <div className="relative flex min-h-[calc(clamp(2.6rem,8vw,3.9rem)*1.4)] items-center [--card-w:clamp(2.6rem,8vw,3.9rem)]">
              <BurnCard trigger={reveal.burn} />
              {reveal.board > 0 ? (
                <div className="flex gap-1 sm:gap-1.5">
                  {state.board.slice(0, reveal.board).map((card, index) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      index={index}
                      delay={0}
                      origin="shoe"
                      short
                      square
                      faceDown={index >= reveal.faceUp}
                    />
                  ))}
                </div>
              ) : (
                <span className="font-mono text-[9.5px] tracking-[0.2em] text-[rgba(236,229,216,0.22)] uppercase">
                  No community cards yet
                </span>
              )}
            </div>

            <div ref={potAnchor} className="flex flex-col items-center gap-1.5 px-4 py-1">
              <PotStack state={state} shown={potShown} />
              <span className="font-mono text-[9px] tracking-[0.22em] text-[rgba(236,229,216,0.42)] uppercase">
                Pot
              </span>
              {/* The figure follows the clay. Chips land, then this catches up. */}
              <Counter
                value={potShown}
                format={formatMoney}
                className="text-[19px] text-[rgba(236,229,216,0.95)]"
              />
            </div>

            <DealerActivity />

            {state.message ? (
              <AnimatePresence mode="wait">
                <motion.p
                  key={state.message}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: DURATION.turn, ease: EASE.arrive }}
                  className="display max-w-md text-center text-[clamp(0.95rem,2.4vw,1.2rem)] text-[rgba(236,229,216,0.82)] italic"
                >
                  {state.message}
                </motion.p>
              </AnimatePresence>
            ) : null}
          </div>

          <div className="flex shrink-0 items-end justify-center gap-6">
            <div ref={humanSeat} className="relative flex flex-col items-center gap-2.5">
              {winners.has(human.id) ? <WinBurst active seed={human.id} /> : null}

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-[0.22em] uppercase transition-colors",
                    humanTurn ? "text-[rgba(201,167,94,0.95)]" : "text-[rgba(236,229,216,0.42)]",
                  )}
                >
                  You
                  {state.players[state.buttonIndex]?.isHuman ? " (dealer)" : ""}
                </span>
                <AnimatePresence>
                  {humanTurn ? (
                    <motion.span
                      key="your-turn"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={SPRING.ui}
                      className="border border-accent-2/70 px-1.5 py-[2px] font-mono text-[8.5px] tracking-[0.16em] text-accent-2 uppercase"
                    >
                      Your turn
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="[--card-w:clamp(3rem,9.5vw,4.6rem)]">
                {humanDealt > 0 ? (
                  <CardRow cards={human.hole} visible={humanDealt} interactive />
                ) : (
                  <div className="flex opacity-25">
                    <CardBackTile />
                    <CardBackTile style={{ marginLeft: "calc(var(--card-w) * -0.34)" }} />
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {made ? (
                  <motion.span
                    key={made.description}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: DURATION.turn, ease: EASE.arrive }}
                    className={cn(
                      "border px-2 py-[3px] font-mono text-[9.5px] tracking-[0.1em] uppercase",
                      winners.has(human.id)
                        ? "border-positive/70 text-positive"
                        : "border-[rgba(236,229,216,0.22)] text-[rgba(236,229,216,0.82)]",
                    )}
                  >
                    {made.description}
                  </motion.span>
                ) : null}
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <Counter
                  value={human.stack}
                  format={formatMoney}
                  delay={0.2}
                  className="text-[13px] text-[rgba(236,229,216,0.92)]"
                />
                {human.committed > 0 ? (
                  <span className="tabular border border-[rgba(236,229,216,0.2)] px-1.5 py-[2px] text-[11px] text-[rgba(236,229,216,0.75)]">
                    {formatMoney(human.committed)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </TableCamera>
    </div>
  );
}
