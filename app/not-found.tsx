import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { LinkButton } from "@/components/ui/LinkButton";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="label">Error 404</span>
        <h1 className="display mt-4 text-[clamp(2.2rem,5.5vw,3rem)] leading-[1.05]">
          That page is not at this table
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-fg-2">
          The link may be old, or the page may never have existed. Everything the app offers is one
          click away.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/games" variant="primary" size="lg" plate>
            Choose a table
          </LinkButton>
          <LinkButton href="/" variant="secondary" size="lg" plate>
            Home
          </LinkButton>
        </div>
      </div>
    </SiteShell>
  );
}
