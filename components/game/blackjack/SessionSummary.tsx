"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DecisionCategory } from "@/lib/games/blackjack/types";
import { HandSummary } from "@/lib/store/blackjack-session";
import {
  BLACKJACK_CATEGORIES,
  CATEGORY_LABEL,
  CategoryStat,
  categoryAccuracy,
  rankCategories,
} from "@/lib/storage/learning";
import { formatDuration, formatMoney, formatPercent } from "@/lib/utils/format";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { QUALITY_LABEL, QualityMark } from "@/components/review/QualityMark";
import { GameMode } from "@/types";

function emptyStat(): CategoryStat {
  return { seen: 0, optimal: 0, acceptable: 0, mistake: 0, major: 0 };
}

export function SessionSummary({
  mode,
  startingBankroll,
  endingBankroll,
  history,
  durationMs,
  onNewSession,
  practiceHref,
}: {
  mode: GameMode;
  startingBankroll: number;
  endingBankroll: number;
  history: HandSummary[];
  durationMs: number;
  onNewSession: () => void;
  practiceHref: string;
}) {
  const net = endingBankroll - startingBankroll;

  const analysis = useMemo(() => {
    const categories = BLACKJACK_CATEGORIES.reduce(
      (acc, key) => {
        acc[key] = emptyStat();
        return acc;
      },
      {} as Record<DecisionCategory, CategoryStat>,
    );

    let decisions = 0;
    let credit = 0;
    const counts = { optimal: 0, acceptable: 0, mistake: 0, "major-mistake": 0 };

    for (const hand of history) {
      for (const decision of hand.decisions) {
        decisions += 1;
        counts[decision.quality] += 1;
        credit += decision.quality === "optimal" ? 1 : decision.quality === "acceptable" ? 0.5 : 0;
        const stat = categories[decision.category];
        stat.seen += 1;
        if (decision.quality === "optimal") stat.optimal += 1;
        else if (decision.quality === "acceptable") stat.acceptable += 1;
        else if (decision.quality === "mistake") stat.mistake += 1;
        else stat.major += 1;
      }
    }

    return {
      decisions,
      counts,
      accuracy: decisions > 0 ? credit / decisions : null,
      categories,
      ranking: rankCategories(categories, 3),
    };
  }, [history]);

  const handsPlayed = history.length;

  return (
    <div className="mx-auto w-full max-w-[var(--shell-max)] px-5 py-14 sm:px-8 sm:py-20">
      <span className="label">Blackjack</span>
      <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">Session complete</h1>

      <hr className="rule-double mt-9" />

      <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Starting bankroll" value={formatMoney(startingBankroll)} />
        <Stat label="Ending bankroll" value={formatMoney(endingBankroll)} />
        <Stat
          label="Net result"
          value={`${net > 0 ? "+" : ""}${formatMoney(net)}`}
          tone={net > 0 ? "good" : net < 0 ? "bad" : "neutral"}
        />
        <Stat label="Hands played" value={handsPlayed} />
        <Stat label="Time played" value={formatDuration(durationMs)} />
      </div>

      {mode === "learn" ? (
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4 border-b border-fg pb-3">
            <h2 className="display text-[24px]">Decision quality</h2>
            <span className="label">{analysis.decisions} decisions</span>
          </div>

          {analysis.decisions === 0 ? (
            <p className="mt-6 text-[14.5px] leading-relaxed text-fg-2">
              No decisions were recorded in this session. Play a few hands and the breakdown will
              appear here.
            </p>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
                <Stat
                  label="Strategy accuracy"
                  value={formatPercent(analysis.accuracy ?? 0)}
                  size="lg"
                />
                <Stat label="Optimal" value={analysis.counts.optimal} />
                <Stat label="Mistakes" value={analysis.counts.mistake} />
                <Stat label="Major mistakes" value={analysis.counts["major-mistake"]} />
              </div>

              <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-fg-2">
                Accuracy counts decisions, not money. A correct decision that lost the hand still
                counts as correct, and acceptable calls count as half credit.
              </p>

              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <div>
                  <span className="label">Strongest</span>
                  <p className="display mt-2 text-[22px]">
                    {analysis.ranking.strongest
                      ? CATEGORY_LABEL[analysis.ranking.strongest]
                      : "Not enough hands yet"}
                  </p>
                </div>
                <div>
                  <span className="label">Needs work</span>
                  <p className="display mt-2 text-[22px]">
                    {analysis.ranking.weakest
                      ? CATEGORY_LABEL[analysis.ranking.weakest]
                      : "Not enough hands yet"}
                  </p>
                </div>
              </div>

              <dl className="mt-10 divide-y divide-[var(--line)] border-y border-line">
                {BLACKJACK_CATEGORIES.filter((key) => analysis.categories[key].seen > 0).map(
                  (key) => {
                    const stat = analysis.categories[key];
                    const accuracy = categoryAccuracy(stat) ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-4 py-3.5">
                        <dt className="min-w-0 flex-1 text-[14px]">{CATEGORY_LABEL[key]}</dt>
                        <dd className="flex shrink-0 items-center gap-4">
                          <span className="label">{stat.seen} seen</span>
                          <div className="hidden h-[3px] w-28 bg-fg/10 sm:block">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${Math.round(accuracy * 100)}%` }}
                            />
                          </div>
                          <span className="tabular w-12 text-right text-[13.5px]">
                            {formatPercent(accuracy)}
                          </span>
                        </dd>
                      </div>
                    );
                  },
                )}
              </dl>
            </>
          )}
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4 border-b border-fg pb-3">
            <h2 className="display text-[24px]">Hands</h2>
            <span className="label">Most recent first</span>
          </div>
          <ol className="mt-6 divide-y divide-[var(--line)] border-y border-line">
            {history.slice(0, 12).map((hand) => {
              const worst = [...hand.decisions].sort(
                (a, b) =>
                  ["major-mistake", "mistake", "acceptable", "optimal"].indexOf(a.quality) -
                  ["major-mistake", "mistake", "acceptable", "optimal"].indexOf(b.quality),
              )[0];
              return (
                <li key={hand.number} className="flex items-center gap-4 py-3">
                  <span className="label w-10 shrink-0">
                    {String(hand.number).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] text-fg-2">
                    {hand.results
                      .map((result) => result.outcome.replace("-", " "))
                      .join(", ")}
                  </span>
                  {worst ? (
                    <span className="hidden sm:block">
                      <QualityMark quality={worst.quality} />
                    </span>
                  ) : (
                    <span className="label hidden sm:block">No decisions</span>
                  )}
                  <span
                    className={
                      "tabular w-20 shrink-0 text-right text-[13.5px] " +
                      (hand.net > 0
                        ? "text-positive"
                        : hand.net < 0
                          ? "text-negative"
                          : "text-fg-2")
                    }
                  >
                    {hand.net > 0 ? "+" : ""}
                    {formatMoney(hand.net)}
                  </span>
                </li>
              );
            })}
          </ol>
          {analysis.decisions > 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-fg-2">
              {(["optimal", "acceptable", "mistake", "major-mistake"] as const).map((quality) => (
                <span key={quality} className="inline-flex items-center gap-2">
                  <QualityMark quality={quality} withLabel={false} />
                  {QUALITY_LABEL[quality]}
                </span>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" plate onClick={onNewSession}>
          New session
        </Button>
        <LinkButton href={practiceHref} variant="secondary" size="lg" plate>
          Practice weak areas
        </LinkButton>
        <Link
          href="/"
          className="ml-1 font-mono text-[11px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
