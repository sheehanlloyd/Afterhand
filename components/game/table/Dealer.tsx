"use client";

import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import { animate, useMotionValue, useReducedMotion, type MotionValue } from "framer-motion";
import { useDealer, type DealerState, type ShuffleVariant } from "@/lib/store/dealer";
import { EASE } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

/**
 * The dealer.
 *
 * Drawn rather than rendered: a photographic person behind felt this stylised
 * would be the only literal thing in the product, and would date badly. What
 * this is instead is a figure with real joints. Both arms are a shoulder, an
 * elbow and a wrist, and every state the dealer machine can be in is a set of
 * angles for those six pivots. So the dealer does not play a video of a
 * shuffle: the arms go through the shuffle, which is why a riffle and a strip
 * look different from each other without either being a separate asset.
 *
 * The state machine lives in `lib/store/dealer`. This file only knows how to
 * put a body into each of its positions.
 */

/* ---------------------------------------------------------------- geometry */

/** Where the arms hang from, in viewBox units. */
const SHOULDER = { off: { x: 122, y: 101 }, work: { x: 198, y: 101 } };
/** Upper arm and forearm lengths. */
const UPPER = 36;
const FORE = 32;

const SKIN = "#c19169";
const SKIN_DEEP = "#a4744f";
const SHIRT = "#e7e0d0";
const SHIRT_SHADE = "#c8bfa9";
const CLOTH = "#101f1a";
const CLOTH_LIGHT = "#1b332a";
const BRASS = "#c9a75e";
const HAIR = "#1a1411";

/* ------------------------------------------------------------------- poses */

/**
 * One arm's angles, in degrees, measured so that positive is always *inward* —
 * towards the middle of the table. The screen-left arm negates them. Writing
 * poses in mirrored space is the only reason the two arms can share a table of
 * numbers instead of each needing its own sign-flipped copy.
 *
 * The angles compound down the limb, so a shoulder of 12 and an elbow of 26 put
 * the forearm at 38 from vertical, not 26. Keeping the total under about
 * seventy keeps each hand in front of the body rather than across it.
 */
interface ArmPose {
  /** Shoulder. 0 hangs straight down; larger brings the hand to the middle. */
  s: number[];
  /** Elbow, relative to the upper arm. */
  e: number[];
  /** Wrist, relative to the forearm. Negative squares the hand back up. */
  w: number[];
}

interface Pose {
  duration: number;
  times?: number[];
  /** The dealing hand: screen right, nearest the shoe. */
  work: ArmPose;
  /** The steadying hand: screen left, nearest the tray. */
  off: ArmPose;
  /** Torso sway, in viewBox units. */
  lean?: number[];
  /** Head turn, degrees. */
  head?: number[];
  /** Head and shoulders dipping towards the table. */
  nod?: number[];
  ease?: readonly [number, number, number, number];
  repeat?: boolean;
}

/** Hands apart on the felt either side of the deck. Everything returns here. */
const REST: Pose = {
  duration: 0.45,
  work: { s: [12], e: [26], w: [-14] },
  off: { s: [12], e: [26], w: [-14] },
};

/**
 * Breathing.
 *
 * A dealer at a live table is never quite still, and never quite doing anything
 * either. Seven seconds is long enough that the loop is not recognisable as a
 * loop, and the numbers are small enough that it reads as a person waiting
 * rather than as a character animating.
 */
const IDLE: Pose = {
  duration: 7.4,
  times: [0, 0.22, 0.44, 0.68, 1],
  work: {
    s: [12, 13.4, 12.2, 11.2, 12],
    e: [26, 24.6, 26.8, 27, 26],
    w: [-14, -12, -16, -13, -14],
  },
  off: {
    s: [12, 11.2, 13, 13.2, 12],
    e: [26, 27.2, 25.4, 26.6, 26],
    w: [-14, -16, -12, -15, -14],
  },
  lean: [0, -0.7, 0.5, -0.3, 0],
  /* An occasional glance down the table and back. */
  head: [0, -5, 1, 4, 0],
  nod: [0, -0.9, 0.3, -0.5, 0],
  ease: EASE.drift,
  repeat: true,
};

