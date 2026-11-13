import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Path,
  Quaternion,
  SRGBColorSpace,
  Shape,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { WORLD } from '../data/worldData';
import { drawFilm, ONCURE, STOCKS, TUTORING, type Film } from '../films';
import { ARCH_Z, BRIDGE_Z, GROUND, RIDE, roadside } from './path';
import { brickFacadeTexture, stoneTexture } from './textures';
import { LAKE } from './Town';
import { VoxelText } from './VoxelText';

/**
 * Set pieces along the journey: the lake bridge, the interests arch, ABOUT ME, Shreyas's three
 * schools (original buildings, real names), the gate into "My Work", his skills floating by the
 * road, and two outdoor projector screens playing short films about Oncure and the stock app.
 */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  void document.fonts?.ready.then(() => {
    g.clearRect(0, 0, w, h);
    draw(g);
    t.needsUpdate = true;
  });
  return t;
}

/** Turn to face a point (local +z towards it). */
function faceTo(from: Vector3, to: Vector3) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

// --- Lake bridge -----------------------------------------------------------------------------

export function LakeBridge() {
  const geo = useMemo(() => {
    const half = LAKE.x + 4;
    const top = 19;
    const s = new Shape();
    s.moveTo(-half, -2);
    s.lineTo(half, -2);
    s.lineTo(half, top);
    s.lineTo(-half, top);
    s.closePath();
    for (let x = -136; x <= 136; x += 34) {
      const r = 13;
      const hole = new Path();
      hole.moveTo(x - r, -2);
      hole.lineTo(x - r, 3);
      hole.absarc(x, 3, r, Math.PI, 0, true);
      hole.lineTo(x + r, -2);
      hole.closePath();
      s.holes.push(hole);
    }
    const g = new ExtrudeGeometry(s, { depth: 10, bevelEnabled: false, curveSegments: 20 });
    g.translate(0, 0, -5);
    return g;
  }, []);
  const stone = useMemo(() => {
    const t = stoneTexture();
    t.repeat.set(0.06, 0.08);
    return t;
  }, []);
  return (
    <group position={[0, 0.4, BRIDGE_Z]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={stone} color="#f3dfd3" roughness={0.85} />
      </mesh>
      {[-5.4, 5.4].map((z) => (
        <mesh key={z} position={[0, 19.8, z]} castShadow>
          <boxGeometry args={[LAKE.x * 2 + 8, 1.6, 0.8]} />
          <meshStandardMaterial color="#f6e6dc" roughness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[-150 + i * 27.3, 20.6, 5.6]}>
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.15, 0.22, 4.8, 8]} />
            <meshStandardMaterial color="#2d2c33" />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <sphereGeometry args={[0.45, 12, 10]} />
            <meshStandardMaterial color="#ffe3b8" emissive="#ffc27a" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Interests arch --------------------------------------------------------------------------

export function InterestsArch() {
  const R = 7;
  const SPRING = 6;
  const DEPTH = 14;
  const geo = useMemo(() => {
    const s = new Shape();
    s.moveTo(-14, 0);
    s.lineTo(14, 0);
    s.lineTo(14, 20);
    s.lineTo(-14, 20);
    s.closePath();
    const hole = new Path();
    hole.moveTo(-R, 0);
    hole.lineTo(-R, SPRING);
    hole.absarc(0, SPRING, R, Math.PI, 0, true);
    hole.lineTo(R, 0);
    hole.closePath();
    s.holes.push(hole);
    const g = new ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false, curveSegments: 32 });
    g.translate(0, 0, -DEPTH / 2);
    return g;
  }, []);
  const words = useMemo(
    () =>
      canvasTex(2048, 512, (g) => {
        g.fillStyle = '#b58a9a';
        g.fillRect(0, 0, 2048, 512);
        const list = [...WORLD.interests, ...WORLD.fields, ...WORLD.roles];
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        list.forEach((w, i) => {
          const x = 120 + ((i * 397) % 1840);
          const y = 70 + ((i * 131) % 380);
          g.save();
          g.translate(x, y);
          g.rotate(((i % 5) - 2) * 0.12);
          g.globalAlpha = 0.75;
          g.fillStyle = '#fff4ee';
          g.font = `700 ${46 + (i % 4) * 14}px "Michroma", "Arial Black", sans-serif`;
          g.fillText(w.toUpperCase(), 0, 0);
          g.restore();
        });
      }),
    [],
  );
  return (
    <group position={[0, GROUND, ARCH_Z]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#c79aa8" roughness={0.85} />
      </mesh>
      {/* Words painted on the inside of the vault and walls */}
      <mesh position={[0, SPRING, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R - 0.05, R - 0.05, DEPTH, 48, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial map={words} side={DoubleSide} roughness={0.9} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (R - 0.05), SPRING / 2, 0]} rotation={[0, -sd * Math.PI / 2, 0]}>
          <planeGeometry args={[DEPTH, SPRING]} />
          <meshStandardMaterial map={words} roughness={0.9} />
        </mesh>
      ))}
      {/* A heart and a little plaque, like a signature on the arch */}
      <mesh position={[0, 16.5, DEPTH / 2 + 0.05]}>
        <planeGeometry args={[12, 2.4]} />
        <meshBasicMaterial map={useMemo(() => canvasTex(1024, 200, (g) => {
          g.fillStyle = '#fff6f0';
          g.font = '400 92px "Michroma", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('I ♥ CURIOSITY', 512, 104);
        }), [])} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

export function AboutMeLetters() {
  return <VoxelText lines={['ABOUT ME']} cube={0.3} colors={['#c4566a', '#e07c8c']} glow={0.25} plinth position={[-14, GROUND + 1.2, -272]} rotation={0.3} />;
}

// --- Schools ---------------------------------------------------------------------------------

function signTex(name: string, sub: string, color: string) {
  return canvasTex(1024, 360, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 1024, 360);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(0, 0, 1024, 18);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const words = name.toUpperCase();
    let size = 92;
    g.font = `700 ${size}px "Michroma", "Arial Black", sans-serif`;
    while (g.measureText(words).width > 940 && size > 40) {
      size -= 4;
      g.font = `700 ${size}px "Michroma", "Arial Black", sans-serif`;
    }
    g.fillText(words, 512, 150);
    g.font = '500 44px "Manrope", sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(sub, 512, 268);
  });
}

