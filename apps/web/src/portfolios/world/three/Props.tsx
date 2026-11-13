import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Group,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROUND } from './path';
import { NIGHT } from './timeOfDay';

/**
 * Soft, toy-like props for the stylised look: blobby tree canopies (clustered, noise-displaced
 * spheres with a vertex-colour gradient) that sway gently, rounded cartoon pines, curved street
 * lamps with glowing heads, street furniture, and a few birds over the lake.
 */

function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

/** Add a vertical colour gradient (shadowed underside → sunlit top). */
function paint(g: BufferGeometry, low: string, high: string, y0: number, y1: number) {
  const pos = g.getAttribute('position');
  const a = new Color(low);
  const b = new Color(high);
  const c = new Color();
  const cols: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    c.copy(a).lerp(b, t * t * (3 - 2 * t));
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new Float32BufferAttribute(cols, 3));
  return g;
}

function blob(r: number, x: number, y: number, z: number, seed: number) {
  const g = new IcosahedronGeometry(r, 3);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i);
    const vy = p.getY(i);
    const vz = p.getZ(i);
    const n = hash(Math.round(vx * 3) + seed, Math.round(vy * 3), Math.round(vz * 3));
    const k = 1 + (n - 0.5) * 0.12;
    p.setXYZ(i, vx * k + x, vy * k * 0.92 + y, vz * k + z);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** A rounded broadleaf canopy, about 2.2 units in radius, centred on the origin. */
export function canopyGeometry() {
  const parts = [
    blob(1.5, 0, 0.2, 0, 1),
    blob(1.15, 1.1, -0.1, 0.3, 2),
    blob(1.1, -1.05, 0, -0.2, 3),
    blob(1.05, 0.2, -0.2, 1.05, 4),
    blob(1.0, -0.3, 0.1, -1.1, 5),
    blob(1.05, 0.15, 1.15, 0.1, 6),
  ];
  return paint(mergeGeometries(parts)!, '#4f6d3a', '#b3c76a', -1.4, 2.2);
}

/** A soft cartoon pine, about 10 units tall, centred on the origin. */
export function pineGeometry() {
  const tiers = [
    [2.4, -3.2],
    [1.95, -0.9],
    [1.45, 1.3],
    [0.9, 3.3],
  ].map(([r, y]) => {
    const g = new SphereGeometry(r!, 18, 10);
    g.scale(1, 0.85, 1);
    g.translate(0, y!, 0);
    g.deleteAttribute('uv');
    return g;
  });
  return paint(mergeGeometries(tiers)!, '#2f4a2c', '#7d9a52', -5, 4.5);
}

/** Curved, toy-like lamp post (base at y −2.4, head hangs at +x 1.2, y +2.4). */
export function lampPostGeometry() {
  const post = new CylinderGeometry(0.11, 0.2, 4.2, 10);
  post.translate(0, -0.3, 0);
  const base = new CylinderGeometry(0.3, 0.36, 0.5, 12);
  base.translate(0, -2.15, 0);
  const arm = new TubeGeometry(
    new CatmullRomCurve3([new Vector3(0, 1.7, 0), new Vector3(0, 2.6, 0), new Vector3(0.5, 2.95, 0), new Vector3(1.2, 2.75, 0)]),
    20,
    0.08,
    8,
  );
  const geos = [post, base, arm].map((g) => {
    g.deleteAttribute('uv');
    return g;
  });
  return mergeGeometries(geos)!;
}

/** The lamp head, where the curved arm ends (placed 2.6 above the post's origin). */
export function lampHeadGeometry() {
  const shade = new SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  shade.scale(1, 0.7, 1);
  shade.translate(1.2, -0.12, 0);
  const bulb = new SphereGeometry(0.26, 14, 10);
  bulb.translate(1.2, -0.22, 0);
  shade.deleteAttribute('uv');
  bulb.deleteAttribute('uv');
  return mergeGeometries([shade, bulb])!;
}

