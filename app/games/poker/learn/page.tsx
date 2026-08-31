import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { TutorialScreen } from "@/components/learn/TutorialScreen";
import { TUTORIALS } from "@/lib/content/tutorials";

export const metadata: Metadata = {
  title: "Learn Poker",
  description:
    "Learn Texas Hold'em in five minutes: the shape of a hand, the betting actions, and how to price a call.",
  alternates: { canonical: "/games/poker/learn" },
};

export default function PokerLearnPage() {
  return (
    <SiteShell>
      <TutorialScreen tutorial={TUTORIALS.poker} />
    </SiteShell>
  );
}
