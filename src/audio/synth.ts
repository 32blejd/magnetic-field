/* Sound effects synthesized live with the Web Audio API – no audio files. Every sound is a short recipe of oscillators,
   filtered noise and volume envelopes. Side effects (AudioContext) only – created on the first user gesture. */
import type { Cue, SoundId } from './cues';

/** Output level before the player's volume, and the most voices playing at once (extra cues are dropped). */
const OUTPUT_GAIN = 0.7;
const MAX_VOICES = 48;

interface Tone {
  wave?: OscillatorType;
  /** Start and (optional) end frequency in Hz – a slide over the whole sound. */
  f: number;
  to?: number;
  dur: number;
  gain: number;
  attack?: number;
}
interface Noise {
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  f: number;
  to?: number;
  q?: number;
  attack?: number;
}

/** What a recipe can do: schedule tones and noise at a time, with the cue's pitch and gain already applied. */
interface Voice {
  tone(t: number, o: Tone): void;
  noise(t: number, o: Noise): void;
}
type Recipe = (v: Voice, t: number) => void;

/** A few notes one after another, `step` seconds apart. */
const seq = (v: Voice, t: number, freqs: number[], step: number, o: Omit<Tone, 'f'>): void =>
  freqs.forEach((f, i) => v.tone(t + i * step, { ...o, f }));

const pulse: Recipe = (v, t) => {
  v.tone(t, { wave: 'sine', f: 180, to: 40, dur: 0.5, gain: 0.35 });
  v.noise(t, { filter: 'lowpass', f: 2500, to: 150, dur: 0.45, gain: 0.15 });
  v.tone(t, { wave: 'triangle', f: 90, to: 45, dur: 0.3, gain: 0.15 });
};
const bell = (v: Voice, t: number, f: number, gain: number, dur = 0.5): void => { // struck-metal partials
  v.tone(t, { wave: 'sine', f, dur, gain });
  v.tone(t, { wave: 'sine', f: f * 2.76, dur: dur * 0.5, gain: gain * 0.35 });
  v.tone(t, { wave: 'sine', f: f * 5.4, dur: dur * 0.25, gain: gain * 0.15 });
};

