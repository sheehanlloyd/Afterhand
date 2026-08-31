"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/games", label: "Play" },
  { href: "/learn", label: "Learn" },
  { href: "/games/blackjack/practice", label: "Practice" },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/92 backdrop-blur-md">
      <div className="mx-auto flex h-[58px] w-full max-w-[var(--shell-max)] items-center gap-8 px-5 sm:px-8">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/games" ? pathname === "/games" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                /* Nav links are one hop from anywhere and the pages are static and
                   small. Prefetching each one on every page view is not worth it. */
                prefetch={false}
                className={cn(
                  "relative py-1 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors",
                  active ? "text-fg" : "text-fg-3 hover:text-fg",
                )}
              >
                {link.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-accent-2"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-5">
          <Link
            href="/settings"
            prefetch={false}
            className="hidden font-mono text-[11px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg md:inline-block"
          >
            Settings
          </Link>
          <Link
            href="/games/blackjack"
            className="hidden h-9 items-center rounded-sm bg-[var(--btn-bg)] px-4 font-mono text-[11px] tracking-[0.14em] text-[var(--btn-fg)] uppercase transition-[filter] hover:brightness-110 md:inline-flex"
          >
            Deal me in
          </Link>
          <button
            type="button"
            className="font-mono text-[11px] tracking-[0.14em] text-fg-2 uppercase md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="site-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col divide-y divide-[var(--line)] px-5">
              {[...LINKS, { href: "/settings", label: "Settings" }].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className="py-3.5 font-mono text-[12px] tracking-[0.14em] text-fg-2 uppercase"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/games/blackjack"
                onClick={() => setOpen(false)}
                className="my-4 inline-flex h-11 items-center justify-center rounded-sm bg-[var(--btn-bg)] font-mono text-[11px] tracking-[0.14em] text-[var(--btn-fg)] uppercase"
              >
                Deal me in
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
