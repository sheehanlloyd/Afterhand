import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { PracticeScreen } from "@/components/game/blackjack/PracticeScreen";

export const metadata: Metadata = {
  title: "Blackjack Practice",
  description:
    "Drill blackjack basic strategy by topic, with immediate feedback and a mastery grid that tracks every situation.",
  alternates: { canonical: "/games/blackjack/practice" },
};

export default function BlackjackPracticePage() {
  return (
    <SiteShell>
      <PracticeScreen />
    </SiteShell>
  );
}
