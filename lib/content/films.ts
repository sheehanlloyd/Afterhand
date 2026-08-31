import { GameId, Rank, Suit } from "@/types";

/**
 * Table films.
 *
 * Each film is a short hand that plays itself, frame by frame, using the same
 * card and chip components the real tables use. They exist so a visitor can
 * watch a hand happen, including the review at the end, without playing one.
 *
 * They are scripted rather than recorded on purpose. A video file would be the
 * largest thing this site serves by an order of magnitude, and every view would
 * be paid bandwidth. A script is a few hundred bytes inside a bundle that has
 * already loaded, it stays sharp at any size, and it cannot drift out of step
 * with the rules the way a recording would.
 *
 * Every hand below follows the real rules of its game, and every payout and
 * probability quoted in a caption is the correct one.
 */

export interface FilmCard {
  rank: Rank;
  suit: Suit;
  faceDown?: boolean;
}

export interface FilmSeat {
  label: string;
  cards?: FilmCard[];
  /** The running total or hand name shown under the seat. */
  value?: string;
}

export interface FilmFrame {
  /** How long this frame holds, in milliseconds. */
  hold: number;
  /** The line on the caption strip under the table. */
  caption: string;
  top: FilmSeat;
  bottom: FilmSeat;
  chips?: number[];
  /** Roulette only: the pocket the ball settled in. */
  pocket?: { label: string; colour: "red" | "black" | "green" };
  /** The afterhand note. Only ever appears on the closing frame. */
  verdict?: { mark: "optimal" | "mistake"; text: string };
}

export interface FilmScript {
  id: GameId;
  /** Shown on the film's own caption line, in the manner of a plate number. */
  plate: string;
  summary: string;
  frames: FilmFrame[];
}

function c(rank: Rank, suit: Suit, faceDown = false): FilmCard {
  return { rank, suit, faceDown };
}

/**
 * Blackjack: soft 18 against a dealer nine.
 *
 * The hand the whole product is built around. Standing feels safe and loses
 * more often, which is exactly the sort of thing you only learn afterwards.
 */
const BLACKJACK: FilmScript = {
  id: "blackjack",
  plate: "Soft 18 against a dealer nine",
  summary: "A blackjack hand playing itself, ending in the post-hand review.",
  frames: [
    {
      hold: 1100,
      caption: "Place your bet.",
      top: { label: "Dealer" },
      bottom: { label: "You" },
      chips: [25, 100, 5],
    },
    {
      hold: 1600,
      caption: "Two cards each. The dealer shows a nine.",
      top: { label: "Dealer", cards: [c("9", "spades"), c("K", "hearts", true)], value: "9" },
      bottom: { label: "You", cards: [c("A", "clubs"), c("7", "diamonds")], value: "Soft 18" },
      chips: [25, 100, 5],
    },
    {
      hold: 1300,
      caption: "You stand. Nothing on screen tells you whether that was right.",
      top: { label: "Dealer", cards: [c("9", "spades"), c("K", "hearts", true)], value: "9" },
      bottom: { label: "You", cards: [c("A", "clubs"), c("7", "diamonds")], value: "Stand on 18" },
      chips: [25, 100, 5],
    },
    {
      hold: 1500,
      caption: "The dealer turns the hole card.",
      top: { label: "Dealer", cards: [c("9", "spades"), c("K", "hearts")], value: "19" },
      bottom: { label: "You", cards: [c("A", "clubs"), c("7", "diamonds")], value: "18" },
      chips: [25, 100, 5],
    },
    {
      hold: 3400,
      caption: "Dealer wins with 19.",
      top: { label: "Dealer", cards: [c("9", "spades"), c("K", "hearts")], value: "19" },
      bottom: { label: "You", cards: [c("A", "clubs"), c("7", "diamonds")], value: "18" },
      verdict: {
        mark: "mistake",
        text: "Basic strategy hits soft 18 against a nine. The ace cannot bust you, so the hand has a free look at a better total.",
      },
    },
  ],
};

