import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { TutorialScreen } from "@/components/learn/TutorialScreen";
import { TUTORIALS } from "@/lib/content/tutorials";

export const metadata: Metadata = {
  title: "Learn Blackjack",
  description:
    "Learn blackjack in five minutes: card values, the five actions, and the two numbers that decide almost every hand.",
  alternates: { canonical: "/games/blackjack/learn" },
};

export default function BlackjackLearnPage() {
  return (
    <SiteShell>
      <TutorialScreen tutorial={TUTORIALS.blackjack} />
    </SiteShell>
  );
}
