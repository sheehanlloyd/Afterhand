"use client";

/**
 * Small synthesised sound set.
 *
 * Sounds are generated with the Web Audio API rather than shipped as files, so
 * there is no audio payload and nothing to load before play begins.
 *
 * Everything here is built from two ingredients: a filtered noise burst, which
 * is what card stock and clay actually sound like, and a short tone, which
 * carries the pitch that tells you whether something good happened. Each sound
 * is timed to land with the animation it belongs to rather than with the click
 * that started it.
 */

import { haptic, type HapticName } from "@/lib/motion/haptics";

export type SoundName =
  | "deal"
  | "slide"
  | "land"
  | "flip"
  | "chip"
  | "chipStack"
  | "sweep"
  | "riffle"
  | "cut"
  | "square"
  | "win"
  | "bigWin"
  | "lose"
  | "click";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.9;
      master.connect(context.destination);
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function out(): AudioNode | null {
  const ctx = ensureContext();
  if (!ctx) return null;
  return master ?? ctx.destination;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (value) ensureContext();
}

export function isSoundEnabled(): boolean {
  return enabled;
}

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
  delay?: number;
}

function tone({ frequency, duration, type = "sine", gain = 0.05, sweepTo, delay = 0 }: ToneOptions) {
  const ctx = ensureContext();
  const destination = out();
  if (!ctx || !destination) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (sweepTo) oscillator.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(amp).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

interface NoiseOptions {
  duration: number;
  gain?: number;
  delay?: number;
  /** Centre of the band. Card stock lives high, clay lives lower. */
  frequency?: number;
  q?: number;
  /** Shapes the tail: 1 is a flat decay, higher numbers snap shut. */
  decay?: number;
  /** Sweeps the filter across the burst, which is what a slide sounds like. */
  sweepTo?: number;
}

function noise({
  duration,
  gain = 0.05,
  delay = 0,
  frequency = 2200,
  q = 0.8,
  decay = 2.2,
  sweepTo,
}: NoiseOptions) {
  const ctx = ensureContext();
  const destination = out();
  if (!ctx || !destination) return;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** decay;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  const start = ctx.currentTime + delay;
  filter.frequency.setValueAtTime(frequency, start);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  filter.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(destination);
  source.start(start);
}

/** A run of clicks, used for the shuffle sounds. */
function burst(count: number, spacing: number, options: NoiseOptions) {
  for (let i = 0; i < count; i++) {
    noise({
      ...options,
      delay: (options.delay ?? 0) + i * spacing * (0.82 + Math.random() * 0.36),
      gain: (options.gain ?? 0.04) * (0.7 + Math.random() * 0.6),
    });
  }
}

const HAPTIC_FOR: Partial<Record<SoundName, HapticName>> = {
  deal: "deal",
  land: "land",
  flip: "tap",
  chip: "chip",
  chipStack: "chip",
  click: "tap",
  win: "win",
  bigWin: "win",
  lose: "lose",
};

export function playSound(name: SoundName): void {
  const feedback = HAPTIC_FOR[name];
  if (feedback) haptic(feedback);
  if (!enabled) return;

  switch (name) {
    /* A card leaving the dealer's hand: a short high scrape. */
    case "deal":
      noise({ duration: 0.085, gain: 0.05, frequency: 2600, sweepTo: 1500, decay: 2.6 });
      break;

    /* The same card crossing the felt, quieter and longer. */
    case "slide":
      noise({ duration: 0.16, gain: 0.026, frequency: 1700, sweepTo: 900, q: 0.6, decay: 1.4 });
      break;

    /* Contact with the felt. Almost no pitch, just a low tap. */
    case "land":
      noise({ duration: 0.05, gain: 0.032, frequency: 420, q: 0.5, decay: 3.4 });
      tone({ frequency: 180, duration: 0.045, gain: 0.012, type: "sine" });
      break;

    case "flip":
      noise({ duration: 0.07, gain: 0.042, frequency: 2100, decay: 2.4 });
      tone({ frequency: 520, duration: 0.05, gain: 0.015, type: "triangle" });
      break;

    case "chip":
      tone({ frequency: 1400, duration: 0.05, gain: 0.025, type: "square", sweepTo: 900 });
      noise({ duration: 0.05, gain: 0.03, frequency: 1200, decay: 3 });
      break;

    /* Clay landing on clay: two impacts a hair apart. */
    case "chipStack":
      noise({ duration: 0.045, gain: 0.034, frequency: 900, q: 1.4, decay: 3.2 });
      noise({ duration: 0.04, gain: 0.02, frequency: 1500, decay: 3.4, delay: 0.035 });
      tone({ frequency: 780, duration: 0.05, gain: 0.014, type: "triangle", sweepTo: 560 });
      break;

    /* Cards gathered in and pushed to the tray. */
    case "sweep":
      noise({ duration: 0.34, gain: 0.03, frequency: 1500, sweepTo: 620, q: 0.5, decay: 1.1 });
      break;

    /* Two halves interlacing. Twenty odd clicks over a fifth of a second. */
    case "riffle":
      burst(22, 0.011, { duration: 0.02, gain: 0.02, frequency: 2900, q: 1.6, decay: 4 });
      noise({ duration: 0.12, gain: 0.016, frequency: 1300, decay: 1.6, delay: 0.24 });
      break;

    case "cut":
      noise({ duration: 0.09, gain: 0.038, frequency: 1900, sweepTo: 1000, decay: 2.6 });
      noise({ duration: 0.06, gain: 0.03, frequency: 700, decay: 3.2, delay: 0.14 });
      break;

    /* Squaring the deck: the edges tapped against the table. */
    case "square":
      burst(3, 0.055, { duration: 0.035, gain: 0.028, frequency: 1100, q: 1.2, decay: 3.4 });
      break;

    case "click":
      tone({ frequency: 900, duration: 0.035, gain: 0.018, type: "triangle" });
      break;

    case "win":
      tone({ frequency: 523.25, duration: 0.18, gain: 0.03, type: "sine" });
      tone({ frequency: 783.99, duration: 0.22, gain: 0.026, type: "sine", delay: 0.09 });
      break;

    /* Held back for hands that are actually worth it. */
    case "bigWin":
      tone({ frequency: 523.25, duration: 0.22, gain: 0.032, type: "sine" });
      tone({ frequency: 659.25, duration: 0.24, gain: 0.028, type: "sine", delay: 0.1 });
      tone({ frequency: 783.99, duration: 0.3, gain: 0.028, type: "sine", delay: 0.2 });
      tone({ frequency: 1046.5, duration: 0.5, gain: 0.024, type: "sine", delay: 0.32 });
      break;

    case "lose":
      tone({ frequency: 320, duration: 0.2, gain: 0.026, type: "sine", sweepTo: 220 });
      break;
  }
}

/** Plays a sound after a delay, so audio lands with the animation, not the click. */
export function playSoundIn(name: SoundName, delayMs: number): void {
  if (delayMs <= 0) {
    playSound(name);
    return;
  }
  setTimeout(() => playSound(name), delayMs);
}
