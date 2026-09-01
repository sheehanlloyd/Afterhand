"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameMode } from "@/types";
import { usePokerSession } from "@/lib/store/poker-session";
import { usePreferences } from "@/lib/store/preferences";
import { currentPlayer, humanPlayer } from "@/lib/games/poker/engine";
import { PokerAssessmentKey } from "@/lib/storage/learning-games";
import { GameFrame } from "@/components/game/GameFrame";
import { GameHeader } from "@/components/game/GameHeader";
import { RulesDrawer } from "@/components/game/RulesDrawer";
import { SiteShell } from "@/components/layout/SiteShell";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Segmented } from "@/components/ui/Segmented";
import { SectionHead } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { PokerTable } from "./PokerTable";
import { PokerActionRail, PokerDealRail, PokerHandOverRail } from "./PokerRails";
import { PokerReview } from "./PokerReview";
import { formatDuration, formatMoney, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { TableSpaceProvider } from "@/lib/motion/table-space";
import { ChipFlightLayer } from "@/components/chips/ChipFlight";

const STACKS = [500, 1000, 2500, 5000];

export function PokerScreen() {
  const store = usePokerSession();
  const { preferences, update } = usePreferences();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [stack, setStack] = useState(1000);
  const [mode, setMode] = useState<GameMode>(preferences.preferredMode);

  const { status, table } = store;

  const tally = useMemo(() => {
    const counts: Record<PokerAssessmentKey, number> = {
      strong: 0,
      reasonable: 0,
      questionable: 0,
      "likely-mistake": 0,
    };
    let total = 0;
    for (const hand of store.history) {
      for (const decision of hand.decisions) {
        counts[decision.assessment] += 1;
        total += 1;
      }
    }
    return { counts, total };
  }, [store.history]);

  if (status === "setup") {
    return (
      <SiteShell>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-20">
          <div>
            <span className="label">Poker</span>
            <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">
              Take a seat
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-2">
              No-limit Texas Hold&apos;em against three computer opponents. Blinds are 1 and 2
              percent of your starting stack, and the button moves every hand.
            </p>

            <hr className="rule-double mt-10" />

            <section className="mt-8">
              <div className="section-head">
                <span className="label pt-1">01</span>
                <div>
                  <h2 className="text-[16px] font-semibold">Starting stack</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {STACKS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setStack(amount)}
                        aria-pressed={stack === amount}
                        className={cn(
                          "tabular h-11 min-w-[5.5rem] border px-4 text-[14px] transition-colors",
                          stack === amount
                            ? "border-accent-2 bg-accent-2/10 text-fg"
                            : "border-line text-fg-2 hover:border-line-2 hover:text-fg",
                        )}
                      >
                        {formatMoney(amount)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-9">
              <div className="section-head">
                <span className="label pt-1">02</span>
                <div>
                  <h2 className="text-[16px] font-semibold">Mode</h2>
                  <div className="mt-4">
                    <Segmented
                      label="Session mode"
                      value={mode}
                      onChange={setMode}
                      options={[
                        { value: "play", label: "Play" },
                        { value: "learn", label: "Learn" },
                      ]}
                    />
                  </div>
                  <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-fg-2">
                    {mode === "learn"
                      ? "After each hand, a review walks through your decisions with the price the pot was offering and the equity your hand actually had."
                      : "No review unless you ask for one. Nothing appears while a hand is live either way."}
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                variant="primary"
                size="lg"
                plate
                onClick={() => {
                  update({ preferredMode: mode, preferredGame: "poker" });
                  store.start({
                    stack,
                    smallBlind: Math.max(1, Math.round(stack / 100)),
                    bigBlind: Math.max(2, Math.round(stack / 50)),
                    mode,
                  });
                }}
              >
                Sit down
              </Button>
              <LinkButton href="/games/poker/learn" variant="ghost" size="lg" plate>
                Five minute intro
              </LinkButton>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="felt border border-[rgba(201,167,94,0.28)] p-6">
              <div className="border border-[rgba(201,167,94,0.16)] p-5">
                <p className="text-center font-mono text-[9px] tracking-[0.3em] text-[rgba(201,167,94,0.75)] uppercase">
                  The table
                </p>
                <p className="display mt-3 text-center text-[26px] leading-none text-[#ece5d8]">
                  Four handed
                </p>
                <dl className="mt-6 space-y-2.5">
                  {[
                    ["Game", "No-limit Hold'em"],
                    ["Seats", "You plus three"],
                    ["Stack", formatMoney(stack)],
                    [
                      "Blinds",
                      `${formatMoney(Math.max(1, Math.round(stack / 100)))} / ${formatMoney(
                        Math.max(2, Math.round(stack / 50)),
                      )}`,
                    ],
                    ["Mode", mode === "learn" ? "Learn" : "Play"],
                  ].map(([term, value]) => (
                    <div key={term} className="flex items-baseline justify-between gap-4">
                      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-[rgba(236,229,216,0.42)] uppercase">
                        {term}
                      </dt>
                      <dd className="tabular text-[12.5px] text-[rgba(236,229,216,0.9)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </SiteShell>
    );
  }

  if (status === "summary") {
    const ending = table ? humanPlayer(table).stack : store.startingStack;
    const net = ending - store.startingStack;
    return (
      <SiteShell contained={false}>
        <div className="mx-auto w-full max-w-[var(--shell-max)] px-5 py-14 sm:px-8 sm:py-20">
          <span className="label">Poker</span>
          <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">
            Session complete
          </h1>
          <hr className="rule-double mt-9" />

          <div className="mt-9 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Starting stack" value={formatMoney(store.startingStack)} />
            <Stat label="Ending stack" value={formatMoney(ending)} />
            <Stat
              label="Net result"
              value={`${net > 0 ? "+" : ""}${formatMoney(net)}`}
              tone={net > 0 ? "good" : net < 0 ? "bad" : "neutral"}
            />
            <Stat label="Hands played" value={store.history.length} />
            <Stat
              label="Time played"
              value={formatDuration((store.endedAt ?? store.startedAt) - store.startedAt)}
            />
          </div>

          {store.mode === "learn" && tally.total > 0 ? (
            <section className="mt-16">
              <SectionHead index="A" title="Decision quality" />
              <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
                <Stat
                  label="Strong or reasonable"
                  value={formatPercent(
                    (tally.counts.strong + tally.counts.reasonable) / tally.total,
                  )}
                  size="lg"
                />
                <Stat label="Decisions" value={tally.total} />
                <Stat label="Questionable" value={tally.counts.questionable} />
                <Stat label="Likely mistakes" value={tally.counts["likely-mistake"]} />
              </div>
              <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-fg-2">
                Poker rarely has one correct answer. These labels compare the price the pot was
                offering against the equity your hand measured by simulation, so they are a guide
                rather than a verdict.
              </p>
            </section>
          ) : null}

          <div className="mt-14 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" plate onClick={store.leaveSession}>
              New session
            </Button>
            <LinkButton href="/games/poker/rules" variant="secondary" size="lg" plate>
              Poker rules
            </LinkButton>
            <LinkButton href="/" variant="ghost" size="lg" plate>
              Return home
            </LinkButton>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (!table) return null;

  const human = humanPlayer(table);
  const acting = currentPlayer(table);
  const handOver = table.street === "complete";
  const canDeal = table.handNumber === 0 || handOver;

  return (
    <TableSpaceProvider>
      <ChipFlightLayer>
        <GameFrame
          railKey={`${table.street}-${handOver}`}
          railActive={Boolean(acting?.isHuman) && !handOver && !store.waiting}
          header={
        <GameHeader
          game="Poker"
          mode={store.mode === "learn" ? "Learn" : "Play"}
          bankroll={human.stack}
          soundEnabled={preferences.soundEnabled}
          onToggleSound={() => update({ soundEnabled: !preferences.soundEnabled })}
          detail={
            <div className="text-right">
              <div className="label leading-none">Session</div>
              <div
                className={cn(
                  "tabular mt-1 text-[13px] leading-none",
                  human.stack - store.startingStack > 0
                    ? "text-positive"
                    : human.stack - store.startingStack < 0
                      ? "text-negative"
                      : "text-fg-2",
                )}
              >
                {human.stack - store.startingStack > 0 ? "+" : ""}
                {formatMoney(human.stack - store.startingStack)}
              </div>
            </div>
          }
          menu={[
            { label: "Rules", onSelect: () => setRulesOpen(true) },
            { label: "Settings", href: "/settings" },
            {
              label: "End session",
              tone: "danger",
              onSelect: () =>
                store.history.length > 0 ? setConfirmExit(true) : store.leaveSession(),
            },
          ]}
        />
      }
      rail={
        canDeal && table.handNumber === 0 ? (
          <PokerDealRail onDeal={store.deal} />
        ) : handOver ? (
          <PokerHandOverRail
            net={table.lastNet}
            onNext={store.deal}
            onReview={store.openReview}
            reviewOpen={store.reviewOpen}
            hasReview={Boolean(store.reviewSummary)}
            broke={human.stack <= 0}
          />
        ) : (
          <PokerActionRail
            state={table}
            onAction={store.act}
            disabled={store.waiting || store.dealing || !acting?.isHuman}
          />
        )
      }
    >
      <PokerTable
        state={table}
        reveal={store.reveal}
        potShown={store.potShown}
        thinking={store.thinking}
      />

      <AnimatePresence>
        {store.reviewOpen && store.reviewSummary ? (
          <motion.aside
            key="poker-review"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Hand review"
            className="absolute right-0 bottom-0 left-0 z-20 max-h-[68%] border-t border-line bg-surface shadow-[0_-20px_50px_-30px_rgba(0,0,0,0.9)] sm:right-5 sm:bottom-5 sm:left-auto sm:max-h-[calc(100%-2.5rem)] sm:w-[24rem] sm:border sm:border-line"
          >
            <PokerReview
              summary={store.reviewSummary}
              onDismiss={store.closeReview}
              onNextHand={handOver ? store.deal : undefined}
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <RulesDrawer game="poker" open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="End this session?"
        description="Your hands so far will be summarised. Stacks do not carry over to a new session."
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
                store.endSession();
              }}
            >
              End session
            </Button>
          </>
        }
      />
        </GameFrame>
      </ChipFlightLayer>
    </TableSpaceProvider>
  );
}