/** Poker: top pair with the best kicker on a dry flop. */
const POKER: FilmScript = {
  id: "poker",
  plate: "Top pair, top kicker on a dry flop",
  summary: "A Texas Hold'em hand playing itself, ending in the post-hand review.",
  frames: [
    {
      hold: 1400,
      caption: "You are dealt ace king, suited, in late position.",
      top: { label: "Board" },
      bottom: { label: "You", cards: [c("A", "spades"), c("K", "spades")], value: "Ace king suited" },
      chips: [10, 5],
    },
    {
      hold: 1700,
      caption: "The flop brings a king. Two low cards, no flush draw.",
      top: {
        label: "Board",
        cards: [c("K", "diamonds"), c("8", "clubs"), c("3", "hearts")],
        value: "Dry board",
      },
      bottom: { label: "You", cards: [c("A", "spades"), c("K", "spades")], value: "Top pair, ace kicker" },
      chips: [10, 5],
    },
    {
      hold: 1500,
      caption: "Your opponent bets 30 into a pot of 120.",
      top: {
        label: "Board",
        cards: [c("K", "diamonds"), c("8", "clubs"), c("3", "hearts")],
        value: "Pot 120",
      },
      bottom: { label: "You", cards: [c("A", "spades"), c("K", "spades")], value: "To call 30" },
      chips: [25, 5],
    },
    {
      hold: 1500,
      caption: "You raise to 95.",
      top: {
        label: "Board",
        cards: [c("K", "diamonds"), c("8", "clubs"), c("3", "hearts")],
        value: "Pot 245",
      },
      bottom: { label: "You", cards: [c("A", "spades"), c("K", "spades")], value: "Raise to 95" },
      chips: [50, 25, 10],
    },
    {
      hold: 3400,
      caption: "Your opponent folds.",
      top: {
        label: "Board",
        cards: [c("K", "diamonds"), c("8", "clubs"), c("3", "hearts")],
        value: "Pot 245",
      },
      bottom: { label: "You", cards: [c("A", "spades"), c("K", "spades")], value: "Wins 245" },
      verdict: {
        mark: "optimal",
        text: "Strong decision. Top pair with the best kicker on a board that misses most calling hands wants to build the pot rather than protect it.",
      },
    },
  ],
};

/** Baccarat: the banker draws on three and gets there. */
const BACCARAT: FilmScript = {
  id: "baccarat",
  plate: "The banker draws on three",
  summary: "A baccarat coup playing itself, with the drawing rules explained.",
  frames: [
    {
      hold: 1200,
      caption: "You back the banker. The rest is automatic.",
      top: { label: "Banker" },
      bottom: { label: "Player" },
      chips: [50, 10],
    },
    {
      hold: 1700,
      caption: "Two cards a side. Player holds seven, banker holds three.",
      top: { label: "Banker", cards: [c("9", "hearts"), c("4", "spades")], value: "3" },
      bottom: { label: "Player", cards: [c("5", "diamonds"), c("2", "clubs")], value: "7" },
      chips: [50, 10],
    },
    {
      hold: 1600,
      caption: "Player stands. The rule is to stand on six or seven.",
      top: { label: "Banker", cards: [c("9", "hearts"), c("4", "spades")], value: "3" },
      bottom: { label: "Player", cards: [c("5", "diamonds"), c("2", "clubs")], value: "Stands on 7" },
      chips: [50, 10],
    },
    {
      hold: 1600,
      caption: "The player stood, so the banker draws on anything up to five.",
      top: {
        label: "Banker",
        cards: [c("9", "hearts"), c("4", "spades"), c("5", "clubs")],
        value: "8",
      },
      bottom: { label: "Player", cards: [c("5", "diamonds"), c("2", "clubs")], value: "7" },
      chips: [50, 10],
    },
    {
      hold: 3400,
      caption: "Banker wins, eight to seven.",
      top: {
        label: "Banker",
        cards: [c("9", "hearts"), c("4", "spades"), c("5", "clubs")],
        value: "8",
      },
      bottom: { label: "Player", cards: [c("5", "diamonds"), c("2", "clubs")], value: "7" },
      verdict: {
        mark: "optimal",
        text: "The banker acts last and wins slightly more often. That advantage is why a winning banker bet pays a commission.",
      },
    },
  ],
};

/** Roulette: a straight up number, and the gap between odds and payout. */
const ROULETTE: FilmScript = {
  id: "roulette",
  plate: "One number in thirty seven",
  summary: "A roulette spin playing itself, ending with where the house edge comes from.",
  frames: [
    {
      hold: 1300,
      caption: "Chips down: red, and one straight up on seventeen.",
      top: { label: "Wheel", value: "European" },
      bottom: { label: "Your bets", value: "Red, and 17 straight up" },
      chips: [25, 5],
    },
    {
      hold: 1400,
      caption: "No more bets.",
      top: { label: "Wheel", value: "Spinning" },
      bottom: { label: "Your bets", value: "Red, and 17 straight up" },
      chips: [25, 5],
    },
    {
      hold: 1800,
      caption: "Seventeen, black.",
      top: { label: "Wheel", value: "17" },
      bottom: { label: "Your bets", value: "Straight up wins" },
      pocket: { label: "17", colour: "black" },
      chips: [25, 5],
    },
    {
      hold: 3400,
      caption: "The straight up pays 35 to 1. The red bet loses.",
      top: { label: "Wheel", value: "17" },
      bottom: { label: "Your bets", value: "Net +325" },
      pocket: { label: "17", colour: "black" },
      verdict: {
        mark: "optimal",
        text: "Seventeen is one pocket in thirty seven, but it pays 35 to 1. That gap, not the result, is the house edge on every spin.",
      },
    },
  ],
};

export const FILMS: Record<GameId, FilmScript> = {
  blackjack: BLACKJACK,
  poker: POKER,
  baccarat: BACCARAT,
  roulette: ROULETTE,
};

export const FILM_ORDER: GameId[] = ["blackjack", "poker", "baccarat", "roulette"];

export function filmDuration(script: FilmScript): number {
  return script.frames.reduce((total, frame) => total + frame.hold, 0);
}
