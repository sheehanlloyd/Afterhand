import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { TutorialScreen } from "@/components/learn/TutorialScreen";
import { TUTORIALS } from "@/lib/content/tutorials";

export const metadata: Metadata = {
  title: "Learn Baccarat",
  description:
    "Learn baccarat in five minutes: card values, the drawing rules, and which bet actually carries the smallest edge.",
  alternates: { canonical: "/games/baccarat/learn" },
};

export default function BaccaratLearnPage() {
  return (
    <SiteShell>
      <TutorialScreen tutorial={TUTORIALS.baccarat} />
    </SiteShell>
  );
}
