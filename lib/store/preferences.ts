"use client";

import { useEffect } from "react";
import { create } from "zustand";
import {
  DEFAULT_PREFERENCES,
  Preferences,
  loadPreferences,
  savePreferences,
} from "@/lib/storage/preferences";
import { setSoundEnabled } from "@/lib/sound";

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
    set({ preferences, hydrated: true });
  },
  update: (patch) => {
    const next = { ...get().preferences, ...patch };
    savePreferences(next);
    if (patch.soundEnabled !== undefined) setSoundEnabled(patch.soundEnabled);
    set({ preferences: next });
  },
  reset: () => {
    savePreferences(DEFAULT_PREFERENCES);
    setSoundEnabled(DEFAULT_PREFERENCES.soundEnabled);
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
