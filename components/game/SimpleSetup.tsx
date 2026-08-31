"use client";

import { ReactNode, useMemo, useState } from "react";
import { GameMode } from "@/types";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Field, NumberField } from "@/components/ui/Field";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const PRESETS = [100, 500, 1000, 5000];
const MIN = 20;
const MAX = 1_000_000;

/** Shared session setup for the games that only need a bankroll and a mode. */
export function SimpleSetup({
  eyebrow,
  title,
  intro,
  initialBankroll,
  initialMode,
  learnCopy,
  playCopy,
  placard,
  extra,
  onStart,
  startLabel = "Start session",
}: {
  eyebrow: string;
  title: string;
  intro: string;
  initialBankroll: number;
  initialMode: GameMode;
  learnCopy: string;
  playCopy: string;
  placard: ReactNode;
  extra?: ReactNode;
  onStart: (result: { bankroll: number; mode: GameMode }) => void;
  startLabel?: string;
}) {
  const [bankroll, setBankroll] = useState(initialBankroll);
  const [custom, setCustom] = useState(false);
  const [mode, setMode] = useState<GameMode>(initialMode);

  const error = useMemo(() => {
    if (!Number.isFinite(bankroll)) return "Enter a number.";
    if (bankroll < MIN) return `The minimum is ${formatMoney(MIN)}.`;
    if (bankroll > MAX) return `The maximum is ${formatMoney(MAX)}.`;
    return null;
  }, [bankroll]);

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-20">
      <div>
        <span className="label">{eyebrow}</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">{title}</h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-2">{intro}</p>

        <hr className="rule-double mt-10" />

        <section className="mt-8">
          <div className="section-head">
            <span className="label pt-1">01</span>
            <div>
              <h2 className="text-[16px] font-semibold">Starting bankroll</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setCustom(false);
                      setBankroll(amount);
                    }}
                    aria-pressed={!custom && bankroll === amount}
                    className={cn(
                      "tabular h-11 min-w-[5.5rem] border px-4 text-[14px] transition-colors",
                      !custom && bankroll === amount
                        ? "border-accent-2 bg-accent-2/10 text-fg"
                        : "border-line text-fg-2 hover:border-line-2 hover:text-fg",
                    )}
                  >
                    {formatMoney(amount)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustom(true)}
                  aria-pressed={custom}
                  className={cn(
                    "h-11 border px-4 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors",
                    custom
                      ? "border-accent-2 bg-accent-2/10 text-fg"
                      : "border-line text-fg-2 hover:border-line-2 hover:text-fg",
                  )}
                >
                  Custom
                </button>
              </div>
              {custom ? (
                <div className="mt-4 max-w-[16rem]">
                  <Field label="Custom amount" hint={`${MIN} to ${MAX.toLocaleString("en-US")}`}>
                    <NumberField
                      value={bankroll}
                      onChange={setBankroll}
                      min={MIN}
                      max={MAX}
                      step={10}
                      prefix="$"
                      ariaLabel="Custom starting bankroll"
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-9">
          <div className="section-head">
            <span className="label pt-1">02</span>
            <div>
              <h2 className="text-[16px] font-semibold">Mode</h2>
              <div className="mt-4">
                <Segmented
                  label="Session mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "play", label: "Play" },
                    { value: "learn", label: "Learn" },
                  ]}
                />
              </div>
              <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-fg-2">
                {mode === "learn" ? learnCopy : playCopy}
              </p>
            </div>
          </div>
        </section>

        {extra ? <div className="mt-9">{extra}</div> : null}

        {error ? <p className="mt-8 text-[13px] text-negative">{error}</p> : null}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            plate
            disabled={Boolean(error)}
            onClick={() => onStart({ bankroll: Math.round(bankroll), mode })}
          >
            {startLabel}
          </Button>
          <span className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase">
            No account required
          </span>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">{placard}</aside>
    </div>
  );
}

export function Placard({ title, lines }: { title: string; lines: Array<[string, string]> }) {
  return (
    <div className="felt border border-[rgba(201,167,94,0.28)] p-6">
      <div className="border border-[rgba(201,167,94,0.16)] p-5">
        <p className="text-center font-mono text-[9px] tracking-[0.3em] text-[rgba(201,167,94,0.75)] uppercase">
          Table rules
        </p>
        <p className="display mt-3 text-center text-[26px] leading-none text-[#ece5d8]">{title}</p>
        <dl className="mt-6 space-y-2.5">
          {lines.map(([term, value]) => (
            <div key={term} className="flex items-baseline justify-between gap-4">
              <dt className="font-mono text-[9.5px] tracking-[0.12em] text-[rgba(236,229,216,0.42)] uppercase">
                {term}
              </dt>
              <dd className="tabular text-[12.5px] text-[rgba(236,229,216,0.9)]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
