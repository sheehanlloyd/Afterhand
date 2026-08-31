"use client";

import { useState } from "react";
import { usePreferences, usePreferencesStore } from "@/lib/store/preferences";
import { Toggle } from "@/components/ui/Toggle";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SectionHead } from "@/components/ui/Panel";
import { Field, NumberField } from "@/components/ui/Field";
import { STORAGE_KEYS, clearAllStores, removeStore, storageAvailable } from "@/lib/storage/storage";
import { DEFAULT_PREFERENCES } from "@/lib/storage/preferences";
import { clearClientValueCache, useClientValue } from "@/lib/storage/use-client-value";

type ResetKind = "learning" | "preferences" | "all";

const RESET_COPY: Record<ResetKind, { title: string; description: string; confirm: string }> = {
  learning: {
    title: "Reset learning progress?",
    description:
      "This removes your review history, strategy mastery, and practice statistics from this browser. Settings are kept.",
    confirm: "Reset progress",
  },
  preferences: {
    title: "Reset preferences?",
    description:
      "Sound, table rules, and default bankroll return to their starting values. Learning history is kept.",
    confirm: "Reset preferences",
  },
  all: {
    title: "Clear all local data?",
    description:
      "This removes locally stored Afterhand settings and learning history from this browser.",
    confirm: "Clear everything",
  },
};

export function SettingsScreen() {
  const { preferences, update } = usePreferences();
  const resetPreferences = usePreferencesStore((state) => state.reset);
  const [pending, setPending] = useState<ResetKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const storable = useClientValue("storage.available", storageAvailable) ?? true;

  function runReset(kind: ResetKind) {
    if (kind === "learning") {
      Object.values(STORAGE_KEYS.learning).forEach(removeStore);
      removeStore(STORAGE_KEYS.tutorials);
      clearClientValueCache();
      setNotice("Learning progress cleared.");
    } else if (kind === "preferences") {
      resetPreferences();
      setNotice("Preferences reset.");
    } else {
      clearAllStores();
      resetPreferences();
      clearClientValueCache();
      setNotice("All local Afterhand data cleared.");
    }
    setPending(null);
  }

  const rules = preferences.blackjackRules;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="max-w-2xl">
        <span className="label">Settings</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">Preferences</h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Everything here lives in this browser. There is no account, and nothing is sent to a
          server.
        </p>
      </header>

      {!storable ? (
        <p className="mt-8 border border-caution/45 px-4 py-3 text-[13.5px] text-caution">
          Browser storage is unavailable in this context, so changes will not persist after you
          close the tab.
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-8 border border-positive/45 px-4 py-3 text-[13.5px] text-positive"
        >
          {notice}
        </p>
      ) : null}

      <section className="mt-14">
        <SectionHead index="01" title="Table" />
        <div className="mt-6 divide-y divide-[var(--line)] border-y border-line">
          <Toggle
            label="Sound"
            description="Short synthesised card and chip sounds. There is no music and no jingles."
            checked={preferences.soundEnabled}
            onChange={(value) => update({ soundEnabled: value })}
          />
          <Toggle
            label="Keyboard hints"
            description="Show the shortcut letters on table controls."
            checked={preferences.showKeyboardHints}
            onChange={(value) => update({ showKeyboardHints: value })}
          />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Field label="Default mode">
            <Segmented
              label="Default mode"
              size="sm"
              value={preferences.preferredMode}
              onChange={(value) => update({ preferredMode: value })}
              options={[
                { value: "play", label: "Play" },
                { value: "learn", label: "Learn" },
              ]}
            />
          </Field>
          <Field label="Default bankroll" hint="20 to 1,000,000">
            <NumberField
              value={preferences.preferredBankroll}
              onChange={(value) =>
                update({
                  preferredBankroll: Math.max(20, Math.min(1_000_000, Math.round(value))),
                })
              }
              min={20}
              max={1_000_000}
              step={50}
              prefix="$"
              ariaLabel="Default starting bankroll"
            />
          </Field>
          <Field label="Roulette wheel">
            <Segmented
              label="Roulette wheel"
              size="sm"
              value={preferences.rouletteVariant}
              onChange={(value) => update({ rouletteVariant: value })}
              options={[
                { value: "european", label: "European" },
                { value: "american", label: "American" },
              ]}
            />
          </Field>
        </div>
      </section>

      <section className="mt-16">
        <SectionHead index="02" title="Blackjack house rules" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Number of decks">
            <Segmented
              label="Number of decks"
              size="sm"
              value={String(rules.decks)}
              onChange={(value) =>
                update({ blackjackRules: { ...rules, decks: Number(value) } })
              }
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
              onChange={(value) =>
                update({ blackjackRules: { ...rules, dealerHitsSoft17: value === "hit" } })
              }
              options={[
                { value: "stand", label: "Stands" },
                { value: "hit", label: "Hits" },
              ]}
            />
          </Field>
        </div>
        <div className="mt-6 divide-y divide-[var(--line)] border-y border-line">
          <Toggle
            label="Blackjack pays 3 to 2"
            description="Turning this off switches the table to 6 to 5, which is a noticeably worse deal for the player."
            checked={rules.blackjackPayout === 1.5}
            onChange={(value) =>
              update({ blackjackRules: { ...rules, blackjackPayout: value ? 1.5 : 1.2 } })
            }
          />
          <Toggle
            label="Double after split"
            checked={rules.doubleAfterSplit}
            onChange={(value) => update({ blackjackRules: { ...rules, doubleAfterSplit: value } })}
          />
          <Toggle
            label="Late surrender"
            checked={rules.surrender === "late"}
            onChange={(value) =>
              update({ blackjackRules: { ...rules, surrender: value ? "late" : "none" } })
            }
          />
          <Toggle
            label="Insurance offered"
            checked={rules.insurance}
            onChange={(value) => update({ blackjackRules: { ...rules, insurance: value } })}
          />
        </div>
        <button
          type="button"
          onClick={() => update({ blackjackRules: DEFAULT_PREFERENCES.blackjackRules })}
          className="mt-5 font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
        >
          Reset to house rules
        </button>
      </section>

      <section className="mt-16">
        <SectionHead index="03" title="Local data" />
        <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-fg-2">
          Your preferences and learning progress stay on this device unless you clear your browser
          data. There is no account to recover and nothing to delete on a server.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" size="md" plate onClick={() => setPending("learning")}>
            Reset learning progress
          </Button>
          <Button variant="secondary" size="md" plate onClick={() => setPending("preferences")}>
            Reset preferences
          </Button>
          <Button variant="danger" size="md" plate onClick={() => setPending("all")}>
            Clear all local data
          </Button>
        </div>
      </section>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? RESET_COPY[pending].title : ""}
        description={pending ? RESET_COPY[pending].description : ""}
        footer={
          <>
            <Button variant="ghost" plate onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant="primary" plate onClick={() => pending && runReset(pending)}>
              {pending ? RESET_COPY[pending].confirm : "Reset"}
            </Button>
          </>
        }
      />
    </div>
  );
}
