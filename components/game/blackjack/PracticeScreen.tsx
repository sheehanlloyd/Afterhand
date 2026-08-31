"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlayerAction } from "@/lib/games/blackjack/types";
import {
  PRACTICE_SIZES,
  PRACTICE_TOPICS,
  PracticeScenario,
  PracticeTopic,
  createSession,
  scenarioCategory,
} from "@/lib/games/blackjack/practice";
import { actionLabel } from "@/lib/strategy/blackjack-strategy";
import { reviewDecision } from "@/lib/strategy/blackjack-coach";
import { usePreferences } from "@/lib/store/preferences";
import {
  loadBlackjackLearning,
  recordPractice,
  saveBlackjackLearning,
} from "@/lib/storage/learning";
import { refreshClientValue, useClientValue } from "@/lib/storage/use-client-value";
import { CardRow, TotalPlate } from "./HandDisplay";
import { StrategyGrid } from "./StrategyGrid";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Segmented } from "@/components/ui/Segmented";
import { Stat } from "@/components/ui/Stat";
import { SectionHead } from "@/components/ui/Panel";
import { formatPercent } from "@/lib/utils/format";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils/cn";

interface Answer {
  scenario: PracticeScenario;
  chosen: PlayerAction;
  correct: boolean;
}

const ACTION_ORDER: PlayerAction[] = ["hit", "stand", "double", "split"];

