import { GameId } from "@/types";

export interface RulesItem {
  label?: string;
  text: string;
}

export interface RulesSection {
  heading: string;
  body?: string[];
  items?: RulesItem[];
}

export interface RulesDoc {
  game: GameId;
  title: string;
  intro: string;
  sections: RulesSection[];
}

const blackjack: RulesDoc = {
  game: "blackjack",
  title: "Blackjack",
  intro:
    "Blackjack is a race to 21 against the dealer alone. The other players at a real table do not affect your hand.",
  sections: [
    {
      heading: "Goal",
      body: [
        "Finish with a total closer to 21 than the dealer, without going over 21.",
        "Going over 21 is called a bust, and a bust loses immediately even if the dealer busts afterwards.",
      ],
    },
    {
      heading: "Setup",
      body: [
        "Afterhand deals from a six deck shoe by default. You place a bet, then receive two cards face up. The dealer takes one card face up, called the [[upcard|upcard]], and one face down.",
      ],
    },
    {
      heading: "Card values",
      items: [
        { label: "2 through 10", text: "Worth their face value." },
        { label: "Jack, Queen, King", text: "Worth 10." },
        {
          label: "Ace",
          text: "Worth 1 or 11, whichever helps. A hand using an ace as 11 is called a [[soft-hand|soft hand]].",
        },
      ],
    },
    {
      heading: "Your actions",
      items: [
        { label: "Hit", text: "Take another card. You can keep hitting until you stand or bust." },
        { label: "Stand", text: "Keep your total and pass play to the dealer." },
        {
          label: "Double",
          text: "Double your bet and take exactly one more card. Offered on your first two cards.",
        },
        {
          label: "Split",
          text: "When your first two cards are a pair, separate them into two hands and match your original bet.",
        },
        {
          label: "Surrender",
          text: "Give up the hand and take half your bet back. Offered on your first two cards only.",
        },
        {
          label: "Insurance",
          text: "A side bet offered when the dealer shows an ace. It pays 2 to 1 if the dealer has blackjack.",
        },
      ],
    },
    {
      heading: "How a round works",
      body: [
        "1. Place your bet.",
        "2. You receive two cards, the dealer receives one face up and one face down.",
        "3. If the dealer shows an ace or a ten value card, they check for [[blackjack|blackjack]] before you act.",
        "4. You act on your hand until you stand, bust, double, or surrender.",
        "5. The dealer turns over the hole card and draws to at least 17.",
        "6. Hands are compared and bets are settled.",
      ],
    },
    {
      heading: "How you win",
      items: [
        { label: "Blackjack", text: "An ace and a ten value card on the first two cards. Pays 3 to 2." },
        { label: "Higher total", text: "Your total beats the dealer without busting. Pays 1 to 1." },
        { label: "Dealer busts", text: "The dealer goes over 21 while you are still live. Pays 1 to 1." },
        { label: "Push", text: "Equal totals. Your bet comes back." },
      ],
    },
    {
      heading: "Payouts",
      body: [
        "A winning hand pays even money. A blackjack pays 3 to 2, so a 100 bet returns 150 in winnings. [[insurance|Insurance]] pays 2 to 1 when it wins.",
        "Some casinos pay 6 to 5 on blackjack, which is a much worse deal. Afterhand lets you switch the rule on so you can see the difference.",
      ],
    },
    {
      heading: "Dealer rules",
      body: [
        "The dealer has no choices. They draw until they reach 17 or more, then stop.",
        "The one variation that matters is soft 17, a hand like ace plus six. Some tables stand on it and some hit. Hitting soft 17 is slightly worse for you.",
      ],
    },
    {
      heading: "Important terms",
      items: [
        { label: "Hard hand", text: "A hand with no ace, or one where the ace must count as 1." },
        { label: "Soft hand", text: "A hand where an ace counts as 11 without busting." },
        { label: "Upcard", text: "The dealer's face up card." },
        { label: "Stiff", text: "A hard total from 12 to 16, the hardest hands to play." },
        { label: "Shoe", text: "The container holding the decks in play." },
      ],
    },
    {
      heading: "Common mistakes",
      items: [
        { text: "Standing on 16 against a dealer 10 because busting feels worse than losing." },
        { text: "Taking insurance. It loses money over time no matter how good the hand looks." },
        { text: "Splitting tens. Twenty is already a very strong hand." },
        { text: "Not splitting eights, which turns the worst total in the game into two fresh hands." },
        { text: "Playing a soft 17 like a [[hard-hand|hard]] 17. A soft 17 cannot bust on the next card." },
      ],
    },
    {
      heading: "Beginner tips",
      items: [
        { text: "Look at the dealer [[upcard|upcard]] first, then your total. Every decision depends on both." },
        { text: "Dealer 2 through 6 is weak. Dealer 7 through Ace is strong." },
        { text: "Never take a side bet you do not understand." },
        { text: "Correct play still loses hands. Judge the decision, not the result." },
      ],
    },
  ],
};