export const RECIPES: Record<SoundId, Recipe> = {
  // ---- coins: each tier has its own pickup and spawn sound ----
  pickupBasic: (v, t) => v.tone(t, { wave: 'triangle', f: 880, to: 1320, dur: 0.07, gain: 0.16 }),
  pickupGold: (v, t) => {
    v.tone(t, { wave: 'triangle', f: 1047, dur: 0.18, gain: 0.15 });
    v.tone(t + 0.04, { wave: 'triangle', f: 1319, dur: 0.22, gain: 0.12 });
  },
  pickupPrism: (v, t) => {
    seq(v, t, [1047, 1319, 1568, 2093], 0.035, { wave: 'triangle', dur: 0.12, gain: 0.11 });
    v.tone(t + 0.1, { wave: 'sine', f: 4186, dur: 0.25, gain: 0.03 });
  },
  pickupVoid: (v, t) => {
    v.tone(t, { wave: 'sine', f: 220, to: 55, dur: 0.45, gain: 0.32 });
    v.noise(t, { filter: 'lowpass', f: 1200, to: 150, dur: 0.4, gain: 0.12 });
    v.tone(t + 0.05, { wave: 'triangle', f: 660, to: 1760, dur: 0.25, gain: 0.05 });
  },
  bounty: (v, t) => { // Polarity: an anti-coin pushed off the board pays out
    v.tone(t, { wave: 'square', f: 330, to: 660, dur: 0.12, gain: 0.06 });
    v.tone(t + 0.08, { wave: 'triangle', f: 1568, dur: 0.2, gain: 0.1 });
  },
  spawnBasic: (v, t) => v.tone(t, { wave: 'sine', f: 520, to: 700, dur: 0.05, gain: 0.035 }),
  spawnGold: (v, t) => v.tone(t, { wave: 'sine', f: 780, to: 1040, dur: 0.07, gain: 0.05 }),
  spawnPrism: (v, t) => {
    v.tone(t, { wave: 'sine', f: 1400, to: 2100, dur: 0.12, gain: 0.045 });
    v.tone(t + 0.03, { wave: 'sine', f: 2100, to: 2800, dur: 0.1, gain: 0.03 });
  },
  spawnVoid: (v, t) => {
    v.tone(t, { wave: 'sine', f: 90, to: 60, dur: 0.35, gain: 0.1 });
    v.noise(t, { filter: 'bandpass', f: 400, to: 120, q: 3, dur: 0.3, gain: 0.04 });
  },
  warning: (v, t) => {
    v.tone(t, { wave: 'square', f: 880, dur: 0.06, gain: 0.045 });
    v.tone(t + 0.09, { wave: 'square', f: 660, dur: 0.06, gain: 0.045 });
  },
  antiHit: (v, t) => { // short circuit
    v.tone(t, { wave: 'sawtooth', f: 220, to: 55, dur: 0.35, gain: 0.12 });
    v.noise(t, { filter: 'bandpass', f: 3000, to: 500, q: 2, dur: 0.25, gain: 0.12 });
    v.tone(t, { wave: 'square', f: 60, dur: 0.2, gain: 0.05 });
  },
  miss: (v, t) => v.tone(t, { wave: 'triangle', f: 180, to: 90, dur: 0.06, gain: 0.025 }),

  // ---- panel and actions ----
  buy: (v, t) => {
    v.noise(t, { filter: 'highpass', f: 4000, dur: 0.02, gain: 0.05 });
    v.tone(t, { wave: 'square', f: 523, to: 784, dur: 0.09, gain: 0.05 });
    v.tone(t + 0.05, { wave: 'triangle', f: 784, dur: 0.1, gain: 0.08 });
  },
  buyFail: (v, t) => v.tone(t, { wave: 'square', f: 150, to: 120, dur: 0.08, gain: 0.05 }),
  buyMax: (v, t) => seq(v, t, [784, 988, 1175, 1568], 0.05, { wave: 'triangle', dur: 0.15, gain: 0.1 }),
  autoBuy: (v, t) => v.tone(t, { wave: 'triangle', f: 659, to: 880, dur: 0.05, gain: 0.035 }),
  unlock: (v, t) => seq(v, t, [523, 659, 784, 1047], 0.07, { wave: 'triangle', dur: 0.2, gain: 0.11 }),
  pulse,
  autoPulse: (v, t) => { // the same whoomp, quieter – it fires on its own
    pulse({ tone: (tt, o) => v.tone(tt, { ...o, gain: o.gain * 0.5 }), noise: (tt, o) => v.noise(tt, { ...o, gain: o.gain * 0.5 }) }, t);
  },
  burst: (v, t) => {
    v.noise(t, { filter: 'bandpass', f: 300, to: 3000, q: 1.5, dur: 0.6, gain: 0.09, attack: 0.4 });
    for (const f of [392, 523, 659, 784]) v.tone(t + 0.45, { wave: 'triangle', f, dur: 0.5, gain: 0.06 });
  },
  fountain: (v, t) => seq(v, t, [784, 880, 1047, 1175, 1319, 1568, 1760, 2093], 0.04, { wave: 'sine', dur: 0.15, gain: 0.07 }),
  meteor: (v, t) => {
    v.tone(t, { wave: 'sine', f: 2400, to: 300, dur: 0.7, gain: 0.08 });
    v.noise(t, { filter: 'highpass', f: 6000, to: 1500, dur: 0.6, gain: 0.05 });
  },
  goal: (v, t) => {
    v.tone(t, { wave: 'triangle', f: 784, dur: 0.25, gain: 0.13 });
    v.tone(t + 0.1, { wave: 'triangle', f: 1175, dur: 0.4, gain: 0.13 });
    v.tone(t + 0.1, { wave: 'sine', f: 2349, dur: 0.4, gain: 0.03 });
  },
  crystal: (v, t) => {
    v.tone(t, { wave: 'sine', f: 2093, dur: 0.15, gain: 0.06 });
    v.tone(t + 0.03, { wave: 'sine', f: 3136, dur: 0.2, gain: 0.035 });
  },
  chain: (v, t) => {
    v.tone(t, { wave: 'square', f: 1200, to: 300, dur: 0.12, gain: 0.05 });
    v.noise(t, { filter: 'highpass', f: 3000, dur: 0.08, gain: 0.05 });
  },
  shield: (v, t) => { // a metallic clang: two detuned high squares
    v.tone(t, { wave: 'square', f: 1760, dur: 0.2, gain: 0.04 });
    v.tone(t, { wave: 'square', f: 1795, dur: 0.2, gain: 0.04 });
    v.tone(t, { wave: 'triangle', f: 880, dur: 0.3, gain: 0.06 });
  },
  interest: (v, t) => {
    v.tone(t, { wave: 'sine', f: 1568, dur: 0.08, gain: 0.045 });
    v.tone(t + 0.06, { wave: 'sine', f: 2093, dur: 0.1, gain: 0.035 });
  },

  // ---- Core tree, shifts, Magnetron ----
  nodeBuy: (v, t) => bell(v, t, 1047, 0.14),
  nodeRefund: (v, t) => v.tone(t, { wave: 'sine', f: 1047, to: 523, dur: 0.2, gain: 0.1 }),
  treeReset: (v, t) => seq(v, t, [1047, 880, 698, 523], 0.05, { wave: 'sine', dur: 0.15, gain: 0.08 }),
  shiftStart: (v, t) => { // matches the 1.1 s polarity-flip animation, then a chord as the new run starts
    v.tone(t, { wave: 'triangle', f: 110, to: 880, dur: 1.0, gain: 0.12, attack: 0.2 });
    v.noise(t, { filter: 'bandpass', f: 200, to: 4000, q: 1, dur: 1.0, gain: 0.06, attack: 0.6 });
    for (const f of [523, 659, 784, 1047]) v.tone(t + 1.0, { wave: 'triangle', f, dur: 0.7, gain: 0.07 });
  },
  autoShift: (v, t) => {
    v.tone(t, { wave: 'triangle', f: 220, to: 880, dur: 0.4, gain: 0.1, attack: 0.1 });
    for (const f of [659, 988]) v.tone(t + 0.4, { wave: 'triangle', f, dur: 0.35, gain: 0.07 });
  },
  pull: (v, t) => {
    v.tone(t, { wave: 'square', f: 200, to: 600, dur: 0.35, gain: 0.04 });
    v.tone(t, { wave: 'triangle', f: 400, to: 1200, dur: 0.35, gain: 0.06 });
  },
  revealCommon: (v, t) => v.tone(t, { wave: 'triangle', f: 660, dur: 0.1, gain: 0.07 }),
  revealRare: (v, t) => seq(v, t, [880, 1175], 0.06, { wave: 'triangle', dur: 0.15, gain: 0.08 }),
  revealEpic: (v, t) => {
    seq(v, t, [988, 1245, 1480], 0.06, { wave: 'triangle', dur: 0.2, gain: 0.09 });
    v.tone(t + 0.15, { wave: 'sine', f: 2960, dur: 0.3, gain: 0.03 });
  },
  revealLegendary: (v, t) => {
    seq(v, t, [784, 988, 1175, 1568, 1976], 0.07, { wave: 'triangle', dur: 0.35, gain: 0.1 });
    v.tone(t + 0.3, { wave: 'sine', f: 3136, dur: 0.6, gain: 0.04 });
    v.tone(t, { wave: 'triangle', f: 196, dur: 0.6, gain: 0.08 });
  },

  // ---- menus and the ending ----
  uiClick: (v, t) => v.tone(t, { wave: 'square', f: 1200, dur: 0.025, gain: 0.035 }),
  ending: (v, t) => {
    seq(v, t, [523, 659, 784, 1047, 1319, 1568], 0.12, { wave: 'triangle', dur: 0.6, gain: 0.08 });
    for (const f of [261, 329, 392, 523]) v.tone(t + 0.8, { wave: 'sine', f, dur: 2.5, gain: 0.05, attack: 0.3 });
    bell(v, t + 0.8, 2093, 0.05, 1.5);
  },
};

