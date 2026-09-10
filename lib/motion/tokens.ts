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
  press: 0.08,
  tooltip: 0.12,
  menu: 0.16,
  /** A card crossing the felt from the shoe to a seat. */
  deal: 0.26,
  /** A hit or a community card sliding one seat over. */
  dealShort: 0.18,
  /** The three dimensional turn of a card. */
  flip: 0.22,
  /** A chip or a small stack of chips crossing the table. */
  chip: 0.28,
  /** Handing the turn from one seat to the next. */
  turn: 0.2,
  /** An outcome resolving: totals, plates, the dealer's line. */
  reveal: 0.28,
  /** Reserved for a genuinely large win. */
  celebrate: 0.95,
  /** One screen handing off to the next (setup → table → summary). */
  screen: 0.2,
  /** One full revolution of the roulette wheel while it is settling. */
  wheelSpin: 0.7,
  /** The ball's trip around the wheel before it drops. */
  wheelBall: 1.35,
  /** Squaring the deck or a short dealer gesture. */
  prepare: 0.22,
  /** A rare idle flourish. Short enough not to stall the next hand. */
  flourish: 0.62,
  /** Ambient felt breathing. Long on purpose. */
  breath: 4.4,
  /** Status marker pulse while the dealer is busy. */
  pulse: 2.2,
  /** The lamp over a table. Slow enough to read as light, not as a screensaver. */
  ambient: 9,
} as const;

/**
 * Curves.
 *
 * `arrive` is the workhorse: a firm push, a short glide, a soft stop. Earlier
 * versions lingered in the glide and read as lag. These are snappier, so a
 * card that has arrived feels arrived.
 */
export const EASE = {
  /** Fast acceleration, brief glide, soft deceleration. Use for anything arriving. */
  arrive: [0.2, 0.9, 0.28, 1] as const,
  /** Firmer still, for short distances where a glide would read as delay. */
  arriveShort: [0.18, 0.82, 0.3, 1] as const,
  /** Leaving the table: accelerate away, no glide, because nothing is waiting. */
  leave: [0.42, 0, 0.92, 0.22] as const,
  /** Symmetric, for things that move without a destination, like a breath. */
  drift: [0.4, 0.05, 0.6, 0.95] as const,
} as const;

export const SPRING = {
  /** The tiny correction as a card meets the felt. */
  settle: { type: "spring" as const, stiffness: 480, damping: 26, mass: 0.55 },
  /** Chips landing on a stack, which wobble a little more than a card. */
  wobble: { type: "spring" as const, stiffness: 320, damping: 16, mass: 0.7 },
  /** Interface elements: seat highlights, plates, rails. */
  ui: { type: "spring" as const, stiffness: 520, damping: 34 },
  /** The camera. Still slow enough to read as attention, not as a pan. */
  camera: { type: "spring" as const, stiffness: 150, damping: 22, mass: 0.85 },
} as const;

/**
 * Dealing rhythm, in milliseconds.
 *
 * A dealer does not deal to everyone at once. The gap between cards is what
 * makes an order legible: first card to every seat, then the second.
 */
export const RHYTHM = {
  /** Between one card leaving and the next, going round the table. */
  betweenCards: 135,
  /** The extra beat before the dealer takes their own card. */
  beforeDealer: 50,
  /** Between the three cards of a flop fanning outward. */
  betweenCommunity: 50,
  /** Held before a card that has arrived face down is turned over. */
  beforeReveal: 140,
  /** Between hands being swept into the discard tray at the end of a round. */
  betweenCollect: 45,
  /** How long a card takes to physically settle once it has arrived. */
  landing: 80,
  /** Squaring the deck before a shuffle starts. */
  prepare: 180,
  /** The cut after a shuffle, in milliseconds. Keep in step with CUT in DealerRail. */
  cut: 380,
  /** A burn card sits on the felt before it is swept. */
  burnHold: 160,
  /** Time from a burn appearing to it being gone. */
  burnSweep: 520,
  /** Between cards in a homepage film, which has less time than a real deal. */
  betweenFilmCards: 55,
} as const;

/** How far a card's flight is allowed to smear, as a fraction of its width. */
export const SMEAR_MAX = 0.12;

/** Shared transition objects so chrome does not invent its own timings. */
export const TRANSITION = {
  fade: { duration: DURATION.tooltip, ease: EASE.arriveShort },
  menu: { duration: DURATION.menu, ease: EASE.arriveShort },
  screen: { duration: DURATION.screen, ease: EASE.arrive },
} as const;
