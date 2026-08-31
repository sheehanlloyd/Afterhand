"use client";

import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  size = "md",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex divide-x divide-[var(--line)] border border-line", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative font-mono tracking-[0.12em] uppercase transition-colors duration-150",
              size === "sm" ? "px-3 py-1.5 text-[10px]" : "px-4 py-2.5 text-[11px]",
              active ? "bg-fg/[0.07] text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {option.label}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-0 bottom-0 h-[2px] transition-opacity duration-150",
                active ? "bg-accent-2 opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
