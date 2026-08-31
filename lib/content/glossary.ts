export interface GlossaryEntry {
  term: string;
  definition: string;
  games?: string[];
}

/** Plain English definitions used by inline term popovers and the rules pages. */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  blackjack: {
    term: "Blackjack",
    definition:
      "An ace plus any ten value card on the first two cards. It beats a plain 21 and normally pays 3 to 2.",
    games: ["blackjack"],
  },
  "soft-hand": {
    term: "Soft hand",
    definition:
      "A hand holding an ace that can count as 11 without busting. A soft 17 is ace plus six, and one more card cannot bust it.",
    games: ["blackjack"],
  },
  "hard-hand": {
    term: "Hard hand",
    definition:
      "A hand with no ace, or one where the ace must count as 1. A hard 16 can bust on the next card.",
    games: ["blackjack"],
  },
  split: {
    term: "Split",
    definition:
      "When your first two cards are a pair, you can separate them into two hands and place a second bet equal to the first.",
    games: ["blackjack"],
  },
  "double-down": {
    term: "Double down",
    definition:
      "Doubling your bet in exchange for exactly one more card. Useful when your total is strong and the dealer's card is weak.",
    games: ["blackjack"],
  },
  push: {
    term: "Push",
    definition: "A tie. Your bet is returned and nothing is won or lost.",
    games: ["blackjack", "baccarat"],
  },
  insurance: {
    term: "Insurance",
    definition:
      "A side bet offered when the dealer shows an ace. It pays 2 to 1 if the dealer has blackjack, and it loses money over time.",
    games: ["blackjack"],
  },
  surrender: {
    term: "Surrender",
    definition:
      "Giving up the hand after the deal and getting half your bet back. Late surrender is offered after the dealer checks for blackjack.",
    games: ["blackjack"],
  },
  upcard: {
    term: "Upcard",
    definition: "The dealer's face up card. Every basic strategy decision starts with it.",
    games: ["blackjack"],
  },
  "basic-strategy": {
    term: "Basic strategy",
    definition:
      "The mathematically best play for every combination of your total and the dealer upcard, assuming no knowledge of the remaining cards.",
    games: ["blackjack"],
  },
  blind: {
    term: "Blind",
    definition:
      "A forced bet posted before cards are dealt. The small blind and big blind rotate around the table each hand.",
    games: ["poker"],
  },
  pot: {
    term: "Pot",
    definition: "The total of all bets made in the hand. The winner of the hand takes it.",
    games: ["poker"],
  },
  "pot-odds": {
    term: "Pot odds",
    definition:
      "The price you are getting on a call. Calling 60 into a pot of 180 means risking 60 to win 240, so you need to win about 25% of the time to break even.",
    games: ["poker"],
  },
  position: {
    term: "Position",
    definition:
      "Where you act in the betting order. Acting last is a large advantage because you see what everyone else does first.",
    games: ["poker"],
  },
  equity: {
    term: "Equity",
    definition:
      "Your share of the pot based on how often your hand wins from here. A hand with 40% equity in a 200 pot is worth about 80.",
    games: ["poker"],
  },
  flop: {
    term: "Flop",
    definition: "The first three community cards, dealt face up after the opening betting round.",
    games: ["poker"],
  },
  turn: {
    term: "Turn",
    definition: "The fourth community card.",
    games: ["poker"],
  },
  river: {
    term: "River",
    definition: "The fifth and final community card.",
    games: ["poker"],
  },
  "board-texture": {
    term: "Board texture",
    definition:
      "How connected and coordinated the community cards are. A board with three cards of one suit changes what hands are possible.",
    games: ["poker"],
  },
  banker: {
    term: "Banker",
    definition:
      "One of the two hands in baccarat. Betting on Banker is not betting on the casino, it is simply the name of the second hand.",
    games: ["baccarat"],
  },
  "house-edge": {
    term: "House edge",
    definition:
      "The long run share of each wager the house keeps. A 1.06% edge means about one cent per dollar wagered on average.",
    games: ["blackjack", "poker", "baccarat", "roulette"],
  },
  natural: {
    term: "Natural",
    definition: "A two card total of 8 or 9 in baccarat. It ends the hand immediately.",
    games: ["baccarat"],
  },
  "outside-bet": {
    term: "Outside bet",
    definition:
      "A roulette bet on a large group of numbers such as red, even, or a dozen. It wins often and pays little.",
    games: ["roulette"],
  },
  "inside-bet": {
    term: "Inside bet",
    definition:
      "A roulette bet on specific numbers. It wins rarely and pays a lot.",
    games: ["roulette"],
  },
};

export const GLOSSARY_LIST = Object.entries(GLOSSARY).map(([id, entry]) => ({ id, ...entry }));