/** Shared materials: foliage sways in the wind; lamp heads glow brighter as it gets dark. */
export function useProps() {
  const sway = useRef({ value: 0 });
  const m = useMemo(() => {
    const foliage = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    foliage.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sway.current;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17;
          #else
            float ph = 0.0;
          #endif
          float bend = max(position.y + 1.5, 0.0) * 0.035;
          transformed.x += sin(uTime * 1.25 + ph) * bend;
          transformed.z += sin(uTime * 0.9 + ph * 1.7) * bend * 0.6;`,
        );
    };
    const post = new MeshStandardMaterial({ color: '#4d6b5c', roughness: 0.55, metalness: 0.3 });
    const head = new MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffcf8a', emissiveIntensity: 1.2, roughness: 0.4 });
    return { foliage, post, head };
  }, []);
  useFrame(({ clock }) => {
    sway.current.value = clock.elapsedTime;
    // Lamps come on as it gets darker, with the faintest flicker.
    m.head.emissiveIntensity = 0.9 + NIGHT.value * 2.6 + Math.sin(clock.elapsedTime * 17) * 0.03 * NIGHT.value;
  });
  return m;
}

// --- Street furniture ------------------------------------------------------------------------------

function Bench({ position, ry = 0 }: { position: [number, number, number]; ry?: number }) {
  return (
    <group position={position} rotation={[0, ry, 0]}>
      {[0.55, 0.85, 1.15].map((y, i) => (
        <mesh key={y} position={[0, i === 2 ? 1.5 : 0.9, i === 2 ? -0.45 : -0.15 + i * 0.3]} castShadow>
          <boxGeometry args={[3, 0.14, 0.32]} />
          <meshStandardMaterial color="#a8774f" roughness={0.8} />
        </mesh>
      ))}
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]}>
          <boxGeometry args={[0.14, 1.1, 1]} />
          <meshStandardMaterial color="#2d2c33" metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Planter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.7, 1, 16]} />
        <meshStandardMaterial color="#d8cfc2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, 0]} scale={[1, 0.7, 1]}>
        <icosahedronGeometry args={[0.85, 2]} />
        <meshStandardMaterial color="#6f9a4e" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.6) * 0.5, 1.6, Math.sin(i * 1.6) * 0.5]}>
          <sphereGeometry args={[0.16, 8, 6]} />
          <meshStandardMaterial color={['#e86f8a', '#f2c14e', '#ffffff', '#c76ad6'][i]} />
        </mesh>
      ))}
    </group>
  );
}

function Hydrant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.9, 12]} />
        <meshStandardMaterial color="#c8423a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8423a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 8]} />
        <meshStandardMaterial color="#c8423a" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Bin({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], position[1] + 0.6, position[2]]} castShadow>
      <cylinderGeometry args={[0.38, 0.34, 1.2, 14]} />
      <meshStandardMaterial color="#3f5a4a" roughness={0.6} metalness={0.2} />
    </mesh>
  );
}

/** A traffic light on a curved arm over the street, cycling green → amber → red. */
function TrafficLight({ position, ry = 0, phase = 0 }: { position: [number, number, number]; ry?: number; phase?: number }) {
  const lights = useRef<(MeshStandardMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime + phase) % 12;
    const on = t < 6 ? 2 : t < 8 ? 1 : 0; // 0 red, 1 amber, 2 green
    lights.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = i === on ? 2.4 : 0.05;
    });
  });
  return (
    <group position={position} rotation={[0, ry, 0]}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 6, 10]} />
        <meshStandardMaterial color="#4d6b5c" metalness={0.3} roughness={0.55} />
      </mesh>
      <mesh position={[1.6, 5.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 3.2, 8]} />
        <meshStandardMaterial color="#4d6b5c" metalness={0.3} />
      </mesh>
      <group position={[3, 5.1, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 1.7, 0.5]} />
          <meshStandardMaterial color="#e2a32e" roughness={0.5} />
        </mesh>
        {['#ff4a4a', '#ffb02e', '#3ddc6e'].map((c, i) => (
          <mesh key={c} position={[0, 0.5 - i * 0.5, 0.26]}>
            <circleGeometry args={[0.16, 14]} />
            <meshStandardMaterial ref={(m) => void (lights.current[i] = m)} color={c} emissive={c} emissiveIntensity={0.05} />
          </mesh>
        ))}
      </group>
      {/* Street name sign and a "one way" style arrow (generic) */}
      <mesh position={[0, 4.6, 0.12]}>
        <boxGeometry args={[1.6, 0.4, 0.05]} />
        <meshStandardMaterial color="#2f7a4f" />
      </mesh>
      <mesh position={[0, 3.9, 0.12]}>
        <boxGeometry args={[1.1, 0.75, 0.05]} />
        <meshStandardMaterial color="#c8423a" />
      </mesh>
      <mesh position={[0, 3.9, 0.15]}>
        <boxGeometry args={[0.8, 0.16, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** Downtown street furniture, kept tidy along the square and the waterfront. */
export function StreetProps() {
  const g = GROUND;
  return (
    <group>
      <TrafficLight position={[-9, g, -219]} ry={0} />
      <TrafficLight position={[9, g, -233]} ry={Math.PI} phase={6} />
      {[-36, -12, 14, 38].map((x) => (
        <Bench key={`p${x}`} position={[x, g, -197]} ry={Math.PI} />
      ))}
      {[-250, -290, -322].map((z) => (
        <group key={z}>
          <Bench position={[-40, g, z]} ry={Math.PI / 2} />
          <Bench position={[40, g, z]} ry={-Math.PI / 2} />
        </group>
      ))}
      {[-244, -272, -300, -330].map((z, i) => (
        <group key={`f${z}`}>
          <Planter position={[i % 2 ? 48 : -48, g, z]} />
          {i % 2 === 0 && <Hydrant position={[-46, g, z - 7]} />}
          {i % 2 === 1 && <Bin position={[46, g, z - 7]} />}
        </group>
      ))}
      {[-24, 24].map((x) => (
        <Planter key={x} position={[x, g, -204]} />
      ))}
    </group>
  );
}

// --- Birds -------------------------------------------------------------------------------------------

export function Birds({ count = 14 }: { count?: number }) {
  const refs = useRef<(Group | null)[]>([]);
  const birds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: 40 + (i % 5) * 9,
        y: 34 + (i % 4) * 4,
        speed: 0.12 + (i % 3) * 0.02,
        ph: i * 0.45,
        cx: -20 + (i % 2) * 30,
        cz: -90,
      })),
    [count],
  );
  useFrame(({ clock, camera }) => {
    const show = camera.position.z > -420;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.visible = show;
      if (!show) return;
      const b = birds[i]!;
      const a = clock.elapsedTime * b.speed + b.ph;
      g.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 3) * 1.2, b.cz + Math.sin(a) * b.r * 0.5);
      g.rotation.y = -a;
      const flap = Math.sin(clock.elapsedTime * 9 + i) * 0.6;
      const l = g.children[0];
      const r = g.children[1];
      if (l) l.rotation.z = flap;
      if (r) r.rotation.z = -flap;
    });
  });
  return (
    <group>
      {birds.map((_, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)} scale={1.4}>
          <mesh position={[-0.45, 0, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.3]} />
            <meshStandardMaterial color="#3a3440" />
          </mesh>
          <mesh position={[0.45, 0, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.3]} />
            <meshStandardMaterial color="#3a3440" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
