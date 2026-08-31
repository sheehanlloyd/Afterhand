"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PokerHandSummary } from "@/lib/store/poker-session";
import { ASSESSMENT_COPY, primaryPokerDecision } from "@/lib/games/poker/coach";
import { PokerAssessmentKey } from "@/lib/storage/learning-games";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { SUIT_GLYPH, isRedSuit } from "@/types";
import { cn } from "@/lib/utils/cn";

const TONE: Record<PokerAssessmentKey, string> = {
  strong: "border-positive/60 text-positive",
  reasonable: "border-line-2 text-fg-2",
  questionable: "border-caution/55 text-caution",
  "likely-mistake": "border-negative/55 text-negative",
};

const STREET_ORDER = ["preflop", "flop", "turn", "river"] as const;

const STREET_TITLE: Record<string, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

function CardText({ card }: { card: { rank: string; suit: string } }) {
  const red = isRedSuit(card.suit as never);
  return (
    <span className={cn("tabular", red ? "text-negative" : "text-fg")}>
      {card.rank}
      {SUIT_GLYPH[card.suit as keyof typeof SUIT_GLYPH]}
    </span>
  );
}

export function PokerReview({
  summary,
  onDismiss,
  onNextHand,
}: {
  summary: PokerHandSummary;
  onDismiss: () => void;
  onNextHand?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const primary = useMemo(() => primaryPokerDecision(summary.decisions), [summary.decisions]);

  const byStreet = useMemo(() => {
    return STREET_ORDER.map((street) => ({
      street,
      decisions: summary.decisions.filter((decision) => decision.street === street),
    })).filter((entry) => entry.decisions.length > 0);
  }, [summary.decisions]);

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <span className="label">Hand {summary.number} review</span>
          <p className="display mt-1.5 text-[20px] leading-none">
            {primary ? primary.headline : "Nothing to review."}
          </p>
        </div>
        <span
          className={cn(
            "tabular shrink-0 text-[14px]",
            summary.net > 0 ? "text-positive" : summary.net < 0 ? "text-negative" : "text-fg-2",
          )}
        >
          {summary.net > 0 ? "+" : ""}
          {formatMoney(summary.net)}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="label">Your hand</span>
          <span className="flex gap-2">
            {summary.hole.map((card) => (
              <CardText key={card.id} card={card} />
            ))}
          </span>
          {summary.board.length > 0 ? (
            <>
              <span className="label">Board</span>
              <span className="flex gap-2">
                {summary.board.map((card) => (
                  <CardText key={card.id} card={card} />
                ))}
              </span>
            </>
          ) : null}
        </div>

        {primary ? (
          <div className="mt-5">
            <p className="text-[14.5px] leading-relaxed">{primary.explanation}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "border px-2 py-[3px] font-mono text-[9.5px] tracking-[0.14em] uppercase",
                  TONE[primary.assessment],
                )}
              >
                {ASSESSMENT_COPY[primary.assessment]}
              </span>
              <span className="label">{STREET_TITLE[primary.street] ?? primary.street}</span>
            </div>

            {primary.toCall > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
                <div className="bg-surface-2 px-3.5 py-3">
                  <span className="label">Price needed</span>
                  <p className="tabular mt-1.5 text-[15px]">
                    {formatPercent(primary.requiredEquity)}
                  </p>
                </div>
                <div className="bg-surface-2 px-3.5 py-3">
                  <span className="label">Measured equity</span>
                  <p className="tabular mt-1.5 text-[15px]">{formatPercent(primary.equity)}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-[14px] leading-relaxed text-fg-2">
            You did not act in this hand, so there is nothing to review.
          </p>
        )}

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-6 border-t border-line pt-5">
                <span className="label">Hand history</span>
                <div className="mt-3 space-y-4">
                  {byStreet.map((entry) => (
                    <div key={entry.street}>
                      <p className="font-mono text-[10px] tracking-[0.14em] text-fg-2 uppercase">
                        {STREET_TITLE[entry.street]}
                      </p>
                      <ul className="mt-2 divide-y divide-[var(--line)] border-y border-line">
                        {entry.decisions.map((decision) => (
                          <li key={decision.id} className="flex items-start gap-3 py-2.5">
                            <span className="min-w-0 flex-1 text-[13px]">
                              You {decision.action}
                              {decision.amount > 0 ? ` ${formatMoney(decision.amount)}` : ""} into a
                              pot of {formatMoney(decision.potBefore)}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 border px-1.5 py-[2px] font-mono text-[9px] tracking-[0.12em] uppercase",
                                TONE[decision.assessment],
                              )}
                            >
                              {ASSESSMENT_COPY[decision.assessment]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {primary ? (
                  <div className="mt-5">
                    <span className="label">The numbers</span>
                    <ul className="mt-3 space-y-2">
                      {primary.detail.map((line, index) => (
                        <li key={index} className="flex gap-2.5 text-[12.5px] leading-relaxed text-fg-2">
                          <span aria-hidden="true" className="mt-[7px] h-px w-2.5 shrink-0 bg-fg-3" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line px-5 py-4">
        <Button variant="secondary" size="sm" plate onClick={onDismiss}>
          Got it
        </Button>
        {summary.decisions.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            plate
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        ) : null}
        {onNextHand ? (
          <Button variant="primary" size="sm" plate className="ml-auto" onClick={onNextHand}>
            Next hand
          </Button>
        ) : null}
      </div>
    </div>
  );
}
