"use client";

import { ReactNode, useId } from "react";
import { cn } from "@/lib/utils/cn";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">{label}</span>
        {hint ? <span className="font-mono text-[10px] text-fg-3">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-[12.5px] text-negative">{error}</p> : null}
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  id,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div
      className={cn(
        "flex h-10 items-center border border-line bg-field px-3 transition-colors focus-within:border-accent-2",
        className,
      )}
    >
      {prefix ? <span className="tabular mr-1 text-[14px] text-fg-3">{prefix}</span> : null}
      <input
        id={inputId}
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="tabular w-full bg-transparent text-[14px] text-fg outline-none"
      />
    </div>
  );
}
