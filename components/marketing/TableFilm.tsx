"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { DeckBlock } from "@/components/game/table/DeckBlock";
import { TableSpaceProvider, useTableAnchor } from "@/lib/motion/table-space";
import { ChipFace } from "@/components/chips/Chip";
import { FilmCard, FilmFrame, FilmScript, FilmSeat } from "@/lib/content/films";
import { Card } from "@/types";
import { cn } from "@/lib/utils/cn";

/**
 * A hand that plays itself.
 *
 * The film only runs while it is actually on screen and the tab is in front, so
 * a page left open in a background tab costs nothing. Reduced motion settings
 * stop the film on its closing frame, which is the one that carries the review.
 *
 * The moving table is hidden from assistive technology and the same hand is
 * offered as a static list underneath, because a caption strip that rewrites
 * itself every second and then loops is unusable through a screen reader.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

function toCard(seat: string, position: number, entry: FilmCard): Card {
  return { rank: entry.rank, suit: entry.suit, id: `${seat}-${position}` };
}

function Seat({
  seat,
  seatKey,
  align,
}: {
  seat: FilmSeat;
  seatKey: string;
  align: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5",
        align === "top" ? "flex-col" : "flex-col-reverse",
      )}
    >
      <span className="font-mono text-[9px] tracking-[0.26em] text-[rgba(236,229,216,0.42)] uppercase">
        {seat.label}
      </span>

      <div className="flex min-h-[var(--film-card-min)] items-center gap-1.5">
        {(seat.cards ?? []).map((entry, position) => (
          <PlayingCard
            // The key is the slot, not the card, so a card that stays on the
            // table across frames keeps its element and only flips, while a
            // newly dealt one mounts and animates in as a deal.
            key={`${seatKey}-${position}`}
            card={toCard(seatKey, position, entry)}
            faceDown={entry.faceDown}
            index={position}
            /* Tighter than a real table: the film has a second and a half to
               show a whole hand, so the deal is quick rather than measured. */
            delay={position * 90}
            short
            className={position > 0 && align === "bottom" ? "-ml-3 rotate-[4deg]" : undefined}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {seat.value ? (
          <motion.span
            key={seat.value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="font-mono text-[10px] tracking-[0.2em] text-[rgba(201,167,94,0.75)] uppercase"
          >
            {seat.value}
          </motion.span>
        ) : (
          <span className="h-[13px]" />
        )}
      </AnimatePresence>
    </div>
  );
}

function Pocket({ pocket }: { pocket: NonNullable<FilmFrame["pocket"]> }) {
  const fill =
    pocket.colour === "red" ? "#9d2f2c" : pocket.colour === "green" ? "#14483a" : "#15181a";
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex h-14 w-14 items-center justify-center rounded-full font-mono text-[17px] text-[#f2ece0] tabular-nums"
      style={{
        background: `radial-gradient(circle at 36% 26%, color-mix(in srgb, ${fill} 82%, white), ${fill})`,
        boxShadow: "0 0 0 2px rgba(201,167,94,0.5), 0 8px 18px -8px rgba(0,0,0,0.9)",
      }}
    >
      {pocket.label}
    </motion.span>
  );
}

/** The deck the film deals from, drawn small in the corner of the felt. */
function FilmShoe() {
  const anchor = useTableAnchor("shoe");
  return (
    <div
      ref={anchor}
      aria-hidden="true"
      className="absolute top-5 right-5 [--card-w:1.5rem] sm:top-7 sm:right-8 sm:[--card-w:1.8rem]"
    >
      <DeckBlock fill={0.8} />
    </div>
  );
}

export interface TableFilmProps {
  script: FilmScript;
  className?: string;
  /** Shown on the plate line under the film. */
  plateNumber?: string;
}

