/**
 * Generated acoustic guitar for the Creative tab.
 *
 * Sound: a Karplus–Strong plucked string. A short burst of filtered noise (shaped by a pick-position
 * comb) is fed into a delay line one period long; every pass round the loop goes through a two-tap
 * averaging lowpass and a loss factor, so the bright noise settles into a decaying, string-like tone.
 * The loop is computed in JS into AudioBuffers (Web Audio DelayNode feedback loops cannot be shorter
 * than one 128-sample render quantum, which would cap pitch around 344 Hz). Buffers are cached per
 * pitch / dynamic / variant and played through a body-resonance EQ, a generated convolution reverb
 * and a gentle compressor.
 *
 * Music: two original pieces composed for this site, stored as chord voicings + picking / strumming
 * patterns and expanded into note events.
 *
 * The AudioContext is only created inside play(), which must be called from a user gesture.
 */

export type TrackId = 'morning-strings' | 'golden-hour';

export interface TrackInfo {
  id: TrackId;
  title: string;
  style: string;
  bpm: number;
  /** Loop length in seconds. */
  duration: number;
}

export interface GuitarProgress {
  position: number;
  duration: number;
  fraction: number;
}

export interface GuitarState {
  playing: boolean;
  paused: boolean;
  current: TrackId | null;
}

export interface GuitarEngine {
  readonly tracks: readonly TrackInfo[];
  /** Start (or restart) a track. Call from a click/tap handler. Defaults to the current or first track. */
  play(trackId?: TrackId): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  /** Play if idle, pause if playing, resume if paused. */
  toggle(): Promise<void>;
  next(): Promise<void>;
  stop(): void;
  readonly playing: boolean;
  readonly paused: boolean;
  readonly current: TrackId | null;
  /** Available after the first play(); null before the AudioContext exists. */
  readonly analyser: AnalyserNode | null;
  getProgress(): GuitarProgress;
  onProgress(cb: (p: GuitarProgress) => void): () => void;
  onChange(cb: (s: GuitarState) => void): () => void;
  dispose(): void;
}

/* ------------------------------------------------------------------ */
/* Composition data                                                    */
/* ------------------------------------------------------------------ */

interface NoteEvent {
  /** Seconds from the start of the loop. */
  t: number;
  midi: number;
  vel: number;
  /** 0 = low E string … 5 = high E; used for panning and string damping. */
  string: number;
}

interface Timbre {
  id: string;
  /** One-pole lowpass coefficient for the pluck noise (0..1, higher = brighter). */
  brightness: number;
  /** Decay time (to -60 dB) for the lowest and highest notes, in seconds. */
  decayLow: number;
  decayHigh: number;
  /** Pick position along the string (0..0.5). */
  pickPos: number;
  lowpass: number;
  reverb: number;
}

interface Piece extends TrackInfo {
  timbre: Timbre;
  events: NoteEvent[];
}

/** Six strings, low E to high E; null = not played. r = root (bass) string, a = alternate bass. */
interface Voicing {
  n: readonly (number | null)[];
  r: number;
  a: number;
}

const NYLON: Timbre = { id: 'nylon', brightness: 0.42, decayLow: 3.2, decayHigh: 1.5, pickPos: 0.22, lowpass: 4200, reverb: 0.32 };
const STEEL: Timbre = { id: 'steel', brightness: 0.78, decayLow: 3.6, decayHigh: 1.9, pickPos: 0.13, lowpass: 7800, reverb: 0.24 };

const CHORDS: Record<string, Voicing> = {
  Dmaj7: { n: [null, 45, 50, 57, 61, 66], r: 2, a: 1 },
  Bm7: { n: [null, 47, 54, 57, 62, 66], r: 1, a: 2 },
  Gmaj7: { n: [43, 47, 50, 55, 59, 66], r: 0, a: 2 },
  Asus4: { n: [null, 45, 52, 57, 62, 64], r: 1, a: 2 },
  A: { n: [null, 45, 52, 57, 61, 64], r: 1, a: 2 },
  'F#m7': { n: [42, 49, 52, 57, 61, 64], r: 0, a: 2 },
  Em7: { n: [40, 47, 52, 55, 62, 64], r: 0, a: 2 },
  G: { n: [43, 47, 50, 55, 62, 67], r: 0, a: 2 },
  'D/F#': { n: [42, null, 50, 57, 62, 66], r: 0, a: 2 },
  Em7b: { n: [40, 47, 52, 55, 62, 67], r: 0, a: 2 },
  Cadd9: { n: [null, 48, 52, 55, 62, 67], r: 1, a: 2 },
  D: { n: [null, null, 50, 57, 62, 66], r: 2, a: 3 },
  Dsus4: { n: [null, null, 50, 57, 62, 67], r: 2, a: 3 },
  Am7: { n: [null, 45, 52, 55, 60, 64], r: 1, a: 2 },
};

