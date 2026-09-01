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
import { usePreferences } from "@/lib/store/preferences";
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
import { TableSpaceProvider } from "@/lib/motion/table-space";
import { ChipFlightLayer } from "@/components/chips/ChipFlight";
import { DiscardTray, Shoe as ShoeBlock } from "@/components/game/table/DealerStation";
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
  const { preferences, update } = usePreferences();
  const [status, setStatus] = useState<"setup" | "playing" | "summary">("setup");
  const [mode, setMode] = useState<GameMode>(preferences.preferredMode);
  const [bankroll, setBankroll] = useState(0);
  const [starting, setStarting] = useState(0);
  const [bet, setBet] = useState<BaccaratBet>("banker");
  const [amount, setAmount] = useState(0);
  const [shoe, setShoe] = useState<Shoe | null>(null);
  const [round, setRound] = useState<BaccaratRound | null>(null);
  const [net, setNet] = useState(0);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [revealing, setRevealing] = useState(false);
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
    [update],
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
              <div className="flex flex-wrap justify-center gap-2.5 [--chip-w:2.9rem] sm:gap-2.5 sm:[--chip-w:3rem]">
                {CHIP_DENOMINATIONS.filter((value) => value <= RULES.maxBet).map((value) => (
                  <Chip
                    key={value}
                    value={value}
                    draggable={round === null}
                    onClick={() => {
                      playSound("chip");
                      setAmount((current) =>
                        Math.min(current + value, Math.min(RULES.maxBet, bankroll)),
                      );
                    }}
                    /* Dropping a chip on a zone picks that side and stakes it,
                       which is the one gesture rather than the usual two. */
                    onDrop={(target) => {
                      playSound("chip");
                      if (target === "player" || target === "banker" || target === "tie") {
                        setBet(target);
                      }
                      setAmount((current) =>
                        Math.min(current + value, Math.min(RULES.maxBet, bankroll)),
                      );
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
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 font-mono text-[9px] tracking-[0.18em] text-[rgba(236,229,216,0.34)] uppercase sm:px-9 sm:py-6">
          <span>Hand {String(log.length + (round ? 1 : 0)).padStart(2, "0")}</span>
          <span>{decksLeft.toFixed(1)} decks in shoe</span>
        </div>

        {/* Every card on this felt comes out of the block on the right and ends
            up in the one on the left, and both of them change size as it does. */}
        <div className="pointer-events-none absolute inset-x-0 top-9 z-10 flex items-start justify-between px-4 sm:top-12 sm:px-8 [--card-w:clamp(1.4rem,3.8vw,1.9rem)]">
          <DiscardTray fill={shoeUsed} />
          <ShoeBlock fill={1 - shoeUsed} />
        </div>

        <TableCamera focus={revealing ? "dealer" : settled ? "result" : "wide"}>
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-12 sm:px-9">
          <div className="grid w-full max-w-2xl grid-cols-2 gap-6 sm:gap-12">
            {(["player", "banker"] as const).map((side) => {
              const cards = round
                ? side === "player"
                  ? round.playerCards
                  : round.bankerCards
                : [];
              const total = round ? (side === "player" ? round.playerTotal : round.bankerTotal) : null;
              const winner = round && !revealing && round.outcome === side;
              return (
                <div key={side} className="flex flex-col items-center gap-3">
                  <span
                    className={cn(
                      "font-mono text-[9px] tracking-[0.24em] uppercase",
                      winner ? "text-[rgba(201,167,94,0.95)]" : "text-[rgba(236,229,216,0.42)]",
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
                      <span className="font-mono text-[9px] tracking-[0.18em] text-[rgba(236,229,216,0.2)] uppercase">
                        Waiting
                      </span>
                    )}
                  </div>
                  {total !== null ? (
                    <span
                      className={cn(
                        "tabular border px-2.5 py-1 text-[15px]",
                        winner
                          ? "border-[rgba(201,167,94,0.7)] text-[rgba(236,229,216,0.98)]"
                          : "border-[rgba(236,229,216,0.2)] text-[rgba(236,229,216,0.8)]",
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
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  {...(disabled ? {} : { [CHIP_DROP_ATTRIBUTE]: option.id })}
                  onClick={() => {
                    playSound("click");
                    setBet(option.id);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 border px-2 py-3 transition-colors",
                    over === option.id
                      ? "border-[rgba(201,167,94,0.95)] bg-[rgba(201,167,94,0.18)]"
                      : active
                        ? "border-[rgba(201,167,94,0.8)] bg-[rgba(201,167,94,0.1)]"
                        : "border-[rgba(236,229,216,0.16)] hover:border-[rgba(236,229,216,0.3)]",
                    dragging && over !== option.id && "border-dashed",
                    disabled && "opacity-60",
                  )}
                >
                  <span className="font-mono text-[10px] tracking-[0.16em] text-[rgba(236,229,216,0.9)] uppercase">
                    {option.label}
                  </span>
                  <span className="tabular text-[11px] text-[rgba(236,229,216,0.55)]">
                    {option.payout}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[rgba(236,229,216,0.4)] uppercase">
                    Edge {formatPercent(BACCARAT_EDGE[option.id], 2)}
                  </span>
                </button>
              );
            })}
          </div>

          {log.length > 0 ? (
            <div className="flex w-full max-w-2xl flex-col items-center gap-2">
              <span className="font-mono text-[8.5px] tracking-[0.2em] text-[rgba(236,229,216,0.3)] uppercase">
                Last outcomes, oldest on the right
              </span>
              <div className="flex flex-wrap justify-center gap-1">
                {log.slice(0, 20).map((entry) => (
                  <span
                    key={entry.number}
                    title={entry.outcome}
                    className={cn(
                      "grid h-5 w-5 place-items-center border font-mono text-[9px] uppercase",
                      entry.outcome === "banker"
                        ? "border-[rgba(205,128,121,0.6)] text-[rgba(205,128,121,0.9)]"
                        : entry.outcome === "player"
                          ? "border-[rgba(127,177,149,0.6)] text-[rgba(127,177,149,0.9)]"
                          : "border-[rgba(201,167,94,0.7)] text-[rgba(201,167,94,0.9)]",
                    )}
                  >
                    {entry.outcome[0]}
                  </span>
                ))}
              </div>
              <span className="font-mono text-[8.5px] tracking-[0.14em] text-[rgba(236,229,216,0.25)] uppercase">
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
