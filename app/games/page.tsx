import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { GameCard } from "@/components/marketing/GameCard";
import { SectionHead } from "@/components/ui/Panel";
import { GAMES } from "@/lib/content/games";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Choose a table. Blackjack, Texas Hold'em, baccarat, and roulette, all with simulated money and post-hand review.",
  alternates: { canonical: "/games" },
};

export default function GamesPage() {
  return (
    <SiteShell>
      <header className="max-w-2xl">
        <span className="label">Game selection</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.6rem)] leading-[1]">
          Choose a table
        </h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Every game runs on real casino rules with simulated money. Play mode stays out of your
          way. Learn mode adds a review once the hand is finished.
        </p>
      </header>

      <div className="mt-12 grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((game, index) => (
          <GameCard key={game.id} game={game} index={index} />
        ))}
      </div>

      <section className="mt-20">
        <SectionHead index="A" title="What each table teaches" />
        <dl className="mt-8 divide-y divide-[var(--line)] border-t border-line">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className="grid gap-2 py-6 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-8"
            >
              <dt className="display text-[21px] leading-none">{game.name}</dt>
              <dd className="text-[14px] leading-relaxed text-fg-2">{game.description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SiteShell>
  );
}
