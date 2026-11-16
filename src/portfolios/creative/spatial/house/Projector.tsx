import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { B, canvasTexture, rng, useMats } from './kit';

/**
 * The living room's cinema: a large screen on the marble wall above the fireplace with a soft
 * glow, and a small ceiling projector whose faint beam reaches the screen. The sofa faces it.
 */

export const SCREEN = { x: -4.97, y: 2.32, z: -0.6, w: 3.0, h: 1.69 } as const;
const LENS: [number, number, number] = [1.52, 3.3, -0.6];

function screenTexture() {
  return canvasTexture(1024, 576, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 576);
    sky.addColorStop(0, '#0d1633');
    sky.addColorStop(0.55, '#3a4f8a');
    sky.addColorStop(0.8, '#e59a74');
    sky.addColorStop(1, '#f6c38f');
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 576);
    const r = rng(19);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
      g.fillRect(r() * 1024, r() * 260, 1.5, 1.5);
    }
    // Soft hills
    const hill = (y: number, amp: number, c: string, seed: number) => {
      const q = rng(seed);
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, 576);
      for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x * 0.006 + q() * 0.2 + seed) * amp + Math.sin(x * 0.017 + seed) * amp * 0.3);
      g.lineTo(1024, 576);
      g.fill();
    };
    hill(430, 26, '#2c3558', 2);
    hill(470, 20, '#1b2240', 5);
    hill(515, 14, '#11162b', 9);
    // A low glowing sun
    const sun = g.createRadialGradient(700, 420, 4, 700, 420, 160);
    sun.addColorStop(0, 'rgba(255,236,200,0.95)');
    sun.addColorStop(0.2, 'rgba(255,190,130,0.45)');
    sun.addColorStop(1, 'rgba(255,170,120,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, 1024, 576);
  });
}

export function Projector() {
  const m = useMats();
  const tex = useMemo(screenTexture, []);
  const screen = useMemo(() => new MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.15, roughness: 0.9 }), [tex]);
  const beam = useMemo(() => {
    const { x, y, z, w, h } = SCREEN;
    const c = [
      [x + 0.02, y - h / 2, z - w / 2],
      [x + 0.02, y - h / 2, z + w / 2],
      [x + 0.02, y + h / 2, z + w / 2],
      [x + 0.02, y + h / 2, z - w / 2],
    ];
    const pos: number[] = [];
    const col: number[] = [];
    const a = [0.0035, 0.0038, 0.005];
    const b = [0.0003, 0.00035, 0.0005];
    for (let i = 0; i < 4; i++) {
      const p = c[i]!;
      const q = c[(i + 1) % 4]!;
      pos.push(...LENS, ...p, ...q);
      col.push(...a, ...b, ...b);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    return {
      geo: g,
      mat: new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }),
    };
  }, []);
  useFrame(({ clock }) => {
    screen.emissiveIntensity = 1.1 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
  });
  return (
    <group>
      {/* Screen: a thin black frame, the picture */}
      <B p={[SCREEN.x + 0.012, SCREEN.y, SCREEN.z]} s={[0.025, SCREEN.h + 0.06, SCREEN.w + 0.06]} m={m.black} cast={false} />
      <mesh position={[SCREEN.x + 0.026, SCREEN.y, SCREEN.z]} rotation={[0, Math.PI / 2, 0]} scale={[SCREEN.w, SCREEN.h, 1]} material={screen}>
        <planeGeometry />
      </mesh>
      {/* Ceiling projector on a short drop rod */}
      <B p={[LENS[0] + 0.14, 3.47, LENS[2]]} s={[0.025, 0.26, 0.025]} m={m.black} cast={false} />
      <B p={[LENS[0] + 0.14, 3.3, LENS[2]]} s={[0.3, 0.1, 0.3]} m={m.white} />
      <mesh position={[LENS[0] - 0.005, LENS[1], LENS[2]]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.03, 24]} />
        <meshStandardMaterial color="#000" emissive="#dfe8ff" emissiveIntensity={2} />
      </mesh>
      <mesh geometry={beam.geo} material={beam.mat} />
    </group>
  );
}