function MonumentSign({ name, sub, color, position, rotation }: { name: string; sub: string; color: string; position: Vector3; rotation: number }) {
  const map = useMemo(() => signTex(name, sub, color), [name, sub, color]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[11.6, 1.2, 1.6]} />
        <meshStandardMaterial color="#d8cfc4" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[10.6, 3.6, 0.9]} />
        <meshStandardMaterial color="#e9e2d8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.9, 0.46]}>
        <planeGeometry args={[10, 3.4]} />
        <meshStandardMaterial map={map} roughness={0.6} />
      </mesh>
      {/* Flowers along the base */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-4.8 + i * 1.2, 1.3, 0.95]}>
          <sphereGeometry args={[0.32, 8, 6]} />
          <meshStandardMaterial color={['#e86f8a', '#f2c14e', '#ffffff'][i % 3]} />
        </mesh>
      ))}
    </group>
  );
}

function Elementary({ color }: { color: string }) {
  const brick = useMemo(() => {
    const t = brickFacadeTexture();
    t.repeat.set(8, 1.5);
    return t;
  }, []);
  return (
    <group>
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[40, 7, 14]} />
        <meshStandardMaterial map={brick} roughness={0.85} />
      </mesh>
      <mesh position={[-14, 3.5, -12]} castShadow>
        <boxGeometry args={[12, 7, 12]} />
        <meshStandardMaterial map={brick} roughness={0.85} />
      </mesh>
      <mesh position={[0, 7.3, 0]}>
        <boxGeometry args={[40.6, 0.6, 14.6]} />
        <meshStandardMaterial color="#efe6da" />
      </mesh>
      {/* Entrance canopy in the school colour */}
      <mesh position={[4, 5, 8.6]} castShadow>
        <boxGeometry args={[10, 0.5, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Playground: slide and swings */}
      <group position={[14, 0, 18]}>
        <mesh position={[0, 1.6, 0]} rotation={[0, 0, -0.55]}>
          <boxGeometry args={[6, 0.25, 1.4]} />
          <meshStandardMaterial color="#f2c14e" />
        </mesh>
        <mesh position={[2.6, 1.6, 0]}>
          <boxGeometry args={[1.4, 3.2, 1.4]} />
          <meshStandardMaterial color="#e86f8a" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-6, 2, s * 2]} rotation={[0, 0, s * 0.12]}>
            <cylinderGeometry args={[0.12, 0.12, 4.2, 6]} />
            <meshStandardMaterial color="#3f7d86" />
          </mesh>
        ))}
        <mesh position={[-6, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 4.4, 6]} />
          <meshStandardMaterial color="#3f7d86" />
        </mesh>
      </group>
    </group>
  );
}

