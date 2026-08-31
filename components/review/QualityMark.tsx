import { DecisionQuality } from "@/lib/games/blackjack/types";
import { cn } from "@/lib/utils/cn";

export const QUALITY_LABEL: Record<DecisionQuality, string> = {
  optimal: "Optimal",
  acceptable: "Acceptable",
  mistake: "Mistake",
  "major-mistake": "Major mistake",
};

const QUALITY_TONE: Record<DecisionQuality, string> = {
  optimal: "border-positive/60 text-positive",
  acceptable: "border-caution/55 text-caution",
  mistake: "border-negative/50 text-negative",
  "major-mistake": "border-negative text-negative",
};

/**
 * Quality is carried by a mark and a word, never by colour alone.
 * Filled squares read as a rating from one glance without relying on hue.
 */
export function QualityMark({
  quality,
  className,
  withLabel = true,
}: {
  quality: DecisionQuality;
  className?: string;
  withLabel?: boolean;
}) {
  const filled =
    quality === "optimal" ? 3 : quality === "acceptable" ? 2 : quality === "mistake" ? 1 : 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-1.5 py-[3px]",
        QUALITY_TONE[quality],
        className,
      )}
    >
      <span aria-hidden="true" className="flex gap-[2px]">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "block h-[6px] w-[6px] border border-current",
              index < filled ? "bg-current" : "bg-transparent",
            )}
          />
        ))}
      </span>
      {withLabel ? (
        <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase">
          {QUALITY_LABEL[quality]}
        </span>
      ) : (
        <span className="sr-only">{QUALITY_LABEL[quality]}</span>
      )}
    </span>
  );
}
