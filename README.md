# Afterhand

**Play first. Understand after.**

Afterhand is an educational casino strategy simulator. You play a real hand with real rules and
simulated money, and the coaching arrives only once the hand is over. During the hand you are on
your own, which is the point: the decision has to be yours before the explanation means anything.

Live at [afterhand.online](https://afterhand.online).

---

## What it does

Afterhand keeps two ideas apart that casinos blur together: whether a decision was correct, and
whether it worked. A correct play that lost the hand is still marked correct, and the review says
so in as many words.

- **No live hints.** No recommended move, no highlighted button, no strategy chart on the table.
- **Post-hand review.** After a hand, the review names the decision that mattered, gives the better
  play, and explains the reasoning with numbers that are actually calculated.
- **Real rules.** Six deck shoe, dealer soft 17 behaviour, splits, double after split, late
  surrender, insurance, side pots in poker, correct baccarat third card rules, both roulette wheels.
- **No money.** No accounts, no deposits, no withdrawals, no chips to buy, no ads.
- **Table films.** Each game plays a scripted hand of itself on the homepage, through to the
  review, using the same card and chip components as the real tables.

## Supported games

| Game | Modes | Notes |
| --- | --- | --- |
| Blackjack | Play, Learn, Practice, Rules | The flagship. Full basic strategy engine and a mastery grid. |
| Texas Hold'em | Play, Learn, Rules | Four handed against computer opponents, with side pots and a hand history. |
| Baccarat | Play, Learn, Rules | Automatic drawing rules, explained after every hand. |
| Roulette | Play, Learn, Rules | European and American wheels, full interactive layout. |

### Blackjack in more detail

The strategy engine is a fixed multi-deck basic strategy chart. It is deterministic and adjusts for
the number of decks, the dealer's soft 17 rule, double after split, and whether surrender is
offered. No language model is involved in deciding the correct play.

Decisions are graded as Optimal, Acceptable, Mistake, or Major mistake. Acceptable covers close
calls and decisions that are directionally right but give up value, such as hitting when doubling
was available.

Probabilities shown in reviews (dealer bust rates, the chance of busting on the next card, and the
outcome split for standing) are computed by exhaustive recursion over an infinite deck model. They
ignore cards already dealt, and the app says so wherever they appear. Expected value figures are
deliberately omitted rather than estimated.

### Poker in more detail

Opponents use hand strength, pot odds, position, and a personality profile that shifts their
thresholds and adds noise, so the table does not play the same way every hand.

Poker coaching never claims there is one correct decision. It states the price the pot was
offering, the equity measured by Monte Carlo simulation against random holdings, and how those two
compare. The assumption is stated every time.

## Tech stack

- [Next.js](https://nextjs.org) 16 with the App Router
- React 19 and TypeScript in strict mode
- Tailwind CSS v4
- Framer Motion for card, chip, and panel animation
- Zustand for game session state
- Vitest for the game logic tests

No backend, no database, no authentication, and no environment variables are required.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint     # ESLint
npm run test     # Vitest, game logic only
npm run build    # Production build
npm run start    # Serve the production build
```

## Deployment

The project deploys to Vercel with no configuration. Import the repository, keep the defaults, and
deploy. Everything is statically prerendered and all game logic runs in the browser, so there is
nothing to provision.

Every route in the build is marked `○ (Static)`. There are no API routes, no server actions, no
image optimisation, and deliberately no middleware, so a page view costs bandwidth and nothing
else.

### Running costs

The expensive things on Vercel are function invocations, image optimisation, and bandwidth. This
project avoids the first two entirely and keeps the third small.

What the repository already does:

- **No middleware.** Middleware runs as a function on every matched request. On an otherwise
  static site it would turn every page view into a billed invocation. Security headers are set in
  `next.config.ts` instead, where the CDN applies them for free.
- **No `next/image`.** Optimised images are billed per source image. The cards, chips, wheel, and
  icons are all drawn in CSS, so the site ships no raster assets at all.
- **No video files.** The table films are scripted frames rendered by components that have already
  loaded, not media downloads. A single short clip would outweigh the rest of the site.
- **Fonts self-hosted at build** through `next/font`, so there is no third party request.
- **Scoped link prefetching.** Next prefetches every `<Link>` in the viewport by default. The
  footer alone would have fired nine speculative requests on every page view. Prefetch is now
  limited to primary actions.
- **Long lived caching** on the generated icons, manifest, Open Graph card, robots, and sitemap,
  which previously revalidated on every request.

What to set once in the Vercel dashboard, which cannot be done from the repository:

1. **Spend management.** Project settings, Usage, set a spend limit and an alert threshold. This is
   the only hard ceiling on a bill.
2. **Firewall rate limiting.** Project settings, Firewall. A rule such as 200 requests per minute
   per IP across `/.*` is far above real use and stops a scraper from running up transfer costs.
   There is no application level rate limiting in the code because there is no endpoint to limit:
   nothing here reaches a server.
3. **Attack Challenge Mode**, in the same panel, if the site is ever targeted.

### Domain

`metadataBase`, the sitemap, and the canonical tags all use the apex, `https://afterhand.online`.
The deployment currently redirects the apex to `www.afterhand.online`, so those canonical URLs
resolve through a redirect. Set the apex as the primary domain under Project settings, Domains, so
the canonical host and the served host agree. If you would rather keep `www` as primary, change
`siteUrl` in `app/layout.tsx` and `BASE` in `app/sitemap.ts` to match.

## Browser and device support

Tested on current Chrome, Safari, Edge, and Firefox, and on iOS Safari and Android Chrome.

Mobile specifics worth knowing:

- Layout heights use `dvh` rather than `vh`, so the collapsing iOS Safari toolbar does not crop the
  control rail.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` keeps the rails clear of the home indicator
  and the notch.
- The theme colour follows the surface, so the browser chrome goes dark when you sit down at a
  table and light again when you leave.
- Blackjack card sizes scale with the number of split hands, so four hands still fit across a
  375px screen, and the row scrolls the active hand into view if it ever cannot.
- The roulette layout is wider than a phone by design. It scrolls horizontally with a masked edge
  to show there is more.
- Tap highlight and double tap zoom are suppressed on controls so repeated presses at a table do
  not read as lag.

## Project structure

```
app/                    Routes, metadata, sitemap, robots, manifest, generated images
components/
  ui/                   Buttons, panels, fields, overlays, the shared design system
  cards/                Custom rendered playing cards and card backs
  chips/                Chips and bet stacks
  game/                 Per game screens, tables, and control rails
  review/               Post-hand review panels
  layout/               Site header, footer, and surface switching
  rules/                Rules rendering
  marketing/            Homepage pieces, game cards, and the table films
lib/
  games/                Rules engines: blackjack, poker, baccarat, roulette
  strategy/             Blackjack basic strategy, probability, and coaching
  storage/              Versioned localStorage and sessionStorage helpers
  store/                Session state
  content/              Rules text, tutorials, glossary, game catalogue, film scripts
tests/                  Vitest suites for the engines
types/                  Shared card and game types
```

Game logic lives in `lib/` and never depends on React, so every engine can be tested on its own.

## Design

The app uses two surfaces that share one set of tokens. The reading side (home, rules, tutorials,
practice, settings) is warm printed paper. The playing side is a dark room with felt. Entering a
session dims the lights, and finishing one brings them back up.

## Local data and privacy

Preferences and learning progress are stored in this browser using localStorage, with a version
number so the shape can migrate later. An active session keeps a small recovery record in
sessionStorage so a refresh does not lose your seat. Nothing is sent to a server, there is no
account, and everything can be cleared from the settings page.

## Educational disclaimer

Afterhand is an educational casino strategy simulator using simulated currency only. It does not
support real-money gambling, deposits, or withdrawals. Nothing in this project is gambling advice,
and no strategy described here overcomes the house edge.

## License

MIT. See [LICENSE](LICENSE).
