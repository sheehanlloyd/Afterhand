import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
  size = "md",
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "bad" | "accent";
  hint?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tones = {
    neutral: "text-fg",
    good: "text-positive",
    bad: "text-negative",
    accent: "text-accent-2",
  };
  const sizes = {
    sm: "text-[15px]",
    md: "text-[21px]",
    lg: "text-[clamp(1.6rem,4vw,2.4rem)]",
  };
  return (
    <div className={cn("min-w-0", className)}>
      <div className="label">{label}</div>
      <div className={cn("tabular mt-2 leading-none font-medium", sizes[size], tones[tone])}>
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[12.5px] text-fg-2">{hint}</div> : null}
    </div>
  );
}
