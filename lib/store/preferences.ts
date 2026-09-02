"use client";

import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import {
  DEFAULT_PREFERENCES,
  Preferences,
  loadPreferences,
  savePreferences,
} from "@/lib/storage/preferences";
import { setSoundEnabled } from "@/lib/sound";
import { setHapticsEnabled } from "@/lib/motion/haptics";

interface PreferencesStore {
  preferences: Preferences;
  hydrated: boolean;
  hydrate: () => void;
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesStore>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const preferences = loadPreferences();
    setSoundEnabled(preferences.soundEnabled);
    setHapticsEnabled(preferences.hapticsEnabled);
    set({ preferences, hydrated: true });
  },
  update: (patch) => {
    const next = { ...get().preferences, ...patch };
    savePreferences(next);
    if (patch.soundEnabled !== undefined) setSoundEnabled(patch.soundEnabled);
    if (patch.hapticsEnabled !== undefined) setHapticsEnabled(patch.hapticsEnabled);
    set({ preferences: next });
  },
  reset: () => {
    savePreferences(DEFAULT_PREFERENCES);
    setSoundEnabled(DEFAULT_PREFERENCES.soundEnabled);
    setHapticsEnabled(DEFAULT_PREFERENCES.hapticsEnabled);
    set({ preferences: DEFAULT_PREFERENCES });
  },
}));

/** Hydrates once on the client and returns the live preferences. */
export function usePreferences() {
  const hydrate = usePreferencesStore((state) => state.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return {
    preferences: usePreferencesStore((state) => state.preferences),
    hydrated: usePreferencesStore((state) => state.hydrated),
    update: usePreferencesStore((state) => state.update),
  };
}

/**
 * Local state backed by a saved preference.
 *
 * Preferences are read out of localStorage after mount, because reading them
 * during the first render would make the client's markup disagree with the
 * server's and lose the hydration. That leaves a gap for any screen that seeds
 * its own state with `useState(preferences.preferredBankroll)`: the default is
 * captured on the first render and the stored value, arriving a moment later,
 * is never heard. A reader who had set a $5,000 bankroll and an eight deck shoe
 * was still handed $1,000 and six decks every time they sat down. The
 * preference had saved correctly and simply never arrived.
 *
 * So nothing is captured. The value is read straight from the preferences until
 * the reader chooses something, at which point their choice is held and wins
 * from then on. Hydration is then just another change to the preferences, and
 * needs no timing of its own.
 */
export function usePreferenceState<T>(select: (preferences: Preferences) => T): [
  T,
  (value: T) => void,
] {
  const { preferences } = usePreferences();
  /* Wrapped rather than stored bare, so that choosing the value a preference
     already holds still counts as having chosen it. */
  const [chosen, setChosen] = useState<{ value: T } | null>(null);
  const choose = useCallback((value: T) => setChosen({ value }), []);
  return [chosen ? chosen.value : select(preferences), choose];
}
