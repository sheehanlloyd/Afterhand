import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { RulesPage } from "@/components/rules/RulesPage";
import { RULES } from "@/lib/content/rules";

export const metadata: Metadata = {
  title: "Roulette Rules",
  description:
    "Beginner friendly roulette rules: how a round works, what every action does, how payouts are calculated, and the mistakes that cost the most.",
  alternates: { canonical: "/games/roulette/rules" },
};

export default function RouletteRulesPage() {
  return (
    <SiteShell>
      <RulesPage doc={RULES.roulette} />
    </SiteShell>
  );
}
