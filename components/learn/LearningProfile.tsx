"use client";


import Link from "next/link";
import {
  BLACKJACK_CATEGORIES,
  CATEGORY_LABEL,
  categoryAccuracy,
  loadBlackjackLearning,
  overallAccuracy,
  rankCategories,
} from "@/lib/storage/learning";
import {
  POKER_ASSESSMENT_LABEL,
  loadBaccaratLearning,
  loadPokerLearning,
  loadRouletteLearning,
  pokerCommonIssue,
} from "@/lib/storage/learning-games";
import { Stat } from "@/components/ui/Stat";
import { LinkButton } from "@/components/ui/LinkButton";
import { formatPercent } from "@/lib/utils/format";
import { storageAvailable } from "@/lib/storage/storage";
import { useClientValue } from "@/lib/storage/use-client-value";

export function LearningProfile() {
  const blackjack = useClientValue("learning.blackjack", loadBlackjackLearning);
  const poker = useClientValue("learning.poker", loadPokerLearning);
  const baccarat = useClientValue("learning.baccarat", loadBaccaratLearning);
  const roulette = useClientValue("learning.roulette", loadRouletteLearning);
  const storable = useClientValue("storage.available", storageAvailable) ?? true;

  if (!blackjack || !poker || !baccarat || !roulette) {
    return <div className="mt-10 h-40 border border-dashed border-line" aria-hidden="true" />;
  }

  const accuracy = overallAccuracy(blackjack);
  const ranking = rankCategories(blackjack.categories, 3);
  const issue = pokerCommonIssue(poker);
  const anyBlackjack = blackjack.decisions > 0 || blackjack.practice.answered > 0;

  return (
    <div className="space-y-16">
      {!storable ? (
        <p className="border border-caution/45 px-4 py-3 text-[13.5px] text-caution">
          Browser storage is unavailable, so progress will not be kept between visits. Everything
          else works normally.
        </p>
      ) : null}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-fg pb-3">
          <h2 className="display text-[26px]">Blackjack</h2>
          <Link
            href="/games/blackjack/practice"
            className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
          >
            Practice
          </Link>
        </div>

        {anyBlackjack ? (
          <>
            <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
              <Stat
                label="Strategy accuracy"
                value={accuracy === null ? "Not yet" : formatPercent(accuracy)}
                size="lg"
              />
              <Stat label="Hands reviewed" value={blackjack.handsReviewed} />
              <Stat
                label="Strongest topic"
                value={ranking.strongest ? CATEGORY_LABEL[ranking.strongest] : "Not enough yet"}
                size="sm"
              />
              <Stat
                label="Weakest topic"
                value={ranking.weakest ? CATEGORY_LABEL[ranking.weakest] : "Not enough yet"}
                size="sm"
              />
            </div>

            {blackjack.decisions > 0 ? (
              <dl className="mt-10 divide-y divide-[var(--line)] border-y border-line">
                {BLACKJACK_CATEGORIES.filter((key) => blackjack.categories[key].seen > 0).map(
                  (key) => {
                    const stat = blackjack.categories[key];
                    const value = categoryAccuracy(stat) ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-4 py-3.5">
                        <dt className="min-w-0 flex-1 text-[14px]">{CATEGORY_LABEL[key]}</dt>
                        <dd className="flex shrink-0 items-center gap-4">
                          <span className="label">{stat.seen} seen</span>
                          <div className="hidden h-[3px] w-28 bg-fg/10 sm:block">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${Math.round(value * 100)}%` }}
                            />
                          </div>
                          <span className="tabular w-12 text-right text-[13.5px]">
                            {formatPercent(value)}
                          </span>
                        </dd>
                      </div>
                    );
                  },
                )}
              </dl>
            ) : null}

            {blackjack.practice.answered > 0 ? (
              <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
                <Stat label="Practice sessions" value={blackjack.practice.sessions} />
                <Stat label="Drills answered" value={blackjack.practice.answered} />
                <Stat
                  label="Drill accuracy"
                  value={formatPercent(
                    blackjack.practice.correct / Math.max(1, blackjack.practice.answered),
                  )}
                />
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No learning history yet."
            body="Play a few hands in Learn Mode and your review history will appear here."
            action={{ href: "/games/blackjack", label: "Play blackjack" }}
          />
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-fg pb-3">
          <h2 className="display text-[26px]">Poker</h2>
          <Link
            href="/games/poker/practice"
            className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
          >
            Practice
          </Link>
        </div>

        {poker.decisions > 0 || poker.practice.answered > 0 ? (
          <>
            <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
              <Stat label="Hands reviewed" value={poker.handsReviewed} />
              <Stat label="Decisions" value={poker.decisions} />
              <Stat
                label="Strong or reasonable"
                value={formatPercent(
                  (poker.assessments.strong + poker.assessments.reasonable) /
                    Math.max(1, poker.decisions),
                )}
              />
              <Stat label="Common issue" value={issue ?? "None yet"} size="sm" />
            </div>

            {poker.decisions > 0 ? (
              <dl className="mt-10 divide-y divide-[var(--line)] border-y border-line">
                {(
                  Object.keys(POKER_ASSESSMENT_LABEL) as Array<
                    keyof typeof POKER_ASSESSMENT_LABEL
                  >
                ).map((key) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-[14px]">{POKER_ASSESSMENT_LABEL[key]}</dt>
                    <dd className="tabular text-[13.5px] text-fg-2">{poker.assessments[key]}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {poker.practice.answered > 0 ? (
              <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
                <Stat label="Practice sessions" value={poker.practice.sessions} />
                <Stat label="Drills answered" value={poker.practice.answered} />
                <Stat
                  label="Drill accuracy"
                  value={formatPercent(
                    poker.practice.correct / Math.max(1, poker.practice.answered),
                  )}
                />
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No poker hands reviewed yet."
            body="Play a hand of Texas Hold'em in Learn Mode and the review breakdown will show up here."
            action={{ href: "/games/poker", label: "Play poker" }}
          />
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-fg pb-3">
          <h2 className="display text-[26px]">Baccarat and roulette</h2>
        </div>
        {baccarat.handsPlayed > 0 || roulette.spins > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat label="Baccarat hands" value={baccarat.handsPlayed} />
            <Stat
              label="Most used bet"
              value={
                Object.entries(baccarat.bets).sort((a, b) => b[1] - a[1])[0]?.[1]
                  ? Object.entries(baccarat.bets).sort((a, b) => b[1] - a[1])[0][0]
                  : "None"
              }
              size="sm"
              className="capitalize"
            />
            <Stat label="Roulette spins" value={roulette.spins} />
            <Stat label="Roulette bets placed" value={roulette.betsPlaced} />
          </div>
        ) : (
          <EmptyState
            title="Nothing recorded yet."
            body="Baccarat and roulette track how often you use each bet, so you can see which ones you gravitate towards."
            action={{ href: "/games/baccarat", label: "Play baccarat" }}
          />
        )}
      </section>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="mt-8 border border-dashed border-line-2 px-6 py-10 text-center">
      <p className="display text-[20px]">{title}</p>
      <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-fg-2">{body}</p>
      <div className="mt-6">
        <LinkButton href={action.href} variant="secondary" size="md" plate>
          {action.label}
        </LinkButton>
      </div>
    </div>
  );
}
