/**
 * The motion language.
 *
 * Everything that moves in Afterhand reads from this file. The point is that a
 * button press, a card landing and a chip crossing the felt should feel like
 * they were made by the same hand, which only happens if they share a small set
 * of durations and curves rather than each picking their own.
 *
 * The curves all describe the same physical idea: something starts quickly,
 * glides, and then settles rather than stopping dead. Nothing here is linear,
 * because nothing on a real table moves at a constant speed.
 */

/** Seconds. Named for the interaction rather than the number. */
export const DURATION = {
  /** Button and chip presses. Short enough to feel like contact, not travel. */
  press: 0.1,
  tooltip: 0.16,
  menu: 0.22,
  /** A card crossing the felt from the shoe to a seat. */
  deal: 0.34,
  /** A short deal: a hit card, or a community card sliding one seat over. */
  dealShort: 0.26,
  /** The three dimensional turn of a card. */
  flip: 0.34,
  /** A chip or a small stack of chips crossing the table. */
  chip: 0.44,
  /** Handing the turn from one seat to the next. */
  turn: 0.28,
  /** An outcome resolving: totals, plates, the dealer's line. */
  reveal: 0.5,
  /** Reserved for a genuinely large win. */
  celebrate: 1.6,
  /** One screen handing off to the next (setup → table → summary). */
  screen: 0.3,
  /** One full revolution of the roulette wheel while it is settling. */
  wheelSpin: 0.9,
} as const;

/**
 * Curves.
 *
 * `arrive` is the workhorse and the one that makes cards feel heavy: a hard
 * push at the start, a long glide, then a very soft stop. `settle` is the small
 * overshoot correction that runs after something has landed.
 */
export const EASE = {
  /** Fast acceleration, glide, soft deceleration. Use for anything arriving. */
  arrive: [0.16, 1, 0.3, 1] as const,
  /** Slightly firmer arrival for short distances, where a long glide reads as lag. */
  arriveShort: [0.22, 1, 0.36, 1] as const,
  /** Leaving the table: accelerate away, no glide, because nothing is waiting. */
  leave: [0.5, 0, 0.85, 0.3] as const,
  /** Symmetric, for things that move without a destination, like a breath. */
  drift: [0.42, 0, 0.58, 1] as const,
} as const;

export const SPRING = {
  /** The tiny correction as a card meets the felt. */
  settle: { type: "spring" as const, stiffness: 640, damping: 32, mass: 0.7 },
  /** Chips landing on a stack, which wobble a little more than a card. */
  wobble: { type: "spring" as const, stiffness: 380, damping: 17, mass: 0.9 },
  /** Interface elements: seat highlights, plates, rails. */
  ui: { type: "spring" as const, stiffness: 420, damping: 30 },
  /** The camera. Deliberately slow and heavily damped so it is never noticed. */
  camera: { type: "spring" as const, stiffness: 70, damping: 24, mass: 1.1 },
} as const;

/**
 * Dealing rhythm, in milliseconds.
 *
 * A dealer does not deal to everyone at once. The gap between cards is what
 * makes an order legible: first card to every seat, then the second.
 */
export const RHYTHM = {
  /** Between one card leaving and the next, going round the table. */
  betweenCards: 210,
  /** The extra beat before the dealer takes their own card. */
  beforeDealer: 90,
  /** Between the three cards of a flop fanning outward. */
  betweenCommunity: 80,
  /** Held before a card that has arrived face down is turned over. */
  beforeReveal: 260,
  /** Between hands being swept into the discard tray at the end of a round. */
  betweenCollect: 70,
  /** How long a card takes to physically settle once it has arrived. */
  landing: 120,
} as const;

/** How far a card's flight is allowed to smear, as a fraction of its width. */
export const SMEAR_MAX = 0.16;
