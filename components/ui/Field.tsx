"use client";

import { ReactNode, useId, useState } from "react";
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

/**
 * A number input you can actually edit.
 *
 * The obvious implementation sends `Number(event.target.value)` straight to the
 * parent on every keystroke, and it makes the field almost unusable: clearing it
 * reads as `Number("") === 0`, the parent clamps that to its own minimum, and
 * the field repaints with that minimum before the next character arrives. A
 * reader selecting the table minimum and retyping it as 25 got 125, because the
 * clamped 1 was still sitting in the box in front of what they typed.
 *
 * So the box keeps the text the reader is actually typing, and the parent is
 * only told about values that are complete numbers. An empty box, a lone minus
 * sign and a trailing decimal point are all legitimate things to be holding
 * halfway through typing a number, and none of them are worth a repaint. On
 * blur the box resyncs to whatever the parent settled on, so an edit abandoned
 * midway shows the committed value rather than the fragment.
 */
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

  const committed = Number.isFinite(value) ? String(value) : "";
  const [draft, setDraft] = useState<string | null>(null);

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
        value={draft ?? committed}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          if (text.trim() === "") return;
          const next = Number(text);
          if (Number.isFinite(next)) onChange(next);
        }}
        onBlur={() => setDraft(null)}
        className="tabular w-full bg-transparent text-[14px] text-fg outline-none"
      />
    </div>
  );
}
