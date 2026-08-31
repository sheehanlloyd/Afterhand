"use client";

import { ReactNode, useEffect, useId, useState } from "react";
import { Overlay } from "./Overlay";
import { Button } from "./Button";

/**
 * A right side drawer on desktop and a full height sheet on small screens.
 * Used for rules during gameplay so the table state is never lost.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Overlay
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      align={wide ? "right" : "bottom"}
      className={
        wide
          ? "h-full w-[min(30rem,100vw)]"
          : "h-[88svh] w-full"
      }
    >
      <div className="flex h-full flex-col border-l border-line bg-surface shadow-[0_0_60px_-20px_rgba(0,0,0,0.7)] max-sm:border-t max-sm:border-l-0">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="display text-[19px]">
            {title}
          </h2>
          <Button variant="ghost" size="sm" plate onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </Overlay>
  );
}
