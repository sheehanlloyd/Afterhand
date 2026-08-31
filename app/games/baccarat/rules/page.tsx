import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { RulesPage } from "@/components/rules/RulesPage";
import { RULES } from "@/lib/content/rules";

export const metadata: Metadata = {
  title: "Baccarat Rules",
  description:
    "Beginner friendly baccarat rules: how a round works, what every action does, how payouts are calculated, and the mistakes that cost the most.",
  alternates: { canonical: "/games/baccarat/rules" },
};

export default function BaccaratRulesPage() {
  return (
    <SiteShell>
      <RulesPage doc={RULES.baccarat} />
    </SiteShell>
  );
}
