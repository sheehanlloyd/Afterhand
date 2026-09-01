import { GameId, GameMode } from "@/types";
import { BlackjackRules, DEFAULT_RULES } from "@/lib/games/blackjack/types";
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

export function loadPreferences(): Preferences {
  const stored = readStore<Preferences>(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);
  return {
    ...stored,
    blackjackRules: { ...DEFAULT_RULES, ...stored.blackjackRules },
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
