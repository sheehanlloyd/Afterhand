import type { Metadata } from "next";
import { PokerScreen } from "@/components/game/poker/PokerScreen";

export const metadata: Metadata = {
  title: "Poker",
  description:
    "Play no-limit Texas Hold'em against computer opponents with simulated chips, then review your decisions street by street.",
  alternates: { canonical: "/games/poker" },
};

export default function PokerPage() {
  return <PokerScreen />;
}
