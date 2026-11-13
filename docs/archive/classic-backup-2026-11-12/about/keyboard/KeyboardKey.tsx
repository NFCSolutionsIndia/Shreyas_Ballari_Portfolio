import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CanvasTexture, Color, Group, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { flight } from '../flight';
import { activity, pressed } from './controller';
import { BOARD_D, BOARD_W, type KeyDef } from './layout';
import { PALETTE } from './palette';

/**
 * One physical key: its switch housing, the blue light under it, the sculpted keycap and its
 * printed legend. Each key owns its materials and its own animation state:
 * - press: travels ~0.11 down on a critically damped spring (no bounce) and back, the light
 *   under it brightening while it is down;
 * - entrance: the cap falls in from above (out from under the hero), tumbling, lands with a
 *   small squash and a pulse of blue light in its socket;
 * - the light sweep that runs across the board once the last key has landed.
 */

export const CAP_H = 0.56;
const GAP = 0.09;
const TRAVEL = 0.11;
const SWITCH_Y = 0.2;

// --- Shared geometry -------------------------------------------------------------------------

const capCache = new Map<number, RoundedBoxGeometry>();
/** A sculpted keycap: wide at the base, a smaller top set slightly back, rounded all round. */
function capGeometry(w: number) {
  let g = capCache.get(w);
  if (g) return g;
  g = new RoundedBoxGeometry(w - GAP, CAP_H, 1 - GAP, 4, 0.09);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + CAP_H / 2) / CAP_H;
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setX(i, Math.sign(x) * Math.max(0, Math.abs(x) - t * 0.11));
    p.setZ(i, Math.sign(z) * Math.max(0, Math.abs(z) - t * 0.11) - t * 0.04);
  }
  g.computeVertexNormals();
  capCache.set(w, g);
  return g;
}
const housing = new BoxGeometry(0.62, 0.22, 0.62);
const stem = new BoxGeometry(0.15, 0.14, 0.15);
const housingMat = new MeshStandardMaterial({ color: '#15171c', roughness: 0.55, metalness: 0.2 });
const stemMat = new MeshStandardMaterial({ color: PALETTE.blueLight, roughness: 0.4, emissive: PALETTE.blue, emissiveIntensity: 0.3 });

// --- Legend ----------------------------------------------------------------------------------

