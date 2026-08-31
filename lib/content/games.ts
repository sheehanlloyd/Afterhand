import { GameId } from "@/types";

export interface GameEntry {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  difficulty: "Easy" | "Moderate" | "Involved";
  /** Routes that exist for this game. */
  play: string;
  learn: string;
  rules: string;
  practice?: string;
  available: boolean;
}

export const GAMES: GameEntry[] = [
  {
    id: "blackjack",
    name: "Blackjack",
    tagline: "Learn basic strategy and understand every decision you make.",
    description:
      "The flagship table. Play real hands against a dealer, then review the decisions that mattered.",
    difficulty: "Moderate",
    play: "/games/blackjack",
    learn: "/games/blackjack/learn",
    rules: "/games/blackjack/rules",
    practice: "/games/blackjack/practice",
    available: true,
  },
  {
    id: "poker",
    name: "Poker",
    tagline:
      "Practice Texas Hold'em against computer opponents and review your decisions after each hand.",
    description:
      "No-limit Hold'em at a four handed table, with a hand history you can walk through street by street.",
    difficulty: "Involved",
    play: "/games/poker",
    learn: "/games/poker/learn",
    rules: "/games/poker/rules",
    practice: "/games/poker/practice",
    available: true,
  },
  {
    id: "baccarat",
    name: "Baccarat",
    tagline: "Learn one of the simplest table games and understand the odds behind each wager.",
    description:
      "Three bets, automatic drawing rules, and a clear explanation of why each card appeared.",
    difficulty: "Easy",
    play: "/games/baccarat",
    learn: "/games/baccarat/learn",
    rules: "/games/baccarat/rules",
    available: true,
  },
  {
    id: "roulette",
    name: "Roulette",
    tagline: "Explore probability, payouts, and house edge through simulated roulette.",
    description:
      "European wheel by default, with an interactive layout and the true odds behind every bet.",
    difficulty: "Easy",
    play: "/games/roulette",
    learn: "/games/roulette/learn",
    rules: "/games/roulette/rules",
    available: true,
  },
];

export function gameById(id: GameId): GameEntry {
  return GAMES.find((game) => game.id === id)!;
}
