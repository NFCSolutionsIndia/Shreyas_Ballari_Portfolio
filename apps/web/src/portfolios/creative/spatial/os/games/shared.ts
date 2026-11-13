/** Small helpers shared by the games: best scores (per browser) and a plucked-string sound. */

const KEY = 'shreyas-games-best';

export function getBest(id: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
    return all[id] ?? 0;
  } catch {
    return 0;
  }
}

/** Saves the score if it is a new best; returns true when it was. */
export function saveBest(id: string, score: number): boolean {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
    if (score <= (all[id] ?? 0)) return false;
    all[id] = score;
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

let ac: AudioContext | null = null;
const cache = new Map<number, AudioBuffer>();

/** A plucked string (Karplus–Strong), synthesised in the browser. Call from a tap or key press. */
export function pluck(freq: number, volume = 0.35) {
  if (typeof window === 'undefined') return;
  ac ??= new AudioContext();
  if (ac.state === 'suspended') void ac.resume();
  let buf = cache.get(freq);
  if (!buf) {
    const sr = ac.sampleRate;
    const n = Math.floor(sr * 1.4);
    buf = ac.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let p = 0;
    for (let i = 0; i < n; i++) {
      const a = ring[p]!;
      const b = ring[(p + 1) % N]!;
      ring[p] = (a + b) * 0.5 * 0.996;
      d[i] = a;
      p = (p + 1) % N;
    }
    cache.set(freq, buf);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const g = ac.createGain();
  g.gain.value = volume;
  src.connect(lp).connect(g).connect(ac.destination);
  src.start();
}

/** A soft two-note chime for wins (and a low blip for misses). */
export function chime(good = true) {
  if (good) {
    pluck(659.25, 0.25);
    window.setTimeout(() => pluck(987.77, 0.22), 90);
  } else pluck(110, 0.25);
}

/** Deterministic random numbers for a given seed. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