function chord(name: string): Voicing {
  const v = CHORDS[name];
  if (!v) throw new Error(`Unknown chord ${name}`);
  return v;
}

/** Small seeded PRNG so the humanised timing is the same on every loop. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "Morning Strings": calm fingerpicking in D major, 80 bpm, 16 bars (48 s). Original. */
function buildMorningStrings(): Piece {
  const bpm = 80;
  const eighth = 60 / bpm / 2;
  const barLen = eighth * 8;
  const rand = mulberry32(2021);
  // Each bar: one chord, or two chords split over the half bar.
  const bars: string[][] = [
    ['Dmaj7'], ['Bm7'], ['Gmaj7'], ['Asus4', 'A'], ['Dmaj7'], ['F#m7'], ['Gmaj7'], ['Em7', 'A'],
    ['Bm7'], ['F#m7'], ['Gmaj7'], ['Dmaj7'], ['Em7'], ['Gmaj7'], ['Asus4'], ['A'],
  ];
  // Melody over the second half (bar index 8..15): [eighth slot, midi].
  const melody: Record<number, [number, number][]> = {
    8: [[0, 74], [3, 73], [4, 71]],
    9: [[0, 73], [2, 69], [4, 73], [6, 76]],
    10: [[0, 78], [3, 76], [4, 74]],
    11: [[0, 73], [2, 74], [4, 69]],
    12: [[0, 71], [2, 74], [4, 79], [6, 78]],
    13: [[0, 76], [4, 74], [6, 71]],
    14: [[0, 74], [4, 76]],
    15: [[0, 73], [4, 69]],
  };
  const events: NoteEvent[] = [];
  bars.forEach((names, b) => {
    const tune = melody[b];
    for (let slot = 0; slot < 8; slot++) {
      const name = names.length > 1 && slot >= 4 ? names[1] : names[0];
      const v = chord(name ?? 'Dmaj7');
      // p-i-m-a pattern with alternating bass: R 3 4 5 A 4 3 4
      const pattern = [v.r, 3, 4, 5, v.a, 4, 3, 4];
      const s = pattern[slot] ?? 3;
      const midi = v.n[s];
      const jitter = (rand() - 0.5) * 0.014;
      const t = b * barLen + slot * eighth + jitter + (slot % 2 === 1 ? eighth * 0.04 : 0);
      if (midi != null) {
        const isBass = slot === 0 || slot === 4;
        const base = isBass ? 0.78 : slot === 3 ? 0.58 : 0.46;
        events.push({ t: Math.max(0, t), midi, vel: (tune ? base * 0.8 : base) + (rand() - 0.5) * 0.1, string: s });
      }
      const m = tune?.find(([sl]) => sl === slot);
      if (m) events.push({ t: Math.max(0, t + 0.004), midi: m[1], vel: 0.86 + (rand() - 0.5) * 0.08, string: 5 });
    }
  });
  events.sort((x, y) => x.t - y.t);
  return {
    id: 'morning-strings',
    title: 'Morning Strings',
    style: 'Fingerpicked, nylon · 80 bpm',
    bpm,
    duration: bars.length * barLen,
    timbre: NYLON,
    events,
  };
}

