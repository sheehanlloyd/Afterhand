"use client";

import { cn } from "@/lib/utils/cn";

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-6 py-3.5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[14px]">{label}</span>
        {description ? (
          <span className="mt-1 block text-[13px] leading-snug text-fg-2">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-10 shrink-0 border transition-colors duration-150",
          checked ? "border-accent-2 bg-accent-2/25" : "border-line-2 bg-transparent",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 left-[3px] h-3.5 w-3.5 -translate-y-1/2 transition-transform duration-150 ease-[cubic-bezier(0.2,0.9,0.28,1)]",
            checked ? "translate-x-[18px] bg-accent-2" : "bg-fg-3",
          )}
        />
      </button>
    </label>
  );
}
