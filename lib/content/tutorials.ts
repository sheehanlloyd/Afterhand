import { GameId } from "@/types";

export interface TutorialStep {
  question: string;
  heading: string;
  body: string[];
  items?: Array<{ label: string; text: string }>;
  aside?: string;
}

export interface Tutorial {
  game: GameId;
  title: string;
  minutes: number;
  intro: string;
  steps: TutorialStep[];
  playHref: string;
}

const blackjack: Tutorial = {
  game: "blackjack",
  title: "Blackjack in five minutes",
  minutes: 5,
  intro:
    "Everything you need to sit down at a blackjack table and play a hand without guessing.",
  playHref: "/games/blackjack",
  steps: [
    {
      question: "What is the objective?",
      heading: "Beat the dealer, not the number 21",
      body: [
        "You want a total closer to 21 than the dealer, without going over. Going over 21 is a bust and loses right away, even if the dealer busts a moment later.",
        "Nobody else at the table matters. It is your hand against the dealer's hand, every time.",
      ],
      aside: "You do not need 21. Most winning hands are in the high teens.",
    },
    {
      question: "What do the cards mean?",
      heading: "Three groups, one special case",
      body: [],
      items: [
        { label: "2 to 10", text: "Face value." },
        { label: "J, Q, K", text: "Ten. Nearly a third of the deck is worth ten." },
        {
          label: "Ace",
          text: "One or eleven, whichever is better. A hand counting an ace as eleven is called [[soft-hand|soft]], and it cannot bust on the next card.",
        },
      ],
      aside: "Ace and six is a soft 17. Ten, six, and an ace is a hard 17.",
    },
    {
      question: "What can you do?",
      heading: "Five choices, and usually only two",
      body: [
        "You act first, and the dealer only plays once you are finished.",
      ],
      items: [
        { label: "Hit", text: "Take another card." },
        { label: "Stand", text: "Keep your total." },
        { label: "Double", text: "Double the bet for exactly one more card." },
        { label: "Split", text: "Turn a pair into two hands with a second bet." },
        { label: "Surrender", text: "Give the hand up for half your bet back." },
      ],
    },
    {
      question: "How do you win?",
      heading: "Four ways, and one of them pays extra",
      body: [],
      items: [
        { label: "Blackjack", text: "An ace with a ten on the first two cards. Pays 3 to 2." },
        { label: "Higher total", text: "You end closer to 21 than the dealer. Pays 1 to 1." },
        { label: "Dealer busts", text: "The dealer goes over 21 while you are still live." },
        { label: "Push", text: "A tie returns your bet." },
      ],
      aside: "The dealer has no decisions. They draw until they reach 17 and then stop.",
    },
    {
      question: "What should beginners remember?",
      heading: "Two numbers decide almost everything",
      body: [
        "Look at your total, then look at the dealer's [[upcard|upcard]]. A dealer showing 2 through 6 is weak and busts often. A dealer showing 7 through Ace is strong.",
        "When the dealer is weak, let them take the risk. When the dealer is strong, your stiff total has to improve to win.",
        "Always [[split|split]] aces and eights. Never split tens or fives. Skip [[insurance|insurance]].",
      ],
      aside: "A correct decision can still lose. That is normal, and it is why the review talks about decisions rather than results.",
    },
  ],
};

const poker: Tutorial = {
  game: "poker",
  title: "Texas Hold'em in five minutes",
  minutes: 5,
  intro: "The shape of a hand, the vocabulary, and the one idea that decides most calls.",
  playHref: "/games/poker",
  steps: [
    {
      question: "What is the objective?",
      heading: "Win the pot, however that happens",
      body: [
        "You either have the best five card hand at the end, or you bet enough that everyone else gives up.",
        "Most pots are won without anyone showing a hand.",
      ],
    },
    {
      question: "What do the cards mean?",
      heading: "Two yours, five shared",
      body: [
        "You get two private cards. Five community cards arrive in the middle over three stages: the flop, the turn, and the river.",
        "Your hand is the best five cards you can make from those seven.",
      ],
      aside: "If the five shared cards beat both of your cards, the pot can be split.",
    },
    {
      question: "What can you do?",
      heading: "Fold, check, call, bet, raise",
      body: [
        "There is a betting round after the deal and after each stage of community cards.",
      ],
      items: [
        { label: "Fold", text: "Give up the hand." },
        { label: "Check", text: "Pass when there is nothing to call." },
        { label: "Call", text: "Match the current bet." },
        { label: "Bet or raise", text: "Put in more and make everyone else decide." },
      ],
    },
    {
      question: "How do you win?",
      heading: "Rankings, in order",
      body: [
        "Straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair, high card.",
        "A pair is common. A flush is not. The rarer the hand, the stronger it is.",
      ],
    },
    {
      question: "What should beginners remember?",
      heading: "Count the pot before you call",
      body: [
        "Calling 60 into a [[pot|pot]] of 180 means risking 60 to win 240. Those are the [[pot-odds|pot odds]], and that call needs to be right roughly one time in four.",
        "[[position|Position]] matters more than most beginners expect. Acting last means you decide with more information than anyone else at the table.",
        "Fold more hands before the flop than feels natural.",
      ],
      aside: "Poker rarely has one correct answer, but it has plenty of clearly poor ones.",
    },
  ],
};

