import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { PokerPracticeScreen } from "@/components/game/poker/PokerPracticeScreen";

export const metadata: Metadata = {
  title: "Poker Practice",
  description:
    "Drill the arithmetic of poker: pot odds and hand equity, with every answer worked out by simulation rather than opinion.",
  alternates: { canonical: "/games/poker/practice" },
};

export default function PokerPracticePage() {
  return (
    <SiteShell>
      <PokerPracticeScreen />
    </SiteShell>
  );
}