/** "Golden Hour": bright strumming in G major, 100 bpm, 20 bars (48 s). Original. */
function buildGoldenHour(): Piece {
  const bpm = 100;
  const eighth = 60 / bpm / 2;
  const barLen = eighth * 8;
  const rand = mulberry32(1100);
  const bars = [
    'G', 'D/F#', 'Em7b', 'Cadd9', 'G', 'D', 'Cadd9', 'Cadd9',
    'Em7b', 'Cadd9', 'G', 'D', 'Em7b', 'D/F#', 'Cadd9', 'G',
    'Am7', 'Cadd9', 'Dsus4', 'D',
  ];
  // D . D U . U D U, accents on the backbeat.
  const strum: (null | { dir: 'D' | 'U'; vel: number })[] = [
    { dir: 'D', vel: 0.86 }, null, { dir: 'D', vel: 0.72 }, { dir: 'U', vel: 0.5 },
    null, { dir: 'U', vel: 0.55 }, { dir: 'D', vel: 0.74 }, { dir: 'U', vel: 0.48 },
  ];
  const lead: Record<number, [number, number][]> = {
    10: [[0, 74], [2, 71], [3, 74], [4, 79]],
    11: [[0, 78], [3, 76], [4, 74]],
    12: [[0, 71], [4, 74], [6, 76]],
    13: [[0, 74], [2, 69], [4, 78]],
    14: [[0, 79], [2, 76], [4, 74], [6, 72]],
    15: [[0, 71], [4, 74]],
    16: [[0, 72], [2, 76], [4, 79]],
    17: [[0, 79], [3, 76], [4, 74]],
  };
  const events: NoteEvent[] = [];
  bars.forEach((name, b) => {
    const v = chord(name);
    const tune = lead[b];
    const soften = tune ? 0.7 : 1;
    strum.forEach((hit, slot) => {
      const t0 = b * barLen + slot * eighth + (rand() - 0.5) * 0.01 + (slot % 2 === 1 ? eighth * 0.06 : 0);
      if (hit) {
        const strings =
          hit.dir === 'D'
            ? [0, 1, 2, 3, 4, 5].filter((s) => s >= v.r)
            : [5, 4, 3, 2];
        const gap = hit.dir === 'D' ? 0.013 : 0.009;
        strings.forEach((s, k) => {
          const midi = v.n[s];
          if (midi == null) return;
          const bassBoost = hit.dir === 'D' && slot === 0 && s === v.r ? 1.15 : 1;
          events.push({
            t: Math.max(0, t0 + k * gap),
            midi,
            vel: Math.min(1, hit.vel * soften * bassBoost * (0.78 + rand() * 0.22)),
            string: s,
          });
        });
      }
      const m = tune?.find(([sl]) => sl === slot);
      if (m) events.push({ t: Math.max(0, t0 + 0.02), midi: m[1], vel: 0.9, string: 5 });
    });
  });
  events.sort((x, y) => x.t - y.t);
  return {
    id: 'golden-hour',
    title: 'Golden Hour',
    style: 'Strummed, steel string · 100 bpm',
    bpm,
    duration: bars.length * barLen,
    timbre: STEEL,
    events,
  };
}

const PIECES: Piece[] = [buildMorningStrings(), buildGoldenHour()];

export const TRACKS: readonly TrackInfo[] = PIECES.map(({ id, title, style, bpm, duration }) => ({ id, title, style, bpm, duration }));

/* ------------------------------------------------------------------ */
/* Karplus–Strong synthesis                                            */
/* ------------------------------------------------------------------ */

const VARIANTS = 3;

function velBucket(vel: number) {
  return vel < 0.45 ? 0 : vel < 0.72 ? 1 : 2;
}

