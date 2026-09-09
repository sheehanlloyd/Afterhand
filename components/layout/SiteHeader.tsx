"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";
import { LinkButton } from "@/components/ui/LinkButton";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/lib/motion/tokens";

const LINKS = [
  { href: "/games", label: "Play" },
  { href: "/learn", label: "Learn" },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[56px] w-full max-w-[var(--shell-max)] items-center gap-8 px-5 sm:px-8">
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
                  <motion.span
                    layoutId="site-nav-underline"
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-accent-2"
                    transition={{ duration: DURATION.menu, ease: EASE.arriveShort }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/settings"
            prefetch={false}
            className="hidden font-mono text-[11px] tracking-[0.14em] text-fg-3 uppercase transition-colors hover:text-fg md:inline-block"
          >
            Settings
          </Link>
          <span className="hidden md:inline-flex">
            <LinkButton href="/games/blackjack" variant="primary" size="sm" plate>
              Deal me in
            </LinkButton>
          </span>
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
            transition={{ duration: DURATION.menu, ease: EASE.arriveShort }}
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
              <LinkButton
                href="/games/blackjack"
                variant="primary"
                size="lg"
                plate
                block
                className="my-4"
                onClick={() => setOpen(false)}
              >
                Deal me in
              </LinkButton>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
