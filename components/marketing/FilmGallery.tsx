"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { TableFilm } from "./TableFilm";
import { FILMS, FILM_ORDER } from "@/lib/content/films";
import { GAMES } from "@/lib/content/games";
import { GameId } from "@/types";
import { cn } from "@/lib/utils/cn";

/**
 * Four tables, one projector. Only the selected film is mounted, so switching
 * tabs never leaves a second hand animating out of sight.
 */
export function FilmGallery({ className }: { className?: string }) {
  const [active, setActive] = useState<GameId>("blackjack");
  const script = FILMS[active];
  const game = GAMES.find((entry) => entry.id === active)!;

  return (
    <div className={cn("grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14", className)}>
      <div className="flex flex-col">
        <div role="tablist" aria-label="Choose a table to watch" className="flex flex-col">
          {FILM_ORDER.map((id) => {
            const entry = GAMES.find((candidate) => candidate.id === id)!;
            const selected = id === active;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setActive(id)}
                className={cn(
                  "group relative flex items-baseline justify-between gap-4 border-b border-line py-4 text-left transition-colors",
                  selected ? "text-fg" : "text-fg-3 hover:text-fg-2",
                )}
              >
                <span className="display text-[22px] leading-none">{entry.name}</span>
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase">
                  {entry.difficulty}
                </span>
                {selected ? (
                  <motion.span
                    layoutId="film-tab-marker"
                    aria-hidden="true"
                    className="absolute right-0 -bottom-px left-0 h-[2px] bg-accent-2"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7"
          >
            <p className="max-w-sm text-[14.5px] leading-relaxed text-fg-2">{game.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={game.play}
                className="inline-flex h-10 items-center rounded-sm bg-[var(--btn-bg)] px-5 font-mono text-[11px] tracking-[0.14em] text-[var(--btn-fg)] uppercase transition-[filter] hover:brightness-110"
              >
                Play {game.name}
              </Link>
              <Link
                href={game.rules}
                prefetch={false}
                className="font-mono text-[11px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
              >
                Read the rules
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <TableFilm
        key={active}
        script={script}
        plateNumber={`Fig. ${FILM_ORDER.indexOf(active) + 2}`}
      />
    </div>
  );
}
