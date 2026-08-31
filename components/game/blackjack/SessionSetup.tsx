"use client";

import { useMemo, useState } from "react";
import { GameMode } from "@/types";
import { BlackjackRules, DEFAULT_RULES } from "@/lib/games/blackjack/types";
import { formatMoney } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Field, NumberField } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils/cn";

const PRESETS = [100, 500, 1000, 5000];
const MIN_BANKROLL = 20;
const MAX_BANKROLL = 1_000_000;

export interface SetupResult {
  bankroll: number;
  mode: GameMode;
  rules: BlackjackRules;
}

export function SessionSetup({
  initialBankroll,
  initialMode,
  initialRules,
  onStart,
  recovery,
  onResume,
  onDiscardRecovery,
}: {
  initialBankroll: number;
  initialMode: GameMode;
  initialRules: BlackjackRules;
  onStart: (result: SetupResult) => void;
  recovery?: { bankroll: number; handNumber: number } | null;
  onResume?: () => void;
  onDiscardRecovery?: () => void;
}) {
  const [bankroll, setBankroll] = useState(initialBankroll);
  const [custom, setCustom] = useState(false);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [rules, setRules] = useState<BlackjackRules>(initialRules);
  const [advanced, setAdvanced] = useState(false);

  const error = useMemo(() => {
    if (!Number.isFinite(bankroll)) return "Enter a number.";
    if (bankroll < MIN_BANKROLL) return `The minimum is ${formatMoney(MIN_BANKROLL)}.`;
    if (bankroll > MAX_BANKROLL) return `The maximum is ${formatMoney(MAX_BANKROLL)}.`;
    if (rules.minBet > bankroll) return "The table minimum is larger than your bankroll.";
    if (rules.maxBet < rules.minBet) return "The table maximum must be at least the minimum.";
    return null;
  }, [bankroll, rules.minBet, rules.maxBet]);

  function patch(next: Partial<BlackjackRules>) {
    setRules((current) => ({ ...current, ...next }));
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-20">
      <div>
        <span className="label">Blackjack</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">
          Start a session
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-2">
          Choose a simulated bankroll and a mode. Nothing is stored on a server, and closing the
          tab ends the session.
        </p>

        {recovery ? (
          <div className="mt-8 border border-accent-2/45 bg-accent-2/[0.06] p-5">
            <p className="label">Unfinished session</p>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-2">
              A session from this tab is still open with {formatMoney(recovery.bankroll)} after{" "}
              {recovery.handNumber} {recovery.handNumber === 1 ? "hand" : "hands"}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="sm" plate onClick={onResume}>
                Resume
              </Button>
              <Button variant="ghost" size="sm" plate onClick={onDiscardRecovery}>
                Start fresh
              </Button>
            </div>
          </div>
        ) : null}

        <hr className="rule-double mt-10" />

        <div className="mt-8 space-y-9">
          <section>
            <div className="section-head">
              <span className="label pt-1">01</span>
              <div>
                <h2 className="text-[16px] font-semibold">Starting bankroll</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PRESETS.map((amount) => {
                    const active = !custom && bankroll === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setCustom(false);
                          setBankroll(amount);
                        }}
                        aria-pressed={active}
                        className={cn(
                          "tabular h-11 min-w-[5.5rem] border px-4 text-[14px] transition-colors",
                          active
                            ? "border-accent-2 bg-accent-2/10 text-fg"
                            : "border-line text-fg-2 hover:border-line-2 hover:text-fg",
                        )}
                      >
                        {formatMoney(amount)}
                      </button>
                    );
                  })}
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
                    <Field
                      label="Custom amount"
                      hint={`${MIN_BANKROLL} to ${MAX_BANKROLL.toLocaleString("en-US")}`}
                    >
                      <NumberField
                        value={bankroll}
                        onChange={setBankroll}
                        min={MIN_BANKROLL}
                        max={MAX_BANKROLL}
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

          <section>
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
                  {mode === "learn"
                    ? "A review opens after each hand, showing which decisions mattered and why. It never appears while the hand is live."
                    : "No review unless you ask for one. Your decisions are still recorded, so you can open a hand review at any point."}
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="section-head">
              <span className="label pt-1">03</span>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-semibold">Table settings</h2>
                  <button
                    type="button"
                    onClick={() => setAdvanced((value) => !value)}
                    className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
                  >
                    {advanced ? "Hide rules" : "Change rules"}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum bet">
                    <NumberField
                      value={rules.minBet}
                      onChange={(value) => patch({ minBet: Math.max(1, Math.round(value)) })}
                      min={1}
                      prefix="$"
                      ariaLabel="Table minimum bet"
                    />
                  </Field>
                  <Field label="Maximum bet">
                    <NumberField
                      value={rules.maxBet}
                      onChange={(value) => patch({ maxBet: Math.max(1, Math.round(value)) })}
                      min={1}
                      prefix="$"
                      ariaLabel="Table maximum bet"
                    />
                  </Field>
                </div>

                {advanced ? (
                  <div className="mt-6 space-y-5 border-t border-line pt-6">
                    <Field label="Number of decks">
                      <Segmented
                        label="Number of decks"
                        size="sm"
                        value={String(rules.decks)}
                        onChange={(value) => patch({ decks: Number(value) })}
                        options={[
                          { value: "1", label: "1" },
                          { value: "2", label: "2" },
                          { value: "4", label: "4" },
                          { value: "6", label: "6" },
                          { value: "8", label: "8" },
                        ]}
                      />
                    </Field>

                    <Field label="Dealer on soft 17">
                      <Segmented
                        label="Dealer on soft 17"
                        size="sm"
                        value={rules.dealerHitsSoft17 ? "hit" : "stand"}
                        onChange={(value) => patch({ dealerHitsSoft17: value === "hit" })}
                        options={[
                          { value: "stand", label: "Stands" },
                          { value: "hit", label: "Hits" },
                        ]}
                      />
                    </Field>

                    <Field label="Blackjack pays">
                      <Segmented
                        label="Blackjack payout"
                        size="sm"
                        value={rules.blackjackPayout === 1.5 ? "3:2" : "6:5"}
                        onChange={(value) =>
                          patch({ blackjackPayout: value === "3:2" ? 1.5 : 1.2 })
                        }
                        options={[
                          { value: "3:2", label: "3 to 2" },
                          { value: "6:5", label: "6 to 5" },
                        ]}
                      />
                    </Field>

                    <div className="divide-y divide-[var(--line)] border-t border-line">
                      <Toggle
                        label="Double after split"
                        description="Allows doubling on a hand created by splitting."
                        checked={rules.doubleAfterSplit}
                        onChange={(value) => patch({ doubleAfterSplit: value })}
                      />
                      <Toggle
                        label="Late surrender"
                        description="Give up a hand after the deal for half the bet back."
                        checked={rules.surrender === "late"}
                        onChange={(value) => patch({ surrender: value ? "late" : "none" })}
                      />
                      <Toggle
                        label="Insurance offered"
                        description="Offer the side bet when the dealer shows an ace."
                        checked={rules.insurance}
                        onChange={(value) => patch({ insurance: value })}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setRules(DEFAULT_RULES)}
                      className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
                    >
                      Reset to house rules
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {error ? <p className="mt-8 text-[13px] text-negative">{error}</p> : null}

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            plate
            disabled={Boolean(error)}
            onClick={() => onStart({ bankroll: Math.round(bankroll), mode, rules })}
          >
            Start session
          </Button>
          <span className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase">
            No account required
          </span>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <TablePlacard bankroll={bankroll} mode={mode} rules={rules} />
      </aside>
    </div>
  );
}