export function TableFilm({ script, className, plateNumber = "Fig. 1" }: TableFilmProps) {
  const reduced = useReducedMotion();
  const frames = script.frames;
  const lastIndex = frames.length - 1;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  /**
   * The film runs unless the reader stops it or asks for reduced motion.
   *
   * Earlier versions also paused when the document reported itself hidden and
   * when an IntersectionObserver said the figure was off screen. Both were
   * optimisations, and both could leave the film stopped on its opening frame
   * in any context that reports an unusual viewport, where it simply reads as
   * broken. The saving never justified that: only two films are ever mounted,
   * each is a handful of nodes advancing on a timer every second or so, and
   * browsers already throttle background timers and pause animation frames on
   * their own. The Pause control below is the mechanism that matters, and it
   * is the one a reader can actually see.
   */
  const running = playing && !reduced;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % frames.length),
      frames[index].hold,
    );
    return () => clearTimeout(timer);
  }, [running, index, frames]);

  // Reduced motion holds the closing frame, the one that carries the review,
  // rather than running the hand. Derived rather than stored so the setting can
  // change under us without the film needing to resynchronise.
  const shown = reduced ? lastIndex : Math.min(index, lastIndex);
  const frame = frames[shown];

  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  const transcript = useMemo(
    () => frames.map((entry) => entry.caption).concat(frames[lastIndex].verdict?.text ?? []),
    [frames, lastIndex],
  );

  return (
    <figure className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className="felt relative aspect-[5/4] w-full overflow-hidden border border-[rgba(201,167,94,0.28)] shadow-[0_36px_70px_-46px_rgba(0,0,0,0.85)] sm:aspect-[16/12]"
        style={{ ["--film-card-min" as string]: "4.4rem" }}
      >
        <TableSpaceProvider>
        <div className="absolute inset-3 border border-[rgba(201,167,94,0.14)]" />

        {/* The film's shoe. Small, unlabelled, and off to one side, but every
            card in the hand below comes out of it, which is the whole reason
            the deal reads as dealing. */}
        <FilmShoe />

        {/* Frame progress, as a strip of exposure marks. */}
        <div className="absolute top-0 right-0 left-0 z-20 flex gap-[3px] p-3">
          {frames.map((entry, position) => (
            <span
              key={position}
              className="relative h-[2px] flex-1 overflow-hidden bg-[rgba(201,167,94,0.16)]"
            >
              <motion.span
                className="absolute inset-y-0 left-0 bg-[rgba(201,167,94,0.75)]"
                initial={false}
                animate={{ width: position <= shown ? "100%" : "0%" }}
                transition={{
                  duration: position === shown && running ? entry.hold / 1000 : 0.2,
                  ease: "linear",
                }}
              />
            </span>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-between px-6 pt-9 pb-12 [--card-w:2.9rem] sm:px-11 sm:pb-14 sm:[--card-w:3.6rem]">
          <Seat seat={frame.top} seatKey={`${script.id}-top`} align="top" />

          <div className="pointer-events-none absolute inset-x-0 top-[50%] flex -translate-y-1/2 items-center gap-4 px-8">
            <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
            {frame.pocket ? (
              <Pocket pocket={frame.pocket} />
            ) : (
              <span className="font-mono text-[clamp(0.5rem,1.1vw,0.6rem)] tracking-[0.3em] whitespace-nowrap text-[rgba(201,167,94,0.4)] uppercase">
                {script.plate}
              </span>
            )}
            <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
          </div>

          <div className="flex w-full items-end justify-between gap-4">
            <div className="flex min-h-[2.2rem] items-end [--chip-w:1.6rem] sm:[--chip-w:2rem]">
              <AnimatePresence>
                {(frame.chips ?? []).map((value, position) => (
                  <motion.span
                    key={`${value}-${position}`}
                    initial={{ opacity: 0, y: -18, scale: 0.85 }}
                    // The resting offset is part of the animated transform.
                    // Setting it through style as well would be overwritten,
                    // which flattens the stack into a single chip.
                    animate={{ opacity: 1, y: position * -5, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3, ease: EASE, delay: position * 0.07 }}
                    className={position > 0 ? "-ml-3 block" : "block"}
                  >
                    <ChipFace value={value} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            <Seat seat={frame.bottom} seatKey={`${script.id}-bottom`} align="bottom" />

            <div className="hidden w-[3.4rem] sm:block" />
          </div>
        </div>

        {/* The review slides up over the felt, the way it does at the real table. */}
        <AnimatePresence>
          {frame.verdict ? (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.42, ease: EASE }}
              className="absolute right-3 bottom-3 left-3 z-10 border border-[rgba(201,167,94,0.3)] bg-[rgba(9,13,11,0.93)] p-4 backdrop-blur-sm sm:right-5 sm:bottom-5 sm:left-5 sm:p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-[7px] w-[7px] rotate-45"
                  style={{
                    background:
                      frame.verdict.mark === "optimal" ? "var(--positive)" : "var(--caution)",
                  }}
                />
                <span className="font-mono text-[9px] tracking-[0.24em] text-[rgba(201,167,94,0.85)] uppercase">
                  {frame.verdict.mark === "optimal" ? "Played well" : "Worth reviewing"}
                </span>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[rgba(236,229,216,0.86)]">
                {frame.verdict.text}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Caption strip */}
        <div className="absolute inset-x-0 bottom-0 z-0 px-6 pb-3 sm:px-11">
          <AnimatePresence mode="wait">
            <motion.p
              key={frame.caption}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="text-center font-mono text-[10px] leading-relaxed tracking-[0.12em] text-[rgba(236,229,216,0.5)] uppercase"
            >
              {frame.caption}
            </motion.p>
          </AnimatePresence>
        </div>
        </TableSpaceProvider>
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-4 font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase">
        <span>{plateNumber}</span>

        <span className="flex items-center gap-4">
          <span className="hidden sm:inline">{script.plate}</span>
          {reduced ? null : (
            <span className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={restart}
                className="tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
              >
                Replay
              </button>
            </span>
          )}
        </span>
      </figcaption>

      {/* The same hand, readable in one pass. */}
      <div className="sr-only">
        <p>{script.summary}</p>
        <ol>
          {transcript.map((line, position) => (
            <li key={position}>{line}</li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