function Middle({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[46, 11, 14]} />
        <meshStandardMaterial color="#efe3cf" roughness={0.85} />
      </mesh>
      {[2.2, 6.2, 9.8].map((y) => (
        <mesh key={y} position={[0, y, 7.05]}>
          <planeGeometry args={[44, y === 9.8 ? 0.5 : 2]} />
          <meshStandardMaterial color={y === 9.8 ? color : '#3d4a63'} roughness={0.3} />
        </mesh>
      ))}
      {/* Clock over the entrance */}
      <mesh position={[0, 12.5, 6.6]} castShadow>
        <boxGeometry args={[8, 4, 1.4]} />
        <meshStandardMaterial color="#efe3cf" />
      </mesh>
      <mesh position={[0, 12.5, 7.35]}>
        <circleGeometry args={[1.4, 24]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      {/* School bus out front */}
      <group position={[-12, 0, 13]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[2.8, 2.8, 10]} />
          <meshStandardMaterial color="#f2b705" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[2.85, 0.9, 8.6]} />
          <meshStandardMaterial color="#2b3350" roughness={0.3} />
        </mesh>
        {[-3.5, 3.5].map((z) =>
          [-1.4, 1.4].map((x) => (
            <mesh key={`${z}${x}`} position={[x, 0.7, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.7, 0.7, 0.4, 14]} />
              <meshStandardMaterial color="#1e1e22" />
            </mesh>
          )),
        )}
      </group>
      {/* Flagpole */}
      <mesh position={[16, 7, 14]}>
        <cylinderGeometry args={[0.12, 0.15, 14, 8]} />
        <meshStandardMaterial color="#d9d9de" metalness={0.6} />
      </mesh>
    </group>
  );
}

