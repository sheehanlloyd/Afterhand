"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Shared state for dragging a chip onto the table.
 *
 * The rail and the felt are siblings, so the bet spot needs to know a chip is
 * in the air in order to light up. The drop itself is resolved by hit testing
 * the pointer against the DOM rather than by tracking geometry here, which
 * keeps this to a single boolean.
 */

interface ChipDragValue {
  dragging: boolean;
  /** The id of the drop target currently under the chip, if any. */
  over: string | null;
  setDragging: (value: boolean) => void;
  setOver: (value: string | null) => void;
}

const ChipDragContext = createContext<ChipDragValue | null>(null);

/** Marks the element a dragged chip can be dropped on. */
export const CHIP_DROP_ATTRIBUTE = "data-chip-drop";

export function ChipDragProvider({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState<string | null>(null);

  const value = useMemo(
    () => ({ dragging, over, setDragging, setOver }),
    [dragging, over],
  );

  return <ChipDragContext.Provider value={value}>{children}</ChipDragContext.Provider>;
}

/** Used when a chip renders outside a provider, where dragging is never on. */
const INERT: ChipDragValue = {
  dragging: false,
  over: null,
  setDragging: () => {},
  setOver: () => {},
};

/** Safe outside a provider, where dragging is simply never on. */
export function useChipDrag(): ChipDragValue {
  return useContext(ChipDragContext) ?? INERT;
}

/**
 * The id of the drop target under a viewport point, or null.
 *
 * A table can have several places to put a chip, so the drop reports which one
 * it landed on rather than a bare yes or no.
 */
export function dropTargetAt(x: number, y: number): string | null {
  if (typeof document === "undefined") return null;
  const hit = document
    .elementsFromPoint(x, y)
    .find((element) => element.hasAttribute(CHIP_DROP_ATTRIBUTE));
  return hit ? hit.getAttribute(CHIP_DROP_ATTRIBUTE) : null;
}

/**
 * Tracks whether the last pointer interaction was a drag, so a chip that was
 * dragged does not also register as a tap when it is released.
 */
export function useDragGuard() {
  const dragged = useRef(false);

  const markDragged = useCallback(() => {
    dragged.current = true;
  }, []);

  const consume = useCallback(() => {
    const value = dragged.current;
    dragged.current = false;
    return value;
  }, []);

  return { markDragged, consume };
}
