"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameMode } from "@/types";
import {
  BET_LABEL,
  BetSettlement,
  PAYOUTS,
  Pocket,
  RouletteBet,
  RouletteVariant,
  houseEdge,
  pocketColour,
  settleBets,
  spin,
  winProbability,
} from "@/lib/games/roulette/engine";
import { usePreferences } from "@/lib/store/preferences";
import { loadRouletteLearning, saveRouletteLearning } from "@/lib/storage/learning-games";
import { GameFrame } from "@/components/game/GameFrame";
import { GameHeader } from "@/components/game/GameHeader";
import { RulesDrawer } from "@/components/game/RulesDrawer";
import { SiteShell } from "@/components/layout/SiteShell";
import { Placard, SimpleSetup } from "@/components/game/SimpleSetup";
import { BetRailLayout, RailFrame, CHIP_DENOMINATIONS } from "@/components/game/blackjack/Rails";
import { Chip } from "@/components/chips/Chip";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Stat } from "@/components/ui/Stat";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { Field } from "@/components/ui/Field";
import { BettingBoard } from "./BettingBoard";
import { RouletteWheel } from "./Wheel";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils/cn";

const MIN_BET = 5;
const MAX_TOTAL = 5000;

export function RouletteScreen() {
  const { preferences, update } = usePreferences();
  const [status, setStatus] = useState<"setup" | "playing" | "summary">("setup");
  const [mode, setMode] = useState<GameMode>(preferences.preferredMode);
  const [variant, setVariant] = useState<RouletteVariant>(preferences.rouletteVariant);
  const [bankroll, setBankroll] = useState(0);
  const [starting, setStarting] = useState(0);
  const [chip, setChip] = useState(5);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [result, setResult] = useState<Pocket | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [settlements, setSettlements] = useState<BetSettlement[] | null>(null);
  const [spins, setSpins] = useState(0);
  const [history, setHistory] = useState<Pocket[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const staked = bets.reduce((sum, bet) => sum + bet.amount, 0);

  const start = useCallback(
    (config: { bankroll: number; mode: GameMode }) => {
      setBankroll(config.bankroll);
      setStarting(config.bankroll);
      setMode(config.mode);
      setStatus("playing");
      setBets([]);
      setResult(null);
      setSettlements(null);
      setSpins(0);
      setHistory([]);
      update({
        preferredMode: config.mode,
        preferredGame: "roulette",
        rouletteVariant: variant,
      });
    },
    [update, variant],
  );

  function place(bet: RouletteBet) {
    if (spinning || settlements) return;
    if (staked + bet.amount > Math.min(bankroll, MAX_TOTAL)) return;
    playSound("chip");
    setBets((current) => {
      const existing = current.find((entry) => entry.id === bet.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === bet.id ? { ...entry, amount: entry.amount + bet.amount } : entry,
        );
      }
      return [...current, bet];
    });
  }

  function removeBet(id: string) {
    if (spinning || settlements) return;
    playSound("click");
    setBets((current) => current.filter((entry) => entry.id !== id));
  }

  function doSpin() {
    if (bets.length === 0 || spinning || staked > bankroll) return;
    playSound("deal");
    setBankroll((current) => current - staked);
    setSpinning(true);
    const pocket = spin(variant);
    setResult(pocket);

    timers.current.push(
      setTimeout(() => {
        const outcome = settleBets(bets, pocket);
        const returned = outcome.reduce((sum, entry) => sum + entry.returned, 0);
        setBankroll((current) => current + returned);
        setSettlements(outcome);
        setSpinning(false);
        setSpins((current) => current + 1);
        setHistory((current) => [pocket, ...current].slice(0, 24));
        const net = outcome.reduce((sum, entry) => sum + entry.net, 0);
        playSound(net > 0 ? "win" : net < 0 ? "lose" : "click");
        if (mode === "learn") {
          const base = loadRouletteLearning();
          const byType = { ...base.byType };
          bets.forEach((bet) => {
            byType[bet.type] = (byType[bet.type] ?? 0) + 1;
          });
          saveRouletteLearning({
            ...base,
            spins: base.spins + 1,
            betsPlaced: base.betsPlaced + bets.length,
            byType,
            updatedAt: Date.now(),
          });
        }
      }, 2600),
    );
  }

  function clearTable(keepBets: boolean) {
    setSettlements(null);
    setResult(null);
    if (!keepBets) setBets([]);
    if (bankroll < MIN_BET) setStatus("summary");
  }

  if (status === "setup") {
    return (
      <SiteShell>
        <SimpleSetup
          eyebrow="Roulette"
          title="Start a session"
          intro="European by default. Every bet on the layout shows its true probability and the edge that comes with it."
          initialBankroll={preferences.preferredBankroll}
          initialMode={preferences.preferredMode}
          learnCopy="After each spin, Afterhand breaks down each bet you placed: how often it wins, what it pays, and where the difference goes."
          playCopy="Just the wheel and the layout. Probabilities still sit next to every bet you place."
          extra={
            <div className="section-head">
              <span className="label pt-1">03</span>
              <div>
                <h2 className="text-[16px] font-semibold">Wheel</h2>
                <div className="mt-4">
                  <Field label="Variant">
                    <Segmented
                      label="Wheel variant"
                      size="sm"
                      value={variant}
                      onChange={(value) => setVariant(value)}
                      options={[
                        { value: "european", label: "European" },
                        { value: "american", label: "American" },
                      ]}
                    />
                  </Field>
                </div>
                <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-fg-2">
                  {variant === "european"
                    ? "Thirty seven pockets, one zero. The house edge is about 2.70% on nearly every bet."
                    : "Thirty eight pockets, including a double zero. That single extra pocket takes the edge to about 5.26%."}
                </p>
              </div>
            </div>
          }
          placard={
            <Placard
              title="Roulette"
              lines={[
                ["Wheel", variant === "american" ? "American" : "European"],
                ["Pockets", variant === "american" ? "38" : "37"],
                ["Straight", "Pays 35 to 1"],
                ["Even money", "Pays 1 to 1"],
                ["House edge", formatPercent(variant === "american" ? 2 / 38 : 1 / 37, 2)],
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
          <span className="label">Roulette</span>
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
            <Stat label="Spins" value={spins} />
          </div>
          <p className="mt-8 max-w-xl text-[13.5px] leading-relaxed text-fg-2">
            Over enough spins, every bet on this layout loses about{" "}
            {formatPercent(variant === "american" ? 2 / 38 : 1 / 37, 2)} of the amount wagered. A
            winning session is variance, not an edge.
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" plate onClick={() => setStatus("setup")}>
              New session
            </Button>
            <LinkButton href="/games/roulette/rules" variant="secondary" size="lg" plate>
              Roulette rules
            </LinkButton>
            <LinkButton href="/" variant="ghost" size="lg" plate>
              Return home
            </LinkButton>
          </div>
        </div>
      </SiteShell>
    );
  }

  const net = settlements ? settlements.reduce((sum, entry) => sum + entry.net, 0) : 0;

  return (
    <GameFrame
      header={
        <GameHeader
          game="Roulette"
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
              onSelect: () => (spins > 0 ? setConfirmExit(true) : setStatus("setup")),
            },
          ]}
        />
      }
      rail={
        settlements ? (
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
              <Button variant="secondary" size="md" plate onClick={() => clearTable(false)}>
                Clear table
              </Button>
              <Button variant="primary" size="lg" plate onClick={() => clearTable(true)}>
                {bankroll < MIN_BET ? "Session summary" : "Same bets again"}
              </Button>
            </div>
          </RailFrame>
        ) : (
          <BetRailLayout
            value={
              <>
                <span className="label">On the table</span>
                <span className="tabular mt-1 text-[19px] leading-none">
                  {formatMoney(staked)}
                </span>
              </>
            }
            chips={
              <div className="flex flex-wrap justify-center gap-2 [--chip-w:2.3rem] sm:gap-2.5 sm:[--chip-w:2.8rem]">
                {CHIP_DENOMINATIONS.map((value) => (
                  <Chip
                    key={value}
                    value={value}
                    selected={chip === value}
                    onClick={() => {
                      playSound("click");
                      setChip(value);
                    }}
                    disabled={spinning}
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
                  onClick={() => setBets([])}
                  disabled={bets.length === 0 || spinning}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  plate
                  onClick={doSpin}
                  disabled={bets.length === 0 || spinning || staked > bankroll}
                >
                  {spinning ? "No more bets" : "Spin"}
                </Button>
              </>
            }
            footnote="Chip selects the stake. Click a spot to place it."
          />
        )
      }
    >
      <div className="felt relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 border border-[rgba(201,167,94,0.14)] sm:inset-4"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 font-mono text-[9px] tracking-[0.18em] text-[rgba(236,229,216,0.34)] uppercase sm:px-9 sm:py-6">
          <span>Spin {String(spins + 1).padStart(2, "0")}</span>
          <span>{variant === "american" ? "American wheel" : "European wheel"}</span>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-12 sm:px-8">
          <div className="flex w-full max-w-4xl flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
            <div className="flex shrink-0 flex-col items-center gap-3">
              <RouletteWheel variant={variant} result={result} spinning={spinning} />
              {history.length > 0 ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex flex-wrap justify-center gap-1">
                    {history.slice(0, 12).map((pocket, index) => (
                      <span
                        key={`${pocket}-${index}`}
                        className={cn(
                          "grid h-5 min-w-5 place-items-center border px-1 font-mono text-[9px]",
                          pocketColour(pocket) === "red"
                            ? "border-[rgba(205,128,121,0.6)] text-[rgba(205,128,121,0.95)]"
                            : pocketColour(pocket) === "black"
                              ? "border-[rgba(236,229,216,0.3)] text-[rgba(236,229,216,0.8)]"
                              : "border-[rgba(127,177,149,0.6)] text-[rgba(127,177,149,0.95)]",
                        )}
                      >
                        {pocket}
                      </span>
                    ))}
                  </div>
                  <span className="font-mono text-[8.5px] tracking-[0.14em] text-[rgba(236,229,216,0.25)] uppercase">
                    Previous spins do not influence the next one
                  </span>
                </div>
              ) : null}
            </div>

            <div className="w-full min-w-0 lg:flex-1">
              <BettingBoard
                variant={variant}
                bets={bets}
                chip={chip}
                onPlace={place}
                onRemove={removeBet}
                disabled={spinning || settlements !== null}
                winning={settlements ? result : null}
              />

              {bets.length > 0 ? (
                <div className="mx-auto mt-4 max-w-3xl">
                  <div className="flex items-center justify-between gap-3 border-b border-[rgba(236,229,216,0.14)] pb-1.5">
                    <span className="font-mono text-[9px] tracking-[0.16em] text-[rgba(236,229,216,0.4)] uppercase">
                      Your bets
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.16em] text-[rgba(236,229,216,0.4)] uppercase">
                      Chance / Pays
                    </span>
                  </div>
                  <ul className="divide-y divide-[rgba(236,229,216,0.1)]">
                    {bets.map((bet) => {
                      const settlement = settlements?.find((entry) => entry.bet.id === bet.id);
                      return (
                        <li
                          key={bet.id}
                          className="flex items-center gap-3 py-1.5 text-[11.5px] text-[rgba(236,229,216,0.8)]"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {BET_LABEL[bet.type]}
                            {bet.type !== "red" &&
                            bet.type !== "black" &&
                            bet.type !== "odd" &&
                            bet.type !== "even" &&
                            bet.type !== "low" &&
                            bet.type !== "high"
                              ? ` ${bet.numbers.join(", ")}`
                              : ""}
                          </span>
                          <span className="tabular shrink-0">{formatMoney(bet.amount)}</span>
                          <span className="tabular shrink-0 text-[rgba(236,229,216,0.5)]">
                            {formatPercent(winProbability(bet, variant), 1)} / {PAYOUTS[bet.type]} to 1
                          </span>
                          {settlement ? (
                            <span
                              className={cn(
                                "tabular w-16 shrink-0 text-right",
                                settlement.net > 0
                                  ? "text-[rgba(127,177,149,0.95)]"
                                  : "text-[rgba(205,128,121,0.95)]",
                              )}
                            >
                              {settlement.net > 0 ? "+" : ""}
                              {formatMoney(settlement.net)}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {settlements && mode === "learn" && result !== null ? (
            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Spin explanation"
              className="absolute right-0 bottom-0 left-0 z-20 max-h-[62%] overflow-y-auto border-t border-line bg-surface sm:right-5 sm:bottom-5 sm:left-auto sm:max-h-[calc(100%-2.5rem)] sm:w-[23rem] sm:border sm:border-line"
            >
              <div className="border-b border-line px-5 py-4">
                <span className="label">Spin explanation</span>
                <p className="display mt-1.5 text-[20px] leading-none">
                  {result} {pocketColour(result) === "green" ? "" : pocketColour(result)}
                </p>
              </div>
              <div className="space-y-4 px-5 py-5">
                <ul className="divide-y divide-[var(--line)] border-y border-line">
                  {settlements.map((entry) => (
                    <li key={entry.bet.id} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px]">{entry.bet.label}</span>
                        <span
                          className={cn(
                            "tabular text-[13px]",
                            entry.net > 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {entry.net > 0 ? "+" : ""}
                          {formatMoney(entry.net)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-2">
                        Covers {entry.bet.numbers.length} of{" "}
                        {variant === "american" ? 38 : 37} pockets, so it wins about{" "}
                        {formatPercent(winProbability(entry.bet, variant), 1)} of the time and pays{" "}
                        {PAYOUTS[entry.bet.type]} to 1. The gap between those two numbers is a house
                        edge of {formatPercent(houseEdge(entry.bet, variant), 2)}.
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="border-l-2 border-accent-2 pl-4 text-[13px] leading-relaxed text-fg-2">
                  The wheel has no memory. Whatever came before, the next spin has the same odds as
                  this one.
                </p>
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>

      <RulesDrawer game="roulette" open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="End this session?"
        description="Your spins so far will be summarised."
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