function TablePlacard({
  bankroll,
  mode,
  rules,
}: {
  bankroll: number;
  mode: GameMode;
  rules: BlackjackRules;
}) {
  const lines: Array<[string, string]> = [
    ["Bankroll", formatMoney(bankroll)],
    ["Mode", mode === "learn" ? "Learn" : "Play"],
    ["Limits", `${formatMoney(rules.minBet)} to ${formatMoney(rules.maxBet)}`],
    ["Decks", String(rules.decks)],
    ["Soft 17", rules.dealerHitsSoft17 ? "Dealer hits" : "Dealer stands"],
    ["Blackjack", rules.blackjackPayout === 1.5 ? "Pays 3 to 2" : "Pays 6 to 5"],
    ["Double after split", rules.doubleAfterSplit ? "Allowed" : "Not allowed"],
    ["Surrender", rules.surrender === "late" ? "Late" : "None"],
    ["Insurance", rules.insurance ? "Offered" : "Not offered"],
  ];

  return (
    <div className="felt border border-[rgba(201,167,94,0.28)] p-6">
      <div className="border border-[rgba(201,167,94,0.16)] p-5">
        <p className="text-center font-mono text-[9px] tracking-[0.3em] text-[rgba(201,167,94,0.75)] uppercase">
          Table rules
        </p>
        <p className="display mt-3 text-center text-[26px] leading-none text-[#ece5d8]">
          Blackjack
        </p>
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
