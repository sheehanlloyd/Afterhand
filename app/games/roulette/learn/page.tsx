import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { TutorialScreen } from "@/components/learn/TutorialScreen";
import { TUTORIALS } from "@/lib/content/tutorials";

export const metadata: Metadata = {
  title: "Learn Roulette",
  description:
    "Learn roulette in five minutes: inside and outside bets, payouts, and where the house edge comes from.",
  alternates: { canonical: "/games/roulette/learn" },
};

export default function RouletteLearnPage() {
  return (
    <SiteShell>
      <TutorialScreen tutorial={TUTORIALS.roulette} />
    </SiteShell>
  );
}
