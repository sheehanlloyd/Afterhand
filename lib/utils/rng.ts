/**
 * Randomness helpers.
 *
 * These use crypto.getRandomValues where available and fall back to Math.random
 * so server rendering and older environments still work. This is a simulation:
 * nothing here claims cryptographic fairness or casino certification.
 */

const MAX_UINT32 = 0xffffffff;

function cryptoObject(): Crypto | undefined {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const candidate = (globalThis as { crypto?: Crypto }).crypto;
    if (candidate && typeof candidate.getRandomValues === "function") {
      return candidate;
    }
  }
  return undefined;
}

/** Uniform integer in [0, maxExclusive) with rejection sampling to avoid modulo bias. */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("randomInt requires a positive bound");
  if (maxExclusive === 1) return 0;

  const source = cryptoObject();
  if (!source) return Math.floor(Math.random() * maxExclusive);

  const limit = Math.floor((MAX_UINT32 + 1) / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    source.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % maxExclusive;
}

/** Float in [0, 1). */
export function randomFloat(): number {
  const source = cryptoObject();
  if (!source) return Math.random();
  const buffer = new Uint32Array(1);
  source.getRandomValues(buffer);
  return buffer[0] / (MAX_UINT32 + 1);
}

/** In-place Fisher-Yates shuffle. Returns the same array for convenience. */
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const swap = items[i];
    items[i] = items[j];
    items[j] = swap;
  }
  return items;
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}