/** Renders one plucked note into an AudioBuffer. */
function renderPluck(ctx: BaseAudioContext, midi: number, bucket: number, variant: number, timbre: Timbre): AudioBuffer {
  const sr = ctx.sampleRate;
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const span = Math.min(1, Math.max(0, (midi - 40) / 40));
  const t60 = timbre.decayLow + (timbre.decayHigh - timbre.decayLow) * span;
  const len = Math.floor(sr * Math.min(t60 + 0.2, 4));
  const buffer = ctx.createBuffer(1, len, sr);
  const out = buffer.getChannelData(0);

  // Loop length: averaging filter adds half a sample, so subtract it.
  const S = 0.5;
  const period = sr / freq - S;
  const P = Math.ceil(period) + 1;

  // Excitation: two-pole lowpassed noise (harder pluck = brighter), then a pick-position comb.
  const rand = mulberry32(midi * 131 + bucket * 17 + variant * 7919 + timbre.id.length);
  const exc = new Float32Array(P);
  const bright = Math.min(0.98, timbre.brightness * (0.6 + 0.25 * bucket));
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < P; i++) {
    const noise = rand() * 2 - 1;
    lp1 += bright * (noise - lp1);
    lp2 += bright * (lp1 - lp2);
    exc[i] = lp2;
  }
  const pick = Math.max(1, Math.round(period * timbre.pickPos));
  for (let i = P - 1; i >= pick; i--) exc[i] = (exc[i] ?? 0) - (exc[i - pick] ?? 0);
  let mean = 0;
  for (let i = 0; i < P; i++) mean += exc[i] ?? 0;
  mean /= P;
  let peak = 1e-6;
  for (let i = 0; i < P; i++) {
    const v = (exc[i] ?? 0) - mean;
    exc[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }

  // Loss per trip round the loop so the note reaches -60 dB after t60 seconds.
  const rho = Math.pow(0.001, 1 / (freq * t60));
  for (let n = 0; n < len; n++) {
    if (n < P) {
      out[n] = (exc[n] ?? 0) / peak;
      continue;
    }
    const d = n - period;
    const i0 = Math.floor(d);
    const fr = d - i0;
    const y0 = out[i0] ?? 0;
    const y1 = out[i0 + 1] ?? 0;
    const ym = out[i0 - 1] ?? 0;
    const a = y0 * (1 - fr) + y1 * fr;
    const b = ym * (1 - fr) + y0 * fr;
    out[n] = rho * ((1 - S) * a + S * b);
  }
  // Soft 2 ms attack and a 60 ms tail fade.
  const atk = Math.floor(sr * 0.002);
  for (let i = 0; i < atk && i < len; i++) out[i] = (out[i] ?? 0) * (i / atk);
  const fade = Math.floor(sr * 0.06);
  for (let i = 0; i < fade && i < len; i++) {
    const k = len - 1 - i;
    out[k] = (out[k] ?? 0) * (i / fade);
  }
  return buffer;
}

/** Synthetic room: stereo decaying noise that darkens as it fades. */
function makeImpulse(ctx: BaseAudioContext, seconds = 2.4): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const pre = Math.floor(sr * 0.014);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    const rand = mulberry32(77 + ch * 999);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      const coeff = 0.85 - 0.75 * x; // brighter early reflections, darker tail
      lp += coeff * (rand() * 2 - 1 - lp);
      data[i] = lp * Math.pow(1 - x, 2) * Math.exp(-3.2 * x);
    }
  }
  return buf;
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

interface Bus {
  input: GainNode;
  strings: StereoPannerNode[];
  nodes: AudioNode[];
}

