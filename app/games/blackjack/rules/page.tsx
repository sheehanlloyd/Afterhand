import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { RulesPage } from "@/components/rules/RulesPage";
import { RULES } from "@/lib/content/rules";

export const metadata: Metadata = {
  title: "Blackjack Rules",
  description:
    "Beginner friendly blackjack rules: how a round works, what every action does, how payouts are calculated, and the mistakes that cost the most.",
  alternates: { canonical: "/games/blackjack/rules" },
};

export default function BlackjackRulesPage() {
  return (
    <SiteShell>
      <RulesPage doc={RULES.blackjack} />
    </SiteShell>
  );
}
