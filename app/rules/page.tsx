import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { SectionHead } from "@/components/ui/Panel";
import { GAMES } from "@/lib/content/games";
import { RULES } from "@/lib/content/rules";
import { GLOSSARY_LIST } from "@/lib/content/glossary";

export const metadata: Metadata = {
  title: "Rules Library",
  description:
    "Plain English rules for blackjack, Texas Hold'em, baccarat, and roulette, with payouts, common mistakes, and beginner tips.",
  alternates: { canonical: "/rules" },
};

export default function RulesIndexPage() {
  return (
    <SiteShell>
      <header className="max-w-2xl">
        <span className="label">Library</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.6rem)] leading-[1]">Rules</h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Written for someone who has never sat at the table. Each page covers the goal, the
          actions, how a round runs, how payouts work, and the mistakes that cost the most.
        </p>
      </header>

      <div className="mt-12 divide-y divide-[var(--line)] border-y border-line">
        {GAMES.map((game, index) => {
          const doc = RULES[game.id];
          return (
            <Link
              key={game.id}
              href={game.rules}
              className="group grid gap-3 py-7 transition-colors sm:grid-cols-[3rem_minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
            >
              <span className="label">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="display text-[26px] leading-none transition-colors group-hover:text-accent">
                {doc.title}
              </h2>
              <p className="text-[14px] leading-relaxed text-fg-2">{doc.intro}</p>
              <span
                aria-hidden="true"
                className="hidden text-fg-3 transition-transform group-hover:translate-x-1 sm:block"
              >
                &rarr;
              </span>
            </Link>
          );
        })}
      </div>

      <section className="mt-20">
        <SectionHead index="A" title="Glossary" note="Every term the app uses, in one place." />
        <dl className="mt-8 grid gap-x-12 gap-y-6 sm:grid-cols-2">
          {GLOSSARY_LIST.map((entry) => (
            <div key={entry.id} className="border-t border-line pt-4">
              <dt className="font-mono text-[10.5px] tracking-[0.12em] uppercase">{entry.term}</dt>
              <dd className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SiteShell>
  );
}
