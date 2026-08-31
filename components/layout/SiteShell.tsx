import { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { Surface } from "./Surface";
import { cn } from "@/lib/utils/cn";

export function SiteShell({
  children,
  className,
  contained = true,
}: {
  children: ReactNode;
  className?: string;
  contained?: boolean;
}) {
  return (
    <>
      <Surface value="paper" />
      <SiteHeader />
      <main
        id="main"
        className={cn(
          "relative z-10 flex-1",
          contained && "mx-auto w-full max-w-[var(--shell-max)] px-5 py-14 sm:px-8 sm:py-20",
          className,
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
