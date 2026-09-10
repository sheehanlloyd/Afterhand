import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Numbered editorial section head with the signature double rule. */
export function SectionHead({
  index,
  title,
  note,
  className,
}: {
  index: string;
  title: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <hr className="rule-double" />
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-8">
        <span className="label shrink-0 sm:w-12 sm:pb-1">{index}</span>
        <h2 className="display flex-1 text-[clamp(1.65rem,3.4vw,2.25rem)] leading-[1.05]">
          {title}
        </h2>
        {note ? (
          <span className="text-[13.5px] leading-relaxed text-fg-2 sm:max-w-xs sm:pb-1">
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Quiet form/section label.
 *
 * Setup, practice, and settings already have a page title. Numbering those
 * fields as 01 / 02 / 03 made every interior page look like the same magazine
 * spread. A kicker is just the name of the field.
 */
export function Kicker({
  title,
  note,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6", className)}>
      <h2 className="label">{title}</h2>
      {note ? (
        <span className="text-[13px] leading-relaxed text-fg-2 sm:max-w-xs sm:text-right">
          {note}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Interior display heading without a number or double rule.
 *
 * Used on pages that already opened with a title, so a second numbered
 * SectionHead would just reprint the homepage.
 */
export function InteriorHead({
  title,
  note,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <h2 className="display text-[clamp(1.55rem,3.1vw,2.05rem)] leading-[1.08]">{title}</h2>
      {note ? <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-fg-2">{note}</p> : null}
    </div>
  );
}
