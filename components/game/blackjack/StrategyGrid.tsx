"use client";

import { useMemo } from "react";
import {
  DEALER_KEYS,
  DealerKey,
  HARD_TOTALS,
  PAIR_KEYS,
  SOFT_TOTALS,
  StrategyCode,
  codeLabel,
  lookupChart,
} from "@/lib/strategy/blackjack-strategy";
import { BlackjackRules } from "@/lib/games/blackjack/types";
import { Card, Rank } from "@/types";
import { BlackjackLearning, MasteryLevel, masteryFor } from "@/lib/storage/learning";
import { cn } from "@/lib/utils/cn";

const MASTERY_LABEL: Record<MasteryLevel, string> = {
  unseen: "Unseen",
  learning: "Learning",
  improving: "Improving",
  strong: "Strong",
};

/**
 * Mastery is shown with fill weight rather than hue, so the grid stays
 * readable without relying on colour and never turns into a wall of red.
 */
const MASTERY_FILL: Record<MasteryLevel, string> = {
  unseen: "bg-transparent",
  learning: "bg-accent/[0.10]",
  improving: "bg-accent/[0.26]",
  strong: "bg-accent/[0.5]",
};

const CODE_LETTER: Record<StrategyCode, string> = {
  H: "H",
  S: "S",
  D: "D",
  Ds: "D",
  P: "P",
  Pd: "P",
  R: "R",
  Rs: "R",
  Rp: "R",
};

let syntheticId = 0;
function synthetic(rank: Rank): Card {
  syntheticId += 1;
  return { rank, suit: "spades", id: `grid-${rank}-${syntheticId}` };
}

function cardsForHardTotal(total: number): Card[] {
  const high = Math.min(10, total - 2);
  return [synthetic(String(high) as Rank), synthetic(String(total - high) as Rank)];
}

function cardsForSoftTotal(total: number): Card[] {
  return [synthetic("A"), synthetic(String(total - 11) as Rank)];
}

function cardsForPair(key: string): Card[] {
  const rank = (key === "10" ? "10" : key) as Rank;
  return [synthetic(rank), synthetic(rank)];
}

type Section = "hard" | "soft" | "pair";

interface GridRow {
  label: string;
  cards: Card[];
}

export function StrategyGrid({
  rules,
  learning,
  onPractice,
}: {
  rules: BlackjackRules;
  learning: BlackjackLearning | null;
  onPractice?: (section: Section) => void;
}) {
  const sections = useMemo(() => {
    const hard: GridRow[] = [...HARD_TOTALS]
      .reverse()
      .map((total) => ({ label: String(total), cards: cardsForHardTotal(total) }));
    const soft: GridRow[] = [...SOFT_TOTALS]
      .reverse()
      .map((total) => ({ label: `Soft ${total}`, cards: cardsForSoftTotal(total) }));
    const pairs: GridRow[] = PAIR_KEYS.map((key) => ({
      label: `${key},${key}`,
      cards: cardsForPair(key),
    }));
    return [
      { id: "hard" as Section, title: "Hard totals", rows: hard },
      { id: "soft" as Section, title: "Soft totals", rows: soft },
      { id: "pair" as Section, title: "Pairs", rows: pairs },
    ];
  }, []);

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2">
            <h3 className="text-[15px] font-semibold">{section.title}</h3>
            {onPractice ? (
              <button
                type="button"
                onClick={() => onPractice(section.id)}
                className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
              >
                Practice this
              </button>
            ) : null}
          </div>

          <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] border-collapse">
              <caption className="sr-only">
                {section.title} basic strategy with your mastery of each situation
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="label w-16 pb-2 text-left">
                    You
                  </th>
                  {DEALER_KEYS.map((key) => (
                    <th key={key} scope="col" className="label pb-2 text-center">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="tabular border-t border-line py-1 pr-2 text-left text-[11.5px] font-normal whitespace-nowrap text-fg-2"
                    >
                      {row.label}
                    </th>
                    {DEALER_KEYS.map((dealer) => (
                      <GridCell
                        key={dealer}
                        section={section.id}
                        row={row}
                        dealer={dealer}
                        rules={rules}
                        learning={learning}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-5">
        <span className="label">Mastery</span>
        {(["unseen", "learning", "improving", "strong"] as MasteryLevel[]).map((level) => (
          <span key={level} className="inline-flex items-center gap-2 text-[12.5px] text-fg-2">
            <span className={cn("block h-3.5 w-3.5 border border-line", MASTERY_FILL[level])} />
            {MASTERY_LABEL[level]}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-fg-3 uppercase">
          H hit / S stand / D double / P split / R surrender
        </span>
      </div>
    </div>
  );
}

function GridCell({
  section,
  row,
  dealer,
  rules,
  learning,
}: {
  section: Section;
  row: GridRow;
  dealer: DealerKey;
  rules: BlackjackRules;
  learning: BlackjackLearning | null;
}) {
  const lookup = lookupChart(row.cards, dealer, rules, section === "pair");
  const key = `${section}|${row.label}|${dealer}`;
  const mastery = masteryFor(learning?.cells[key]);

  return (
    <td className="border-t border-line p-[2px]">
      <span
        title={`${row.label} against ${dealer}: ${codeLabel(lookup.code)}. ${MASTERY_LABEL[mastery]}.`}
        className={cn(
          "flex h-7 items-center justify-center border border-line font-mono text-[11px] text-fg",
          MASTERY_FILL[mastery],
        )}
      >
        {CODE_LETTER[lookup.code]}
        <span className="sr-only">
          {" "}
          {codeLabel(lookup.code)}, {MASTERY_LABEL[mastery]}
        </span>
      </span>
    </td>
  );
}
