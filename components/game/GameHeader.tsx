"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { formatMoney } from "@/lib/utils/format";
import { Counter } from "@/components/ui/Counter";
import { DURATION } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

export interface GameMenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  tone?: "default" | "danger";
}

export function GameHeader({
  game,
  mode,
  bankroll,
  detail,
  soundEnabled,
  onToggleSound,
  menu,
}: {
  game: string;
  mode?: string;
  bankroll?: number;
  detail?: ReactNode;
  soundEnabled: boolean;
  onToggleSound: () => void;
  menu: GameMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="relative z-30 shrink-0 border-b border-line bg-surface">
      <div className="flex h-[52px] items-center gap-2.5 px-3 sm:gap-5 sm:px-6">
        <Logo responsiveWordmark className="shrink-0" />

        <span aria-hidden="true" className="hidden h-4 w-px shrink-0 bg-line-2 sm:block" />

        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="truncate font-mono text-[10.5px] tracking-[0.14em] text-fg uppercase sm:text-[11px] sm:tracking-[0.16em]">
            {game}
          </h1>
          {mode ? (
            <span className="shrink-0 border border-accent-2/50 px-1 py-[2px] font-mono text-[8.5px] tracking-[0.1em] text-accent-2 uppercase sm:px-1.5 sm:text-[9px] sm:tracking-[0.14em]">
              {mode}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-6">
          {detail ? <div className="hidden lg:block">{detail}</div> : null}

          {bankroll !== undefined ? (
            <div className="text-right">
              <div className="label hidden leading-none sm:block">Bankroll</div>
              {/* The bankroll counts to its new figure rather than replacing
                  itself, and it starts a beat late so the chips that caused the
                  change have already left the table. */}
              <Counter
                value={bankroll}
                format={formatMoney}
                duration={DURATION.reveal}
                delay={0.18}
                className="block text-[14px] leading-none text-fg sm:mt-1 sm:text-[15px]"
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? "Mute sound" : "Turn sound on"}
            className="grid h-8 w-8 shrink-0 place-items-center border border-line text-fg-2 transition-colors hover:border-line-2 hover:text-fg"
          >
            <SoundIcon on={soundEnabled} />
          </button>

          <div ref={wrapper} className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="h-8 shrink-0 border border-line px-2.5 font-mono text-[10px] tracking-[0.14em] text-fg-2 uppercase transition-colors hover:border-line-2 hover:text-fg sm:px-3"
            >
              Menu
            </button>
            <AnimatePresence>
              {open ? (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 z-40 mt-2 w-52 border border-line bg-surface-2 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.8)]"
                >
                  {menu.map((item) =>
                    item.href ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        role="menuitem"
                        className="block px-4 py-2.5 text-left font-mono text-[10.5px] tracking-[0.12em] text-fg-2 uppercase transition-colors hover:bg-fg/[0.06] hover:text-fg"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false);
                          item.onSelect?.();
                        }}
                        className={cn(
                          "block w-full px-4 py-2.5 text-left font-mono text-[10.5px] tracking-[0.12em] uppercase transition-colors hover:bg-fg/[0.06]",
                          item.tone === "danger"
                            ? "text-negative hover:text-negative"
                            : "text-fg-2 hover:text-fg",
                        )}
                      >
                        {item.label}
                      </button>
                    ),
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" fill="none">
      <path
        d="M3 6h2.2L8 3.6v8.8L5.2 10H3z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {on ? (
        <>
          <path d="M10.4 5.9a3 3 0 0 1 0 4.2" stroke="currentColor" strokeWidth="1.1" />
          <path d="M12.3 4.2a5.5 5.5 0 0 1 0 7.6" stroke="currentColor" strokeWidth="1.1" />
        </>
      ) : (
        <path d="M10.6 6.2l3.4 3.6M14 6.2l-3.4 3.6" stroke="currentColor" strokeWidth="1.1" />
      )}
    </svg>
  );
}
