/**
 * Thin wrapper over localStorage.
 *
 * Every read is defensive: private browsing modes, disabled storage, and
 * corrupted values all fall back to defaults instead of throwing.
 */

export const STORAGE_KEYS = {
  preferences: "afterhand.preferences",
  tutorials: "afterhand.tutorials",
  learning: {
    blackjack: "afterhand.learning.blackjack",
    poker: "afterhand.learning.poker",
    baccarat: "afterhand.learning.baccarat",
    roulette: "afterhand.learning.roulette",
  },
} as const;

export const ALL_STORAGE_KEYS: string[] = [
  STORAGE_KEYS.preferences,
  STORAGE_KEYS.tutorials,
  ...Object.values(STORAGE_KEYS.learning),
];

export interface Versioned {
  version: number;
}

function available(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "__afterhand_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function storageAvailable(): boolean {
  return available() !== null;
}

export function readStore<T extends Versioned>(key: string, fallback: T): T {
  const store = available();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T> & Versioned;
    if (typeof parsed !== "object" || parsed === null) return fallback;
    if (parsed.version !== fallback.version) {
      // Older or newer shapes are dropped rather than guessed at.
      return fallback;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writeStore<T extends Versioned>(key: string, value: T): void {
  const store = available();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or permission problems are not worth interrupting play for.
  }
}

export function removeStore(key: string): void {
  const store = available();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // Ignored on purpose.
  }
}

export function clearAllStores(): void {
  ALL_STORAGE_KEYS.forEach(removeStore);
}

/** Same-tab session recovery uses sessionStorage so a refresh does not lose a hand. */
export function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSession<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored on purpose.
  }
}

export function removeSession(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignored on purpose.
  }
}