const baccarat: Tutorial = {
  game: "baccarat",
  title: "Baccarat in five minutes",
  minutes: 4,
  intro: "The simplest table game in the room, and the reason it stays that way.",
  playHref: "/games/baccarat",
  steps: [
    {
      question: "What is the objective?",
      heading: "Pick the hand that gets closer to 9",
      body: [
        "Two hands are dealt, called Player and Banker. You bet on which one finishes closer to nine, or that they tie.",
        "Player and Banker are only names. You are not betting for or against the house.",
      ],
    },
    {
      question: "What do the cards mean?",
      heading: "Tens and faces are worth nothing",
      body: [],
      items: [
        { label: "Ace", text: "One." },
        { label: "2 to 9", text: "Face value." },
        { label: "10, J, Q, K", text: "Zero." },
      ],
      aside: "Only the last digit counts. A 7 and an 8 make 15, which scores as 5.",
    },
    {
      question: "What can you do?",
      heading: "Choose a bet, then nothing",
      body: [
        "There are no decisions after the deal. Fixed rules decide whether a third card is dealt to either hand.",
        "That is the whole game. It is why baccarat plays quickly.",
      ],
    },
    {
      question: "How do you win?",
      heading: "Higher total, with one small catch",
      body: [
        "Player pays 1 to 1. Banker pays 1 to 1 minus a 5% commission, because Banker wins slightly more often. Tie pays 8 to 1 at this table.",
      ],
    },
    {
      question: "What should beginners remember?",
      heading: "Banker is the best bet, Tie is the worst",
      body: [
        "[[banker|Banker]] carries about a 1.06% [[house-edge|house edge]], Player about 1.24%, and Tie about 14.4%.",
        "The commission on Banker looks like a penalty but it is already the better deal.",
        "Past results tell you nothing about the next hand.",
      ],
    },
  ],
};

const roulette: Tutorial = {
  game: "roulette",
  title: "Roulette in five minutes",
  minutes: 4,
  intro: "The clearest illustration of how payouts and probability relate.",
  playHref: "/games/roulette",
  steps: [
    {
      question: "What is the objective?",
      heading: "Predict where the ball lands",
      body: [
        "A European wheel has 37 pockets, numbered 0 to 36. You can bet on one number or on large groups of numbers.",
        "An American wheel adds a 00 pocket. That one extra pocket roughly doubles the house edge.",
      ],
    },
    {
      question: "What do the table values mean?",
      heading: "Inside and outside",
      body: [],
      items: [
        { label: "Inside", text: "Specific numbers, called [[inside-bet|inside bets]]. Rare wins, large payouts." },
        { label: "Outside", text: "Red, black, odd, even, dozens, columns, called [[outside-bet|outside bets]]. Frequent wins, small payouts." },
      ],
      aside: "Zero is neither red nor black, and it is neither odd nor even for betting purposes.",
    },
    {
      question: "What can you do?",
      heading: "Place as many bets as you like",
      body: [
        "Chips can sit on a number, on a line between numbers, or on any of the outside boxes. Every bet is settled on its own.",
      ],
    },
    {
      question: "How do you win?",
      heading: "The payout is always slightly short",
      body: [
        "A single number wins once in 37 spins but pays 35 to 1. That gap is the [[house-edge|house edge]], about 2.70% on a European wheel.",
        "Nearly every bet on the layout carries the same edge. Covering more numbers trades a smaller win for a higher hit rate.",
      ],
    },
    {
      question: "What should beginners remember?",
      heading: "The wheel has no memory",
      body: [
        "A run of red says nothing about the next spin. Each spin is independent.",
        "Doubling after a loss risks a lot to win a little and runs into the table maximum.",
        "If you have a choice, play European.",
      ],
    },
  ],
};

export const TUTORIALS: Record<GameId, Tutorial> = {
  blackjack,
  poker,
  baccarat,
  roulette,
};
