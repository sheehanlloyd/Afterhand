import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Motion } from "@/components/layout/Motion";

/* Fraunces carries the display voice: a warm, slightly odd old style face that
   reads like a printed manual rather than a product page. */
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = "https://afterhand.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Afterhand | Learn Casino Games Through Play",
    template: "%s | Afterhand",
  },
  description:
    "Practice blackjack, poker, baccarat, and roulette with simulated money and post-hand coaching that helps you understand every decision.",
  applicationName: "Afterhand",
  keywords: [
    "blackjack trainer",
    "basic strategy",
    "poker practice",
    "baccarat",
    "roulette odds",
    "casino simulator",
  ],
  authors: [{ name: "Afterhand" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Afterhand",
    title: "Afterhand | Learn Casino Games Through Play",
    description:
      "Play first. Understand after. Simulated blackjack, poker, baccarat, and roulette with coaching that arrives once the hand is over.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Afterhand | Learn Casino Games Through Play",
    description:
      "Play first. Understand after. Simulated casino games with post-hand coaching.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f0eae0",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-surface="paper"
      className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:border focus:border-line-2 focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <Motion>{children}</Motion>
      </body>
    </html>
  );
}
