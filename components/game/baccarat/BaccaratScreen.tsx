"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameMode } from "@/types";
import {
  BACCARAT_EDGE,
  BaccaratBet,
  BaccaratRound,
  DEFAULT_BACCARAT_RULES,
  createBaccaratShoe,
  dealRound,
  settleBet,
} from "@/lib/games/baccarat/engine";
import { Shoe, cardsRemaining } from "@/lib/games/deck";
import { usePreferences, usePreferenceState } from "@/lib/store/preferences";
import { loadBaccaratLearning, saveBaccaratLearning } from "@/lib/storage/learning-games";
import { GameFrame } from "@/components/game/GameFrame";
import { GameHeader } from "@/components/game/GameHeader";
import { RulesDrawer } from "@/components/game/RulesDrawer";
import { SiteShell } from "@/components/layout/SiteShell";
import { Placard, SimpleSetup } from "@/components/game/SimpleSetup";
import { CardRow } from "@/components/game/blackjack/HandDisplay";
import { BetRailLayout, RailFrame, CHIP_DENOMINATIONS } from "@/components/game/blackjack/Rails";
import { Chip } from "@/components/chips/Chip";
import {
  CHIP_DROP_ATTRIBUTE,
  ChipDragProvider,
  useChipDrag,
} from "@/components/chips/chip-drag";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Stat } from "@/components/ui/Stat";
import { Modal } from "@/components/ui/Modal";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { playSound, playSoundIn } from "@/lib/sound";
import { TableSpaceProvider, useTableAnchor, useTableSpace } from "@/lib/motion/table-space";
import { moveChips } from "@/lib/motion/chip-bus";
import { ChipFlightLayer } from "@/components/chips/ChipFlight";
import { DealerRail } from "@/components/game/table/DealerRail";
import { TableCamera } from "@/components/game/table/TableCamera";
import { useDealer } from "@/lib/store/dealer";
import { applyStep, revealSteps, type RevealCounts } from "@/lib/motion/deal-order";
import { DURATION, RHYTHM } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

const RULES = DEFAULT_BACCARAT_RULES;

const BET_INFO: Array<{ id: BaccaratBet; label: string; payout: string }> = [
  { id: "player", label: "Player", payout: "1 to 1" },
  { id: "banker", label: "Banker", payout: "1 to 1 less 5%" },
  { id: "tie", label: "Tie", payout: "8 to 1" },
];

/**
 * Player, Banker and Tie each keep one hue throughout the table — the bet
 * selector, the two hands, and the outcome badge — so the three read apart at
 * a glance rather than by the word printed on them.
 */
const SIDE_TONE: Record<BaccaratBet, { text: string; border: string; wash: string }> = {
  player: {
    text: "text-positive",
    border: "border-positive/70",
    wash: "bg-positive/10",
  },
  banker: {
    text: "text-negative",
    border: "border-negative/70",
    wash: "bg-negative/10",
  },
  tie: {
    text: "text-accent-2",
    border: "border-accent-2/70",
    wash: "bg-accent-2/10",
  },
};

interface RoundLog {
  number: number;
  outcome: BaccaratRound["outcome"];
  net: number;
}

/** The provider has to sit above the table so the zones can see the drag. */
export function BaccaratScreen() {
  return (
    <TableSpaceProvider>
      <ChipFlightLayer>
        <ChipDragProvider>
          <BaccaratTable />
        </ChipDragProvider>
      </ChipFlightLayer>
    </TableSpaceProvider>
  );
}

