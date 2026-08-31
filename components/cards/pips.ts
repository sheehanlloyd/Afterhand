import { Rank } from "@/types";

export interface Pip {
  x: number;
  y: number;
  flipped: boolean;
}

const LEFT = 26;
const RIGHT = 74;
const CENTER = 50;

function pip(x: number, y: number): Pip {
  return { x, y, flipped: y > 50 };
}

/** Traditional pip layouts for the number cards. */
export const PIP_LAYOUT: Partial<Record<Rank, Pip[]>> = {
  A: [pip(CENTER, 50)],
  "2": [pip(CENTER, 15), pip(CENTER, 85)],
  "3": [pip(CENTER, 15), pip(CENTER, 50), pip(CENTER, 85)],
  "4": [pip(LEFT, 15), pip(RIGHT, 15), pip(LEFT, 85), pip(RIGHT, 85)],
  "5": [pip(LEFT, 15), pip(RIGHT, 15), pip(CENTER, 50), pip(LEFT, 85), pip(RIGHT, 85)],
  "6": [
    pip(LEFT, 15), pip(RIGHT, 15),
    pip(LEFT, 50), pip(RIGHT, 50),
    pip(LEFT, 85), pip(RIGHT, 85),
  ],
  "7": [
    pip(LEFT, 15), pip(RIGHT, 15),
    pip(CENTER, 32),
    pip(LEFT, 50), pip(RIGHT, 50),
    pip(LEFT, 85), pip(RIGHT, 85),
  ],
  "8": [
    pip(LEFT, 15), pip(RIGHT, 15),
    pip(CENTER, 32),
    pip(LEFT, 50), pip(RIGHT, 50),
    pip(CENTER, 68),
    pip(LEFT, 85), pip(RIGHT, 85),
  ],
  "9": [
    pip(LEFT, 14), pip(RIGHT, 14),
    pip(LEFT, 38), pip(RIGHT, 38),
    pip(CENTER, 50),
    pip(LEFT, 62), pip(RIGHT, 62),
    pip(LEFT, 86), pip(RIGHT, 86),
  ],
  "10": [
    pip(LEFT, 14), pip(RIGHT, 14),
    pip(CENTER, 26),
    pip(LEFT, 38), pip(RIGHT, 38),
    pip(LEFT, 62), pip(RIGHT, 62),
    pip(CENTER, 74),
    pip(LEFT, 86), pip(RIGHT, 86),
  ],
};