/** Waiting on a player. Hands settled, attention on the seat that has to act. */
const WAITING: Pose = {
  duration: 6.2,
  times: [0, 0.3, 0.62, 1],
  work: { s: [14, 15, 13.6, 14], e: [28, 27, 29, 28], w: [-16, -15, -17, -16] },
  off: { s: [14, 13.4, 14.6, 14], e: [28, 29, 27.4, 28], w: [-16, -17, -15, -16] },
  lean: [0, 0.5, -0.4, 0],
  head: [0, 3, -2, 0],
  nod: [0, -0.5, 0.2, 0],
  ease: EASE.drift,
  repeat: true,
};

/** Squaring the deck: both hands to the cards, edges tapped into line. */
const PREPARING: Pose = {
  duration: 0.36,
  times: [0, 0.4, 0.7, 1],
  work: { s: [12, 22, 20, 21], e: [26, 38, 35, 37], w: [-14, -20, -16, -19] },
  off: { s: [12, 22, 20, 21], e: [26, 38, 35, 37], w: [-14, -20, -16, -19] },
  head: [0, 2, 1, 1.5],
  nod: [0, 1.4, 0.6, 1],
  ease: EASE.arriveShort,
};

/**
 * The shuffles.
 *
 * These are the same five the shoe animates, and they are deliberately built
 * from the same shapes: what the halves of the deck do and what the hands doing
 * it do have to agree, or the deck looks like it is moving itself.
 */
const SHUFFLES: Record<ShuffleVariant, Pose> = {
  /* Halves split, thumbs lift the inner edges, cards interlace, deck squared. */
  riffle: {
    duration: 0.9,
    times: [0, 0.24, 0.52, 0.78, 1],
    work: { s: [21, 14, 15, 23, 21], e: [37, 31, 32, 39, 37], w: [-19, -10, -13, -22, -19] },
    off: { s: [21, 14, 15, 23, 21], e: [37, 31, 32, 39, 37], w: [-19, -10, -13, -22, -19] },
    nod: [0, 1.2, 1.4, 0.6, 0.8],
    ease: EASE.drift,
  },

  /* Flatter and slower, worked down against the felt. */
  "table-riffle": {
    duration: 1,
    times: [0, 0.22, 0.46, 0.74, 1],
    work: { s: [21, 16, 16.5, 22, 21], e: [37, 33, 34, 38, 37], w: [-19, -14, -15, -21, -19] },
    off: { s: [21, 16, 16.5, 22, 21], e: [37, 33, 34, 38, 37], w: [-19, -14, -15, -21, -19] },
    nod: [0, 1.6, 1.8, 1, 1],
    ease: EASE.drift,
  },

  /* Packets pulled off the top and dropped back on, three times. The steadying
     hand holds the deck absolutely still while the other works, which is the
     whole tell of a strip shuffle. */
  strip: {
    duration: 0.82,
    times: [0, 0.2, 0.38, 0.56, 0.74, 1],
    work: {
      s: [21, 24, 20, 23.5, 20, 21],
      e: [37, 45, 35, 44, 35, 37],
      w: [-19, -34, -16, -32, -16, -19],
    },
    off: {
      s: [21, 21, 21, 21, 21, 21],
      e: [37, 37.5, 37, 37.5, 37, 37],
      w: [-19, -19, -19, -19, -19, -19],
    },
    nod: [0, 0.8, 1.2, 0.8, 1.2, 1],
    ease: EASE.drift,
  },

  /* A run of small cuts, each packet passing behind the last. */
  "running-cuts": {
    duration: 0.88,
    times: [0, 0.18, 0.36, 0.54, 0.72, 1],
    work: {
      s: [21, 13, 22, 14, 22, 21],
      e: [37, 44, 34, 43, 34, 37],
      w: [-19, -36, -15, -34, -15, -19],
    },
    off: {
      s: [21, 22.5, 21, 22.5, 21, 21],
      e: [37, 36, 37, 36, 37, 37],
      w: [-19, -18, -19, -18, -19, -19],
    },
    nod: [0, 1, 0.6, 1, 0.6, 0.9],
    ease: EASE.drift,
  },

  /* Cards spread flat and scrambled with both palms. A fresh shoe only. */
  wash: {
    duration: 1.2,
    times: [0, 0.3, 0.55, 0.8, 1],
    work: { s: [21, 8, 26, 11, 21], e: [37, 44, 30, 42, 37], w: [-19, -4, -30, -6, -19] },
    off: { s: [21, 27, 6, 24, 21], e: [37, 29, 45, 31, 37], w: [-19, -32, -2, -28, -19] },
    lean: [0, 1.6, -1.4, 1, 0],
    nod: [0, 1.8, 1.8, 1.6, 1],
    ease: EASE.drift,
  },
};

