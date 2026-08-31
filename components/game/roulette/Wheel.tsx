"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Pocket, pocketColour, pocketsFor, RouletteVariant } from "@/lib/games/roulette/engine";

const OUTER = 96;
const INNER = 68;
const HUB = 40;

function polar(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: 100 + radius * Math.cos(radians), y: 100 + radius * Math.sin(radians) };
}

function wedgePath(startAngle: number, endAngle: number): string {
  const outerStart = polar(OUTER, startAngle);
  const outerEnd = polar(OUTER, endAngle);
  const innerEnd = polar(INNER, endAngle);
  const innerStart = polar(INNER, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER} ${OUTER} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

const FILL = {
  red: "#7c2f2c",
  black: "#191d1c",
  green: "#14483a",
} as const;

/**
 * The wheel is drawn from the real pocket order for each variant, so the
 * neighbours of every number are correct rather than decorative.
 */
export function RouletteWheel({
  variant,
  result,
  spinning,
}: {
  variant: RouletteVariant;
  result: Pocket | null;
  spinning: boolean;
}) {
  const reduced = useReducedMotion();
  const pockets = pocketsFor(variant);
  const step = 360 / pockets.length;
  const index = result === null ? 0 : pockets.findIndex((pocket) => pocket === result);
  const targetAngle = index * step + step / 2;

  return (
    <div className="relative w-full" style={{ maxWidth: "min(17rem, 62vw)" }}>
      <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label="Roulette wheel">
        <circle cx="100" cy="100" r="99" fill="#0a1512" stroke="rgba(201,167,94,0.35)" />
        <g>
          {pockets.map((pocket, position) => {
            const start = position * step;
            const end = start + step;
            const label = polar((OUTER + INNER) / 2, start + step / 2);
            const colour = pocketColour(pocket);
            return (
              <g key={String(pocket)}>
                <path
                  d={wedgePath(start, end)}
                  fill={FILL[colour]}
                  stroke="rgba(201,167,94,0.22)"
                  strokeWidth="0.4"
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill="rgba(236,229,216,0.86)"
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${start + step / 2} ${label.x} ${label.y})`}
                >
                  {pocket}
                </text>
              </g>
            );
          })}
        </g>
        <circle
          cx="100"
          cy="100"
          r={HUB}
          fill="#0d2a22"
          stroke="rgba(201,167,94,0.4)"
          strokeWidth="0.8"
        />
        <circle cx="100" cy="100" r={HUB - 9} fill="none" stroke="rgba(201,167,94,0.2)" />

        {result !== null ? (
          <text
            x="100"
            y="100"
            fill="rgba(236,229,216,0.95)"
            fontSize="26"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {result}
          </text>
        ) : (
          <text
            x="100"
            y="100"
            fill="rgba(236,229,216,0.32)"
            fontSize="8"
            letterSpacing="2"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            dominantBaseline="central"
          >
            SPIN
          </text>
        )}

        {/* The ball rides the outer track and settles on the winning pocket. */}
        <motion.g
          animate={{ rotate: result === null ? 0 : targetAngle + (spinning ? 1440 : 0) }}
          transition={{
            duration: reduced ? 0 : spinning ? 2.4 : 0.4,
            ease: [0.16, 0.9, 0.24, 1],
          }}
          style={{ originX: "100px", originY: "100px" }}
        >
          <circle cx="100" cy={100 - (OUTER + INNER) / 2} r="4.2" fill="#f3efe6" />
          <circle
            cx="100"
            cy={100 - (OUTER + INNER) / 2}
            r="4.2"
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="0.6"
          />
        </motion.g>
      </svg>
    </div>
  );
}