const poker: RulesDoc = {
  game: "poker",
  title: "Texas Hold'em",
  intro:
    "No-limit Texas Hold'em. Two private cards each, five shared cards in the middle, and four rounds of betting.",
  sections: [
    {
      heading: "Goal",
      body: [
        "Win the pot, either by making the best five card hand at showdown or by betting enough that everyone else folds.",
        "You do not need the best hand to win a pot. You only need everyone else to give up, or to be ahead when the cards are shown.",
      ],
    },
    {
      heading: "Setup",
      body: [
        "Each player receives two private cards. Two players post forced bets called the small [[blind|blind]] and the big blind. The dealer button moves one seat to the left each hand.",
      ],
    },
    {
      heading: "Hand rankings, strongest first",
      items: [
        { label: "Straight flush", text: "Five cards in sequence, all the same suit." },
        { label: "Four of a kind", text: "Four cards of the same rank." },
        { label: "Full house", text: "Three of a kind plus a pair." },
        { label: "Flush", text: "Five cards of the same suit." },
        { label: "Straight", text: "Five cards in sequence of mixed suits." },
        { label: "Three of a kind", text: "Three cards of the same rank." },
        { label: "Two pair", text: "Two separate pairs." },
        { label: "One pair", text: "Two cards of the same rank." },
        { label: "High card", text: "None of the above. The highest card plays." },
      ],
    },
    {
      heading: "Your actions",
      items: [
        { label: "Fold", text: "Give up the hand and any money already in the pot." },
        { label: "Check", text: "Pass the action along when there is nothing to call." },
        { label: "Call", text: "Match the current bet." },
        { label: "Bet", text: "Put money in when nobody has bet yet this round." },
        { label: "Raise", text: "Increase an existing bet." },
        { label: "All in", text: "Commit your remaining stack." },
      ],
    },
    {
      heading: "How a round works",
      body: [
        "1. Blinds are posted and everyone receives two cards. This is preflop.",
        "2. Three shared cards are dealt face up. This is the [[flop|flop]].",
        "3. A fourth shared card is dealt. This is the [[turn|turn]].",
        "4. A fifth shared card is dealt. This is the [[river|river]].",
        "5. Betting happens after each of those steps. If two or more players remain, cards are shown and the best five card hand wins.",
      ],
    },
    {
      heading: "How you win",
      body: [
        "You make the best five card hand using any combination of your two cards and the five shared cards, or everyone else folds.",
        "If the board plays better than your two cards, the pot can be split.",
      ],
    },
    {
      heading: "Important terms",
      items: [
        { label: "Position", text: "Where you act in the betting order. Acting last is a real advantage." },
        {
          label: "Pot odds",
          text: "The price on a call. Calling 60 into a pot of 180 risks 60 to win 240, so you need to be right about 25% of the time.",
        },
        { label: "Outs", text: "Cards left in the deck that improve your hand to a likely winner." },
        { label: "Board texture", text: "How connected the shared cards are and what hands they make possible." },
        { label: "Value bet", text: "A bet you expect to be called by worse hands." },
      ],
    },
    {
      heading: "Common mistakes",
      items: [
        { text: "Calling because a hand is pretty rather than because the price is right." },
        { text: "Playing too many hands from early position." },
        { text: "Betting with no plan for what to do if you get raised." },
        { text: "Chasing a draw when the [[pot-odds|pot odds]] are not paying enough for it." },
      ],
    },
    {
      heading: "Beginner tips",
      items: [
        { text: "Fold more hands than feels natural before the flop." },
        { text: "Notice who acts after you. That single fact, your [[position|position]], changes how a hand should be played." },
        { text: "Count the [[pot|pot]] before you call. The number decides more often than the cards do." },
        { text: "There is rarely one correct answer, but there are plenty of clearly poor ones." },
      ],
    },
  ],
};

