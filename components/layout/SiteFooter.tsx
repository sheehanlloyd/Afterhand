import Link from "next/link";

const GITHUB_URL = "https://github.com/sheehanlloyd/afterhand";

const COLUMNS = [
  {
    title: "Tables",
    links: [
      { href: "/games/blackjack", label: "Blackjack" },
      { href: "/games/poker", label: "Poker" },
      { href: "/games/baccarat", label: "Baccarat" },
      { href: "/games/roulette", label: "Roulette" },
    ],
  },
  {
    title: "Study",
    links: [
      { href: "/learn", label: "Learn" },
      { href: "/rules", label: "Rules" },
      { href: "/games/blackjack/practice", label: "Practice" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/settings", label: "Settings" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto w-full max-w-[var(--shell-max)] px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="max-w-xs">
            <p className="display text-[26px] leading-none">Afterhand</p>
            <p className="mt-4 text-[13px] leading-relaxed text-fg-2">
              An educational casino simulator. Play the hand yourself, then find out what the
              better decision was and why.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="label">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      /* Footer links sit in the viewport on every page. Prefetching
                         all nine of them on every visit costs far more than it saves. */
                      prefetch={false}
                      className="text-[13.5px] text-fg-2 transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === "About" ? (
                  <li>
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13.5px] text-fg-2 transition-colors hover:text-fg"
                    >
                      GitHub
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-5 font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase sm:flex-row sm:items-center sm:justify-between">
          <p>Simulated money only</p>
          <p>No deposits. No withdrawals. No real money gambling.</p>
        </div>
      </div>
    </footer>
  );
}
