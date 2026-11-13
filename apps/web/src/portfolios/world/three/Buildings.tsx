import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Euler,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type InstancedMesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GROUND } from './path';
import { NIGHT } from './timeOfDay';
import type { House } from './Town';

/**
 * Parametric stylised buildings, in the soft "animated film" look: bevelled walls with a tiling
 * brick or stucco surface (projected in world space so it never stretches), framed windows with
 * sills and lintels, a cornice and parapet, ground-floor shopfronts with a sign and awning, and
 * black fire escapes on some brick blocks. Every part is instanced, one draw call per part type.
 */

export type Style = 'brick' | 'lake' | 'farm' | 'suburb' | 'touch';

interface StyleDef {
  walls: [string, string];
  surface: 'brick' | 'stucco' | 'siding';
  trim: string;
  glass: string;
  roof: 'flat' | 'gable';
  roofs: [string, string];
  shops: boolean;
  fireEscapes: boolean;
  awnings: string[];
  signs: string[];
}

export const STYLES: Record<Style, StyleDef> = {
  brick: {
    walls: ['#c27257', '#9e5a48'], surface: 'brick', trim: '#efe2cf', glass: '#34425e', roof: 'flat', roofs: ['#6d4a40', '#5a3f3a'],
    shops: true, fireEscapes: true, awnings: ['#2f6b4f', '#a23b3b', '#2f4f7a', '#d6a548', '#e07a5f'], signs: ['#d6a548', '#2f4f7a', '#f2efe6', '#a23b3b'],
  },
  touch: {
    walls: ['#cfe0f3', '#a9c2df'], surface: 'stucco', trim: '#ffffff', glass: '#3c5478', roof: 'gable', roofs: ['#7f98b8', '#e9eef5'],
    shops: true, fireEscapes: false, awnings: ['#f2b6c4', '#ffffff', '#8fb3d9'], signs: ['#f2b6c4', '#ffffff'],
  },
  lake: {
    walls: ['#f4efe6', '#c9d6cf'], surface: 'siding', trim: '#ffffff', glass: '#41546f', roof: 'gable', roofs: ['#4b5560', '#5d5a58'],
    shops: false, fireEscapes: false, awnings: [], signs: [],
  },
  farm: {
    walls: ['#f7f2ea', '#efe2cf'], surface: 'siding', trim: '#ffffff', glass: '#41546f', roof: 'gable', roofs: ['#8c2f2f', '#6d6a68'],
    shops: false, fireEscapes: false, awnings: [], signs: [],
  },
  suburb: {
    walls: ['#d8dcec', '#bcc8e0'], surface: 'siding', trim: '#ffffff', glass: '#41546f', roof: 'gable', roofs: ['#4b546e', '#5f5a70'],
    shops: false, fireEscapes: false, awnings: [], signs: [],
  },
};

// --- Surfaces ----------------------------------------------------------------------------------

