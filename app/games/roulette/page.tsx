import type { Metadata } from "next";
import { RouletteScreen } from "@/components/game/roulette/RouletteScreen";

export const metadata: Metadata = {
  title: "Roulette",
  description:
    "Simulated European and American roulette with an interactive layout, true probabilities beside every bet, and the house edge derived from the numbers.",
  alternates: { canonical: "/games/roulette" },
};

export default function RoulettePage() {
  return <RouletteScreen />;
}
