import Link from "next/link";
import { GameEntry } from "@/lib/content/games";
import { GameGlyph } from "./GameGlyph";
import { LinkButton } from "@/components/ui/LinkButton";

/**
 * An invitation to sit: a strip of felt, the table's name, one primary seat,
 * and the quieter routes listed as text rather than as a second identical menu.
 */
export function GameCard({ game, index }: { game: GameEntry; index: number }) {
  const secondary = [
    { href: game.learn, label: "Learn" },
    ...(game.practice ? [{ href: game.practice, label: "Practice" }] : []),
    { href: game.rules, label: "Rules" },
  ];

  return (
    <article className="group relative flex flex-col bg-surface">
      <div className="felt relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 border border-[rgba(201,167,94,0.16)]"
        />
        <div className="relative z-10 flex items-center justify-between px-5 pt-4">
          <span className="font-mono text-[10px] tracking-[0.18em] text-[rgba(201,167,94,0.72)] uppercase">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-[rgba(236,229,216,0.42)] uppercase">
            {game.difficulty}
          </span>
        </div>
        <div className="relative z-10 flex items-end px-5 pt-8 pb-5">
          <GameGlyph game={game.id} className="h-11 w-12 text-[rgba(201,167,94,0.88)]" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
        <h3 className="display text-[26px] leading-none">{game.name}</h3>
        <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-fg-2">{game.tagline}</p>
        <LinkButton href={game.play} variant="primary" size="md" plate className="mt-5 w-full">
          Play
        </LinkButton>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {secondary.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={false}
                className="font-mono text-[10.5px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