/** The cut: a packet lifted off, set beside the deck, and completed. */
const CUTTING: Pose = {
  duration: 0.62,
  times: [0, 0.34, 0.66, 1],
  work: { s: [21, 10, 10, 21], e: [37, 44, 32, 37], w: [-19, -38, -8, -19] },
  off: { s: [21, 22, 21.5, 21], e: [37, 36, 37, 37], w: [-19, -19, -19, -19] },
  nod: [0, 1.2, 1, 0.8],
  ease: EASE.arrive,
};

/**
 * The flick.
 *
 * A dealer's card is not pushed, it is thrown from the wrist: the hand loads
 * back over the deck and then snaps open, and the card is gone before the arm
 * has finished moving. So the wrist travels furthest and fastest here and the
 * shoulder barely moves. `focus` swings the whole arm towards whichever seat is
 * being dealt to.
 */
function dealingPose(focus: number): Pose {
  const swing = focus * 10;
  return {
    duration: 0.32,
    times: [0, 0.34, 0.56, 1],
    work: {
      s: [12, 20, 9 - swing, 12 - swing * 0.35],
      e: [26, 38, 20, 27],
      w: [-14, 4, -52, -14],
    },
    off: { s: [12, 14, 12.5, 12], e: [26, 28, 26.5, 26], w: [-14, -13, -14, -14] },
    head: [0, 2, -focus * 7, -focus * 3],
    nod: [0, 1, 0.2, 0],
    ease: EASE.arriveShort,
  };
}

/** Reaching out, lifting a corner, and turning the card over. */
const REVEALING: Pose = {
  duration: 0.62,
  times: [0, 0.3, 0.56, 0.78, 1],
  work: { s: [12, 3, 2, 5, 12], e: [26, 46, 50, 44, 26], w: [-14, 6, -64, -40, -14] },
  off: { s: [12, 12.6, 12.6, 12, 12], e: [26, 26.4, 26.4, 26, 26], w: [-14, -14, -14, -14, -14] },
  head: [0, -3, -4, -2, 0],
  nod: [0, 1.6, 2, 1.2, 0],
  ease: EASE.arrive,
};

/** Both arms sweep the felt clear, wide and then across towards the tray. */
const COLLECTING: Pose = {
  duration: 0.72,
  times: [0, 0.28, 0.62, 1],
  work: { s: [12, -6, 30, 12], e: [26, 44, 36, 26], w: [-14, 2, -30, -14] },
  off: { s: [12, -6, 30, 12], e: [26, 44, 36, 26], w: [-14, 2, -30, -14] },
  lean: [0, 1.8, -1.2, 0],
  head: [0, -6, 5, 0],
  nod: [0, 1.4, 1, 0],
  ease: EASE.arrive,
};

