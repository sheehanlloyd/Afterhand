import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { SectionHead } from "@/components/ui/Panel";
import { LearningProfile } from "@/components/learn/LearningProfile";
import { TUTORIALS } from "@/lib/content/tutorials";
import { GAMES } from "@/lib/content/games";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "How Afterhand teaches: play the hand yourself, then read a review that separates decision quality from the result. Your progress stays in your browser.",
  alternates: { canonical: "/learn" },
};

export default function LearnPage() {
  return (
    <SiteShell>
      <header className="max-w-2xl">
        <span className="label">Learn</span>
        <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.6rem)] leading-[1]">
          The coach speaks after the hand
        </h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Afterhand separates two things that casinos blur together: whether a decision was right,
          and whether it worked. A correct play that lost is still a correct play, and the review
          says so.
        </p>
      </header>

      <section className="mt-16">
        <SectionHead index="01" title="Five minute walkthroughs" />
        <div className="mt-8 grid sm:grid-cols-2">
          {GAMES.map((game) => {
            const tutorial = TUTORIALS[game.id];
            return (
              <Link
                key={game.id}
                href={game.learn}
                className="group -mt-px -ml-px flex flex-col border border-line p-6 transition-colors hover:bg-surface-2"
              >
                <span className="label">{tutorial.minutes} minutes</span>
                <h3 className="display mt-3 text-[22px] leading-none transition-colors group-hover:text-accent">
                  {tutorial.title}
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-fg-2">{tutorial.intro}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-20">
        <SectionHead
          index="02"
          title="Your progress"
          note="Stored in this browser only. Nothing is sent anywhere."
        />
        <div className="mt-10">
          <LearningProfile />
        </div>
      </section>

      <section className="mt-20">
        <SectionHead index="03" title="How decisions are graded" />
        <dl className="mt-8 divide-y divide-[var(--line)] border-y border-line">
          {[
            ["Optimal", "The play matches basic strategy for the rules at your table."],
            [
              "Acceptable",
              "A close alternative, or the right direction with some value given up, such as hitting when doubling was available.",
            ],
            ["Mistake", "A clearly better play was available."],
            [
              "Major mistake",
              "A play that gives up a large amount, such as standing on a total that cannot bust or refusing to split aces.",
            ],
          ].map(([term, definition]) => (
            <div
              key={term}
              className="grid gap-2 py-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-6"
            >
              <dt className="font-mono text-[10.5px] tracking-[0.12em] uppercase">{term}</dt>
              <dd className="text-[14px] leading-relaxed text-fg-2">{definition}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-2xl text-[13.5px] leading-relaxed text-fg-2">
          Recommendations come from a fixed basic strategy chart that accounts for the number of
          decks, the dealer&apos;s soft 17 rule, whether doubling after a split is allowed, and whether
          surrender is offered. Probabilities in the review are calculated from an infinite deck
          model, so they are close approximations rather than exact figures for the current shoe.
        </p>
      </section>
    </SiteShell>
  );
}
