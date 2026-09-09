import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { TableFilm } from "@/components/marketing/TableFilm";
import { FilmGallery } from "@/components/marketing/FilmGallery";
import { FILMS } from "@/lib/content/films";
import { GameCard } from "@/components/marketing/GameCard";
import { LinkButton } from "@/components/ui/LinkButton";
import { SectionHead } from "@/components/ui/Panel";
import { GAMES } from "@/lib/content/games";

export const metadata: Metadata = {
  title: "Afterhand | Learn Casino Games Through Play",
  description:
    "Practice blackjack, poker, baccarat, and roulette with simulated money and post-hand coaching that helps you understand every decision.",
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Play the hand",
    body: "Real rules, real dealer behaviour, simulated money. Nothing interrupts you while the hand is live.",
  },
  {
    title: "Make your own decisions",
    body: "No hints. No highlighted button. No recommended move. The thinking stays yours, mistakes included.",
  },
  {
    title: "Review what happened",
    body: "Afterwards, see which decisions mattered, what the better play was, and the reasoning behind it.",
  },
];

export default function HomePage() {
  return (
    <SiteShell contained={false}>
      <section className="mx-auto w-full max-w-[var(--shell-max)] px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="label">Casino strategy simulator</p>
            <h1 className="display mt-5 text-[clamp(3.1rem,7.8vw,5.15rem)] leading-[0.9]">
              Play first.
              <br />
              <span className="italic">Understand</span>
              <br />
              after.
            </h1>

            <hr className="rule-double mt-9 max-w-xs" />

            <p className="mt-6 max-w-md text-[16.5px] leading-[1.65] text-fg-2">
              Practice blackjack, poker, and other casino games with post-hand coaching that
              explains what happened and how to improve.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton href="/games/blackjack" variant="primary" size="lg" plate>
                Play Blackjack
              </LinkButton>
              <LinkButton href="/games" variant="secondary" size="lg" plate>
                All tables
              </LinkButton>
            </div>

            <Link
              href="/learn"
              className="mt-7 inline-flex items-baseline gap-2 font-mono text-[11px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
            >
              How the coaching works
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <TableFilm script={FILMS.blackjack} />
        </div>
      </section>

      <section
        aria-labelledby="games-heading"
        className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28"
      >
        <SectionHead
          index="01"
          title={<span id="games-heading">The tables</span>}
          note="Each one plays by real casino rules and explains itself once the hand is done."
        />
        <div className="mt-10 grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="how-heading"
        className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28"
      >
        <h2 id="how-heading" className="display text-[clamp(1.7rem,3.4vw,2.2rem)]">
          How it works
        </h2>
        <ol className="mt-12 grid gap-x-12 gap-y-12 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="display text-[clamp(2.2rem,4.5vw,2.85rem)] leading-none text-accent-2/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="display mt-4 text-[22px] leading-tight">{step.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-fg-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="film-heading"
        className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28"
      >
        <SectionHead
          index="02"
          title={<span id="film-heading">Watch a hand</span>}
          note="Each table plays a hand through to the review, so you can see how a session reads before you sit down."
        />
        <FilmGallery className="mt-10" />
      </section>

      <section className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="grid gap-10 border-t border-fg pt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
          <blockquote className="display text-[clamp(1.55rem,3.5vw,2.4rem)] leading-[1.18]">
            A coach who talks during the hand is not teaching you. They are playing for you.
          </blockquote>
          <div className="space-y-4 text-[14.5px] leading-relaxed text-fg-2 lg:pt-1">
            <p>
              Afterhand never shows a recommended move while a hand is live. You look at your
              total, look at the dealer upcard, and decide. That moment of commitment is the part
              that teaches.
            </p>
            <p>
              Once the hand settles, the review opens. It names the decision, gives the better
              play, and explains the reasoning with real numbers rather than slogans. Correct
              decisions that lost are marked as correct, because the point is the choice and not
              the result.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="felt relative overflow-hidden px-7 py-12 sm:px-12 sm:py-16 lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-4 border border-[rgba(201,167,94,0.16)]"
          />
          <div className="relative z-10 max-w-lg">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[rgba(201,167,94,0.8)] uppercase">
              The room
            </span>
            <h2 className="display mt-4 text-[clamp(1.9rem,4.6vw,2.85rem)] leading-[1.04] text-[#ece5d8]">
              Sit down at a table where losing a hand is allowed.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[rgba(236,229,216,0.66)]">
              Unlimited simulated funds. No account, no deposits, no chips to buy. Close the tab
              and the session ends.
            </p>
          </div>
          <LinkButton
            href="/games/blackjack"
            variant="primary"
            size="lg"
            plate
            className="relative z-10 mt-8 shrink-0 lg:mt-0"
          >
            Start a session
          </LinkButton>
        </div>
      </section>
    </SiteShell>
  );
}
