"use client";

import { Fragment } from "react";
import {
  BET_LABEL,
  Pocket,
  RouletteBet,
  RouletteBetType,
  RouletteVariant,
  isRed,
  numbersForOutside,
} from "@/lib/games/roulette/engine";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * A real betting layout: numbers sit in three rows of twelve, and the small
 * markers on the lines place splits, streets, corners, and six lines exactly
 * where a chip would sit on felt.
 */

export type PlacedBet = RouletteBet;

const ROWS = [0, 1, 2];
const COLUMNS = Array.from({ length: 12 }, (_, index) => index);

function numberAt(column: number, row: number): number {
  return (column + 1) * 3 - row;
}

function makeId(type: RouletteBetType, numbers: Pocket[]): string {
  return `${type}:${numbers.join("-")}`;
}

function labelFor(type: RouletteBetType, numbers: Pocket[]): string {
  if (type === "straight") return `Straight ${numbers[0]}`;
  return `${BET_LABEL[type]} ${numbers.join(", ")}`;
}

export function BettingBoard({
  variant,
  bets,
  chip,
  onPlace,
  onRemove,
  disabled,
  winning,
}: {
  variant: RouletteVariant;
  bets: PlacedBet[];
  chip: number;
  onPlace: (bet: Omit<PlacedBet, "amount"> & { amount: number }) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
  winning: Pocket | null;
}) {
  const totalOn = (id: string) => bets.find((bet) => bet.id === id)?.amount ?? 0;

  function place(type: RouletteBetType, numbers: Pocket[]) {
    if (disabled) return;
    const id = makeId(type, numbers);
    onPlace({ id, type, numbers, amount: chip, label: labelFor(type, numbers) });
  }

  function ChipMark({ id }: { id: string }) {
    const amount = totalOn(id);
    if (amount === 0) return null;
    return (
      <span
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onRemove(id);
        }}
        role="presentation"
        className="tabular pointer-events-auto absolute -top-1 -right-1 z-20 grid h-5 min-w-5 cursor-pointer place-items-center rounded-full border border-[rgba(201,167,94,0.85)] bg-[#1a1512] px-1 text-[9px] text-[#e8dcbf]"
        title={`${formatMoney(amount)}. Click to remove.`}
      >
        {amount}
      </span>
    );
  }

  const zeroPockets: Pocket[] = variant === "american" ? [0, "00"] : [0];

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-[32rem] max-w-3xl sm:mx-auto">
        <div className="flex gap-1">
          {/* Zero column */}
          <div className={cn("flex flex-col gap-1", variant === "american" ? "w-10" : "w-9")}>
            {zeroPockets.map((pocket) => {
              const id = makeId("straight", [pocket]);
              return (
                <button
                  key={String(pocket)}
                  type="button"
                  disabled={disabled}
                  onClick={() => place("straight", [pocket])}
                  aria-label={`Straight up on ${pocket}`}
                  className={cn(
                    "relative flex flex-1 items-center justify-center border font-mono text-[12px] transition-colors",
                    "border-[rgba(236,229,216,0.2)] bg-[rgba(20,72,58,0.75)] text-[rgba(236,229,216,0.9)]",
                    !disabled && "hover:border-[rgba(201,167,94,0.8)]",
                    winning === pocket && "border-[rgba(201,167,94,1)] bg-[rgba(201,167,94,0.28)]",
                  )}
                  style={{ minHeight: zeroPockets.length === 1 ? "6.75rem" : "3.3rem" }}
                >
                  {pocket}
                  <ChipMark id={id} />
                </button>
              );
            })}
          </div>

          {/* Numbers grid with line markers */}
          <div className="relative flex-1">
            <div className="grid grid-cols-12 grid-rows-3 gap-1">
              {ROWS.map((row) =>
                COLUMNS.map((column) => {
                  const value = numberAt(column, row);
                  const id = makeId("straight", [value]);
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => place("straight", [value])}
                      aria-label={`Straight up on ${value}`}
                      className={cn(
                        "relative flex h-9 items-center justify-center border font-mono text-[12px] transition-colors",
                        isRed(value)
                          ? "bg-[rgba(124,47,44,0.85)]"
                          : "bg-[rgba(25,29,28,0.85)]",
                        "border-[rgba(236,229,216,0.18)] text-[rgba(236,229,216,0.92)]",
                        !disabled && "hover:border-[rgba(201,167,94,0.8)]",
                        winning === value && "border-[rgba(201,167,94,1)] ring-1 ring-[rgba(201,167,94,0.8)]",
                      )}
                    >
                      {value}
                      <ChipMark id={id} />
                    </button>
                  );
                }),
              )}
            </div>

            {/* Line bets sit on the grid lines */}
            <div className="pointer-events-none absolute inset-0">
              {ROWS.map((row) =>
                COLUMNS.map((column) => (
                  <Fragment key={`markers-${column}-${row}`}>
                    {column < 11 ? (
                      <Marker
                        left={((column + 1) / 12) * 100}
                        top={((row + 0.5) / 3) * 100}
                        label={`Split ${numberAt(column, row)} and ${numberAt(column + 1, row)}`}
                        onClick={() =>
                          place("split", [numberAt(column, row), numberAt(column + 1, row)])
                        }
                        chip={<ChipMark id={makeId("split", [numberAt(column, row), numberAt(column + 1, row)])} />}
                        disabled={disabled}
                      />
                    ) : null}
                    {row < 2 ? (
                      <Marker
                        left={((column + 0.5) / 12) * 100}
                        top={((row + 1) / 3) * 100}
                        label={`Split ${numberAt(column, row)} and ${numberAt(column, row + 1)}`}
                        onClick={() =>
                          place("split", [numberAt(column, row), numberAt(column, row + 1)])
                        }
                        chip={<ChipMark id={makeId("split", [numberAt(column, row), numberAt(column, row + 1)])} />}
                        disabled={disabled}
                      />
                    ) : null}
                    {row < 2 && column < 11 ? (
                      <Marker
                        left={((column + 1) / 12) * 100}
                        top={((row + 1) / 3) * 100}
                        corner
                        label={`Corner on ${numberAt(column, row)}, ${numberAt(column + 1, row)}, ${numberAt(column, row + 1)}, ${numberAt(column + 1, row + 1)}`}
                        onClick={() =>
                          place("corner", [
                            numberAt(column, row + 1),
                            numberAt(column, row),
                            numberAt(column + 1, row + 1),
                            numberAt(column + 1, row),
                          ])
                        }
                        chip={
                          <ChipMark
                            id={makeId("corner", [
                              numberAt(column, row + 1),
                              numberAt(column, row),
                              numberAt(column + 1, row + 1),
                              numberAt(column + 1, row),
                            ])}
                          />
                        }
                        disabled={disabled}
                      />
                    ) : null}
                  </Fragment>
                )),
              )}

              {COLUMNS.map((column) => (
                <Marker
                  key={`street-${column}`}
                  left={((column + 0.5) / 12) * 100}
                  top={0}
                  label={`Street on ${numberAt(column, 2)}, ${numberAt(column, 1)}, ${numberAt(column, 0)}`}
                  onClick={() =>
                    place("street", [numberAt(column, 2), numberAt(column, 1), numberAt(column, 0)])
                  }
                  chip={
                    <ChipMark
                      id={makeId("street", [
                        numberAt(column, 2),
                        numberAt(column, 1),
                        numberAt(column, 0),
                      ])}
                    />
                  }
                  disabled={disabled}
                />
              ))}

              {COLUMNS.slice(0, 11).map((column) => {
                const numbers = [
                  numberAt(column, 2),
                  numberAt(column, 1),
                  numberAt(column, 0),
                  numberAt(column + 1, 2),
                  numberAt(column + 1, 1),
                  numberAt(column + 1, 0),
                ];
                return (
                  <Marker
                    key={`sixline-${column}`}
                    left={((column + 1) / 12) * 100}
                    top={0}
                    corner
                    label={`Six line on ${numbers.join(", ")}`}
                    onClick={() => place("six-line", numbers)}
                    chip={<ChipMark id={makeId("six-line", numbers)} />}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          </div>

          {/* Columns */}
          <div className="flex w-16 flex-col gap-1">
            {[2, 1, 0].map((index) => {
              const numbers = numbersForOutside("column", index);
              const id = makeId("column", numbers);
              return (
                <button
                  key={index}
                  type="button"
                  disabled={disabled}
                  onClick={() => place("column", numbers)}
                  aria-label={`Column ${index + 1}, pays 2 to 1`}
                  className={cn(
                    "relative flex h-9 items-center justify-center border border-[rgba(236,229,216,0.18)] bg-[rgba(20,72,58,0.5)] font-mono text-[9px] tracking-[0.1em] text-[rgba(236,229,216,0.8)] uppercase transition-colors",
                    !disabled && "hover:border-[rgba(201,167,94,0.8)]",
                  )}
                >
                  2 to 1
                  <ChipMark id={id} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Dozens */}
        <div className="mt-1 flex gap-1">
          <div className={cn(variant === "american" ? "w-10" : "w-9")} />
          <div className="grid flex-1 grid-cols-3 gap-1">
            {["1st 12", "2nd 12", "3rd 12"].map((label, index) => {
              const numbers = numbersForOutside("dozen", index);
              const id = makeId("dozen", numbers);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => place("dozen", numbers)}
                  className={cn(
                    "relative flex h-8 items-center justify-center border border-[rgba(236,229,216,0.18)] bg-[rgba(20,72,58,0.5)] font-mono text-[9.5px] tracking-[0.12em] text-[rgba(236,229,216,0.82)] uppercase transition-colors",
                    !disabled && "hover:border-[rgba(201,167,94,0.8)]",
                  )}
                >
                  {label}
                  <ChipMark id={id} />
                </button>
              );
            })}
          </div>
          <div className="w-16" />
        </div>

        {/* Even money bets */}
        <div className="mt-1 flex gap-1">
          <div className={cn(variant === "american" ? "w-10" : "w-9")} />
          <div className="grid flex-1 grid-cols-6 gap-1">
            {(
              [
                ["low", "1 to 18"],
                ["even", "Even"],
                ["red", "Red"],
                ["black", "Black"],
                ["odd", "Odd"],
                ["high", "19 to 36"],
              ] as Array<[RouletteBetType, string]>
            ).map(([type, label]) => {
              const numbers = numbersForOutside(type);
              const id = makeId(type, numbers);
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => place(type, numbers)}
                  className={cn(
                    "relative flex h-8 items-center justify-center border border-[rgba(236,229,216,0.18)] font-mono text-[9.5px] tracking-[0.1em] uppercase transition-colors",
                    type === "red"
                      ? "bg-[rgba(124,47,44,0.75)] text-[rgba(236,229,216,0.9)]"
                      : type === "black"
                        ? "bg-[rgba(25,29,28,0.85)] text-[rgba(236,229,216,0.9)]"
                        : "bg-[rgba(20,72,58,0.5)] text-[rgba(236,229,216,0.82)]",
                    !disabled && "hover:border-[rgba(201,167,94,0.8)]",
                  )}
                >
                  {label}
                  <ChipMark id={id} />
                </button>
              );
            })}
          </div>
          <div className="w-16" />
        </div>

        <p className="mt-3 text-center font-mono text-[8.5px] tracking-[0.14em] text-[rgba(236,229,216,0.3)] uppercase">
          Click a line marker for splits, streets, corners, and six lines. Click a chip to remove it.
        </p>
      </div>
    </div>
  );
}

function Marker({
  left,
  top,
  label,
  onClick,
  chip,
  corner,
  disabled,
}: {
  left: number;
  top: number;
  label: string;
  onClick: () => void;
  chip: React.ReactNode;
  corner?: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "pointer-events-auto absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors",
        corner
          ? "border-[rgba(201,167,94,0.22)] bg-[rgba(201,167,94,0.07)]"
          : "border-[rgba(236,229,216,0.12)] bg-[rgba(0,0,0,0.2)]",
        !disabled && "hover:border-[rgba(201,167,94,0.95)] hover:bg-[rgba(201,167,94,0.3)]",
      )}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      {chip}
    </button>
  );
}