/** Plays cues on a shared AudioContext. Silent until unlock() runs from a user gesture (browser autoplay rules). */
export class Synth {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private volume = 1;
  private voices = 0;

  /** Creates or resumes the AudioContext – call from a click or key press. */
  unlock(): void {
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return; }
      const comp = this.ctx.createDynamicsCompressor(); // keeps many overlapping sounds from clipping
      comp.threshold.value = -18; comp.ratio.value = 4;
      this.out = this.ctx.createGain();
      this.out.connect(comp).connect(this.ctx.destination);
      this.setVolume(this.volume);
      const n = this.ctx.sampleRate; // 1 s of white noise, shared by every noise layer
      this.noiseBuf = this.ctx.createBuffer(1, n, n);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /** Effective volume 0–1 (master × effects). */
  setVolume(v: number): void {
    this.volume = v;
    if (this.out) this.out.gain.value = v * OUTPUT_GAIN;
  }

  play(cue: Cue): void {
    const ctx = this.ctx, out = this.out;
    if (!ctx || !out || ctx.state !== 'running' || this.volume <= 0 || this.voices >= MAX_VOICES) return;
    const p = cue.pitch ?? 1, g = cue.gain ?? 1;
    const envelope = (t: number, dur: number, gain: number, attack: number): GainNode => {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(gain * g, t + attack);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      env.connect(out);
      return env;
    };
    const track = (node: AudioScheduledSourceNode, t: number, dur: number): void => {
      this.voices++;
      node.onended = () => { this.voices--; };
      node.start(t);
      node.stop(t + dur + 0.02);
    };
    const voice: Voice = {
      tone: (t, o) => {
        const osc = ctx.createOscillator();
        osc.type = o.wave ?? 'sine';
        osc.frequency.setValueAtTime(o.f * p, t);
        if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to * p, t + o.dur);
        osc.connect(envelope(t, o.dur, o.gain, o.attack ?? 0.004));
        track(osc, t, o.dur);
      },
      noise: (t, o) => {
        if (!this.noiseBuf) return;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf; src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = o.filter; filter.Q.value = o.q ?? 1;
        filter.frequency.setValueAtTime(o.f * p, t);
        if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to * p, t + o.dur);
        src.connect(filter).connect(envelope(t, o.dur, o.gain, o.attack ?? 0.004));
        track(src, t, o.dur);
      },
    };
    RECIPES[cue.id](voice, ctx.currentTime + 0.005 + (cue.delay ?? 0));
  }
}
