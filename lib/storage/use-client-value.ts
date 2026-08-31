"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a value that only exists in the browser, such as anything backed by
 * localStorage, without setting state inside an effect.
 *
 * The snapshot is cached per key so React always sees a stable reference, and
 * the server snapshot is null so the first paint matches the markup.
 */

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function subscribeTo(key: string, callback: () => void): () => void {
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(callback);
  listeners.set(key, set);
  return () => {
    set.delete(callback);
  };
}

export function useClientValue<T>(key: string, load: () => T): T | null {
  const subscribe = useCallback(
    (callback: () => void) => subscribeTo(key, callback),
    [key],
  );

  const getSnapshot = useCallback(() => {
    if (!cache.has(key)) cache.set(key, load());
    return cache.get(key) as T;
  }, [key, load]);

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Drops the cached value and tells every reader to pick up the new one. */
export function refreshClientValue(key: string): void {
  cache.delete(key);
  listeners.get(key)?.forEach((callback) => callback());
}

export function clearClientValueCache(): void {
  const keys = [...cache.keys()];
  cache.clear();
  keys.forEach((key) => listeners.get(key)?.forEach((callback) => callback()));
}
