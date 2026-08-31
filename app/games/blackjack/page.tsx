import type { Metadata } from "next";
import { BlackjackScreen } from "@/components/game/blackjack/BlackjackScreen";

export const metadata: Metadata = {
  title: "Blackjack",
  description:
    "Play blackjack with simulated money and a post-hand review that explains every decision you made.",
  alternates: { canonical: "/games/blackjack" },
};

export default function BlackjackPage() {
  return <BlackjackScreen />;
}
