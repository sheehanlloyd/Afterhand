import { GameId } from "@/types";

/**
 * Line marks for each game, drawn in currentColor so they pick up whatever
 * surface they land on.
 */
export function GameGlyph({ game, className }: { game: GameId; className?: string }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
    strokeLinejoin: "round" as const,
  };

  if (game === "blackjack") {
    return (
      <svg viewBox="0 0 40 34" className={className} aria-hidden="true">
        <rect x="4.5" y="6.5" width="17" height="23" {...stroke} transform="rotate(-8 13 18)" />
        <rect x="18.5" y="6.5" width="17" height="23" {...stroke} transform="rotate(8 27 18)" />
        <path
          d="M27 13.5c-2.4 2-3.6 3.1-3.6 4.4a1.7 1.7 0 0 0 3.1.9 1.7 1.7 0 0 0 3.1-.9c0-1.3-1.2-2.4-3.6-4.4Z"
          fill="currentColor"
          stroke="none"
        />
        <path d="M27 19.4v3" {...stroke} />
      </svg>
    );
  }

  if (game === "poker") {
    return (
      <svg viewBox="0 0 40 34" className={className} aria-hidden="true">
        <rect x="2.5" y="8.5" width="11" height="17" {...stroke} />
        <rect x="14.5" y="8.5" width="11" height="17" {...stroke} />
        <rect x="26.5" y="8.5" width="11" height="17" {...stroke} />
        <circle cx="8" cy="17" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="20" cy="17" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="32" cy="17" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (game === "baccarat") {
    return (
      <svg viewBox="0 0 40 34" className={className} aria-hidden="true">
        <rect x="3.5" y="6.5" width="14" height="21" {...stroke} />
        <rect x="22.5" y="6.5" width="14" height="21" {...stroke} />
        <path d="M20 9v16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <path d="M10.5 14.5l2.2 2.6-2.2 2.6-2.2-2.6z" fill="currentColor" stroke="none" />
        <path d="M29.5 14.5l2.2 2.6-2.2 2.6-2.2-2.6z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 34" className={className} aria-hidden="true">
      <circle cx="20" cy="17" r="12.5" {...stroke} />
      <circle cx="20" cy="17" r="4.5" {...stroke} />
      <path d="M20 4.5v25M7.5 17h25M11.2 8.2l17.6 17.6M28.8 8.2 11.2 25.8" {...stroke} />
      <circle cx="20" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
