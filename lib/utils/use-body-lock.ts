"use client";

import { useEffect } from "react";

/** Prevents the page behind an overlay from scrolling, including on iOS. */
export function useBodyLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
