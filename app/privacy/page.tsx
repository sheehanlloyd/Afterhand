import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Afterhand has no accounts and no server side storage. Preferences and learning progress stay in your browser.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    heading: "What is stored",
    body: [
      "Afterhand keeps a small amount of data in your browser using localStorage: your preferences, your blackjack learning statistics, and whether you have finished a tutorial.",
      "During a session, a copy of your bankroll and table rules is kept in sessionStorage so an accidental refresh does not lose your seat. That copy is removed when the session ends and disappears when you close the tab.",
    ],
  },
  {
    heading: "What is not stored",
    body: [
      "There is no account, no email address, no password, and no profile. Nothing you do here is sent to a server, because there is no application server holding game data.",
      "Afterhand has no advertising, no third party trackers, and no cross site identifiers.",
    ],
  },
  {
    heading: "Your control",
    body: [
      "You can clear everything at any time from the settings page, or by clearing site data in your browser. There is nothing left behind elsewhere.",
      "Because the data is local, it does not follow you between devices or browsers.",
    ],
  },
  {
    heading: "Simulated play only",
    body: [
      "Afterhand uses simulated currency. There are no deposits, no withdrawals, and no real money gambling of any kind. Nothing in the app can cost you money.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-2xl">
        <span className="label">Privacy</span>
        <h1 className="display mt-4 text-[clamp(2.2rem,5.5vw,3.2rem)] leading-[1]">
          Your data stays here
        </h1>
        <p className="mt-6 text-[15.5px] leading-relaxed text-fg-2">
          Your preferences and learning progress stay on this device unless you clear your browser
          data.
        </p>

        <hr className="rule-double mt-10" />

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section, index) => (
            <section key={section.heading}>
              <div className="flex items-baseline gap-3 border-b border-line pb-2">
                <span className="label">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="text-[17px] font-semibold">{section.heading}</h2>
              </div>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph, position) => (
                  <p key={position} className="text-[14.5px] leading-relaxed text-fg-2">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-[13.5px] text-fg-2">
          Manage or clear stored data on the{" "}
          <Link href="/settings" className="underline decoration-accent-2/60 underline-offset-4">
            settings page
          </Link>
          .
        </p>
      </div>
    </SiteShell>
  );
}
