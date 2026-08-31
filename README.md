# Afterhand

**Play first. Understand after.**

Afterhand is a casino strategy simulator. You play a real hand with real rules and simulated
money, and the coaching only shows up once the hand is over. While the hand is live you are on your
own, which is the whole point. The decision has to be yours before the explanation is worth
anything.

Live at [afterhand.online](https://afterhand.online).

---

## The idea

Most trainers tell you the right move while you are still deciding. That is not teaching, it is
playing the hand for you. You end up clicking whatever is highlighted and learning nothing, because
you never had to commit to anything.

So Afterhand stays quiet. No recommended move, no highlighted button, no strategy chart on the
table. You look at your total, look at the dealer's upcard, and choose. Once the hand settles, the
review opens and tells you what you did, what the better play was, and why.

The other thing it does is keep two ideas apart that casinos deliberately blur: whether a decision
was correct, and whether it worked. A correct play that lost the hand is still marked correct, and
the review says so in as many words. Most of what feels like a mistake at a table is just variance,
and you cannot get better at the game until you can tell the two apart.

## What is in it

| Game | Modes | Notes |
| --- | --- | --- |
| Blackjack | Play, Learn, Practice, Rules | The main one. Full basic strategy engine and a mastery grid. |
| Texas Hold'em | Play, Learn, Practice, Rules | Four handed against computer opponents, with side pots and a hand history. |
| Baccarat | Play, Learn, Rules | Automatic drawing rules, explained after every hand. |
| Roulette | Play, Learn, Rules | European and American wheels, full interactive layout. |

The rules are the real ones: six deck shoe, dealer soft 17 behaviour, splits and resplits, double
after split, late surrender, insurance, correct baccarat third card rules, proper side pot
construction in poker, and both roulette wheel layouts.

There is no money in it anywhere. No accounts, no deposits, no withdrawals, no chips to buy, no
ads, and nothing to sign up for. Close the tab and the session is gone.

Each game also plays a short hand of itself on the homepage, right through to the review, so you
can see how a session reads before you sit down. Those are built out of the same card and chip
components the real tables use rather than being video, which keeps them sharp at any size and
costs nothing to serve.

### How the blackjack coaching works

The strategy engine is a fixed multi-deck basic strategy chart. It is deterministic and adjusts for
the number of decks, the dealer's soft 17 rule, whether double after split is allowed, and whether
surrender is offered. No language model decides the correct play, because a language model would
occasionally be confidently wrong and there is no reason to guess at something that has a known
answer.

Decisions come back as Optimal, Acceptable, Mistake, or Major mistake. Acceptable covers the close
calls and the plays that are directionally right but give up a little value, like hitting when you
could have doubled.

The probabilities in the reviews (dealer bust rates, your chance of busting on the next card, how
standing tends to split out) are calculated by exhaustive recursion over an infinite deck model.
They ignore the cards already dealt, and the app says so wherever it shows one. Expected value
numbers are left out entirely rather than estimated, since a made up EV figure is worse than none.

### How the poker coaching works

The opponents play off hand strength, pot odds, position, and a personality that shifts their
thresholds and adds some noise, so the table does not play identically every hand.

Poker coaching never pretends there is one right answer. It tells you the price the pot was
offering, the equity from a Monte Carlo simulation against random holdings, and how the two compare.
The assumption that opponents hold random cards is stated every time, because it matters and it is
not true at a real table.

## Built with

- [Next.js](https://nextjs.org) 16, App Router
- React 19 and TypeScript in strict mode
- Tailwind CSS v4
- Framer Motion for the card, chip, and panel animation
- Zustand for session state
- Vitest for the engine tests

No backend, no database, no auth, and no environment variables. The whole thing runs in the browser.

## Running it locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint     # ESLint
npm run test     # Vitest, engines and strategy
npm run build    # Production build
npm run start    # Serve the production build
```

The tests are a good place to start if you are poking around. The engines are pure functions with
no React anywhere near them, so `tests/` covers card values and soft aces, blackjack and bust
detection, split and double rules, dealer behaviour under both soft 17 rules, payouts and pushes,
the full basic strategy chart, poker hand evaluation and side pots, baccarat third card rules, and
roulette payouts.

`tests/invariants.test.ts` is a bit different. It plays a few hundred randomised hands through each
engine and asserts the things that have to hold no matter what comes off the deck: money is
conserved across a session, chips are conserved across a poker hand and the pot is always fully
distributed, a bankroll never goes negative, no hand is ever left unresolved, and every round
terminates.

## Deployment

It deploys to Vercel with no configuration. Import the repo, keep the defaults, done.

Every route is prerendered at build time. There are no API routes, no server actions, no image
optimisation, and no middleware, so serving a page costs bandwidth and nothing else.

A few of those are deliberate choices rather than accidents:

- **No middleware.** Middleware runs as a function on every matched request, which on an otherwise
  static site would turn each page view into a billed invocation. The security headers live in
  `next.config.ts` instead, where the CDN applies them for nothing.
- **No `next/image`.** Optimised images are billed per source image. The cards, chips, wheel, and
  icons are all drawn in CSS, so there are no raster assets to optimise.
- **No video.** The homepage films are scripted frames rendered by components that have already
  loaded. One short clip would outweigh everything else the site serves.
- **Fonts self-hosted at build** through `next/font`, so nothing is fetched from a third party.
- **Prefetch limited to primary actions.** Next prefetches every link in the viewport by default,
  and the footer alone would have fired nine speculative requests on every page view.

There is no rate limiting in the code because there is no endpoint to limit. Nothing here reaches a
server. If you fork this and want protection against someone hammering the CDN, that belongs in
Vercel's firewall settings, along with a spend cap.

## On phones

Phones got proper attention rather than a shrunk down desktop layout. A few things that needed
real work:

- Heights use `dvh` rather than `vh`, so the iOS Safari toolbar collapsing does not crop the
  control rail off the bottom of the screen.
- `viewport-fit=cover` with `env(safe-area-inset-*)` keeps the controls clear of the home indicator
  and the notch.
- The browser chrome colour follows the surface, so it goes dark when you sit down at a table and
  comes back to paper when you leave.
- Blackjack card sizes scale with the number of split hands. Four hands at full size do not fit
  across a 375px screen, so they shrink, and the row scrolls the hand you are playing into view if
  it still cannot fit.
- The roulette layout is wider than a phone on purpose. It scrolls sideways with a faded edge so it
  is obvious there is more of it.
- Tap highlight and double tap zoom are turned off on the controls, because at a table you press
  things quickly and repeatedly and both of those read as lag.

## How it is laid out

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

Game logic lives in `lib/` and never imports React, so every engine can be tested on its own and
the UI can be rewritten without touching the rules.

## Design

There are two surfaces sharing one set of tokens. The reading side (home, rules, tutorials,
practice, settings) is warm printed paper. The playing side is a dark room with felt on the table.
Sitting down at a game dims the lights and leaving brings them back up.

The cards are drawn rather than drawn from anywhere. Every rank, suit, pip layout, and card back is
CSS, which is why they stay crisp at any size and why the whole site has no image payload.

## Your data

Preferences and learning progress live in your browser's localStorage, with a version number on
them so the shape can migrate later. An active session keeps a small recovery record in
sessionStorage so a refresh does not lose your seat. None of it is sent anywhere, there is no
account attached to it, and the settings page can clear all of it.

## A disclaimer, since it matters

Afterhand is an educational simulator that uses fake money. It does not support real money
gambling, deposits, or withdrawals, and it never will. Nothing here is gambling advice, and no
strategy in it beats the house edge. Basic strategy makes you lose more slowly, which is a genuinely
useful thing to know and is not the same as winning.

If gambling is causing you problems, [BeGambleAware](https://www.begambleaware.org) and the
[National Council on Problem Gambling](https://www.ncpgambling.org) both have free, confidential
help.

## License

MIT. See [LICENSE](LICENSE).
