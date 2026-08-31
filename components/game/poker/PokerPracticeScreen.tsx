"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  EQUITY_BRACKETS,
  POKER_PRACTICE_SIZES,
  POKER_PRACTICE_TOPICS,
  PokerPracticeTopic,
  PokerScenario,
  createPokerSession,
  explainScenario,
} from "@/lib/games/poker/practice";
import {
  loadPokerLearning,
  recordPokerPractice,
  savePokerLearning,
} from "@/lib/storage/learning-games";
import { refreshClientValue, useClientValue } from "@/lib/storage/use-client-value";
import { CardRow } from "@/components/game/blackjack/HandDisplay";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Segmented } from "@/components/ui/Segmented";
import { Stat } from "@/components/ui/Stat";
import { SectionHead } from "@/components/ui/Panel";
import { Term } from "@/components/ui/Term";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils/cn";

interface Answer {
  scenario: PokerScenario;
  chosen: string;
  correct: boolean;
}

const STREET_LABEL = { flop: "Flop", turn: "Turn", river: "River" } as const;

export function PokerPracticeScreen() {
  const [stage, setStage] = useState<"choose" | "drill" | "done">("choose");
  const [topic, setTopic] = useState<PokerPracticeTopic>("pot-odds");
  const [size, setSize] = useState<number>(10);
  const [scenarios, setScenarios] = useState<PokerScenario[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pending, setPending] = useState<Answer | null>(null);
  const learning = useClientValue("learning.poker", loadPokerLearning);

  const start = useCallback((nextTopic: PokerPracticeTopic, nextSize: number) => {
    setTopic(nextTopic);
    setSize(nextSize);
    setScenarios(createPokerSession(nextTopic, nextSize));
    setIndex(0);
    setAnswers([]);
    setPending(null);
    setStage("drill");
  }, []);

  const scenario = scenarios[index];

  function answer(choice: string) {
    if (!scenario || pending) return;
    const correct = choice === scenario.correct;
    playSound(correct ? "win" : "lose");
    setPending({ scenario, chosen: choice, correct });
  }

  function advance() {
    if (!pending) return;
    const next = [...answers, pending];
    setAnswers(next);
    setPending(null);
    if (index + 1 >= scenarios.length) {
      savePokerLearning(
        recordPokerPractice(
          loadPokerLearning(),
          topic,
          next.map((entry) => ({ correct: entry.correct })),
        ),
      );
      refreshClientValue("learning.poker");
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
      if ((event.key === "Enter" || event.key === " ") && pending) {
        event.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (stage === "drill" && scenario) {
    const progress = (index + (pending ? 1 : 0)) / scenarios.length;
    const options =
      scenario.topic === "pot-odds"
        ? [
            { id: "fold", label: "Fold" },
            { id: "call", label: `Call ${formatMoney(scenario.toCall)}` },
          ]
        : EQUITY_BRACKETS.map((bracket) => ({ id: bracket.id, label: bracket.label }));

    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-baseline justify-between gap-4">
          <span className="label">
            {POKER_PRACTICE_TOPICS.find((entry) => entry.id === topic)?.label}
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
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <span className="font-mono text-[9px] tracking-[0.26em] text-[rgba(236,229,216,0.42)] uppercase">
                {STREET_LABEL[scenario.street]}
              </span>
              <div className="flex gap-1.5 [--card-w:clamp(2.6rem,8vw,3.6rem)]">
                {scenario.board.map((card) => (
                  <CardRow key={card.id} cards={[card]} />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="[--card-w:clamp(3rem,9.5vw,4.4rem)]">
                <CardRow cards={scenario.hole} />
              </div>
              <span className="font-mono text-[9px] tracking-[0.22em] text-[rgba(236,229,216,0.42)] uppercase">
                Your hand
              </span>
            </div>

            {scenario.topic === "pot-odds" ? (
              <div className="grid w-full max-w-sm grid-cols-2 gap-px border border-[rgba(236,229,216,0.16)] bg-[rgba(236,229,216,0.16)]">
                <div className="bg-[rgba(8,25,20,0.75)] px-4 py-3 text-center">
                  <span className="font-mono text-[9px] tracking-[0.16em] text-[rgba(236,229,216,0.45)] uppercase">
                    Pot
                  </span>
                  <p className="tabular mt-1.5 text-[17px] text-[rgba(236,229,216,0.95)]">
                    {formatMoney(scenario.pot)}
                  </p>
                </div>
                <div className="bg-[rgba(8,25,20,0.75)] px-4 py-3 text-center">
                  <span className="font-mono text-[9px] tracking-[0.16em] text-[rgba(236,229,216,0.45)] uppercase">
                    To call
                  </span>
                  <p className="tabular mt-1.5 text-[17px] text-[rgba(236,229,216,0.95)]">
                    {formatMoney(scenario.toCall)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "mt-6 grid gap-2",
            scenario.topic === "pot-odds" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
          )}
        >
          {options.map((option) => {
            const isChosen = pending?.chosen === option.id;
            const isAnswer = Boolean(pending) && scenario.correct === option.id;
            return (
              <Button
                key={option.id}
                variant={pending ? "quiet" : "secondary"}
                size="lg"
                plate
                disabled={Boolean(pending)}
                onClick={() => answer(option.id)}
                className={cn(
                  "disabled:opacity-100",
                  isAnswer && "border-positive text-positive",
                  isChosen && !pending?.correct && "border-negative text-negative",
                )}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        <AnimatePresence>
          {pending ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="mt-6 border border-line bg-surface-2 p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="display text-[20px]">
                  {pending.correct ? "Correct." : "Not this one."}
                </p>
                <span className="label">
                  {formatPercent(scenario.equity)} equity
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-2">
                {explainScenario(scenario)}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-fg-3">
                Equity is measured by simulating the hand against one random opponent holding. A
                real opponent does not hold random cards, so this is the price check, not the whole
                decision.
              </p>
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
    return (
      <div className="mx-auto w-full max-w-3xl">
        <span className="label">Practice complete</span>
        <h1 className="display mt-4 text-[clamp(2.2rem,5.5vw,3.2rem)] leading-none">
          {correct} of {answers.length}
        </h1>
        <hr className="rule-double mt-8" />
        <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-3">
          <Stat
            label="Accuracy"
            value={formatPercent(answers.length ? correct / answers.length : 0)}
          />
          <Stat
            label="Topic"
            value={POKER_PRACTICE_TOPICS.find((entry) => entry.id === topic)?.label ?? topic}
            size="sm"
          />
          <Stat label="Questions" value={answers.length} />
        </div>

        {answers.some((entry) => !entry.correct) ? (
          <section className="mt-12">
            <h2 className="text-[15px] font-semibold">Missed hands</h2>
            <ol className="mt-4 divide-y divide-[var(--line)] border-y border-line">
              {answers
                .filter((entry) => !entry.correct)
                .map((entry, position) => (
                  <li key={position} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                    <span className="tabular w-24 shrink-0 text-[13px] text-fg-2">
                      {entry.scenario.hole.map((card) => card.rank).join(" ")} on the{" "}
                      {entry.scenario.street}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] text-fg-2">
                      {entry.scenario.madeHand}
                    </span>
                    <span className="tabular shrink-0 text-[13px]">
                      {formatPercent(entry.scenario.equity)} equity
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" plate onClick={() => start(topic, size)}>
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
        <span className="label">Poker</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">Practice</h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Two drills, both about the part of poker that is arithmetic rather than opinion: the
          price the pot is offering, and how much your hand is actually worth. Everything else at
          the table is judgement, and drills cannot teach that honestly.
        </p>
      </header>

      <div className="mt-12">
        <SectionHead index="01" title="Choose a topic" />
        <div className="mt-8 grid sm:grid-cols-2">
          {POKER_PRACTICE_TOPICS.map((entry) => (
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
            options={POKER_PRACTICE_SIZES.map((value) => ({
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
        <SectionHead index="03" title="Why these two" />
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-[15px] font-semibold">
              <Term id="pot-odds">Pot odds</Term>
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-fg-2">
              Every call has a price. Working out that price takes a second and settles more
              decisions than any read ever will.
            </p>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold">
              <Term id="equity">Equity</Term>
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-fg-2">
              Beginners badly misjudge how often a draw gets there. Guessing the bracket a few
              dozen times fixes that faster than memorising a table.
            </p>
          </div>
        </div>

        {learning && learning.practice.answered > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
            <Stat label="Drills answered" value={learning.practice.answered} />
            <Stat label="Sessions" value={learning.practice.sessions} />
            <Stat
              label="Drill accuracy"
              value={formatPercent(
                learning.practice.correct / Math.max(1, learning.practice.answered),
              )}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-14 flex flex-wrap gap-3">
        <LinkButton href="/games/poker" variant="secondary" size="md" plate>
          Play a session
        </LinkButton>
        <LinkButton href="/games/poker/rules" variant="ghost" size="md" plate>
          Poker rules
        </LinkButton>
      </div>
    </div>
  );
}
