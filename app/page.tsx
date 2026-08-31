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
      {/* Masthead strip */}
      <div className="border-b border-line">
        <div className="mx-auto flex w-full max-w-[var(--shell-max)] items-center justify-between gap-4 px-5 py-2.5 font-mono text-[10px] tracking-[0.16em] text-fg-3 uppercase sm:px-8">
          <span>Casino strategy simulator</span>
          <span className="hidden sm:inline">Four tables</span>
          <span>Simulated currency only</span>
        </div>
      </div>

      <section className="mx-auto w-full max-w-[var(--shell-max)] px-5 pt-14 pb-20 sm:px-8 sm:pt-20 sm:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h1 className="display text-[clamp(3rem,7.5vw,5rem)] leading-[0.93]">
              Play first.
              <br />
              <span className="italic">Understand</span>
              <br />
              after.
            </h1>

            <hr className="rule-double mt-9 max-w-md" />

            <p className="mt-6 max-w-md text-[16px] leading-[1.65] text-fg-2">
              Practice blackjack, poker, and other casino games with post-hand coaching that
              explains what happened and how to improve.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton href="/games/blackjack" variant="primary" size="lg" plate>
                Play Blackjack
              </LinkButton>
              <LinkButton href="/games" variant="secondary" size="lg" plate>
                Explore Games
              </LinkButton>
            </div>

            <Link
              href="/learn"
              className="mt-6 inline-flex items-baseline gap-2 font-mono text-[11px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
            >
              Learn how it works
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

      <section
        aria-labelledby="how-heading"
        className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28"
      >
        <SectionHead index="03" title={<span id="how-heading">How it works</span>} />
        <ol className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t border-fg pt-5">
              <span className="label">Step {index + 1}</span>
              <h3 className="display mt-3 text-[22px] leading-tight">{step.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-[var(--shell-max)] px-5 pb-20 sm:px-8 sm:pb-28">
        <SectionHead index="04" title="Why after" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
          <blockquote className="display text-[clamp(1.5rem,3.4vw,2.3rem)] leading-[1.2]">
            A coach who talks during the hand is not teaching you. They are playing for you.
          </blockquote>
          <div className="space-y-4 text-[14.5px] leading-relaxed text-fg-2">
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
        <div className="felt flex flex-col gap-8 border border-[rgba(201,167,94,0.25)] px-7 py-10 sm:px-12 sm:py-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[rgba(201,167,94,0.8)] uppercase">
              The room
            </span>
            <h2 className="display mt-4 text-[clamp(1.8rem,4.4vw,2.7rem)] leading-[1.05] text-[#ece5d8]">
              Sit down at a table where losing a hand is allowed.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-[rgba(236,229,216,0.66)]">
              Unlimited simulated funds. No account, no deposits, no chips to buy. Close the tab
              and the session ends.
            </p>
          </div>
          <Link
            href="/games/blackjack"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-sm bg-[#c9a75e] px-7 font-mono text-[11px] tracking-[0.16em] text-[#10130f] uppercase transition-[filter] hover:brightness-110"
          >
            Start a session
          </Link>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center font-mono text-[10px] leading-[1.9] tracking-[0.14em] text-fg-3 uppercase">
          Afterhand uses simulated money only. No deposits. No withdrawals. No real money gambling.
        </p>
      </section>
    </SiteShell>
  );
}
