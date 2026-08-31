"use client";

import { useEffect } from "react";

/**
 * Switches the document between the two surfaces.
 *
 * Paper is the reading side of the app. Room is the table, where the lights
 * come down. Setting it on the document root means the browser chrome, the
 * overscroll area, and every portal follow along.
 */
export function Surface({ value }: { value: "paper" | "room" }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-surface") ?? "paper";
    root.setAttribute("data-surface", value);
    const meta = document.querySelector('meta[name="theme-color"]');
    const previousColor = meta?.getAttribute("content");
    meta?.setAttribute("content", value === "room" ? "#0c0f0e" : "#f0eae0");
    return () => {
      root.setAttribute("data-surface", previous);
      if (meta && previousColor) meta.setAttribute("content", previousColor);
    };
  }, [value]);

  return null;
}
