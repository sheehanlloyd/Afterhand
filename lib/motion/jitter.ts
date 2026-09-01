/**
 * Deterministic scatter.
 *
 * A hand of cards that lines up perfectly looks printed rather than dealt, but
 * random offsets that change on every render make the table twitch. These
 * derive the scatter from the card's own id, so a card sits at the same tiny
 * angle for as long as it is on the felt and a different one next time it
 * appears.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** A stable value in [-1, 1] for a given seed and channel. */
export function wobbleOf(seed: string, channel = ""): number {
  return hash(`${seed}::${channel}`) * 2 - 1;
}

export interface CardRest {
  /** Degrees the card comes to rest at. */
  rotate: number;
  /** Pixels of vertical scatter, as a fraction of card width. */
  offsetY: number;
  offsetX: number;
}

/**
 * Where a card settles inside a hand.
 *
 * The first card is close to square because the rest of the hand is stacked
 * against it; later cards fan out a little more, the way they do when they are
 * flicked onto a pile that is already there.
 */
export function restingPose(cardId: string, index: number): CardRest {
  const spread = Math.min(index, 5);
  return {
    rotate: wobbleOf(cardId, "rot") * (1.1 + spread * 0.85) + (index === 0 ? 0 : spread * 0.5),
    offsetY: wobbleOf(cardId, "y") * (0.012 + spread * 0.006),
    offsetX: wobbleOf(cardId, "x") * 0.01,
  };
}