/** The rare bit of showing off, once the felt is clear and nobody is waiting. */
const FLOURISH: Pose = {
  duration: 1.1,
  times: [0, 0.3, 0.55, 0.8, 1],
  work: { s: [12, 22, 4, 18, 12], e: [26, 40, 47, 33, 26], w: [-14, 8, -58, -20, -14] },
  off: { s: [12, 16, 14, 15, 12], e: [26, 31, 29, 28, 26], w: [-14, -12, -16, -13, -14] },
  head: [0, 3, -2, 2, 0],
  nod: [0, 0.8, 1.2, 0.6, 0],
  ease: EASE.drift,
};

function poseFor(
  state: DealerState,
  variant: ShuffleVariant,
  focus: number,
  flourish: boolean,
): Pose {
  switch (state) {
    case "preparing":
      return PREPARING;
    case "shuffling":
      return SHUFFLES[variant];
    case "cutting":
      return CUTTING;
    case "dealing":
      return dealingPose(focus);
    case "revealing":
      return REVEALING;
    case "collecting":
      return COLLECTING;
    case "waiting":
      return WAITING;
    case "idle":
    default:
      return flourish ? FLOURISH : IDLE;
  }
}

/* ------------------------------------------------------------------ joints */

/**
 * A rotating joint.
 *
 * The rotation is written to the SVG `transform` *attribute* rather than to a
 * CSS transform. It has to be: `transform-origin` on a nested SVG group is
 * resolved against the viewport rather than the group's own origin, and the
 * difference between those two is a shoulder that pivots around the middle of
 * the picture. `translate(x y) rotate(a)` has no such ambiguity — the rotation
 * is about the joint, in every engine.
 */
function Pivot({
  angle,
  x,
  y,
  children,
}: {
  angle: MotionValue<number>;
  x: number;
  y: number;
  children: ReactNode;
}) {
  const ref = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const apply = (value: number) =>
      node.setAttribute("transform", `translate(${x} ${y}) rotate(${value.toFixed(2)})`);
    apply(angle.get());
    return angle.on("change", apply);
  }, [angle, x, y]);

  return (
    <g ref={ref} transform={`translate(${x} ${y}) rotate(${angle.get()})`}>
      {children}
    </g>
  );
}

/** The torso, which sways and dips rather than rotating. */
function Sway({
  x,
  y,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  children: ReactNode;
}) {
  const ref = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const apply = () =>
      node.setAttribute("transform", `translate(${x.get().toFixed(2)} ${y.get().toFixed(2)})`);
    apply();
    const stopX = x.on("change", apply);
    const stopY = y.on("change", apply);
    return () => {
      stopX();
      stopY();
    };
  }, [x, y]);

  return <g ref={ref}>{children}</g>;
}

/* ------------------------------------------------------------- the drawing */

function Hand({ wrist, side }: { wrist: MotionValue<number>; side: 1 | -1 }) {
  return (
    <Pivot angle={wrist} x={0} y={FORE}>
      <g transform={`scale(${side},1)`}>
        {/* The shadow the hand puts on the felt. It rides with the hand, so a
            hand held over the deck darkens the deck. */}
        <ellipse cx="1" cy="14" rx="10" ry="4" fill="rgba(0,0,0,0.3)" />

        {/* Cuff, then the hand: a palm, a thumb and the suggestion of fingers.
            At this size any more detail turns into noise. */}
        <rect x="-7" y="-5.5" width="14" height="7" rx="2" fill={SHIRT} />
        <rect x="-7" y="-5.5" width="14" height="7" rx="2" fill="rgba(0,0,0,0.08)" />
        <circle cx="5.6" cy="-2" r="1.2" fill={BRASS} />

        <path
          d="M -6.2 -0.6 C -7.6 4.4, -6.2 9.8, -2.3 11.2 C 1.8 12.6, 5.9 10.7, 6.6 6.6 C 7.1 3.2, 6.6 0.4, 5.9 -0.6 Z"
          fill={SKIN}
        />
        {/* Thumb, laid along the near edge the way it sits on a deck. */}
        <path
          d="M -5.9 1.2 C -8.9 3, -9.2 7.1, -6.8 8.4 C -5.2 9.1, -4.1 7.6, -4.3 5.3"
          fill={SKIN}
          stroke={SKIN_DEEP}
          strokeWidth="0.5"
        />
        {/* Two creases, which is all it takes to read as fingers. */}
        <path
          d="M -1.2 11 L -0.7 5.9 M 2.7 10.2 L 2.9 5.5"
          stroke={SKIN_DEEP}
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
    </Pivot>
  );
}

