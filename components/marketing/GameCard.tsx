import Link from "next/link";
import { GameEntry } from "@/lib/content/games";
import { GameGlyph } from "./GameGlyph";
import { cn } from "@/lib/utils/cn";

/**
 * An index card from a printed manual: hairline box, number in the corner,
 * name set in the display face, and the routes listed as plain entries.
 */
export function GameCard({ game, index }: { game: GameEntry; index: number }) {
  const links = [
    { href: game.play, label: "Play" },
    { href: game.learn, label: "Learn" },
    ...(game.practice ? [{ href: game.practice, label: "Practice" }] : []),
    { href: game.rules, label: "Rules" },
  ];

  return (
    <article className="group relative flex flex-col bg-surface transition-colors duration-200 hover:bg-surface-2">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] scale-x-0 bg-accent-2 transition-transform duration-300 ease-out group-hover:scale-x-100"
        style={{ transformOrigin: "left" }}
      />

      <div className="flex items-baseline justify-between gap-4 px-5 pt-5">
        <span className="label">{String(index + 1).padStart(2, "0")}</span>
        <span className="font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase">
          {game.difficulty}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-6">
        <GameGlyph
          game={game.id}
          className="h-9 w-10 text-accent-2/75 transition-colors group-hover:text-accent-2"
        />
        <h3 className="display mt-4 text-[27px] leading-none">{game.name}</h3>
        <p className="mt-3.5 flex-1 text-[13.5px] leading-relaxed text-fg-2">{game.tagline}</p>
      </div>

      <ul className="flex flex-col divide-y divide-[var(--line)] border-t border-line">
        {links.map((link, position) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "flex items-center justify-between px-5 py-2.5 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors",
                position === 0 ? "text-fg" : "text-fg-3",
                "hover:bg-fg/[0.05] hover:text-fg",
              )}
            >
              {link.label}
              <span aria-hidden="true" className="text-[13px] leading-none">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
