import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/content/games";

const BASE = "https://afterhand.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/games", "/learn", "/rules", "/settings", "/privacy"];

  const gameRoutes = GAMES.flatMap((game) =>
    [game.play, game.learn, game.rules, game.practice].filter(Boolean) as string[],
  );

  return [...staticRoutes, ...gameRoutes].map((route) => ({
    url: `${BASE}${route}`,
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : route.startsWith("/games/") ? 0.8 : 0.6,
  }));
}
