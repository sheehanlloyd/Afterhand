"use client";

/**
 * A way for a game's state machine to move chips.
 *
 * The chip layer is a React component, and the code that knows a raise just
 * happened is a store. Rather than threading a callback through six components,
 * the layer registers itself here when it mounts and the stores call this.
 *
 * If no layer is mounted the request is dropped and the `onArrive` callback
 * fires immediately, so a game still works with nothing drawing the chips.
 */

export interface ChipMove {
  from: string;
  to: string;
  amount: number;
  denominations: number[];
  onArrive?: () => void;
  max?: number;
}

type Sender = (move: ChipMove) => number;

let sender: Sender | null = null;

export function registerChipSender(next: Sender | null): void {
  sender = next;
}

/** Returns how long the chips will take to land, in milliseconds. */
export function moveChips(move: ChipMove): number {
  if (!sender) {
    move.onArrive?.();
    return 0;
  }
  return sender(move);
}
