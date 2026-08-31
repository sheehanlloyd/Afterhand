import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * A small plaque and a serif wordmark, the way a card room marks its door.
 */
export function Logo({
  className,
  compact,
  /** Hides the wordmark below the small breakpoint. */
  responsiveWordmark,
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  responsiveWordmark?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex items-baseline gap-2.5",
        /* On a phone the wordmark is hidden and only the 22px plaque is left,
           which is under the comfortable touch size. This widens the hit area
           to 46px square without moving anything on screen. */
        "after:absolute after:-inset-x-3 after:-inset-y-3 after:content-['']",
        className,
      )}
      aria-label="Afterhand home"
    >
      <span
        aria-hidden="true"
        className="relative grid h-[22px] w-[22px] shrink-0 translate-y-[3px] place-items-center border border-accent-2/70 bg-accent-2/10 transition-colors group-hover:bg-accent-2/20"
      >
        <span className="display text-[13px] leading-none text-accent-2">A</span>
      </span>
      {!compact ? (
        <span
          className={cn(
            "display text-[19px] leading-none tracking-[0.01em]",
            responsiveWordmark && "hidden sm:inline",
          )}
        >
          Afterhand
        </span>
      ) : null}
    </Link>
  );
}
