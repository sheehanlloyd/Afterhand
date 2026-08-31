import Link from "next/link";
import { RulesDoc } from "@/lib/content/rules";
import { RulesBody } from "./RulesBody";
import { RichText } from "@/components/ui/RichText";
import { LinkButton } from "@/components/ui/LinkButton";
import { GAMES } from "@/lib/content/games";
import { GLOSSARY_LIST } from "@/lib/content/glossary";

export function RulesPage({ doc }: { doc: RulesDoc }) {
  const game = GAMES.find((entry) => entry.id === doc.game)!;
  const terms = GLOSSARY_LIST.filter((entry) => entry.games?.includes(doc.game));

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,16.5rem)] lg:gap-16">
      <div className="min-w-0">
        <header className="max-w-2xl">
          <span className="label">Rules</span>
          <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.4rem)] leading-[1]">{doc.title}</h1>
          <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
            <RichText text={doc.intro} />
          </p>
        </header>

        <hr className="rule-double mt-10" />

        <div className="mt-10">
          <RulesBody doc={doc} />
        </div>

        {terms.length > 0 ? (
          <section className="mt-14">
            <div className="flex items-baseline gap-3 border-b border-line pb-2">
              <span className="label">Glossary</span>
              <h2 className="text-[17px] font-semibold">Terms you will hear</h2>
            </div>
            <dl className="mt-4 divide-y divide-[var(--line)] border-b border-line">
              {terms.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 py-3.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-6"
                >
                  <dt className="font-mono text-[10.5px] tracking-[0.12em] uppercase">
                    {entry.term}
                  </dt>
                  <dd className="text-[14px] leading-relaxed text-fg-2">{entry.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line p-5">
          <span className="label">Start playing</span>
          <p className="mt-3 text-[13.5px] leading-relaxed text-fg-2">
            Rules stick faster once you have played a few hands with them.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <LinkButton href={game.play} variant="primary" size="md" plate block>
              Play {game.name}
            </LinkButton>
            <LinkButton href={game.learn} variant="secondary" size="md" plate block>
              5 minute intro
            </LinkButton>
            {game.practice ? (
              <LinkButton href={game.practice} variant="ghost" size="md" plate block>
                Practice drills
              </LinkButton>
            ) : null}
          </div>
        </div>

        <nav aria-label="Other rules" className="mt-8">
          <span className="label">Other games</span>
          <ul className="mt-3 divide-y divide-[var(--line)] border-y border-line">
            {GAMES.filter((entry) => entry.id !== doc.game).map((entry) => (
              <li key={entry.id}>
                <Link
                  href={entry.rules}
                  className="flex items-center justify-between py-2.5 text-[13.5px] text-fg-2 transition-colors hover:text-fg"
                >
                  {entry.name}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