function Arm({
  shoulder,
  elbow,
  wrist,
  at,
  side,
}: {
  shoulder: MotionValue<number>;
  elbow: MotionValue<number>;
  wrist: MotionValue<number>;
  at: { x: number; y: number };
  /** +1 for the screen-right arm, -1 for the screen-left one. */
  side: 1 | -1;
}) {
  return (
    <Pivot angle={shoulder} x={at.x} y={at.y}>
      {/* Upper arm, drawn as a thick round-capped stroke, which gives a
          shoulder and an elbow that stay joined at every angle for free. */}
      <line x1="0" y1="0" x2="0" y2={UPPER} stroke={SHIRT} strokeWidth="17" strokeLinecap="round" />
      <line
        x1={side * 4.8}
        y1="2"
        x2={side * 4}
        y2={UPPER - 3}
        stroke={SHIRT_SHADE}
        strokeWidth="3.6"
        strokeLinecap="round"
        opacity="0.6"
      />

      <Pivot angle={elbow} x={0} y={UPPER}>
        <line x1="0" y1="0" x2="0" y2={FORE} stroke={SHIRT} strokeWidth="14" strokeLinecap="round" />
        <line
          x1={side * 3.9}
          y1="1"
          x2={side * 3.1}
          y2={FORE - 3}
          stroke={SHIRT_SHADE}
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.55"
        />
        <Hand wrist={wrist} side={side} />
      </Pivot>
    </Pivot>
  );
}

function Body({ head }: { head: MotionValue<number> }) {
  return (
    <>
      {/* Shirt and shoulders. */}
      <path
        d="M 160 70 C 182 72, 194 82, 200 103 L 207 194 L 113 194 L 120 103 C 126 82, 138 72, 160 70 Z"
        fill={SHIRT}
      />
      {/* Waistcoat, cut open at the collar the way a house jacket is. */}
      <path d="M 160 84 L 189 96 L 196 194 L 124 194 L 131 96 Z" fill={CLOTH} />
      <path d="M 160 84 L 189 96 L 177 112 Z" fill={CLOTH_LIGHT} opacity="0.55" />
      {/* The shirt front showing through the opening. */}
      <path d="M 160 84 L 176 94 L 160 122 L 144 94 Z" fill={SHIRT} />
      <circle cx="160" cy="134" r="1.9" fill={BRASS} opacity="0.8" />
      <circle cx="160" cy="152" r="1.9" fill={BRASS} opacity="0.8" />
      <circle cx="160" cy="170" r="1.9" fill={BRASS} opacity="0.8" />

      {/* Neck, collar and bow tie. */}
      <path d="M 151 58 L 169 58 L 169 82 L 151 82 Z" fill={SKIN_DEEP} />
      <path d="M 147 73 L 160 87 L 145 93 Z" fill={SHIRT} />
      <path d="M 173 73 L 160 87 L 175 93 Z" fill={SHIRT} />
      <path d="M 160 85 L 148 79 L 148 91 Z M 160 85 L 172 79 L 172 91 Z" fill={BRASS} />
      <rect x="157.4" y="82.4" width="5.2" height="5.2" rx="1.4" fill="#a8863f" />

      <Pivot angle={head} x={160} y={64}>
        {/* Drawn about the neck, so every coordinate here is relative to it. */}
        <g transform="translate(-160,-64)">
          <ellipse cx="141" cy="42" rx="3.6" ry="5.4" fill={SKIN_DEEP} />
          <ellipse cx="179" cy="42" rx="3.6" ry="5.4" fill={SKIN_DEEP} />
          <ellipse cx="160" cy="40" rx="19" ry="22" fill={SKIN} />
          {/* A clean short cut, because a dealer on shift has one. */}
          <path
            d="M 141 38 C 141 21, 150 16, 160 16 C 170 16, 179 21, 179 38 C 175.6 30, 170 27.4, 160 27.4 C 150 27.4, 144.4 30, 141 38 Z"
            fill={HAIR}
          />
          {/* Brow, eyes, mouth. Three marks and no more: at the size this is
              drawn a rendered face reads as a smudge, and a suggested one does
              not. */}
          <path
            d="M 147.6 36.6 C 151 34.4, 155.6 34.4, 157.6 36 M 162.4 36 C 164.4 34.4, 169 34.4, 172.4 36.6"
            stroke={SKIN_DEEP}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          <ellipse cx="152.6" cy="41.6" rx="1.9" ry="2.2" fill="#241a14" />
          <ellipse cx="167.4" cy="41.6" rx="1.9" ry="2.2" fill="#241a14" />
          <path
            d="M 155.4 51.4 C 157.6 53.4, 162.4 53.4, 164.6 51.4"
            stroke={SKIN_DEEP}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </Pivot>
    </>
  );
}