export function PracticeScreen() {
  const { preferences } = usePreferences();
  const rules = preferences.blackjackRules;

  const [stage, setStage] = useState<"choose" | "drill" | "done">("choose");
  const [topic, setTopic] = useState<PracticeTopic>("mixed");
  const [size, setSize] = useState<number>(20);
  const [scenarios, setScenarios] = useState<PracticeScenario[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pending, setPending] = useState<Answer | null>(null);
  const learning = useClientValue("learning.blackjack", loadBlackjackLearning);

  const start = useCallback(
    (nextTopic: PracticeTopic, nextSize: number) => {
      setTopic(nextTopic);
      setSize(nextSize);
      setScenarios(createSession(nextTopic, nextSize, rules));
      setIndex(0);
      setAnswers([]);
      setPending(null);
      setStage("drill");
    },
    [rules],
  );

  const scenario = scenarios[index];

  const feedback = useMemo(() => {
    if (!pending) return null;
    return reviewDecision({
      id: pending.scenario.id,
      handId: pending.scenario.id,
      handLabel: "Practice",
      cards: pending.scenario.playerCards,
      dealerUpcard: pending.scenario.dealerUpcard,
      available: pending.scenario.available,
      taken: pending.chosen,
      rules,
    });
  }, [pending, rules]);

  function answer(action: PlayerAction) {
    if (!scenario || pending) return;
    const correct = action === scenario.correct;
    playSound(correct ? "win" : "lose");
    setPending({ scenario, chosen: action, correct });
  }

  function advance() {
    if (!pending) return;
    const nextAnswers = [...answers, pending];
    setAnswers(nextAnswers);
    setPending(null);
    if (index + 1 >= scenarios.length) {
      const base = loadBlackjackLearning();
      const updated = recordPractice(
        base,
        topic,
        nextAnswers.map((entry) => ({ correct: entry.correct })),
      );
      saveBlackjackLearning(updated);
      refreshClientValue("learning.blackjack");
      setStage("done");
    } else {
      setIndex(index + 1);
    }
  }

  useEffect(() => {
    if (stage !== "drill") return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.isContentEditable)) return;
      if (event.key === "Enter" || event.key === " ") {
        if (pending) {
          event.preventDefault();
          advance();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (stage === "drill" && scenario) {
    const progress = (index + (pending ? 1 : 0)) / scenarios.length;
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-baseline justify-between gap-4">
          <span className="label">
            {PRACTICE_TOPICS.find((entry) => entry.id === topic)?.label}
          </span>
          <span className="tabular text-[13px] text-fg-2">
            {index + 1} / {scenarios.length}
          </span>
        </div>
        <div className="mt-3 h-[3px] w-full bg-fg/10">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="felt mt-8 border border-[rgba(201,167,94,0.24)] px-6 py-9 sm:px-10 sm:py-11">
          <div className="flex flex-col items-center gap-7">
            <div className="flex flex-col items-center gap-3">
              <span className="font-mono text-[9px] tracking-[0.26em] text-[rgba(236,229,216,0.42)] uppercase">
                Dealer shows
              </span>
              <div className="[--card-w:clamp(3rem,9vw,4.2rem)]">
                <CardRow cards={[scenario.dealerUpcard]} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="[--card-w:clamp(3.2rem,10vw,4.8rem)]">
                <CardRow cards={scenario.playerCards} />
              </div>
              <TotalPlate cards={scenario.playerCards} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTION_ORDER.filter((action) => scenario.available.includes(action)).map((action) => {
            const isChosen = pending?.chosen === action;
            const isAnswer = Boolean(pending) && scenario.correct === action;
            return (
              <Button
                key={action}
                variant={pending ? "quiet" : "secondary"}
                size="lg"
                plate
                disabled={Boolean(pending)}
                onClick={() => answer(action)}
                className={cn(
                  "disabled:opacity-100",
                  isAnswer && "border-positive text-positive",
                  isChosen && !pending?.correct && "border-negative text-negative",
                )}
              >
                {actionLabel(action)}
              </Button>
            );
          })}
        </div>

        <AnimatePresence>
          {pending && feedback ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="mt-6 border border-line bg-surface-2 p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="display text-[20px]">
                  {pending.correct ? "Correct." : `The chart says ${actionLabel(scenario.correct).toLowerCase()}.`}
                </p>
                <span className="label">{pending.correct ? "Right" : "Not this time"}</span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-2">{feedback.explanation}</p>
              <div className="mt-5 flex items-center gap-3">
                <Button variant="primary" size="md" plate onClick={advance}>
                  {index + 1 >= scenarios.length ? "See results" : "Next"}
                </Button>
                <span className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase">
                  Press enter
                </span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setStage("choose")}
          className="mt-8 font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
        >
          Leave drill
        </button>
      </div>
    );
  }

  if (stage === "done") {
    const correct = answers.filter((entry) => entry.correct).length;
    const byCategory = answers.reduce<Record<string, { total: number; correct: number }>>(
      (acc, entry) => {
        const key = scenarioCategory(entry.scenario);
        const current = acc[key] ?? { total: 0, correct: 0 };
        acc[key] = {
          total: current.total + 1,
          correct: current.correct + (entry.correct ? 1 : 0),
        };
        return acc;
      },
      {},
    );
    const ranked = Object.entries(byCategory)
      .filter(([, value]) => value.total >= 2)
      .sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total);
    const topicLabel = (id: string) =>
      PRACTICE_TOPICS.find((entry) => entry.id === id)?.label ?? id;

    const weakest = ranked.length > 1 ? ranked[ranked.length - 1][0] : null;

    return (
      <div className="mx-auto w-full max-w-3xl">
        <span className="label">Practice complete</span>
        <h1 className="display mt-4 text-[clamp(2.2rem,5.5vw,3.2rem)] leading-none">
          {correct} of {answers.length}
        </h1>
        <hr className="rule-double mt-8" />

        <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Stat
            label="Accuracy"
            value={formatPercent(answers.length ? correct / answers.length : 0)}
          />
          <Stat label="Topic" value={topicLabel(topic)} size="sm" />
          <Stat
            label="Strongest"
            value={ranked.length ? topicLabel(ranked[0][0]) : "Not enough"}
            size="sm"
          />
          <Stat
            label="Needs practice"
            value={weakest ? topicLabel(weakest) : "Not enough"}
            size="sm"
          />
        </div>

        {answers.some((entry) => !entry.correct) ? (
          <section className="mt-12">
            <h2 className="text-[15px] font-semibold">Missed hands</h2>
            <ol className="mt-4 divide-y divide-[var(--line)] border-y border-line">
              {answers
                .filter((entry) => !entry.correct)
                .map((entry, position) => (
                  <li key={position} className="flex items-center gap-4 py-3 text-[13.5px]">
                    <span className="tabular w-28 shrink-0 text-fg-2">
                      {entry.scenario.playerCards
                        .map((card) => card.rank)
                        .join(", ")}{" "}
                      vs {entry.scenario.dealerUpcard.rank}
                    </span>
                    <span className="flex-1 text-fg-2">
                      You chose {actionLabel(entry.chosen).toLowerCase()}
                    </span>
                    <span className="shrink-0">{actionLabel(entry.scenario.correct)}</span>
                  </li>
                ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          {weakest ? (
            <Button
              variant="primary"
              size="lg"
              plate
              onClick={() => start(weakest as PracticeTopic, size)}
            >
              Practice weak areas
            </Button>
          ) : null}
          <Button variant="secondary" size="lg" plate onClick={() => start(topic, size)}>
            Run it again
          </Button>
          <Button variant="ghost" size="lg" plate onClick={() => setStage("choose")}>
            Choose a topic
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="max-w-2xl">
        <span className="label">Blackjack</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">Practice</h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Short drills with immediate feedback. Practice is the one place the coach speaks up right
          away, because a drill is not a real hand.
        </p>
      </header>

      <div className="mt-12">
        <SectionHead index="01" title="Choose a topic" />
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICE_TOPICS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTopic(entry.id)}
              aria-pressed={topic === entry.id}
              className={cn(
                "group -mt-px -ml-px flex flex-col border border-line bg-surface p-5 text-left transition-colors",
                topic === entry.id ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="display text-[20px]">{entry.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 border transition-colors",
                    topic === entry.id ? "border-accent bg-accent" : "border-line-2",
                  )}
                />
              </span>
              <span className="mt-2 text-[13px] leading-relaxed text-fg-2">
                {entry.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <SectionHead index="02" title="Session size" />
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Segmented
            label="Session size"
            value={String(size)}
            onChange={(value) => setSize(Number(value))}
            options={PRACTICE_SIZES.map((value) => ({
              value: String(value),
              label: String(value),
            }))}
          />
          <Button variant="primary" size="lg" plate onClick={() => start(topic, size)}>
            Start drill
          </Button>
        </div>
      </div>

      <div className="mt-16">
        <SectionHead
          index="03"
          title="Strategy mastery"
          note="Every cell is the correct play. The fill shows how reliably you have made it."
        />
        <div className="mt-8">
          <StrategyGrid
            rules={rules}
            learning={learning}
            onPractice={(section) =>
              start(section === "pair" ? "pairs" : section === "soft" ? "soft" : "hard", size)
            }
          />
        </div>
      </div>

      <div className="mt-14 flex flex-wrap gap-3">
        <LinkButton href="/games/blackjack" variant="secondary" size="md" plate>
          Play a session
        </LinkButton>
        <LinkButton href="/games/blackjack/rules" variant="ghost" size="md" plate>
          Blackjack rules
        </LinkButton>
      </div>
    </div>
  );
}