function Academy({ color }: { color: string }) {
  return (
    <group>
      {/* Glass curtain wall in a white frame */}
      <mesh position={[0, 6.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[44, 13, 16]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.6} />
      </mesh>
      <mesh position={[2, 6.5, 8.05]}>
        <planeGeometry args={[34, 10.5]} />
        <meshStandardMaterial color="#5f8fbf" metalness={0.6} roughness={0.15} emissive="#20406a" emissiveIntensity={0.25} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-15 + i * 4.25, 6.5, 8.12]}>
          <planeGeometry args={[0.25, 10.5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Planetarium dome for the sciences */}
      <mesh position={[-14, 13, -2]} castShadow>
        <sphereGeometry args={[6.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d9e2ea" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Accent band and solar panels */}
      <mesh position={[0, 13.3, 0]}>
        <boxGeometry args={[44.4, 0.6, 16.4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[6 + i * 6, 14.2, -2]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[5, 0.15, 3]} />
          <meshStandardMaterial color="#1f2a44" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

const SCHOOL_COLORS = ['#2f6b4f', '#8c2f2f', '#2f5d8c'];
const SCHOOL_KIND = ['Elementary school', 'Middle school', 'High school · now'];

export function Schools() {
  const places = useMemo(
    () =>
      RIDE.schools.map((t, i) => {
        const side = i % 2 ? -1 : 1;
        const b = roadside(t, side, 30).at;
        const road = roadside(t, 0, 0).at;
        const sign = roadside(t - 0.012, side, 9);
        return { b, ry: faceTo(b, road), sign: sign.at, signRy: sign.ry + side * 0.5 };
      }),
    [],
  );
  return (
    <group>
      {places.map((pl, i) => (
        <group key={i}>
          <group position={pl.b} rotation={[0, pl.ry, 0]}>
            {i === 0 ? <Elementary color={SCHOOL_COLORS[0]!} /> : i === 1 ? <Middle color={SCHOOL_COLORS[1]!} /> : <Academy color={SCHOOL_COLORS[2]!} />}
            {/* Name on the building */}
            <FacadeName name={WORLD.schools[i] ?? ''} y={i === 0 ? 8.6 : i === 1 ? 15.8 : 16} z={i === 2 ? 8.3 : 7.2} />
          </group>
          <MonumentSign name={WORLD.schools[i] ?? ''} sub={SCHOOL_KIND[i]!} color={SCHOOL_COLORS[i]!} position={pl.sign} rotation={pl.signRy} />
        </group>
      ))}
    </group>
  );
}

function FacadeName({ name, y, z }: { name: string; y: number; z: number }) {
  const map = useMemo(
    () =>
      canvasTex(2048, 200, (g) => {
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        let size = 120;
        g.font = `700 ${size}px "Michroma", "Arial Black", sans-serif`;
        while (g.measureText(name.toUpperCase()).width > 1980 && size > 40) {
          size -= 4;
          g.font = `700 ${size}px "Michroma", "Arial Black", sans-serif`;
        }
        g.shadowColor = 'rgba(0,0,0,0.35)';
        g.shadowBlur = 10;
        g.fillText(name.toUpperCase(), 1024, 104);
      }),
    [name],
  );
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[34, 3.3]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} />
    </mesh>
  );
}

// --- Gate into My Work -----------------------------------------------------------------------

export function WorkGate() {
  const { at, ry } = useMemo(() => roadside(RIDE.gate, 0, 0), []);
  const label = useMemo(
    () =>
      canvasTex(1024, 200, (g) => {
        g.fillStyle = '#fff6f0';
        g.font = '400 80px "Michroma", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('MY WORK', 512, 104);
      }),
    [],
  );
  const brick = useMemo(() => {
    const t = brickFacadeTexture();
    t.repeat.set(3, 4);
    return t;
  }, []);
  return (
    <group position={at} rotation={[0, ry, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 14, 10, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 20, 16]} />
          <meshStandardMaterial map={brick} roughness={0.85} />
        </mesh>
      ))}
      {/* Bridge between the two buildings, over the road */}
      <mesh position={[0, 15.5, 0]} castShadow>
        <boxGeometry args={[16, 5, 8]} />
        <meshStandardMaterial color="#e9d6c8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 15.5, 4.05]}>
        <planeGeometry args={[12, 2.4]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
      {/* Café tables by the gate */}
      {[-1, 1].map((s) =>
        [0, 1].map((k) => (
          <group key={`${s}${k}`} position={[s * 9.5, 0, 10 + k * 6]}>
            <mesh position={[0, 3.2, 0]}>
              <coneGeometry args={[2.4, 1, 12]} />
              <meshStandardMaterial color={k ? '#f2b6c4' : '#ffffff'} />
            </mesh>
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 3, 6]} />
              <meshStandardMaterial color="#9a8f8a" />
            </mesh>
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.8, 0.8, 0.08, 12]} />
              <meshStandardMaterial color="#e9e4dc" />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

// --- Skills floating by the road ---------------------------------------------------------------

function SkillLabel({ text, t, side }: { text: string; t: number; side: number }) {
  const { at, ry } = useMemo(() => roadside(t, side, 8.5), [t, side]);
  const map = useMemo(
    () =>
      canvasTex(1024, 160, (g) => {
        g.textAlign = side > 0 ? 'left' : 'right';
        g.textBaseline = 'middle';
        g.font = '400 78px "Michroma", sans-serif';
        g.shadowColor = 'rgba(80,30,50,0.45)';
        g.shadowBlur = 16;
        g.fillStyle = '#ffffff';
        g.fillText(text, side > 0 ? 20 : 1004, 84);
      }),
    [text, side],
  );
  const mesh = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    const d = camera.position.distanceTo(at);
    const mat = m.material as MeshBasicMaterial;
    mat.opacity = Math.min(1, Math.max(0, (70 - d) / 30)) * Math.min(1, Math.max(0, (d - 4) / 6));
    m.visible = mat.opacity > 0.01;
    m.position.y = GROUND + 6 + Math.sin(performance.now() / 900 + t * 40) * 0.25;
  });
  return (
    <mesh ref={mesh} position={[at.x, GROUND + 6, at.z]} rotation={[0, ry - side * 0.35, 0]}>
      <planeGeometry args={[14, 2.2]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function SkillSigns() {
  return (
    <group>
      {WORLD.fields.map((f, i) => (
        <SkillLabel key={f} text={f} t={RIDE.skills[i] ?? 0.5} side={i % 2 ? -1 : 1} />
      ))}
    </group>
  );
}

// --- Projector screens -------------------------------------------------------------------------

function Projector({ t, side, film, title }: { t: number; side: number; film: Film; title: string }) {
  const place = useMemo(() => {
    const s = roadside(t, side, 24);
    const before = roadside(Math.max(0, t - 0.05), 0, 0).at;
    const ry = faceTo(s.at, before);
    const proj = roadside(t - 0.05, -side, 10).at.setY(GROUND + 9);
    return { at: s.at, ry, proj };
  }, [t, side]);
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 960;
    c.height = 540;
    const tx = new CanvasTexture(c);
    tx.colorSpace = SRGBColorSpace;
    return { canvas: c, tex: tx };
  }, []);
  const last = useRef(0);
  const screenCenter = useMemo(() => place.at.clone().setY(GROUND + 11), [place]);
  useFrame(({ camera, clock }) => {
    // Play only when near, at ~20 fps.
    if (camera.position.distanceTo(place.at) > 260) return;
    const now = clock.elapsedTime;
    if (now - last.current < 0.05) return;
    last.current = now;
    drawFilm(film, canvas.getContext('2d')!, now, canvas.width, canvas.height);
    tex.needsUpdate = true;
  });
  const beam = useMemo(() => {
    const dirv = screenCenter.clone().sub(place.proj);
    const len = dirv.length();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dirv.clone().normalize());
    return { len, q, mid: place.proj.clone().addScaledVector(dirv, 0.5) };
  }, [screenCenter, place]);
  const caption = useMemo(
    () =>
      canvasTex(1024, 120, (g) => {
        g.fillStyle = '#ffffff';
        g.font = '400 56px "Michroma", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(title.toUpperCase(), 512, 64);
      }),
    [title],
  );
  const group = useRef<Group>(null);
  return (
    <group ref={group}>
      <group position={place.at} rotation={[0, place.ry, 0]}>
        {/* Screen and frame on two legs */}
        <mesh position={[0, 11, -0.2]} castShadow>
          <boxGeometry args={[27.4, 16, 0.4]} />
          <meshStandardMaterial color="#1b1b22" roughness={0.6} />
        </mesh>
        <mesh position={[0, 11, 0.02]}>
          <planeGeometry args={[26, 14.6]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        {[-10, 10].map((x) => (
          <mesh key={x} position={[x, 1.6, -0.4]} castShadow>
            <boxGeometry args={[0.6, 3.2, 0.6]} />
            <meshStandardMaterial color="#2d2c33" />
          </mesh>
        ))}
        <mesh position={[0, 20.4, 0]}>
          <planeGeometry args={[18, 2.1]} />
          <meshBasicMaterial map={caption} transparent toneMapped={false} />
        </mesh>
      </group>
      {/* Projector on a post, and its beam */}
      <mesh position={[place.proj.x, GROUND + 4.4, place.proj.z]}>
        <cylinderGeometry args={[0.15, 0.22, 8.8, 8]} />
        <meshStandardMaterial color="#2d2c33" />
      </mesh>
      <mesh position={place.proj}>
        <boxGeometry args={[1.4, 0.9, 1.6]} />
        <meshStandardMaterial color="#e9e9ee" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={beam.mid} quaternion={beam.q}>
        <cylinderGeometry args={[9, 0.35, beam.len, 4, 1, true]} />
        <meshBasicMaterial color="#cfe6ff" transparent opacity={0.045} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

export function Projectors() {
  return (
    <group>
      <Projector t={RIDE.oncure} side={1} film={ONCURE} title="Oncure · research concept" />
      <Projector t={RIDE.stocks} side={-1} film={STOCKS} title="Stock trading app" />
      <Projector t={RIDE.tutoring} side={1} film={TUTORING} title="Peer tutoring" />
    </group>
  );
}
