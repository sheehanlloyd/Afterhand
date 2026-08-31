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
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
        <span className="label shrink-0 pt-1 sm:w-12">{index}</span>
        <h2 className="display flex-1 text-[clamp(1.5rem,3.2vw,2.1rem)]">{title}</h2>
        {note ? <span className="text-[13px] text-fg-2 sm:max-w-xs">{note}</span> : null}
      </div>
    </div>
  );
}
