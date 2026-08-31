import { ImageResponse } from "next/og";

export const alt = "Afterhand. Play first. Understand after.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f0eae0";
const INK = "#15181a";
const MUTED = "#565d60";
const BRASS = "#9a6a1f";
const FELT = "#0d2a22";
const FELT_LINE = "rgba(201,167,94,0.3)";

function CardShape({
  rank,
  suit,
  red,
  rotate,
  offset,
}: {
  rank: string;
  suit: string;
  red?: boolean;
  rotate: number;
  offset: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 132,
        height: 186,
        borderRadius: 10,
        backgroundColor: "#f7f3ea",
        color: red ? "#9d2f2c" : "#15181a",
        padding: "12px 14px",
        marginLeft: offset,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 18px 28px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 26 }}>
        <div style={{ fontSize: 30, lineHeight: 1 }}>{rank}</div>
        <div style={{ fontSize: 22, lineHeight: 1 }}>{suit}</div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
        }}
      >
        {suit}
      </div>
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: PAPER }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 56px",
            width: 720,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${BRASS}`,
                color: BRASS,
                fontSize: 22,
              }}
            >
              A
            </div>
            <div style={{ fontSize: 30, color: INK, letterSpacing: -0.5 }}>Afterhand</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 78, color: INK, lineHeight: 1.04, letterSpacing: -2 }}>
              Play first.
            </div>
            <div style={{ fontSize: 78, color: INK, lineHeight: 1.04, letterSpacing: -2 }}>
              Understand after.
            </div>
            <div style={{ display: "flex", height: 2, backgroundColor: INK, width: 300, marginTop: 26 }} />
            <div style={{ marginTop: 24, fontSize: 25, color: MUTED, maxWidth: 560, lineHeight: 1.4 }}>
              Practice blackjack, poker, baccarat, and roulette with post-hand coaching that
              explains every decision.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              fontSize: 17,
              color: "#8b9296",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            <div>afterhand.online</div>
            <div>Simulated money only</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: FELT,
            borderLeft: `1px solid ${FELT_LINE}`,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 26,
              bottom: 26,
              left: 26,
              right: 26,
              border: `1px solid rgba(201,167,94,0.18)`,
            }}
          />
          <div style={{ display: "flex", alignItems: "center" }}>
            <CardShape rank="A" suit="♠" rotate={-8} offset={0} />
            <CardShape rank="7" suit="♦" red rotate={7} offset={-42} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
