"use client";

/**
 * Touch feedback.
 *
 * Only fires on hardware that actually has a motor, and only for events that
 * correspond to something physical happening on the table. A phone that buzzes
 * on every tap is worse than one that never buzzes at all, so the patterns here
 * are short and the vocabulary is small.
 */

export type HapticName = "tap" | "deal" | "chip" | "land" | "win" | "lose";

const PATTERNS: Record<HapticName, number | number[]> = {
  tap: 8,
  deal: 12,
  chip: [6, 18, 9],
  land: 10,
  win: [14, 40, 22],
  lose: 26,
};

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function haptic(name: HapticName): void {
  if (!enabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  /* Desktop Chrome exposes vibrate and silently ignores it, which is fine, but
     a machine that prefers reduced motion has asked for less of everything. */
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  try {
    navigator.vibrate(PATTERNS[name]);
  } catch {
    /* Some browsers throw when the document has never been interacted with. */
  }
}