export function createGuitar(): GuitarEngine {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let convolver: ConvolverNode | null = null;
  const cache = new Map<string, AudioBuffer>();

  let piece: Piece | null = null;
  let bus: Bus | null = null;
  let startTime = 0;
  let loopIndex = 0;
  let eventIndex = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let warmTimer: ReturnType<typeof setTimeout> | null = null;
  let playing = false;
  let paused = false;
  let lastEmit = 0;
  let disposed = false;
  const lastOnString: ({ gain: GainNode; src: AudioBufferSourceNode } | null)[] = [null, null, null, null, null, null];
  const active = new Set<AudioBufferSourceNode>();
  const progressCbs = new Set<(p: GuitarProgress) => void>();
  const changeCbs = new Set<(s: GuitarState) => void>();

  const emitChange = () => {
    const s: GuitarState = { playing, paused, current: piece?.id ?? null };
    changeCbs.forEach((cb) => cb(s));
  };

  const ensureContext = (): AudioContext => {
    if (ctx) return ctx;
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = new Ctor({ latencyHint: 'playback' });
    compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.25;
    const master = c.createGain();
    master.gain.value = 0.9;
    analyser = c.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    convolver = c.createConvolver();
    convolver.buffer = makeImpulse(c);
    convolver.connect(compressor);
    compressor.connect(master);
    master.connect(analyser);
    analyser.connect(c.destination);
    ctx = c;
    return c;
  };

  const bufferFor = (c: BaseAudioContext, timbre: Timbre, midi: number, vel: number, variant: number) => {
    const bucket = velBucket(vel);
    const key = `${timbre.id}:${midi}:${bucket}:${variant}`;
    let buf = cache.get(key);
    if (!buf) {
      buf = renderPluck(c, midi, bucket, variant, timbre);
      cache.set(key, buf);
    }
    return buf;
  };

  const makeBus = (c: AudioContext, timbre: Timbre): Bus => {
    const input = c.createGain();
    input.gain.value = 0.32;
    const bodyLow = c.createBiquadFilter();
    bodyLow.type = 'peaking';
    bodyLow.frequency.value = 105;
    bodyLow.Q.value = 1.1;
    bodyLow.gain.value = 3.5;
    const bodyMid = c.createBiquadFilter();
    bodyMid.type = 'peaking';
    bodyMid.frequency.value = 220;
    bodyMid.Q.value = 1.4;
    bodyMid.gain.value = 2;
    const air = c.createBiquadFilter();
    air.type = 'lowpass';
    air.frequency.value = timbre.lowpass;
    air.Q.value = 0.5;
    const dry = c.createGain();
    dry.gain.value = 0.85;
    const send = c.createGain();
    send.gain.value = timbre.reverb;
    input.connect(bodyLow);
    bodyLow.connect(bodyMid);
    bodyMid.connect(air);
    air.connect(dry);
    air.connect(send);
    if (compressor) dry.connect(compressor);
    if (convolver) send.connect(convolver);
    const strings = [0, 1, 2, 3, 4, 5].map((s) => {
      const p = c.createStereoPanner();
      p.pan.value = -0.3 + s * 0.12;
      p.connect(input);
      return p;
    });
    return { input, strings, nodes: [input, bodyLow, bodyMid, air, dry, send, ...strings] };
  };

  const retireBus = (c: AudioContext, b: Bus) => {
    const now = c.currentTime;
    b.input.gain.cancelScheduledValues(now);
    b.input.gain.setValueAtTime(b.input.gain.value, now);
    b.input.gain.linearRampToValueAtTime(0, now + 0.18);
    const sources = [...active];
    active.clear();
    setTimeout(() => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
        s.disconnect();
      });
      b.nodes.forEach((n) => n.disconnect());
    }, 260);
  };

  const scheduleNote = (c: AudioContext, p: Piece, b: Bus, ev: NoteEvent, when: number) => {
    const variant = Math.floor(Math.random() * VARIANTS);
    const buf = bufferFor(c, p.timbre, ev.midi, ev.vel, variant);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.detune.value = (Math.random() - 0.5) * 4;
    const g = c.createGain();
    g.gain.value = 0.35 + ev.vel * 0.75;
    src.connect(g);
    g.connect(b.strings[ev.string] ?? b.input);
    // A new note on the same string damps the previous one, like a real guitar.
    const prev = lastOnString[ev.string];
    if (prev) prev.gain.gain.setTargetAtTime(0, when, 0.03);
    lastOnString[ev.string] = { gain: g, src };
    src.start(when);
    active.add(src);
    src.onended = () => {
      active.delete(src);
      src.disconnect();
      g.disconnect();
    };
  };

  const getProgress = (): GuitarProgress => {
    if (!ctx || !piece) return { position: 0, duration: piece?.duration ?? 0, fraction: 0 };
    const elapsed = Math.max(0, ctx.currentTime - startTime);
    const position = elapsed % piece.duration;
    return { position, duration: piece.duration, fraction: position / piece.duration };
  };

  const tick = () => {
    const c = ctx;
    const p = piece;
    const b = bus;
    if (!c || !p || !b || !playing) return;
    const lookahead = typeof document !== 'undefined' && document.hidden ? 1.6 : 0.35;
    const horizon = c.currentTime + lookahead;
    // Bounded loop so a stalled clock can never spin forever.
    for (let guard = 0; guard < 400; guard++) {
      const ev = p.events[eventIndex];
      if (!ev) {
        eventIndex = 0;
        loopIndex += 1;
        continue;
      }
      const when = startTime + loopIndex * p.duration + ev.t;
      if (when > horizon) break;
      if (when >= c.currentTime - 0.05) scheduleNote(c, p, b, ev, Math.max(when, c.currentTime));
      eventIndex += 1;
    }
    const now = performance.now();
    if (now - lastEmit > 90) {
      lastEmit = now;
      const prog = getProgress();
      progressCbs.forEach((cb) => cb(prog));
    }
  };

  /** Renders the rest of the piece's buffers in small idle chunks so the scheduler never stalls. */
  const warmUp = (c: AudioContext, p: Piece) => {
    if (warmTimer) clearTimeout(warmTimer);
    const keys: [number, number][] = [];
    const seen = new Set<string>();
    p.events.forEach((ev) => {
      const k = `${ev.midi}:${velBucket(ev.vel)}`;
      if (!seen.has(k)) {
        seen.add(k);
        keys.push([ev.midi, ev.vel]);
      }
    });
    const jobs: [number, number, number][] = [];
    for (let v = 0; v < VARIANTS; v++) keys.forEach(([m, vel]) => jobs.push([m, vel, v]));
    const step = () => {
      warmTimer = null;
      if (disposed || piece !== p) return;
      for (let i = 0; i < 3; i++) {
        const job = jobs.shift();
        if (!job) return;
        bufferFor(c, p.timbre, job[0], job[1], job[2]);
      }
      warmTimer = setTimeout(step, 24);
    };
    warmTimer = setTimeout(step, 30);
  };

  const stopInternal = () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (warmTimer) clearTimeout(warmTimer);
    warmTimer = null;
    if (ctx && bus) retireBus(ctx, bus);
    bus = null;
    lastOnString.fill(null);
  };

  const engine: GuitarEngine = {
    tracks: TRACKS,
    async play(trackId) {
      if (disposed) return;
      const id = trackId ?? piece?.id ?? PIECES[0]?.id;
      const p = PIECES.find((x) => x.id === id);
      if (!p) return;
      // Created and resumed synchronously inside the user gesture.
      const c = ensureContext();
      const resumed = c.state === 'running' ? Promise.resolve() : c.resume();
      stopInternal();
      piece = p;
      playing = true;
      paused = false;
      emitChange();
      await resumed.catch(() => undefined);
      if (disposed || piece !== p || !playing) return;
      // Pre-render the first second and a half so the opening is clean.
      p.events.filter((ev) => ev.t < 1.5).forEach((ev) => bufferFor(c, p.timbre, ev.midi, ev.vel, 0));
      bus = makeBus(c, p.timbre);
      startTime = c.currentTime + 0.12;
      loopIndex = 0;
      eventIndex = 0;
      tick();
      timer = setInterval(tick, 25);
      warmUp(c, p);
    },
    pause() {
      if (!ctx || !playing || paused) return;
      paused = true;
      void ctx.suspend();
      emitChange();
    },
    async resume() {
      if (!ctx || !playing || !paused) return;
      paused = false;
      emitChange();
      await ctx.resume().catch(() => undefined);
    },
    async toggle() {
      if (!playing) return engine.play();
      if (paused) return engine.resume();
      engine.pause();
    },
    async next() {
      const idx = PIECES.findIndex((x) => x.id === piece?.id);
      const nextPiece = PIECES[(idx + 1) % PIECES.length];
      if (nextPiece) await engine.play(nextPiece.id);
    },
    stop() {
      stopInternal();
      playing = false;
      paused = false;
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
      emitChange();
      const prog = getProgress();
      progressCbs.forEach((cb) => cb({ ...prog, position: 0, fraction: 0 }));
    },
    get playing() {
      return playing;
    },
    get paused() {
      return paused;
    },
    get current() {
      return piece?.id ?? null;
    },
    get analyser() {
      return analyser;
    },
    getProgress,
    onProgress(cb) {
      progressCbs.add(cb);
      return () => progressCbs.delete(cb);
    },
    onChange(cb) {
      changeCbs.add(cb);
      return () => changeCbs.delete(cb);
    },
    dispose() {
      if (disposed) return;
      stopInternal();
      playing = false;
      paused = false;
      disposed = true;
      progressCbs.clear();
      changeCbs.clear();
      const c = ctx;
      ctx = null;
      analyser = null;
      cache.clear();
      if (c) setTimeout(() => void c.close().catch(() => undefined), 300);
    },
  };
  return engine;
}