/* ------------------------------------------------------------- the machine */

interface Joints {
  workShoulder: MotionValue<number>;
  workElbow: MotionValue<number>;
  workWrist: MotionValue<number>;
  offShoulder: MotionValue<number>;
  offElbow: MotionValue<number>;
  offWrist: MotionValue<number>;
  leanX: MotionValue<number>;
  leanY: MotionValue<number>;
  head: MotionValue<number>;
}

type Playback = { stop: () => void };

/** Puts every joint into one pose, and reports the animations it started. */
function playPose(joints: Joints, pose: Pose): Playback[] {
  const curve = pose.ease ?? EASE.arrive;
  const shared = {
    duration: pose.duration,
    times: pose.times,
    /* Copied into a fresh tuple: the tokens are readonly, and the animator
       wants a mutable four-point cubic bezier. */
    ease: [curve[0], curve[1], curve[2], curve[3]] as [number, number, number, number],
    repeat: pose.repeat ? Infinity : 0,
  };

  const running: Playback[] = [];
  const drive = (value: MotionValue<number>, frames: number[]) => {
    if (pose.duration <= 0) {
      value.set(frames[frames.length - 1]);
      return;
    }
    /* A single-value pose is a destination rather than a sequence, so it is
       played from wherever the joint currently is. */
    const keyframes = frames.length === 1 ? [value.get(), frames[0]] : frames;
    running.push(
      animate(value, keyframes, {
        ...shared,
        times: frames.length === 1 ? undefined : shared.times,
      }),
    );
  };

  /* Positive rotation swings a hanging arm to screen left, so the arm on the
     right takes the angles as written and the one on the left negates them for
     `inward` to mean the same thing on both sides. */
  const arm = (
    limb: { s: MotionValue<number>; e: MotionValue<number>; w: MotionValue<number> },
    spec: ArmPose,
    side: 1 | -1,
  ) => {
    drive(limb.s, spec.s.map((v) => v * side));
    drive(limb.e, spec.e.map((v) => v * side));
    drive(limb.w, spec.w.map((v) => v * side));
  };

  arm({ s: joints.workShoulder, e: joints.workElbow, w: joints.workWrist }, pose.work, 1);
  arm({ s: joints.offShoulder, e: joints.offElbow, w: joints.offWrist }, pose.off, -1);

  drive(joints.leanX, pose.lean ?? [0]);
  drive(joints.leanY, (pose.nod ?? [0]).map((v) => v * 0.6));
  drive(joints.head, pose.head ?? [0]);

  return running;
}

