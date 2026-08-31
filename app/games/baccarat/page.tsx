import type { Metadata } from "next";
import { BaccaratScreen } from "@/components/game/baccarat/BaccaratScreen";

export const metadata: Metadata = {
  title: "Baccarat",
  description:
    "Play baccarat with simulated money and see exactly which drawing rule fired, plus the house edge behind Player, Banker, and Tie.",
  alternates: { canonical: "/games/baccarat" },
};

export default function BaccaratPage() {
  return <BaccaratScreen />;
}
