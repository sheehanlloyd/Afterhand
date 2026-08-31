import { PlayingCard } from "@/components/cards/PlayingCard";
import { ChipFace } from "@/components/chips/Chip";
import { Card } from "@/types";

function card(rank: Card["rank"], suit: Card["suit"], id: string): Card {
  return { rank, suit, id };
}

/**
 * A window cut into the paper, looking down at the table.
 * The whole concept of the product in one image: the study is light, the room
 * is dark, and the cards are the same components the real table uses.
 */
export function HeroTable() {
  return (
    <figure
      className="relative"
      aria-label="A blackjack table showing a dealer hand and a player hand of soft eighteen"
    >
      <div className="felt relative aspect-[5/4] w-full overflow-hidden border border-[rgba(201,167,94,0.28)] shadow-[0_36px_70px_-46px_rgba(0,0,0,0.85)] sm:aspect-[16/12]">
        <div className="absolute inset-3 border border-[rgba(201,167,94,0.14)]" />

        <div className="absolute inset-0 flex flex-col items-center justify-between px-7 py-9 sm:px-12 sm:py-11">
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(236,229,216,0.4)] uppercase">
              Dealer
            </span>
            <div className="flex [--card-w:3rem] gap-2 sm:[--card-w:3.9rem]">
              <PlayingCard card={card("9", "spades", "hero-d1")} still index={0} />
              <PlayingCard card={card("K", "hearts", "hero-d2")} faceDown still index={1} />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-[50%] flex -translate-y-1/2 items-center gap-4 px-10">
            <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
            <span className="font-mono text-[clamp(0.5rem,1.1vw,0.6rem)] tracking-[0.34em] whitespace-nowrap text-[rgba(201,167,94,0.42)] uppercase">
              Blackjack pays 3 to 2
            </span>
            <span className="h-px flex-1 bg-[rgba(201,167,94,0.16)]" />
          </div>

          <div className="flex w-full items-end justify-between gap-4">
            <div className="flex items-end [--chip-w:1.75rem] sm:[--chip-w:2.2rem]">
              <ChipFace value={25} />
              <ChipFace value={100} className="-ml-3.5 -translate-y-[7px]" />
              <ChipFace value={5} className="-ml-3.5" />
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex [--card-w:3.25rem] gap-2 sm:[--card-w:4.3rem]">
                <PlayingCard card={card("A", "clubs", "hero-p1")} still index={2} />
                <PlayingCard
                  card={card("7", "diamonds", "hero-p2")}
                  still
                  index={3}
                  className="-ml-5 rotate-[6deg]"
                />
              </div>
              <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(236,229,216,0.4)] uppercase">
                Soft 18
              </span>
            </div>

            <div className="hidden w-[4.2rem] sm:block" />
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-mono text-[10px] tracking-[0.14em] text-fg-3 uppercase">
        <span>Fig. 1</span>
        <span>Soft 18 against a dealer nine</span>
      </figcaption>
    </figure>
  );
}