const baccarat: RulesDoc = {
  game: "baccarat",
  title: "Baccarat",
  intro:
    "Baccarat looks formal but it is the simplest table game in the room. You choose a bet and then watch. No decisions follow.",
  sections: [
    {
      heading: "Goal",
      body: [
        "Pick which of two hands, Player or [[banker|Banker]], will finish closer to 9. You can also bet that they tie.",
        "Player and Banker are just labels for the two hands. Betting on Banker does not mean betting for the casino.",
      ],
    },
    {
      heading: "Card values",
      items: [
        { label: "Ace", text: "Worth 1." },
        { label: "2 through 9", text: "Worth face value." },
        { label: "10, Jack, Queen, King", text: "Worth 0." },
      ],
    },
    {
      heading: "How totals work",
      body: [
        "Only the last digit of the total counts. A 7 and an 8 make 15, which scores as 5.",
        "The highest possible total is 9.",
      ],
    },
    {
      heading: "How a round works",
      body: [
        "1. Place a bet on Player, Banker, or Tie.",
        "2. Two cards go to each hand.",
        "3. If either hand totals 8 or 9, that is a [[natural|natural]] and the round ends immediately.",
        "4. Otherwise fixed drawing rules decide whether a third card is dealt. Nobody chooses.",
        "5. The higher total wins.",
      ],
    },
    {
      heading: "The drawing rules",
      body: [
        "The Player hand draws a third card on a total of 0 through 5 and stands on 6 or 7.",
        "The Banker hand follows a longer rule that depends on its own total and, when the Player drew, the value of that third card. Afterhand explains which rule fired after every hand.",
      ],
    },
    {
      heading: "Payouts",
      items: [
        { label: "Player", text: "Pays 1 to 1." },
        { label: "Banker", text: "Pays 1 to 1 less a 5% commission, because Banker wins slightly more often." },
        { label: "Tie", text: "Pays 8 to 1 at this table and pushes the Player and Banker bets." },
      ],
    },
    {
      heading: "House edge",
      body: [
        "Banker is the best bet at about 1.06%. Player is close behind at about 1.24%. Tie is far worse at about 14.4% with an 8 to 1 payout. That number is the [[house-edge|house edge]].",
        "Those numbers are why Afterhand nudges you away from the Tie bet, and why the small Banker commission is still worth paying.",
      ],
    },
    {
      heading: "Common mistakes",
      items: [
        { text: "Betting Tie because it pays more. The payout does not come close to covering how rarely it wins." },
        { text: "Reading patterns in past results. Each shoe deals fresh cards and the odds do not shift." },
        { text: "Avoiding Banker because of the commission, which is already priced into the edge." },
      ],
    },
    {
      heading: "Beginner tips",
      items: [
        { text: "There is nothing to play. Choose a bet and let the rules run." },
        { text: "If you want the smallest edge, bet Banker every time." },
        { text: "Baccarat is a good place to practise sitting out a bad bet." },
      ],
    },
  ],
};

const roulette: RulesDoc = {
  game: "roulette",
  title: "Roulette",
  intro:
    "A wheel, a ball, and a layout of numbers. Roulette is the clearest way to see how payouts and probability relate.",
  sections: [
    {
      heading: "Goal",
      body: [
        "Predict where the ball lands. Bets can cover a single number or large groups of numbers.",
      ],
    },
    {
      heading: "Setup",
      body: [
        "European roulette uses 37 pockets numbered 0 to 36. American roulette adds a 00 pocket, making 38.",
        "That single extra pocket doubles the house edge, from about 2.70% to about 5.26%.",
      ],
    },
    {
      heading: "Inside bets",
      items: [
        { label: "Straight", text: "One number. Pays 35 to 1." },
        { label: "Split", text: "Two adjacent numbers. Pays 17 to 1." },
        { label: "Street", text: "A row of three. Pays 11 to 1." },
        { label: "Corner", text: "Four numbers meeting at a corner. Pays 8 to 1." },
        { label: "Six line", text: "Two rows of three. Pays 5 to 1." },
      ],
    },
    {
      heading: "Outside bets",
      items: [
        { label: "Red or Black", text: "Eighteen numbers. Pays 1 to 1." },
        { label: "Odd or Even", text: "Eighteen numbers. Pays 1 to 1." },
        { label: "Low or High", text: "1 to 18 or 19 to 36. Pays 1 to 1." },
        { label: "Dozens", text: "Twelve numbers. Pays 2 to 1." },
        { label: "Columns", text: "Twelve numbers down the layout. Pays 2 to 1." },
      ],
    },
    {
      heading: "How a round works",
      body: [
        "1. Place chips anywhere on the layout. You can place as many bets as you like.",
        "2. The wheel spins and the ball settles in a pocket.",
        "3. Losing bets are cleared and winning bets are paid.",
        "4. Zero is not red, black, odd, or even, so every even money bet loses when it hits.",
      ],
    },
    {
      heading: "Why the edge exists",
      body: [
        "A straight up bet wins 1 time in 37 on a European wheel but pays only 35 to 1. That gap is the entire [[house-edge|house edge]], and it is the same 2.70% on almost every bet on the layout.",
        "No combination of bets removes it. Covering more numbers only trades a smaller win for a higher hit rate.",
      ],
    },
    {
      heading: "Common mistakes",
      items: [
        { text: "Believing a colour is due after a run. The wheel has no memory and each spin starts fresh." },
        { text: "Doubling after losses. It risks a lot to win a little and runs into table limits." },
        { text: "Playing an American wheel when a European one is available." },
      ],
    },
    {
      heading: "Beginner tips",
      items: [
        { text: "Pick European whenever you have the choice." },
        { text: "[[outside-bet|Outside bets]] last longer. [[inside-bet|Inside bets]] swing harder. The long run edge is the same." },
        { text: "Watch the probability figures next to each bet. They are the honest version of the payout." },
      ],
    },
  ],
};

export const RULES: Record<GameId, RulesDoc> = {
  blackjack,
  poker,
  baccarat,
  roulette,
};
