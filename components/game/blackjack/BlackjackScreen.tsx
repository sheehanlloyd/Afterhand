"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBlackjackSession } from "@/lib/store/blackjack-session";
import { usePreferences } from "@/lib/store/preferences";
import { availableActions, canDeal, netForRound } from "@/lib/games/blackjack/engine";
import { labelForHand } from "@/lib/games/blackjack/engine";
import { PlayerAction } from "@/lib/games/blackjack/types";
import { GameFrame } from "@/components/game/GameFrame";
import { GameHeader } from "@/components/game/GameHeader";
import { RulesDrawer } from "@/components/game/RulesDrawer";
import { SiteShell } from "@/components/layout/SiteShell";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { HandReview } from "@/components/review/HandReview";
import { SessionSetup } from "./SessionSetup";
import { SessionSummary } from "./SessionSummary";
import { BlackjackTable } from "./BlackjackTable";
import { ActionRail, BettingRail, InsuranceRail, SettledRail } from "./Rails";
import { formatMoney } from "@/lib/utils/format";
import { ChipDragProvider } from "@/components/chips/chip-drag";
import { ChipFlightLayer, useChipFlight } from "@/components/chips/ChipFlight";
import { TableSpaceProvider } from "@/lib/motion/table-space";
import { CHIP_DENOMINATIONS } from "./Rails";

const ACTION_KEYS: Record<string, PlayerAction> = {
  h: "hit",
  s: "stand",
  d: "double",
  p: "split",
  r: "surrender",
};

