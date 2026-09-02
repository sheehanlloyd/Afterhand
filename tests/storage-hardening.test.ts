import { describe, expect, it, beforeEach } from "vitest";
import { DEFAULT_RULES, sanitiseRules } from "@/lib/games/blackjack/types";
import { createShoe } from "@/lib/games/deck";
import { DEFAULT_PREFERENCES, loadPreferences } from "@/lib/storage/preferences";
import { STORAGE_KEYS } from "@/lib/storage/storage";

/**
 * localStorage and sessionStorage are text the reader can edit, and a rule set
 * read back out of them reaches the engine rather than just the screen. These
 * cover the values that actually broke a table rather than the type system.
 */


/**
 * A localStorage that lives in memory.
 *
 * The suite runs without a DOM, and the storage layer reaches for
 * `window.localStorage` behind a `typeof window` guard. Standing one up here
 * keeps these tests to the sanitising, without giving the whole suite a DOM it
 * does not otherwise need.
 */
class MemoryStorage {
  private entries = new Map<string, string>();
  getItem(key: string) {
    return this.entries.has(key) ? (this.entries.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.entries.set(key, String(value));
  }
  removeItem(key: string) {
    this.entries.delete(key);
  }
  clear() {
    this.entries.clear();
  }
}

const storage = new MemoryStorage();
(globalThis as { window?: unknown }).window = { localStorage: storage };

function withStoredPreferences(raw: string) {
  storage.setItem(STORAGE_KEYS.preferences, raw);
  return loadPreferences();
}

describe("sanitiseRules", () => {
  it("keeps a rule set that is already valid", () => {
    const rules = sanitiseRules({ ...DEFAULT_RULES, decks: 2, dealerHitsSoft17: true });
    expect(rules.decks).toBe(2);
    expect(rules.dealerHitsSoft17).toBe(true);
  });

  it("replaces a non-numeric deck count, which would otherwise build an empty shoe", () => {
    expect(sanitiseRules({ decks: "x" }).decks).toBe(DEFAULT_RULES.decks);
    // The reason it matters: createShoe loops `i < count`.
    expect(createShoe(sanitiseRules({ decks: "x" }).decks).cards.length).toBe(52 * 6);
    expect(createShoe("x" as unknown as number).cards.length).toBe(0);
  });

  it("rejects deck counts outside the range a real table offers", () => {
    expect(sanitiseRules({ decks: 0 }).decks).toBe(DEFAULT_RULES.decks);
    expect(sanitiseRules({ decks: 99 }).decks).toBe(DEFAULT_RULES.decks);
    expect(sanitiseRules({ decks: 2.5 }).decks).toBe(DEFAULT_RULES.decks);
  });

  it("replaces bet limits that are missing or not positive numbers", () => {
    const rules = sanitiseRules({ minBet: -5, maxBet: null });
    expect(rules.minBet).toBe(DEFAULT_RULES.minBet);
    expect(rules.maxBet).toBe(DEFAULT_RULES.maxBet);
  });

  it("restores both limits when the maximum sits below the minimum", () => {
    const rules = sanitiseRules({ minBet: 900, maxBet: 10 });
    expect(rules.minBet).toBe(DEFAULT_RULES.minBet);
    expect(rules.maxBet).toBe(DEFAULT_RULES.maxBet);
  });

  it("ignores values of the wrong type without discarding the rest", () => {
    const rules = sanitiseRules({ surrender: "sometimes", insurance: "yes", decks: 4 });
    expect(rules.surrender).toBe(DEFAULT_RULES.surrender);
    expect(rules.insurance).toBe(DEFAULT_RULES.insurance);
    expect(rules.decks).toBe(4);
  });

  it("falls back completely for input that is not an object", () => {
    expect(sanitiseRules("not an object")).toEqual(DEFAULT_RULES);
    expect(sanitiseRules(null)).toEqual(DEFAULT_RULES);
    expect(sanitiseRules([1, 2, 3])).toEqual(DEFAULT_RULES);
  });
});

describe("loadPreferences", () => {
  beforeEach(() => storage.clear());

  it("returns the defaults when nothing is stored", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps values that are still valid", () => {
    const saved = { ...DEFAULT_PREFERENCES, preferredBankroll: 5000, soundEnabled: true };
    const loaded = withStoredPreferences(JSON.stringify(saved));
    expect(loaded.preferredBankroll).toBe(5000);
    expect(loaded.soundEnabled).toBe(true);
  });

  it("replaces every field that is not the type it claims to be", () => {
    const loaded = withStoredPreferences(
      JSON.stringify({
        version: 1,
        soundEnabled: "yes",
        hapticsEnabled: null,
        preferredGame: "chess",
        preferredBankroll: "lots",
        preferredMode: 42,
        rouletteVariant: "martian",
        showKeyboardHints: "maybe",
        blackjackRules: { decks: "x", minBet: -5, maxBet: null },
      }),
    );
    expect(loaded).toEqual(DEFAULT_PREFERENCES);
  });

  it("does not let a corrupt deck count reach the shoe", () => {
    const loaded = withStoredPreferences(
      JSON.stringify({ ...DEFAULT_PREFERENCES, blackjackRules: { decks: "x" } }),
    );
    expect(createShoe(loaded.blackjackRules.decks).cards.length).toBeGreaterThan(0);
  });

  it("survives a stored value that is not JSON at all", () => {
    expect(withStoredPreferences("{{{ not json")).toEqual(DEFAULT_PREFERENCES);
  });
});
