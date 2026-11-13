import { Color, Vector3 } from 'three';

/**
 * Light for the hometown follows the visitor's clock (dawn, day, sunset, night), or a choice
 * from the time button. The Get in touch city is always bright day (blended in by `mood`).
 */

export type TimeName = 'dawn' | 'day' | 'sunset' | 'night';

export interface Palette {
  zenith: Color;
  mid: Color;
  horizon: Color;
  sunGlow: Color;
  sun: Color;
  sunIntensity: number;
  sunDir: Vector3;
  fog: Color;
  fogDensity: number;
  sky: Color;
  ground: Color;
  hemi: number;
  /** 0 by day, 1 at night: lamps and lit windows. */
  night: number;
  exposure: number;
}

const c = (h: string) => new Color(h);
const dir = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize();

export const PALETTES: Record<TimeName, Palette> = {
  dawn: {
    zenith: c('#6c7bb0'), mid: c('#e3a7b7'), horizon: c('#ffd3b4'), sunGlow: c('#ffb98a'),
    sun: c('#ffc7a0'), sunIntensity: 1.9, sunDir: dir(-0.35, 0.1, -1), fog: c('#e6c2bf'), fogDensity: 0.0024,
    sky: c('#ffd9cc'), ground: c('#6f6a8a'), hemi: 0.85, night: 0.25, exposure: 1.0,
  },
  day: {
    zenith: c('#3f7ed0'), mid: c('#8dbbe6'), horizon: c('#d9eaf6'), sunGlow: c('#fff1d0'),
    sun: c('#fff3df'), sunIntensity: 2.6, sunDir: dir(0.3, 0.75, -0.6), fog: c('#cadced'), fogDensity: 0.0017,
    sky: c('#e3f0ff'), ground: c('#8c917c'), hemi: 1.0, night: 0, exposure: 1.02,
  },
  sunset: {
    zenith: c('#6b669e'), mid: c('#dba0a8'), horizon: c('#ffcca8'), sunGlow: c('#ffb86b'),
    sun: c('#ffc28e'), sunIntensity: 2.6, sunDir: dir(-0.42, 0.13, -1), fog: c('#efbfae'), fogDensity: 0.0028,
    sky: c('#ffd9c8'), ground: c('#a8705a'), hemi: 1.05, night: 0.15, exposure: 1.0,
  },
  night: {
    zenith: c('#070b24'), mid: c('#18214a'), horizon: c('#38406e'), sunGlow: c('#9fb4ff'),
    sun: c('#9fb4ff'), sunIntensity: 0.55, sunDir: dir(-0.3, 0.45, -1), fog: c('#1b2142'), fogDensity: 0.0026,
    sky: c('#3a4a85'), ground: c('#0f1022'), hemi: 0.55, night: 1, exposure: 1.1,
  },
};

export function timeFromClock(d = new Date()): TimeName {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5.5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'sunset';
  return 'night';
}

/** Shared uniforms (house windows glow at night). */
export const NIGHT = { value: 0 };

export function mixPalette(out: Palette, a: Palette, b: Palette, t: number) {
  out.zenith.copy(a.zenith).lerp(b.zenith, t);
  out.mid.copy(a.mid).lerp(b.mid, t);
  out.horizon.copy(a.horizon).lerp(b.horizon, t);
  out.sunGlow.copy(a.sunGlow).lerp(b.sunGlow, t);
  out.sun.copy(a.sun).lerp(b.sun, t);
  out.sunIntensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t;
  out.sunDir.copy(a.sunDir).lerp(b.sunDir, t).normalize();
  out.fog.copy(a.fog).lerp(b.fog, t);
  out.fogDensity = a.fogDensity + (b.fogDensity - a.fogDensity) * t;
  out.sky.copy(a.sky).lerp(b.sky, t);
  out.ground.copy(a.ground).lerp(b.ground, t);
  out.hemi = a.hemi + (b.hemi - a.hemi) * t;
  out.night = a.night + (b.night - a.night) * t;
  out.exposure = a.exposure + (b.exposure - a.exposure) * t;
  return out;
}

export function clonePalette(p: Palette): Palette {
  return {
    ...p,
    zenith: p.zenith.clone(),
    mid: p.mid.clone(),
    horizon: p.horizon.clone(),
    sunGlow: p.sunGlow.clone(),
    sun: p.sun.clone(),
    sunDir: p.sunDir.clone(),
    fog: p.fog.clone(),
    sky: p.sky.clone(),
    ground: p.ground.clone(),
  };
}
