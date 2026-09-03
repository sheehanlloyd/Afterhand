"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DecisionRecord } from "@/lib/games/blackjack/types";
import { actionLabel } from "@/lib/strategy/blackjack-strategy";
import { strategyRank } from "@/lib/games/blackjack/hand";
import { HandSummary } from "@/lib/store/blackjack-session";
import { formatMoney } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { QUALITY_LABEL, QualityMark } from "./QualityMark";
import { CATEGORY_LABEL } from "@/lib/storage/learning";
import { cn } from "@/lib/utils/cn";

const SEVERITY = {
  "major-mistake": 0,
  mistake: 1,
  acceptable: 2,
  optimal: 3,
} as const;

/** The decision most worth talking about comes first. */
export function primaryDecision(decisions: DecisionRecord[]): DecisionRecord | null {
  if (decisions.length === 0) return null;
  return [...decisions].sort((a, b) => SEVERITY[a.quality] - SEVERITY[b.quality])[0];
}

function describe(record: DecisionRecord): string {
  const verb =
    record.taken === "insurance"
      ? "took insurance"
      : record.taken === "decline-insurance"
        ? "declined insurance"
        : `${pastTense(record.taken)}`;
  const dealer = strategyRank(record.dealerUpcard.rank);
  const hand = record.isPair
    ? `a pair of ${strategyRank(record.playerCards[0].rank)}s`
    : record.soft
      ? `soft ${record.total}`
      : `${record.total}`;
  if (record.taken === "insurance" || record.taken === "decline-insurance") {
    return `You ${verb} with ${hand} against a dealer Ace.`;
  }
  return `You ${verb} on ${hand} against a dealer ${dealer}.`;
}

function pastTense(action: string): string {
  switch (action) {
    case "hit": return "hit";
    case "stand": return "stood";
    case "double": return "doubled";
    case "split": return "split";
    case "surrender": return "surrendered";
    default: return action;
  }
}

export function HandReview({
  summary,
  onDismiss,
  onNextHand,
  compact,
}: {
  summary: HandSummary;
  onDismiss: () => void;
  onNextHand?: () => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const primary = useMemo(() => primaryDecision(summary.decisions), [summary.decisions]);
  const headingRef = useRef<HTMLParagraphElement | null>(null);

  /**
   * The review opens without trapping focus — the result behind it stays
   * visible and reachable — but it should still receive focus itself, and
   * hand it back to whatever opened it once it closes, rather than leaving
   * the keyboard user's position undefined.
   */
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  const tally = useMemo(() => {
    const counts = { optimal: 0, acceptable: 0, mistake: 0, "major-mistake": 0 };
    summary.decisions.forEach((decision) => {
      counts[decision.quality] += 1;
    });
    return counts;
  }, [summary.decisions]);

  const headline = (() => {
    if (summary.decisions.length === 0) return "Nothing to decide.";
    if (tally["major-mistake"] > 0) return "Worth a second look.";
    if (tally.mistake > 0) return "One to look at.";
    if (tally.acceptable > 0) return "Close to the book.";
    return "Played by the book.";
  })();

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <span className="label">Hand {summary.number} review</span>
          <p
            ref={headingRef}
            tabIndex={-1}
            className="display mt-1.5 text-[20px] leading-none focus:outline-2 focus:outline-accent-2 focus:outline-offset-4"
          >
            {headline}
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
        {primary ? (
          <div>
            <p className="text-[15px] leading-relaxed">{describe(primary)}</p>

            <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
              <div className="bg-surface-2 px-3.5 py-3">
                <span className="label">Your move</span>
                <p className="mt-1.5 text-[14px]">{actionLabel(primary.taken)}</p>
              </div>
              <div className="bg-surface-2 px-3.5 py-3">
                <span className="label">Better move</span>
                <p className="mt-1.5 text-[14px]">
                  {primary.recommended === primary.taken ? "Same" : actionLabel(primary.recommended)}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <QualityMark quality={primary.quality} />
            </div>

            <div className="mt-5">
              <span className="label">Why</span>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{primary.explanation}</p>
            </div>

            <div className="mt-5 border-l-2 border-accent-2 pl-4">
              <span className="label">Remember</span>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{primary.remember}</p>
            </div>
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-fg-2">
            No player decisions came up in this hand, so there is nothing to review.
          </p>
        )}

        {summary.note ? (
          <p className="mt-5 border border-caution/40 px-3.5 py-3 text-[13px] leading-relaxed text-caution">
            {summary.note}
          </p>
        ) : null}

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
                <span className="label">Decision timeline</span>
                <ol className="mt-3 divide-y divide-[var(--line)] border-y border-line">
                  {summary.decisions.map((decision) => (
                    <li key={decision.id} className="flex items-start gap-3 py-3">
                      <span className="label w-[4.5rem] shrink-0 pt-1">{decision.handLabel}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px]">
                          {decision.rowLabel} against {decision.dealerKey}, {" "}
                          {actionLabel(decision.taken).toLowerCase()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-[0.1em] text-fg-3 uppercase">
                          {CATEGORY_LABEL[decision.category]} / {QUALITY_LABEL[decision.quality]}
                        </p>
                      </div>
                      <QualityMark quality={decision.quality} withLabel={false} className="mt-0.5" />
                    </li>
                  ))}
                </ol>

                {primary ? (
                  <div className="mt-5">
                    <span className="label">The numbers</span>
                    <ul className="mt-3 space-y-2">
                      {primary.detail.map((line, index) => (
                        <li
                          key={index}
                          className="flex gap-2.5 text-[12.5px] leading-relaxed text-fg-2"
                        >
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
        {onNextHand && !compact ? (
          <Button variant="primary" size="sm" plate className="ml-auto" onClick={onNextHand}>
            Next hand
          </Button>
        ) : null}
      </div>
    </div>
  );
}
