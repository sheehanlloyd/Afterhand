"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Surface } from "@/components/layout/Surface";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

/**
 * The room. A fixed height column so the table can own the viewport and the
 * controls stay under the thumb on a phone.
 */
export function GameFrame({
  header,
  children,
  rail,
  /**
   * Changes when the controls change. The rail slides up into place on a new
   * phase rather than swapping its contents in the same instant, which is what
   * makes it read as the table handing you the turn.
   */
  railKey,
  /** Lights the top edge of the rail while it is your move. */
  railActive = false,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  rail?: ReactNode;
  railKey?: string;
  railActive?: boolean;
  className?: string;
}) {
  return (
    <>
      <Surface value="room" />
      <div className={cn("flex h-dvh min-h-0 flex-col overflow-hidden", className)}>
        {header}
        <main id="main" className="relative z-10 flex min-h-0 flex-1 flex-col">
          {children}
        </main>
        {rail ? (
          <div className="relative z-20 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-px h-px"
              animate={{ opacity: railActive ? 1 : 0 }}
              transition={{ duration: DURATION.turn, ease: EASE.arrive }}
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--accent-2) 22%, var(--accent-2) 78%, transparent)",
              }}
            />
            <motion.div
              key={railKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.turn, ease: EASE.arrive }}
            >
              {rail}
            </motion.div>
          </div>
        ) : null}
      </div>
    </>
  );
}
