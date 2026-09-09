export type ButtonVariant = "primary" | "secondary" | "quiet" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Press depth.
 *
 * A control on a table is a physical thing, so it goes down when it is pressed
 * and comes back up when it is released. One pixel and a collapsing shadow is
 * the whole effect; anything more and the rail starts bouncing. The duration
 * matches the press step of the motion language, which is short enough to read
 * as contact rather than as travel.
 */
export const buttonBase =
  "relative inline-flex items-center justify-center gap-2 rounded-sm select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out " +
  "active:translate-y-px active:duration-75 " +
  "disabled:pointer-events-none disabled:opacity-35";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--btn-bg)] text-[var(--btn-fg)] " +
    "shadow-[0_2px_0_-1px_rgba(0,0,0,0.35),0_8px_18px_-10px_rgba(0,0,0,0.55)] " +
    "hover:brightness-[1.07] hover:shadow-[0_3px_0_-1px_rgba(0,0,0,0.3),0_12px_22px_-10px_rgba(0,0,0,0.5)] " +
    "active:brightness-95 active:shadow-[0_1px_0_-1px_rgba(0,0,0,0.3)]",
  secondary:
    "border border-line-2 bg-transparent text-fg hover:bg-fg/[0.05] hover:border-fg/35 " +
    "active:bg-fg/[0.09] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]",
  quiet: "border border-line bg-surface-2 text-fg hover:border-line-2 hover:bg-surface-3 active:bg-fg/[0.06]",
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
