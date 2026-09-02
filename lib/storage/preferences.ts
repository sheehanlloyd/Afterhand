import { GameId, GameMode } from "@/types";
import { BlackjackRules, DEFAULT_RULES, sanitiseRules } from "@/lib/games/blackjack/types";
import { STORAGE_KEYS, Versioned, readStore, writeStore } from "./storage";

export interface Preferences extends Versioned {
  soundEnabled: boolean;
  /** Short vibrations on a phone when a card lands or a chip is placed. */
  hapticsEnabled: boolean;
  preferredGame: GameId;
  preferredBankroll: number;
  preferredMode: GameMode;
  blackjackRules: BlackjackRules;
  rouletteVariant: "european" | "american";
  showKeyboardHints: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  version: 1,
  soundEnabled: false,
  hapticsEnabled: true,
  preferredGame: "blackjack",
  preferredBankroll: 1000,
  preferredMode: "learn",
  blackjackRules: DEFAULT_RULES,
  rouletteVariant: "european",
  showKeyboardHints: true,
};

const GAME_IDS: GameId[] = ["blackjack", "poker", "baccarat", "roulette"];

/**
 * Reads the saved preferences back, keeping only what still makes sense.
 *
 * `readStore` drops a payload whose version it does not recognise, but within a
 * matching version it merges the stored object over the defaults field by
 * field, and localStorage is a text file the reader can edit. That was enough
 * to put `"chess"` in `preferredGame`, `"lots"` in `preferredBankroll`, and a
 * `decks` of `"x"` into the shoe, where it produced a table that took a bet and
 * then dealt no cards at all.
 *
 * A preference is a convenience, so a value that is not the type it claims to be
 * is replaced by its default rather than being allowed to reach a game.
 */
export function loadPreferences(): Preferences {
  const stored = readStore<Preferences>(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);
  const bankroll = stored.preferredBankroll;

  return {
    version: DEFAULT_PREFERENCES.version,
    soundEnabled:
      typeof stored.soundEnabled === "boolean"
        ? stored.soundEnabled
        : DEFAULT_PREFERENCES.soundEnabled,
    hapticsEnabled:
      typeof stored.hapticsEnabled === "boolean"
        ? stored.hapticsEnabled
        : DEFAULT_PREFERENCES.hapticsEnabled,
    showKeyboardHints:
      typeof stored.showKeyboardHints === "boolean"
        ? stored.showKeyboardHints
        : DEFAULT_PREFERENCES.showKeyboardHints,
    preferredGame: GAME_IDS.includes(stored.preferredGame)
      ? stored.preferredGame
      : DEFAULT_PREFERENCES.preferredGame,
    preferredMode:
      stored.preferredMode === "play" || stored.preferredMode === "learn"
        ? stored.preferredMode
        : DEFAULT_PREFERENCES.preferredMode,
    preferredBankroll:
      typeof bankroll === "number" && Number.isFinite(bankroll) && bankroll > 0
        ? Math.round(bankroll)
        : DEFAULT_PREFERENCES.preferredBankroll,
    rouletteVariant:
      stored.rouletteVariant === "european" || stored.rouletteVariant === "american"
        ? stored.rouletteVariant
        : DEFAULT_PREFERENCES.rouletteVariant,
    blackjackRules: sanitiseRules(stored.blackjackRules),
  };
}

export function savePreferences(preferences: Preferences): void {
  writeStore(STORAGE_KEYS.preferences, preferences);
}

export interface TutorialState extends Versioned {
  completed: Record<string, boolean>;
}

export const DEFAULT_TUTORIALS: TutorialState = { version: 1, completed: {} };

export function loadTutorials(): TutorialState {
  return readStore<TutorialState>(STORAGE_KEYS.tutorials, DEFAULT_TUTORIALS);
}

export function saveTutorials(state: TutorialState): void {
  writeStore(STORAGE_KEYS.tutorials, state);
}
