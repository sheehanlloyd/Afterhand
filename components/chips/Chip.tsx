"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { dropTargetAt, useChipDrag, useDragGuard } from "./chip-drag";
import { cn } from "@/lib/utils/cn";

export interface ChipStyle {
  body: string;
  edge: string;
  ring: string;
  text: string;
}

/**
 * Antique clay rather than plastic. Each chip is a matte body with a cream
 * edge inlay, the way a real card room chip is pressed.
 */
const CHIP_STYLES: Array<{ upTo: number; style: ChipStyle }> = [
  { upTo: 5, style: { body: "#6d2c2b", edge: "#e6dcc8", ring: "#411818", text: "#efe6d5" } },
  { upTo: 10, style: { body: "#31485c", edge: "#dfe4e8", ring: "#1b2936", text: "#e9eef2" } },
  { upTo: 25, style: { body: "#2c4a39", edge: "#dde5dc", ring: "#152a20", text: "#e8f0e8" } },
  { upTo: 50, style: { body: "#7a5c2a", edge: "#f0e6cd", ring: "#4a3616", text: "#f6efdd" } },
  { upTo: 100, style: { body: "#22262a", edge: "#cbbb96", ring: "#0c0e10", text: "#e5dcc5" } },
  { upTo: 500, style: { body: "#463150", edge: "#e3dae8", ring: "#291b31", text: "#efe9f3" } },
  { upTo: Infinity, style: { body: "#3a3a40", edge: "#ddd6c7", ring: "#1f1f24", text: "#efeae0" } },
];

export function chipStyle(value: number): ChipStyle {
  return CHIP_STYLES.find((entry) => value <= entry.upTo)!.style;
}

export function chipLabel(value: number): string {
  if (value >= 1000) return `${value / 1000}k`;
  return String(value);
}

export function ChipFace({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const style = chipStyle(value);
  return (
    <span
      className={cn(
        "relative block aspect-square w-[var(--chip-w,3.25rem)] rounded-full [container-type:inline-size]",
        className,
      )}
      style={{
        background: `radial-gradient(circle at 38% 24%, color-mix(in srgb, ${style.body} 88%, white), ${style.body} 58%, ${style.ring})`,
        boxShadow:
          "0 0 0 1px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1) inset, 0 5px 10px -6px rgba(0,0,0,0.85)",
      }}
    >
      {/* Edge spots */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `repeating-conic-gradient(from 11.25deg, ${style.edge} 0deg 12deg, transparent 12deg 45deg)`,
          WebkitMask: "radial-gradient(circle, transparent 0 71%, #000 71% 93%, transparent 93%)",
          mask: "radial-gradient(circle, transparent 0 71%, #000 71% 93%, transparent 93%)",
          opacity: 0.62,
        }}
      />
      <span
        className="absolute inset-[17%] rounded-full border"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          background: `radial-gradient(circle at 36% 26%, color-mix(in srgb, ${style.body} 92%, white), ${style.body})`,
        }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[26cqw] leading-none font-medium tracking-tight"
        style={{ color: style.text }}
      >
        {chipLabel(value)}
      </span>
    </span>
  );
}

/** Movement past this many pixels means the player meant to drag, not tap. */
const DRAG_SLOP = 12;

/**
 * Framer reports the pointer in page space. The table never scrolls the window,
 * so this is a no-op there, but subtracting the scroll offset keeps the hit test
 * correct if a draggable chip is ever used on a scrolling page.
 */
function targetUnder(info: PanInfo): string | null {
  return dropTargetAt(info.point.x - window.scrollX, info.point.y - window.scrollY);
}

/**
 * A chip in the rail.
 *
 * It can be tapped, which is the fast way to build a bet, or picked up and
 * dropped on the bet spot, which is how you do it at a table. Both end in the
 * same place. The drag is the reason the felt has a drop target at all, and on
 * a phone it turns a lot of empty green into something you can aim at.
 */
export function Chip({
  value,
  onClick,
  disabled,
  selected,
  className,
  draggable = false,
  onDrop,
}: {
  value: number;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  /** Allows the chip to be dragged onto a bet spot as well as tapped. */
  draggable?: boolean;
  /** Called with the drop target id when the chip lands on one. */
  onDrop?: (target: string) => void;
}) {
  const reduced = useReducedMotion();
  const { setDragging, setOver } = useChipDrag();
  const { markDragged, consume } = useDragGuard();

  const canDrag = draggable && !disabled && !reduced;

  const dragProps = canDrag
    ? {
        drag: true as const,
        dragSnapToOrigin: true,
        dragMomentum: false,
        dragElastic: 0.9,
        whileDrag: { scale: 1.16, zIndex: 50 },
        onDragStart: () => setDragging(true),
        onDrag: (_: unknown, info: PanInfo) => {
          // Only a deliberate movement counts as a drag. Framer starts the
          // gesture after a few pixels, and treating that as a drag would let a
          // slightly shaky tap fall through without placing a bet.
          if (Math.hypot(info.offset.x, info.offset.y) > DRAG_SLOP) markDragged();
          setOver(targetUnder(info));
        },
        onDragEnd: (_: unknown, info: PanInfo) => {
          const target = targetUnder(info);
          setDragging(false);
          setOver(null);
          if (target === null) return;
          if (onDrop) onDrop(target);
          else onClick?.();
        },
      }
    : {};

  return (
    <motion.button
      type="button"
      disabled={disabled}
      // A chip that was dragged has already been dealt with on release, so the
      // trailing click the browser fires afterwards must not bet a second time.
      onClick={() => {
        if (consume()) return;
        onClick?.();
      }}
      aria-label={`Add $${value} to your bet`}
      whileHover={disabled || reduced ? undefined : { y: -5 }}
      whileTap={disabled || reduced ? undefined : { y: -1, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "relative rounded-full transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-35",
        canDrag && "cursor-grab active:cursor-grabbing",
        selected && "ring-2 ring-brass-500/80 ring-offset-2 ring-offset-felt-800",
        className,
      )}
      {...dragProps}
    >
      <ChipFace value={value} />
    </motion.button>
  );
}

/** Breaks an amount into a small stack of chips for display. */
export function chipBreakdown(amount: number, denominations: number[]): number[] {
  const out: number[] = [];
  let remaining = Math.round(amount);
  const sorted = [...denominations].sort((a, b) => b - a);
  for (const denomination of sorted) {
    while (remaining >= denomination && out.length < 12) {
      out.push(denomination);
      remaining -= denomination;
    }
  }
  return out;
}

export function BetStack({
  amount,
  denominations,
  className,
}: {
  amount: number;
  denominations: number[];
  className?: string;
}) {
  const stack = chipBreakdown(amount, denominations);
  if (stack.length === 0) return null;
  return (
    <span
      className={cn("relative block", className)}
      style={{ width: "var(--chip-w, 2.5rem)", height: `calc(var(--chip-w, 2.5rem) + ${(stack.length - 1) * 4}px)` }}
      aria-hidden="true"
    >
      {stack.map((value, index) => (
        <motion.span
          key={`${value}-${index}`}
          className="absolute left-0"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.03 }}
          style={{ bottom: index * 4 }}
        >
          <ChipFace value={value} />
        </motion.span>
      ))}
    </span>
  );
}
