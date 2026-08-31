"use client";

/**
 * Small synthesised sound set.
 *
 * Sounds are generated with the Web Audio API rather than shipped as files, so
 * there is no audio payload and nothing to load before play begins.
 */

export type SoundName = "deal" | "flip" | "chip" | "win" | "lose" | "click";

let context: AudioContext | null = null;
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
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") void context.resume();
  return context;
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
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (sweepTo) oscillator.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(amp).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(duration: number, gain = 0.05, delay = 0) {
  const ctx = ensureContext();
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2.2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2200;
  filter.Q.value = 0.8;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start(ctx.currentTime + delay);
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  switch (name) {
    case "deal":
      noise(0.09, 0.05);
      break;
    case "flip":
      noise(0.07, 0.04);
      tone({ frequency: 520, duration: 0.05, gain: 0.015, type: "triangle" });
      break;
    case "chip":
      tone({ frequency: 1400, duration: 0.05, gain: 0.025, type: "square", sweepTo: 900 });
      noise(0.05, 0.03);
      break;
    case "click":
      tone({ frequency: 900, duration: 0.035, gain: 0.018, type: "triangle" });
      break;
    case "win":
      tone({ frequency: 523.25, duration: 0.18, gain: 0.03, type: "sine" });
      tone({ frequency: 783.99, duration: 0.22, gain: 0.026, type: "sine", delay: 0.09 });
      break;
    case "lose":
      tone({ frequency: 320, duration: 0.2, gain: 0.026, type: "sine", sweepTo: 220 });
      break;
  }
}
