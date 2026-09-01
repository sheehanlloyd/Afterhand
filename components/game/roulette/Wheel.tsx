"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Pocket, pocketColour, pocketsFor, RouletteVariant } from "@/lib/games/roulette/engine";
import { EASE } from "@/lib/motion/tokens";

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
  ballAt,
  spinning,
  turn,
}: {
  variant: RouletteVariant;
  /** The live result, which is cleared when the table is swept. */
  result: Pocket | null;
  /** Where the ball is physically sitting, which it stays at once it lands. */
  ballAt: Pocket | null;
  spinning: boolean;
  /** Increments when a spin starts. Gives the ball its revolutions. */
  turn: number;
}) {
  const reduced = useReducedMotion();
  const pockets = pocketsFor(variant);
  const step = 360 / pockets.length;
  const index = ballAt === null ? 0 : pockets.findIndex((pocket) => pocket === ballAt);

  /**
   * Revolutions accumulate rather than resetting.
   *
   * The ball's resting angle has to stay the same number once it has landed,
   * or clearing the table would send it back round the wheel to zero. Each spin
   * adds six turns to a running total, and the ball's target is that total plus
   * the winning pocket, so between spins it simply sits where it stopped.
   */
  const targetAngle = index * step + step / 2 + turn * 6 * 360;

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
            const won = !spinning && result !== null && pocket === result;
            return (
              <g key={String(pocket)}>
                <path
                  d={wedgePath(start, end)}
                  fill={FILL[colour]}
                  stroke="rgba(201,167,94,0.22)"
                  strokeWidth="0.4"
                />
                {/* The pocket the ball is sitting in, lit from underneath. */}
                {won ? (
                  <motion.path
                    d={wedgePath(start, end)}
                    fill="rgba(201,167,94,0.32)"
                    stroke="rgba(201,167,94,0.9)"
                    strokeWidth="0.8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: EASE.arrive }}
                  />
                ) : null}
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
          <motion.text
            key={String(result)}
            x="100"
            y="100"
            fill="rgba(236,229,216,0.95)"
            fontSize="26"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            dominantBaseline="central"
            initial={{ opacity: 0 }}
            animate={{ opacity: spinning ? 0.25 : 1 }}
            transition={{ duration: 0.3, ease: EASE.arrive }}
          >
            {result}
          </motion.text>
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

        {/* While the wheel is turning, a band of light sweeps round it. The
            pocket ring itself cannot rotate, because the ball's landing angle
            is measured against it, but a wheel that shows no movement of its
            own reads as a dial rather than as a thing that spins. */}
        {spinning && !reduced ? (
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            style={{ originX: "100px", originY: "100px" }}
          >
            <path
              d={wedgePath(0, 70)}
              fill="rgba(255,255,255,0.07)"
              stroke="none"
            />
          </motion.g>
        ) : null}

        {/* The ball rides the outer track, loses speed, drops onto the pocket
            ring and rattles into place. A ball that glides to a perfect stop is
            the tell that nothing physical is being modelled, so the last few
            degrees are a separate, springier movement. */}
        <motion.g
          animate={{
            rotate: targetAngle,
            /* It spirals inward as it slows, the way a real ball leaves the
               track and falls onto the numbers. */
            scale: ballAt === null ? 1 : spinning ? [1, 1, 0.94] : 0.94,
          }}
          transition={{
            duration: reduced ? 0 : spinning ? 2.6 : 0.4,
            ease: spinning ? [0.1, 0.72, 0.2, 1] : EASE.arrive,
            scale: { duration: reduced ? 0 : spinning ? 2.6 : 0.2, times: [0, 0.62, 1] },
          }}
          style={{ originX: "100px", originY: "100px" }}
        >
          <motion.g
            /* Remounted the moment the ball stops, so the rattle plays once
               and never again on a later render. */
            key={spinning ? "rolling" : `settled-${turn}`}
            initial={{ rotate: spinning || reduced ? 0 : 9 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 11, mass: 0.6 }}
            style={{ originX: "100px", originY: "100px" }}
          >
            <ellipse
              cx="101"
              cy={100 - (OUTER + INNER) / 2 + 2}
              rx="4"
              ry="2.6"
              fill="rgba(0,0,0,0.45)"
            />
            <circle cx="100" cy={100 - (OUTER + INNER) / 2} r="4.2" fill="#f3efe6" />
            <circle
              cx="98.7"
              cy={100 - (OUTER + INNER) / 2 - 1.2}
              r="1.5"
              fill="rgba(255,255,255,0.85)"
            />
            <circle
              cx="100"
              cy={100 - (OUTER + INNER) / 2}
              r="4.2"
              fill="none"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="0.6"
            />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
