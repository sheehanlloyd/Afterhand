import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { RulesPage } from "@/components/rules/RulesPage";
import { RULES } from "@/lib/content/rules";

export const metadata: Metadata = {
  title: "Poker Rules",
  description:
    "Beginner friendly poker rules: how a round works, what every action does, how payouts are calculated, and the mistakes that cost the most.",
  alternates: { canonical: "/games/poker/rules" },
};

export default function PokerRulesPage() {
  return (
    <SiteShell>
      <RulesPage doc={RULES.poker} />
    </SiteShell>
  );
}
