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
        "flex flex-col items-center gap-1.5 sm:gap-2.5",
        align === "top" ? "flex-col" : "flex-col-reverse",
      )}
    >
      <span className="font-mono text-[9px] tracking-[0.26em] text-[rgba(236,229,216,0.42)] uppercase">
        {seat.label}
      </span>

      <div className="flex min-h-[calc(var(--card-w)*1.4)] items-center gap-1.5">
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
        className="felt relative flex min-h-[21rem] w-full flex-col overflow-hidden border border-[rgba(201,167,94,0.28)] shadow-[0_36px_70px_-46px_rgba(0,0,0,0.85)] sm:min-h-[26rem]"
      >
        <TableSpaceProvider>
        <div className="pointer-events-none absolute inset-3 z-0 border border-[rgba(201,167,94,0.14)]" />

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

        {/*
          The table is laid out as rows in normal flow rather than as absolutely
          positioned pieces over a shared box. An earlier version floated the
          centre plate, the caption and the review over the felt at fixed
          offsets, which held at one size and collided at every other: the plate
          printed across the player's cards, the review sat on top of the caption
          strip, and on a narrow screen the review's own text ran past the bottom
          edge and was cut off. Rows cannot overlap each other, so the whole
          class of collision is gone rather than tuned away.

          The two seat bands share the slack (`flex-1`), so whatever height is
          left after the fixed rows is split evenly and the seats stay centred in
          it at any aspect.
        */}
        <div className="relative z-10 flex flex-1 flex-col px-4 pt-9 pb-2 [--card-w:2.6rem] sm:px-11 sm:[--card-w:3.6rem]">
          <div className="flex flex-1 items-center justify-center">
            <Seat seat={frame.top} seatKey={`${script.id}-top`} align="top" />
          </div>

          {/* Centre plate. In flow, so it divides the two seats instead of
              being drawn across whichever one happens to reach the midline. */}
          <div className="flex shrink-0 items-center gap-3 py-1 sm:gap-4">
            <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
            {frame.pocket ? (
              <Pocket pocket={frame.pocket} />
            ) : (
              <span className="min-w-0 truncate font-mono text-[9px] tracking-[0.24em] text-[rgba(201,167,94,0.4)] uppercase sm:text-[10px] sm:tracking-[0.3em]">
                {script.plate}
              </span>
            )}
            <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
          </div>

          {/* The player's band. The chips are taken out of the flow so that the
              seat is centred on the felt rather than on the space the chips
              leave over; below `sm` there was no counterweight on the right and
              the hand was pushed hard against the edge, where the last card was
              clipped by the felt. */}
          <div className="relative flex flex-1 items-center justify-center">
            <div className="pointer-events-none absolute bottom-0 left-0 flex items-end [--chip-w:1.4rem] sm:[--chip-w:2rem]">
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
          </div>
        </div>

        {/*
          One band at the foot of the felt, carrying either the caption or the
          review. They are alternatives rather than layers: the review used to
          be painted over the caption at 93% opacity, so the caption showed
          through its own replacement as a second line of ghosted text. Only one
          is ever mounted now, and the band reserves the height of a two line
          caption so the table above does not jump as the wording changes.
        */}
        <div className="relative z-10 flex min-h-[7.5rem] shrink-0 items-end px-3 pb-3 sm:min-h-[7rem] sm:px-5">
          <AnimatePresence mode="wait">
            {frame.verdict ? (
              <motion.div
                key="verdict"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.42, ease: EASE }}
                className="w-full border border-[rgba(201,167,94,0.3)] bg-[#0a0e0c] p-3 sm:p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-[7px] w-[7px] shrink-0 rotate-45"
                    style={{
                      background:
                        frame.verdict.mark === "optimal" ? "var(--positive)" : "var(--caution)",
                    }}
                  />
                  <span className="font-mono text-[9px] tracking-[0.24em] text-[rgba(201,167,94,0.85)] uppercase">
                    {frame.verdict.mark === "optimal" ? "Played well" : "Worth reviewing"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-snug text-[rgba(236,229,216,0.86)] sm:text-[13px] sm:leading-relaxed">
                  {frame.verdict.text}
                </p>
              </motion.div>
            ) : (
              <motion.p
                key={frame.caption}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="w-full text-center font-mono text-[9px] leading-relaxed tracking-[0.12em] text-[rgba(236,229,216,0.5)] uppercase sm:text-[10px]"
              >
                {frame.caption}
              </motion.p>
            )}
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