function surfaceTexture(kind: StyleDef['surface']) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  if (kind === 'brick') {
    g.fillStyle = '#d9cfc4'; // mortar
    g.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row++) {
      const off = row % 2 ? 16 : 0;
      for (let col = -1; col < 9; col++) {
        const k = 0.86 + (((row * 17 + col * 31) % 13) / 13) * 0.22;
        const v = Math.round(255 * k);
        g.fillStyle = `rgb(${v},${Math.round(v * 0.96)},${Math.round(v * 0.94)})`;
        g.beginPath();
        g.roundRect(col * 32 + off + 1.5, row * 16 + 1.5, 29, 13, 3);
        g.fill();
      }
    }
  } else if (kind === 'stucco') {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(120,120,140,${((i * 37) % 7) / 220})`;
      g.fillRect((i * 97) % 256, (i * 61) % 256, 2, 2);
    }
    g.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 2);
  } else {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      g.fillStyle = 'rgba(0,0,0,0.09)';
      g.fillRect(0, y + 13, 256, 3);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(0, y, 256, 1);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Wall material: the surface tiles in world space (2.6 units per tile), tinted per instance. */
function wallMaterial(kind: StyleDef['surface']) {
  const m = new MeshStandardMaterial({ map: surfaceTexture(kind), roughness: 0.88 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 wpp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWP = wpp.xyz;
        vWN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace(
        '#include <map_fragment>',
        `vec3 an = abs(vWN);
        vec2 wuv = an.y > 0.5 ? vWP.xz : (an.x > an.z ? vWP.zy : vWP.xy);
        diffuseColor *= texture2D(map, wuv / 2.6);`,
      );
  };
  return m;
}

function gableGeometry() {
  const g = new BufferGeometry();
  const v = [
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0,
  ];
  g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
  g.computeVertexNormals();
  return g;
}

// --- Layout --------------------------------------------------------------------------------------

type Part = 'wall' | 'roof' | 'cornice' | 'frame' | 'glass' | 'sill' | 'lintel' | 'shop' | 'sign' | 'awning' | 'escape';

interface Placed {
  m: Matrix4;
  c?: Color;
}

const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
const _up = new Vector3(0, 1, 0);

function layout(list: House[], st: StyleDef) {
  const parts: Record<Part, Placed[]> = { wall: [], roof: [], cornice: [], frame: [], glass: [], sill: [], lintel: [], shop: [], sign: [], awning: [], escape: [] };
  const a = new Color(st.walls[0]);
  const b = new Color(st.walls[1]);
  list.forEach((h, idx) => {
    const base = new Matrix4().compose(_p.set(h.x, GROUND, h.z), _q.setFromAxisAngle(_up, h.ry), _s.set(1, 1, 1));
    // A part in the house's local frame (+z is the street side, y from the ground).
    const put = (part: Part, x: number, y: number, z: number, sx: number, sy: number, sz: number, c?: Color, rx = 0) => {
      const local = new Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, 0, 0)), _s.set(sx, sy, sz));
      parts[part].push({ m: base.clone().multiply(local), c });
    };
    const tint = a.clone().lerp(b, h.tint);
    put('wall', 0, h.h / 2, 0, h.w, h.h, h.d, tint);
    if (st.roof === 'flat') {
      put('cornice', 0, h.h + 0.3, 0, h.w + 0.7, 0.6, h.d + 0.7);
      put('cornice', 0, h.h + 0.85, 0, h.w + 0.2, 0.5, h.d + 0.2);
    } else {
      put('roof', 0, h.h, 0, h.w + 0.9, 2.6 + h.tint * 2.4, h.d + 0.9, new Color(h.tint > 0.5 ? st.roofs[0] : st.roofs[1]));
      put('cornice', 0, h.h + 0.1, 0, h.w + 0.5, 0.3, h.d + 0.5);
    }
    const front = h.d / 2;
    const floorH = 3.8;
    const shop = st.shops;
    const first = shop ? 1 : 0;
    const floors = Math.max(1, Math.floor((h.h - 1.2) / floorH));
    const bays = Math.max(1, Math.floor(h.w / 3.1));
    const bayW = h.w / bays;
    // Windows on the street side (and the gable ends of small houses get a pair each side).
    for (let f = first; f < floors; f++) {
      const y = f * floorH + 2.3;
      if (y + 1.2 > h.h - 0.6) break;
      for (let i = 0; i < bays; i++) {
        const x = -h.w / 2 + bayW * (i + 0.5);
        put('frame', x, y, front + 0.02, 1.62, 2.22, 0.1);
        put('glass', x, y, front + 0.06, 1.3, 1.9, 0.06);
        put('sill', x, y - 1.18, front + 0.16, 1.85, 0.16, 0.34);
        put('lintel', x, y + 1.2, front + 0.1, 1.75, 0.22, 0.2);
      }
    }
    if (shop) {
      const sc = new Color(st.awnings.length ? st.awnings[idx % st.awnings.length]! : '#ffffff');
      const signC = new Color(st.signs.length ? st.signs[(idx * 3) % st.signs.length]! : '#ffffff');
      put('shop', 0, 1.45, front + 0.05, h.w * 0.82, 2.5, 0.08);
      put('frame', 0, 1.45, front + 0.02, h.w * 0.86, 2.8, 0.1);
      put('sign', 0, 3.25, front + 0.14, h.w * 0.6, 0.62, 0.16, signC);
      put('awning', 0, 3.95, front + 0.95, h.w * 0.8, 0.14, 1.9, sc, 0.33);
    }
    if (st.fireEscapes && h.h > 13 && h.tint > 0.45) {
      const ex = h.w * 0.18;
      for (let f = 1; f < floors; f++) {
        const y = f * floorH + 0.95;
        put('escape', ex, y, front + 0.7, h.w * 0.42, 0.1, 1.3);
        put('escape', ex, y + 0.5, front + 1.33, h.w * 0.42, 0.9, 0.05);
        put('escape', ex + h.w * 0.08, y - floorH / 2 + 0.2, front + 0.75, 0.1, floorH * 1.12, 0.32, undefined, 0);
      }
    }
  });
  return parts;
}

export function Houses({ list, style = 'lake' }: { list: House[]; style?: Style }) {
  const st = STYLES[style];
  const parts = useMemo(() => layout(list, st), [list, st]);
  const geo = useMemo(
    () => ({
      wall: new RoundedBoxGeometry(1, 1, 1, 2, 0.035),
      box: new BoxGeometry(1, 1, 1),
      soft: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
      gable: gableGeometry(),
    }),
    [],
  );
  const mats = useMemo(() => {
    const glass = new MeshStandardMaterial({ color: st.glass, roughness: 0.18, metalness: 0.4, emissive: '#ffb45e', emissiveIntensity: 0 });
    const shop = new MeshStandardMaterial({ color: '#27304a', roughness: 0.15, metalness: 0.45, emissive: '#ffcf8a', emissiveIntensity: 0.04 });
    return {
      wall: wallMaterial(st.surface),
      trim: new MeshStandardMaterial({ color: st.trim, roughness: 0.75 }),
      roof: new MeshStandardMaterial({ roughness: 0.8, flatShading: true }),
      tinted: new MeshStandardMaterial({ roughness: 0.75 }),
      escape: new MeshStandardMaterial({ color: '#25242a', roughness: 0.6, metalness: 0.4 }),
      glass,
      shop,
    };
  }, [st]);
  // Windows glow as the light fades.
  useFrame(() => {
    mats.glass.emissiveIntensity = NIGHT.value * 1.1;
    mats.shop.emissiveIntensity = 0.04 + NIGHT.value * 1.1;
  });

  const refs = useRef<Partial<Record<Part, InstancedMesh | null>>>({});
  useEffect(() => {
    (Object.keys(parts) as Part[]).forEach((k) => {
      const mesh = refs.current[k];
      if (!mesh) return;
      parts[k].forEach((p, i) => {
        mesh.setMatrixAt(i, p.m);
        if (p.c) mesh.setColorAt(i, p.c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [parts]);

  const mesh = (k: Part, geometry: BufferGeometry, material: MeshStandardMaterial, shadow = true) =>
    parts[k].length > 0 && (
      <instancedMesh key={k} ref={(m) => void (refs.current[k] = m)} args={[geometry, material, parts[k].length]} castShadow={shadow} receiveShadow />
    );

  return (
    <group>
      {mesh('wall', geo.wall, mats.wall)}
      {st.roof === 'gable' ? mesh('roof', geo.gable, mats.roof) : null}
      {mesh('cornice', geo.soft, mats.trim)}
      {mesh('frame', geo.box, mats.trim, false)}
      {mesh('glass', geo.box, mats.glass, false)}
      {mesh('sill', geo.soft, mats.trim, false)}
      {mesh('lintel', geo.soft, mats.trim, false)}
      {mesh('shop', geo.box, mats.shop, false)}
      {mesh('sign', geo.soft, mats.tinted, false)}
      {mesh('awning', geo.soft, mats.tinted)}
      {mesh('escape', geo.box, mats.escape, false)}
    </group>
  );
}