function BaccaratTable() {
  const { dragging, over } = useChipDrag();
  const { preferences, hydrated, update } = usePreferences();
  const [status, setStatus] = useState<"setup" | "playing" | "summary">("setup");
  const [mode, setMode] = usePreferenceState((saved) => saved.preferredMode);
  const [bankroll, setBankroll] = useState(0);
  const [starting, setStarting] = useState(0);
  const [bet, setBet] = useState<BaccaratBet>("banker");
  const [amount, setAmount] = useState(0);
  const [shoe, setShoe] = useState<Shoe | null>(null);
  const [round, setRound] = useState<BaccaratRound | null>(null);
  const [net, setNet] = useState(0);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [revealing, setRevealing] = useState(false);
  const railAnchor = useTableAnchor("rail");
  const { register } = useTableSpace();
  /**
   * Cards physically on the felt, per side.
   *
   * Baccarat resolves the whole coup in one call, third cards included. Dealing
   * it out player, banker, player, banker is what makes the drawing rules
   * legible: you can see the third card being decided on rather than simply
   * being there.
   */
  const [shown, setShown] = useState<{ player: number; banker: number }>({
    player: 0,
    banker: 0,
  });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = useCallback(
    (config: { bankroll: number; mode: GameMode }) => {
      setBankroll(config.bankroll);
      setStarting(config.bankroll);
      setMode(config.mode);
      setShoe(createBaccaratShoe(RULES));
      setStatus("playing");
      setRound(null);
      setLog([]);
      setAmount(0);
      update({ preferredMode: config.mode, preferredGame: "baccarat" });
    },
    [update, setMode],
  );

  function deal() {
    if (!shoe || amount < RULES.minBet || amount > bankroll || revealing) return;
    const result = dealRound(shoe);
    setShoe(result.shoe);
    setRound(result.round);
    setRevealing(true);
    setShown({ player: 0, banker: 0 });
    setBankroll((current) => current - amount);
    useDealer.getState().enter("dealing");

    /* Round the table twice, then any third cards, on the dealer's rhythm. */
    const target = {
      dealer: 0,
      hands: {
        player: result.round.playerCards.length,
        banker: result.round.bankerCards.length,
      },
    };
    let counts: RevealCounts = { dealer: 0, hands: { player: 0, banker: 0 } };
    let at = 0;
    for (const step of revealSteps(counts, target, ["player", "banker"])) {
      counts = applyStep(counts, step);
      const snapshot = {
        player: counts.hands.player ?? 0,
        banker: counts.hands.banker ?? 0,
      };
      timers.current.push(
        setTimeout(() => {
          setShown({ ...snapshot });
          playSound("deal");
          playSoundIn("land", Math.round(DURATION.deal * 780));
        }, at),
      );
      at += RHYTHM.betweenCards;
    }
    const landed = at - RHYTHM.betweenCards + DURATION.deal * 1000;

    const settlement = settleBet(bet, amount, result.round, RULES);
    timers.current.push(
      setTimeout(() => {
        useDealer.getState().enter("idle");
        setBankroll((current) => current + settlement.returned);
        setNet(settlement.net);
        setRevealing(false);
        playSound(settlement.net > 0 ? "win" : settlement.net < 0 ? "lose" : "click");
        setLog((current) => [
          { number: current.length + 1, outcome: result.round.outcome, net: settlement.net },
          ...current,
        ].slice(0, 40));
        if (mode === "learn") {
          const base = loadBaccaratLearning();
          saveBaccaratLearning({
            ...base,
            handsPlayed: base.handsPlayed + 1,
            bets: { ...base.bets, [bet]: base.bets[bet] + 1 },
            updatedAt: Date.now(),
          });
        }
      }, landed + 320),
    );
  }

  /**
   * Putting a chip on a zone.
   *
   * The clay leaves the tray, crosses the felt and lands on the zone, and only
   * then does the staked figure change. Tapping and dragging end in the same
   * place, which is the point: the drag is how you do it at a table and the tap
   * is how you do it quickly.
   */
  function placeChip(value: number, target: BaccaratBet) {
    moveChips({
      from: "rail",
      to: `bet:${target}`,
      amount: value,
      denominations: CHIP_DENOMINATIONS,
      onArrive: () =>
        setAmount((current) => Math.min(current + value, Math.min(RULES.maxBet, bankroll))),
    });
  }

  function nextHand() {
    setRound(null);
    setNet(0);
    setShown({ player: 0, banker: 0 });
    if (bankroll < RULES.minBet) {
      setStatus("summary");
    }
  }

  if (status === "setup") {
    return (
      <SiteShell>
        <SimpleSetup
          /* The setup seeds its fields from these props once, on mount. The
             stored preferences only arrive after that first render, so the form
             is rebuilt the moment they land and picks them up as its starting
             values. Before then it is showing the same defaults the server
             rendered, so nothing the reader has touched is thrown away. */
          key={hydrated ? "saved" : "defaults"}
          eyebrow="Baccarat"
          title="Start a session"
          intro="Three bets, no decisions after the deal, and the clearest house edge comparison on the site."
          initialBankroll={preferences.preferredBankroll}
          initialMode={preferences.preferredMode}
          learnCopy="After each hand, Afterhand explains which drawing rule fired and what the bet you chose actually costs over time."
          playCopy="Cards and outcomes only. You can still open the explanation from the table."
          placard={
            <Placard
              title="Baccarat"
              lines={[
                ["Decks", String(RULES.decks)],
                ["Player", "Pays 1 to 1"],
                ["Banker", "Pays 1 to 1 less 5%"],
                ["Tie", `Pays ${RULES.tiePayout} to 1`],
                ["Limits", `${formatMoney(RULES.minBet)} to ${formatMoney(RULES.maxBet)}`],
              ]}
            />
          }
          onStart={start}
        />
      </SiteShell>
    );
  }

  if (status === "summary") {
    const change = bankroll - starting;
    return (
      <SiteShell contained={false}>
        <div className="mx-auto w-full max-w-[var(--shell-max)] px-5 py-14 sm:px-8 sm:py-20">
          <span className="label">Baccarat</span>
          <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">
            Session complete
          </h1>
          <hr className="rule-double mt-9" />
          <div className="mt-9 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat label="Starting bankroll" value={formatMoney(starting)} />
            <Stat label="Ending bankroll" value={formatMoney(bankroll)} />
            <Stat
              label="Net result"
              value={`${change > 0 ? "+" : ""}${formatMoney(change)}`}
              tone={change > 0 ? "good" : change < 0 ? "bad" : "neutral"}
            />
            <Stat label="Hands played" value={log.length} />
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" plate onClick={() => setStatus("setup")}>
              New session
            </Button>
            <LinkButton href="/games/baccarat/rules" variant="secondary" size="lg" plate>
              Baccarat rules
            </LinkButton>
            <LinkButton href="/" variant="ghost" size="lg" plate>
              Return home
            </LinkButton>
          </div>
        </div>
      </SiteShell>
    );
  }

  const settled = round !== null && !revealing;
  const decksLeft = shoe ? cardsRemaining(shoe) / 52 : 0;
  /* How far into the shoe the table is, which drives the two card blocks. */
  const shoeUsed = shoe && shoe.cards.length > 0 ? shoe.position / shoe.cards.length : 0;

  return (
    <GameFrame
      header={
        <GameHeader
          game="Baccarat"
          mode={mode === "learn" ? "Learn" : "Play"}
          bankroll={bankroll}
          soundEnabled={preferences.soundEnabled}
          onToggleSound={() => update({ soundEnabled: !preferences.soundEnabled })}
          detail={
            <div className="text-right">
              <div className="label leading-none">Session</div>
              <div
                className={cn(
                  "tabular mt-1 text-[13px] leading-none",
                  bankroll - starting > 0
                    ? "text-positive"
                    : bankroll - starting < 0
                      ? "text-negative"
                      : "text-fg-2",
                )}
              >
                {bankroll - starting > 0 ? "+" : ""}
                {formatMoney(bankroll - starting)}
              </div>
            </div>
          }
          menu={[
            { label: "Rules", onSelect: () => setRulesOpen(true) },
            { label: "Settings", href: "/settings" },
            {
              label: "End session",
              tone: "danger",
              onSelect: () => (log.length > 0 ? setConfirmExit(true) : setStatus("setup")),
            },
          ]}
        />
      }
      rail={
        round === null ? (
          <BetRailLayout
            value={
              <>
                <span className="label">Bet on {bet}</span>
                <span className="tabular mt-1 text-[19px] leading-none">
                  {formatMoney(amount)}
                </span>
              </>
            }
            chips={
              <div
                ref={railAnchor}
                className="flex flex-wrap justify-center gap-2.5 [--chip-w:2.9rem] sm:gap-2.5 sm:[--chip-w:3rem]"
              >
                {CHIP_DENOMINATIONS.filter((value) => value <= RULES.maxBet).map((value) => (
                  <Chip
                    key={value}
                    value={value}
                    draggable={round === null}
                    onClick={() => placeChip(value, bet)}
                    /* Dropping a chip on a zone picks that side and stakes it,
                       which is the one gesture rather than the usual two. */
                    onDrop={(target) => {
                      const zone =
                        target === "player" || target === "banker" || target === "tie"
                          ? target
                          : bet;
                      if (zone !== bet) setBet(zone);
                      placeChip(value, zone);
                    }}
                    disabled={amount + value > Math.min(RULES.maxBet, bankroll)}
                  />
                ))}
              </div>
            }
            controls={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  plate
                  onClick={() => setAmount(0)}
                  disabled={amount === 0}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  plate
                  onClick={deal}
                  disabled={amount < RULES.minBet || amount > bankroll}
                >
                  Deal
                </Button>
              </>
            }
            footnote={`Table ${formatMoney(RULES.minBet)} to ${formatMoney(RULES.maxBet)}`}
          />
        ) : settled ? (
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
            <div className="flex flex-1 justify-end">
              <Button variant="primary" size="lg" plate onClick={nextHand}>
                {bankroll < RULES.minBet ? "Session summary" : "Next hand"}
              </Button>
            </div>
          </RailFrame>
        ) : (
          <div className="flex h-[68px] items-center justify-center font-mono text-[10px] tracking-[0.18em] text-fg-3 uppercase">
            Dealing
          </div>
        )
      }
    >
      <div className="felt relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 border border-[rgba(201,167,94,0.14)] sm:inset-4"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3 font-mono text-[10px] tracking-[0.16em] text-fg-3 uppercase sm:px-9 sm:py-4">
          <span>Hand {String(log.length + (round ? 1 : 0)).padStart(2, "0")}</span>
          <span>{decksLeft.toFixed(1)} decks in shoe</span>
        </div>

        {/* The dealer's presence is the equipment: the shoe, the tray, and a
            small marker — never a figure. */}
        <div className="relative z-10 flex justify-center pt-9 pb-2 sm:pt-12 [--card-w:clamp(1.4rem,3.8vw,1.9rem)]">
          <DealerRail shoeFill={1 - shoeUsed} trayFill={shoeUsed} />
        </div>

        <TableCamera focus={revealing ? "dealer" : settled ? "result" : "wide"}>
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-6 sm:px-9">
          <div className="grid w-full max-w-2xl grid-cols-2 gap-6 sm:gap-12">
            {(["player", "banker"] as const).map((side) => {
              const cards = round
                ? side === "player"
                  ? round.playerCards
                  : round.bankerCards
                : [];
              const total = round ? (side === "player" ? round.playerTotal : round.bankerTotal) : null;
              const winner = round && !revealing && round.outcome === side;
              const tone = SIDE_TONE[side];
              return (
                <div key={side} className="flex flex-col items-center gap-3">
                  <span
                    className={cn(
                      "label",
                      winner ? tone.text : "text-fg-3",
                    )}
                  >
                    {side}
                  </span>
                  <div className="flex min-h-[calc(clamp(2.8rem,9vw,4.2rem)*1.4)] items-center [--card-w:clamp(2.8rem,9vw,4.2rem)]">
                    {(side === "player" ? shown.player : shown.banker) > 0 ? (
                      <CardRow
                        cards={cards}
                        visible={side === "player" ? shown.player : shown.banker}
                        square
                      />
                    ) : (
                      <span className="label text-fg-3">Waiting</span>
                    )}
                  </div>
                  {total !== null ? (
                    <span
                      className={cn(
                        "tabular border px-2.5 py-1 text-[15px] font-medium",
                        winner ? cn(tone.border, tone.text) : "border-line-2 text-fg-2",
                      )}
                    >
                      {total}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Bet selection */}
          <div className="grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            {BET_INFO.map((option) => {
              const active = bet === option.id;
              const disabled = round !== null;
              const tone = SIDE_TONE[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  ref={(element) => register(`bet:${option.id}`, element)}
                  disabled={disabled}
                  {...(disabled ? {} : { [CHIP_DROP_ATTRIBUTE]: option.id })}
                  onClick={() => {
                    playSound("click");
                    setBet(option.id);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 border-2 px-2 py-3 transition-colors",
                    over === option.id
                      ? cn(tone.border, tone.wash)
                      : active
                        ? cn(tone.border, tone.wash)
                        : "border-line-2 hover:border-fg-3",
                    dragging && over !== option.id && "border-dashed",
                    disabled && "opacity-60",
                  )}
                >
                  <span className={cn("font-mono text-[11px] tracking-[0.14em] uppercase", active ? tone.text : "text-fg")}>
                    {option.label}
                  </span>
                  <span className="tabular text-[11px] text-fg-2">{option.payout}</span>
                  <span className="label text-fg-3">
                    Edge {formatPercent(BACCARAT_EDGE[option.id], 2)}
                  </span>
                </button>
              );
            })}
          </div>

          {log.length > 0 ? (
            <div className="flex w-full max-w-2xl flex-col items-center gap-2">
              <span className="label text-fg-3">Last outcomes, oldest on the right</span>
              <div className="flex flex-wrap justify-center gap-1">
                {log.slice(0, 20).map((entry) => (
                  <span
                    key={entry.number}
                    title={entry.outcome}
                    className={cn(
                      "grid h-5 w-5 place-items-center border-2 font-mono text-[9px] uppercase",
                      SIDE_TONE[entry.outcome].border,
                      SIDE_TONE[entry.outcome].text,
                    )}
                  >
                    {entry.outcome[0]}
                  </span>
                ))}
              </div>
              <span className="label text-fg-3">
                Past results do not affect the next hand
              </span>
            </div>
          ) : null}
        </div>
        </TableCamera>

        <AnimatePresence>
          {settled && mode === "learn" && round ? (
            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Hand explanation"
              className="absolute right-0 bottom-0 left-0 z-20 max-h-[62%] overflow-y-auto border-t border-line bg-surface sm:right-5 sm:bottom-5 sm:left-auto sm:max-h-[calc(100%-2.5rem)] sm:w-[23rem] sm:border sm:border-line"
            >
              <div className="border-b border-line px-5 py-4">
                <span className="label">Hand explanation</span>
                <p className="display mt-1.5 text-[20px] leading-none capitalize">
                  {round.outcome === "tie" ? "Tie" : `${round.outcome} wins`}
                </p>
              </div>
              <div className="space-y-4 px-5 py-5">
                <ul className="space-y-3">
                  {round.notes.map((note, index) => (
                    <li key={index} className="flex gap-2.5 text-[13.5px] leading-relaxed text-fg-2">
                      <span aria-hidden="true" className="mt-[8px] h-px w-2.5 shrink-0 bg-fg-3" />
                      <span>{note.reason}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-l-2 border-accent-2 pl-4">
                  <span className="label">Your bet</span>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">
                    {bet === "tie"
                      ? `Tie pays ${RULES.tiePayout} to 1 but lands roughly once in every ten or eleven hands. That gap gives it a house edge near ${formatPercent(BACCARAT_EDGE.tie, 1)}, by far the worst on the table.`
                      : bet === "banker"
                        ? `Banker wins slightly more often than Player because it acts last and sees the Player's third card. The 5% commission exists to price that in, and even after paying it Banker keeps the smallest edge at about ${formatPercent(BACCARAT_EDGE.banker, 2)}.`
                        : `Player pays the full amount with no commission, but wins a little less often. Its edge is about ${formatPercent(BACCARAT_EDGE.player, 2)}, slightly worse than Banker.`}
                  </p>
                </div>
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>

      <RulesDrawer game="baccarat" open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="End this session?"
        description="Your hands so far will be summarised."
        footer={
          <>
            <Button variant="ghost" plate onClick={() => setConfirmExit(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              plate
              onClick={() => {
                setConfirmExit(false);
                setStatus("summary");
              }}
            >
              End session
            </Button>
          </>
        }
      />
    </GameFrame>
  );
}
