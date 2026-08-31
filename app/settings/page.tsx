import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Sound, table rules, default bankroll, and controls for clearing the local data Afterhand keeps in your browser.",
  alternates: { canonical: "/settings" },
};

export default function SettingsPage() {
  return (
    <SiteShell>
      <SettingsScreen />
    </SiteShell>
  );
}
