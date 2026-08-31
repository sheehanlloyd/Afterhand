import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Afterhand",
    short_name: "Afterhand",
    description:
      "An educational casino simulator. Play blackjack, poker, baccarat, and roulette with simulated money and post-hand coaching.",
    start_url: "/",
    display: "standalone",
    background_color: "#f0eae0",
    theme_color: "#0c0f0e",
    categories: ["education", "games"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
