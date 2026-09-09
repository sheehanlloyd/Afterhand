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
