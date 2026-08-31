export type ButtonVariant = "primary" | "secondary" | "quiet" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonBase =
  "relative inline-flex items-center justify-center gap-2 rounded-sm select-none " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 " +
  "disabled:pointer-events-none disabled:opacity-35";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--btn-bg)] text-[var(--btn-fg)] " +
    "hover:brightness-[1.08] active:brightness-95",
  secondary:
    "border border-line-2 bg-transparent text-fg hover:bg-fg/[0.06] active:bg-fg/[0.1]",
  quiet: "border border-line bg-surface-2 text-fg hover:border-line-2 active:bg-fg/[0.06]",
  ghost: "border border-transparent text-fg-2 hover:text-fg hover:bg-fg/[0.05]",
  danger: "border border-negative/45 bg-transparent text-negative hover:bg-negative/10",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

/** Uppercase mono lettering, used for table controls and eyebrow actions. */
export const plateType = "font-mono text-[11px] tracking-[0.14em] uppercase";
