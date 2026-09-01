"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * Where things on the table physically are.
 *
 * Cards and chips should never appear out of nowhere. They come from the shoe,
 * they leave to the discard tray, they travel from a rail to a betting circle.
 * That only works if a component that is about to animate can ask where those
 * places currently sit on screen.
 *
 * Anchors register a DOM element under a name. Anything that wants to fly reads
 * the anchor's rectangle at the moment it mounts and animates in from the
 * difference. Nothing is stored in state, so registering an anchor never causes
 * a render, and a table with no anchors registered simply falls back to a plain
 * fade instead of breaking.
 */

export type AnchorName =
  | "shoe"
  | "discard"
  | "pot"
  | "dealer"
  | `seat:${string}`
  | `bet:${string}`
  | "rail";

interface TableSpaceValue {
  register: (name: string, element: HTMLElement | null) => void;
  rectOf: (name: string) => DOMRect | null;
}

const TableSpaceContext = createContext<TableSpaceValue | null>(null);

const INERT: TableSpaceValue = {
  register: () => {},
  rectOf: () => null,
};

export function TableSpaceProvider({ children }: { children: ReactNode }) {
  const elements = useRef(new Map<string, HTMLElement>());

  const register = useCallback((name: string, element: HTMLElement | null) => {
    if (element) elements.current.set(name, element);
    else elements.current.delete(name);
  }, []);

  const rectOf = useCallback((name: string) => {
    const element = elements.current.get(name);
    if (!element || !element.isConnected) return null;
    const rect = element.getBoundingClientRect();
    /* A collapsed element is one that has not been laid out yet. Treat it as
       missing rather than flying a card to the top left corner. */
    if (rect.width === 0 && rect.height === 0) return null;
    return rect;
  }, []);

  const value = useMemo(() => ({ register, rectOf }), [register, rectOf]);

  return <TableSpaceContext.Provider value={value}>{children}</TableSpaceContext.Provider>;
}

export function useTableSpace(): TableSpaceValue {
  return useContext(TableSpaceContext) ?? INERT;
}

/**
 * Marks an element as a named place on the table.
 *
 * Returns a ref callback, so it costs one attribute at the call site:
 * `<div ref={useTableAnchor("shoe")} />`.
 */
export function useTableAnchor(name: string) {
  const { register } = useTableSpace();
  return useCallback(
    (element: HTMLElement | null) => {
      register(name, element);
    },
    [register, name],
  );
}

export interface Flight {
  /** Offset from the destination back to the origin, in pixels. */
  dx: number;
  dy: number;
  /** Direction of travel in degrees, used to smear the card along its path. */
  angle: number;
  distance: number;
}

/**
 * The vector from where something is going to where it came from.
 *
 * Expressed that way round because it is fed straight into an animation as a
 * starting offset: the element is already laid out at its destination, and we
 * push it back to the origin for one frame before letting it travel in.
 */
export function useFlight() {
  const { rectOf } = useTableSpace();

  return useCallback(
    (target: HTMLElement | null, origin: string | undefined): Flight | null => {
      if (!target || !origin) return null;
      const from = rectOf(origin);
      if (!from) return null;
      const to = target.getBoundingClientRect();
      if (to.width === 0 && to.height === 0) return null;

      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const distance = Math.hypot(dx, dy);
      /* The angle of travel is the reverse of the offset, since the offset
         points backwards along the path. */
      const angle = (Math.atan2(-dy, -dx) * 180) / Math.PI;
      return { dx, dy, angle, distance };
    },
    [rectOf],
  );
}