export function BlackjackScreen() {
  const store = useBlackjackSession();
  const { preferences, update } = usePreferences();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const { status, game, mode } = store;

  useEffect(() => {
    store.checkRecovery();
    // Recovery is checked once when the setup screen first mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keyboard shortcuts, ignored while a field has focus. */
  useEffect(() => {
    if (status !== "playing" || !game) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === " " || event.code === "Space") {
        event.preventDefault();
        if (game!.phase === "betting" && canDeal(game!)) store.deal();
        else if (game!.phase === "settled" && !store.revealing) store.nextHand();
        return;
      }
      const action = ACTION_KEYS[key];
      if (action && game!.phase === "player" && availableActions(game!).includes(action)) {
        event.preventDefault();
        store.act(action);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, game, store]);

  if (status === "setup") {
    return (
      <SiteShell>
        <SessionSetup
          initialBankroll={preferences.preferredBankroll}
          initialMode={preferences.preferredMode}
          initialRules={preferences.blackjackRules}
          recovery={store.recoveryAvailable}
          onResume={store.resumeRecovered}
          onDiscardRecovery={store.discardRecovery}
          onStart={(result) => {
            update({
              preferredBankroll: result.bankroll,
              preferredMode: result.mode,
              blackjackRules: result.rules,
              preferredGame: "blackjack",
            });
            store.start(result);
          }}
        />
      </SiteShell>
    );
  }

  if (status === "summary") {
    return (
      <SiteShell contained={false}>
        <SessionSummary
          mode={mode}
          startingBankroll={store.startingBankroll}
          endingBankroll={game?.bankroll ?? store.startingBankroll}
          history={[...store.history].sort((a, b) => b.number - a.number)}
          durationMs={(store.endedAt ?? store.startedAt) - store.startedAt}
          practiceHref="/games/blackjack/practice"
          onNewSession={store.leaveSession}
        />
      </SiteShell>
    );
  }

  if (!game) return null;

  return (
    <TableSpaceProvider>
      <ChipFlightLayer>
        <ChipDragProvider>
          <PlayingRoom
            rulesOpen={rulesOpen}
            setRulesOpen={setRulesOpen}
            confirmExit={confirmExit}
            setConfirmExit={setConfirmExit}
            confirmRestart={confirmRestart}
            setConfirmRestart={setConfirmRestart}
          />
        </ChipDragProvider>
      </ChipFlightLayer>
    </TableSpaceProvider>
  );
}

/**
 * The table itself, inside the providers.
 *
 * Split out so that it can reach the chip flight layer above it: a chip that
 * leaves the rail for the betting circle is drawn by a component that has to be
 * a parent of both of them.
 */
function PlayingRoom({
  rulesOpen,
  setRulesOpen,
  confirmExit,
  setConfirmExit,
  confirmRestart,
  setConfirmRestart,
}: {
  rulesOpen: boolean;
  setRulesOpen: (value: boolean) => void;
  confirmExit: boolean;
  setConfirmExit: (value: boolean) => void;
  confirmRestart: boolean;
  setConfirmRestart: (value: boolean) => void;
}) {
  const store = useBlackjackSession();
  const { preferences, update } = usePreferences();
  const flight = useChipFlight();
  const { game, mode } = store;

  const actions = useMemo(() => (game ? availableActions(game) : []), [game]);

  const handleAction = useCallback(
    (action: PlayerAction) => {
      store.act(action);
    },
    [store],
  );

  /**
   * A chip does not become a bet until it has arrived.
   *
   * The clay leaves the rail, crosses the felt and lands in the circle, and
   * only then does the wagered amount change. It is the same rule the pot
   * follows in poker, and it is what stops the interface reading as a
   * spreadsheet with a table drawn behind it.
   */
  const placeChip = useCallback(
    (value: number) => {
      flight.send({
        from: "rail",
        to: "bet:main",
        amount: value,
        denominations: CHIP_DENOMINATIONS,
        onArrive: () => store.addChip(value),
      });
    },
    [flight, store],
  );

  if (!game) return null;

  const isBusy = store.revealing || store.collecting;
  const roundNet = game.phase === "settled" ? netForRound(game) : 0;
  const activeHand = game.hands[game.activeHandIndex];
  const insuranceCost = Math.floor((game.hands[0]?.bet ?? 0) / 2);
  const meaningfulSession = store.history.length > 0 || game.phase !== "betting";

  return (
    <>
      <GameFrame
        railKey={game.phase}
        railActive={game.phase === "player" || game.phase === "insurance"}
        header={
        <GameHeader
          game="Blackjack"
          mode={mode === "learn" ? "Learn" : "Play"}
          bankroll={game.bankroll}
          soundEnabled={preferences.soundEnabled}
          onToggleSound={() => update({ soundEnabled: !preferences.soundEnabled })}
          detail={
            <div className="text-right">
              <div className="label leading-none">Session</div>
              <div
                className={
                  "tabular mt-1 text-[13px] leading-none " +
                  (game.bankroll - store.startingBankroll > 0
                    ? "text-positive"
                    : game.bankroll - store.startingBankroll < 0
                      ? "text-negative"
                      : "text-fg-2")
                }
              >
                {game.bankroll - store.startingBankroll > 0 ? "+" : ""}
                {formatMoney(game.bankroll - store.startingBankroll)}
              </div>
            </div>
          }
          menu={[
            { label: "Rules", onSelect: () => setRulesOpen(true) },
            { label: "Restart session", onSelect: () => setConfirmRestart(true) },
            { label: "Settings", href: "/settings" },
            {
              label: "End session",
              tone: "danger",
              onSelect: () =>
                meaningfulSession ? setConfirmExit(true) : store.leaveSession(),
            },
          ]}
        />
      }
      rail={
        game.phase === "betting" ? (
          <BettingRail
            bet={game.pendingBet}
            bankroll={game.bankroll}
            minBet={game.rules.minBet}
            maxBet={Math.min(game.rules.maxBet, game.bankroll)}
            canDeal={canDeal(game)}
            canRepeat={store.history.length > 0 && game.pendingBet === 0}
            onChip={placeChip}
            onClear={store.clearBet}
            onRepeat={store.repeatBet}
            onDeal={store.deal}
            showHints={preferences.showKeyboardHints}
          />
        ) : game.phase === "insurance" ? (
          <InsuranceRail
            amount={insuranceCost}
            onTake={() => store.insurance(true)}
            onDecline={() => store.insurance(false)}
          />
        ) : game.phase === "player" ? (
          <ActionRail
            available={actions}
            onAction={handleAction}
            disabled={isBusy}
            showHints={preferences.showKeyboardHints}
            handLabel={activeHand ? labelForHand(game, activeHand) : undefined}
          />
        ) : store.resultVisible ? (
          <SettledRail
            net={roundNet}
            onNext={store.nextHand}
            onReview={store.openReview}
            reviewOpen={store.reviewOpen}
            hasReview={Boolean(store.reviewSummary)}
            showHints={preferences.showKeyboardHints}
            bankrollSpent={game.bankroll < game.rules.minBet}
          />
        ) : (
          <div className="flex h-[68px] items-center justify-center font-mono text-[10px] tracking-[0.18em] text-fg-3 uppercase">
            Dealer plays
          </div>
        )
      }
    >
      <BlackjackTable
        game={game}
        visible={store.visible}
        holeUp={store.holeUp}
        resultVisible={store.resultVisible}
        collecting={store.collecting}
      />

      <AnimatePresence>
        {store.reviewOpen && store.reviewSummary ? (
          <motion.aside
            key="review"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Hand review"
            className="pointer-events-auto absolute right-0 bottom-0 left-0 z-20 mx-auto max-h-[68%] w-full border-t border-line bg-surface shadow-[0_-20px_50px_-30px_rgba(0,0,0,0.9)] sm:right-5 sm:bottom-5 sm:left-auto sm:max-h-[calc(100%-2.5rem)] sm:w-[24rem] sm:border sm:border-line"
          >
            <HandReview
              summary={store.reviewSummary}
              onDismiss={store.closeReview}
              onNextHand={
                game.phase === "settled" && store.resultVisible ? store.nextHand : undefined
              }
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <RulesDrawer game="blackjack" open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="End this session?"
        description="Your hands so far will be summarised. The bankroll does not carry over to a new session."
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

      <Modal
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title="Restart the session?"
        description="The shoe is reshuffled and the bankroll returns to where it started."
        footer={
          <>
            <Button variant="ghost" plate onClick={() => setConfirmRestart(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              plate
              onClick={() => {
                setConfirmRestart(false);
                store.restartSession();
              }}
            >
              Restart
            </Button>
          </>
        }
      />
      </GameFrame>
    </>
  );
}