/** The legend printed on the cap's own colour (opaque, so thin strokes survive at any angle). */
export function KeyLegendTexture(k: KeyDef) {
  const wpx = Math.round(128 * k.w);
  const c = document.createElement('canvas');
  c.width = wpx;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = k.accent ? PALETTE.blue : PALETTE.cap;
  g.fillRect(0, 0, wpx, 128);
  g.fillStyle = PALETTE.legend;
  g.textBaseline = 'middle';
  const font = (px: number) => (g.font = `800 ${px}px 'Manrope Variable', Manrope, 'Segoe UI Symbol', system-ui, sans-serif`);
  if (k.top) {
    font(40);
    g.textAlign = 'left';
    g.fillText(k.top, 28, 40);
    g.fillText(k.label, 28, 90);
  } else if (k.align === 'l') {
    font(k.label.length > 9 ? 28 : 33);
    g.textAlign = 'left';
    g.fillText(k.label, 22, 66);
  } else {
    font(k.label.length > 1 ? 36 : 58);
    g.textAlign = 'center';
    g.fillText(k.label, wpx / 2, 66);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// --- Entrance order --------------------------------------------------------------------------

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
/** When each key starts falling (0..1 of the rain) and how long its fall takes. */
export const FALL_DUR = 0.34;
export function fallDelay(k: KeyDef) {
  // Row by row from the back (closest to the hero), shuffled within a row.
  const raw = k.z * 0.08 + hash(k.x, k.z) * 0.22;
  return (raw / (BOARD_D * 0.08 + 0.22)) * (1 - FALL_DUR);
}

// --- The key ---------------------------------------------------------------------------------

const BLUE = new Color(PALETTE.blue);
const BLUE_LIGHT = new Color(PALETTE.blueLight);

export function KeyboardKey({ def }: { def: KeyDef }) {
  const mats = useMemo(() => {
    const tex = KeyLegendTexture(def);
    const capColor = def.accent ? PALETTE.blue : PALETTE.cap;
    return {
      cap: new MeshStandardMaterial({ color: capColor, roughness: def.accent ? 0.5 : 0.74, metalness: def.accent ? 0.1 : 0.05, emissive: BLUE, emissiveIntensity: 0 }),
      legend: new MeshStandardMaterial({ map: tex, roughness: def.accent ? 0.5 : 0.74, metalness: 0.05, emissive: new Color('#ffffff'), emissiveMap: tex, emissiveIntensity: def.accent ? 0.12 : 0.04, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      light: new MeshStandardMaterial({ color: '#000000', emissive: BLUE, emissiveIntensity: 0.25, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }),
    };
  }, [def]);
  const geo = useMemo(
    () => ({
      cap: capGeometry(def.w),
      legend: new PlaneGeometry(def.w - GAP - 0.24, 1 - GAP - 0.24),
      light: new PlaneGeometry(def.w - 0.3, 0.7),
    }),
    [def],
  );
  const delay = useMemo(() => fallDelay(def), [def]);
  const spin = useMemo(() => [hash(def.x * 3.1, def.z) - 0.5, hash(def.z, def.x * 1.7) - 0.5] as const, [def]);
  const fall = useRef<Group>(null);
  const cap = useRef<Group>(null);
  const st = useRef({ y: 0, v: 0, flash: 0, lastDown: 0 });

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = st.current;
    const t = pressed.get(def.id) ?? 0;
    const down = t > 0;
    if (down && t !== s.lastDown) {
      s.lastDown = t;
      s.flash = 1;
      activity.knob += 0.08;
      activity.v = 1;
    }
    // Press: critically damped spring, quick down, smooth return, no bounce.
    const target = down ? -TRAVEL : 0;
    const k = down ? 1400 : 520;
    const d = 2 * Math.sqrt(k);
    const steps = Math.ceil(dt / 0.004);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      s.v += ((target - s.y) * k - s.v * d) * h;
      s.y += s.v * h;
    }
    if (cap.current) cap.current.position.y = s.y;
    s.flash = Math.max(0, s.flash - dt * 3.2);

    // Entrance: fall, land, squash, pulse.
    const p = Math.min(1, Math.max(0, (flight.keys - delay) / FALL_DUR));
    const f = Math.min(1, p / 0.78);
    const land = p > 0.78 ? Math.sin((Math.PI * (p - 0.78)) / 0.22) : 0;
    const g = fall.current;
    if (g) {
      g.visible = p > 0;
      g.position.set(0, 14 * (1 - f * f), -9 * (1 - f) * (1 - f));
      g.rotation.set((1 - f) * spin[0] * 3.2, (1 - f) * spin[1] * 1.4, (1 - f) * spin[1] * 2.4);
      g.scale.set(1 + land * 0.05, 1 - land * 0.16, 1 + land * 0.05);
    }
    // Light: base glow, the landing pulse, the post-landing sweep, keypress.
    const sweep = Math.exp(-(((clock.elapsedTime - flight.sweepAt) * 22 - (def.x + 1)) ** 2) / 6);
    const glow = 0.12 + activity.v * 0.1 + land * 1.4 + sweep * 1.3 + s.flash * 1.2 + (down ? 0.5 : 0);
    mats.light.emissiveIntensity = glow;
    mats.light.emissive.copy(BLUE).lerp(BLUE_LIGHT, Math.min(1, sweep + s.flash * 0.6));
    mats.cap.emissiveIntensity = sweep * 0.18 + s.flash * 0.1;
    mats.legend.emissiveIntensity = (def.accent ? 0.12 : 0.04) + sweep * 0.35 + s.flash * 0.3;
  });

  return (
    <group position={[-BOARD_W / 2 + def.x + def.w / 2, SWITCH_Y, -BOARD_D / 2 + def.z + 0.5]}>
      {/* Switch housing and stem (seen on the empty board), and the light under the cap */}
      <mesh geometry={housing} material={housingMat} position={[0, 0.09, 0]} />
      <mesh geometry={stem} material={stemMat} position={[0, 0.25, 0]} />
      <mesh geometry={geo.light} material={mats.light} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <group ref={fall}>
        <group ref={cap}>
          <mesh geometry={geo.cap} material={mats.cap} position={[0, CAP_H / 2, 0]} />
          <mesh geometry={geo.legend} material={mats.legend} position={[0, CAP_H + 0.004, -0.04]} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      </group>
    </group>
  );
}