export function Dealer({
  className,
  /** Rendered without any animation at all, for stills and reduced motion. */
  still = false,
}: {
  className?: string;
  still?: boolean;
}) {
  const reduced = useReducedMotion();
  const inert = still || Boolean(reduced);
  const { state, variant, beat, focus, flourish } = useDealer();

  /* The motion values are stable across renders; the object holding them is
     wrapped so the effect below does not re-run every time a parent renders. */
  const workShoulder = useMotionValue(REST.work.s[0]);
  const workElbow = useMotionValue(REST.work.e[0]);
  const workWrist = useMotionValue(REST.work.w[0]);
  const offShoulder = useMotionValue(-REST.off.s[0]);
  const offElbow = useMotionValue(-REST.off.e[0]);
  const offWrist = useMotionValue(-REST.off.w[0]);
  const leanX = useMotionValue(0);
  const leanY = useMotionValue(0);
  const head = useMotionValue(0);

  /* The motion values are stable across renders; the object holding them is
     wrapped so the effect below does not re-run every time a parent renders. */
  const joints: Joints = useMemo(
    () => ({
      workShoulder,
      workElbow,
      workWrist,
      offShoulder,
      offElbow,
      offWrist,
      leanX,
      leanY,
      head,
    }),
    [
      workShoulder,
      workElbow,
      workWrist,
      offShoulder,
      offElbow,
      offWrist,
      leanX,
      leanY,
      head,
    ],
  );

  useEffect(() => {
    const limbs = joints;
    if (inert) {
      playPose(limbs, { ...REST, duration: 0 });
      return;
    }

    const pose = poseFor(state, variant, focus, flourish);
    let running = playPose(limbs, pose);

    /**
     * Everything except idling is a movement rather than a position, so once it
     * has been performed the dealer goes back to standing there. Without this
     * the arms hold the last frame of a flick until the next card, which is the
     * pose a mannequin holds.
     */
    let settle: number | undefined;
    if (!pose.repeat) {
      settle = window.setTimeout(
        () => {
          /* Mid-round the hands return to the deck; a finished round returns to
             breathing. */
          running = playPose(
            limbs,
            state === "collecting" || state === "revealing" ? IDLE : REST,
          );
        },
        pose.duration * 1000 + 40,
      );
    }

    return () => {
      if (settle !== undefined) window.clearTimeout(settle);
      running.forEach((animation) => animation.stop());
    };
    // `beat` is the trigger: dealing the next card re-enters the same state.
  }, [beat, state, variant, focus, flourish, inert, joints]);

  /* Two tables can be on screen at once, so the mask cannot have a fixed name.
     `useId` rather than a random one, because the markup has to match between
     the server render and the client. */
  const gradientId = `dealer-fade-${useId().replace(/:/g, "")}`;

  return (
    <div className={cn("pointer-events-none relative", className)} aria-hidden="true">
      <svg viewBox="52 6 216 182" className="block h-auto w-full" role="presentation">
        <defs>
          {/* The dealer stands behind the table, so the bottom of the figure is
              not cropped: it falls away into the felt, the way a body does
              under a table light that only reaches so far down. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="88%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`${gradientId}-mask`}>
            <rect x="52" y="6" width="216" height="182" fill={`url(#${gradientId})`} />
          </mask>
        </defs>

        <g mask={`url(#${gradientId}-mask)`}>
          {/* The shadow the figure throws back onto the felt. */}
          <ellipse cx="160" cy="180" rx="70" ry="12" fill="rgba(0,0,0,0.34)" />

          <Sway x={joints.leanX} y={joints.leanY}>
            <Body head={joints.head} />
            {/* Both arms are in front of the body, because both of them work
                over the table rather than beside it. Drawn the other way round
                a forearm folding inward vanishes behind the waistcoat and takes
                its hand with it. The shoulders hide the join: the sleeves and
                the shirt are the same cloth. */}
            <Arm
              shoulder={joints.offShoulder}
              elbow={joints.offElbow}
              wrist={joints.offWrist}
              at={SHOULDER.off}
              side={-1}
            />
            <Arm
              shoulder={joints.workShoulder}
              elbow={joints.workElbow}
              wrist={joints.workWrist}
              at={SHOULDER.work}
              side={1}
            />
          </Sway>
        </g>
      </svg>
    </div>
  );
}
