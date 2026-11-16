import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { CanvasTexture, Color, MeshStandardMaterial, PointLight, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { Model } from './Model';

/**
 * The living room (metres; x to the right, z towards the entrance, floor at y = 0). Room box:
 * x −5…5, z −3.6…5.5, ceiling 3.6.
 * - Back: a full-height glass wall with black frames, looking out over the park.
 * - Left: a book-matched marble feature wall with a long linear fireplace; the hallway door beyond it.
 * - Right: warm plaster with walnut slats, a display shelf and plants.
 * - Front: the entrance (the camera walks in through it).
 * Furniture is Poly Haven CC0 (see public/assets/house/ASSETS.md).
 */

const T = `${import.meta.env.BASE_URL}assets/house/textures`;
const X0 = -5;
const X1 = 5;
const Z0 = -3.6;
const Z1 = 5.5;
const CEIL = 3.6;

const pbr = (name: string) => [`${T}/${name}/diff.jpg`, `${T}/${name}/nor.jpg`, `${T}/${name}/rough.jpg`];

function useSet(name: string, rx: number, ry: number) {
  const [map, normalMap, roughnessMap] = useTexture(pbr(name)) as Texture[];
  return useMemo(() => {
    for (const t of [map!, normalMap!, roughnessMap!]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = 8;
    }
    map!.colorSpace = SRGBColorSpace;
    return { map: map!, normalMap: normalMap!, roughnessMap: roughnessMap! };
  }, [map, normalMap, roughnessMap, rx, ry]);
}

function flameTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 70; i++) {
    const x = (i / 70) * 512 + Math.random() * 6;
    const h = 22 + Math.random() * 36;
    const grad = g.createLinearGradient(0, 64, 0, 64 - h);
    grad.addColorStop(0, 'rgba(255,190,90,0.95)');
    grad.addColorStop(0.5, 'rgba(255,110,30,0.7)');
    grad.addColorStop(1, 'rgba(255,60,10,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(x, 64, 4 + Math.random() * 5, h, 0, Math.PI, 0);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  return t;
}

function Fireplace() {
  const flame = useMemo(flameTexture, []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: flame, emissiveIntensity: 2.2, transparent: true }), [flame]);
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flame.offset.x = (t * 0.05) % 1;
    mat.emissiveIntensity = 2 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1;
    if (light.current) light.current.intensity = 5 + Math.sin(t * 7) * 0.8 + Math.sin(t * 17) * 0.5;
  });
  return (
    <group position={[X0 + 0.02, 0, -0.6]}>
      {/* Recess, glass and the flames */}
      <mesh position={[0.12, 0.72, 0]}>
        <boxGeometry args={[0.26, 0.56, 2.6]} />
        <meshStandardMaterial color="#0b0b0c" roughness={0.9} />
      </mesh>
      <mesh position={[0.26, 0.64, 0]} rotation={[0, Math.PI / 2, 0]} material={mat}>
        <planeGeometry args={[2.5, 0.36]} />
      </mesh>
      <mesh position={[0.27, 0.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 0.56]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.05} metalness={0} />
      </mesh>
      <pointLight ref={light} position={[0.8, 0.8, 0]} color="#ff9a4a" intensity={5} distance={6} decay={2} />
    </group>
  );
}

function Rug() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#cfc6b8';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = 180 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v - 8},${v - 18},0.35)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(4, 3);
    return t;
  }, []);
  return (
    <mesh position={[0.6, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[4.2, 3.2]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}

function WindowWall() {
  const mullions = [-5, -2.5, 0, 2.5, 5];
  return (
    <group position={[0, 0, Z0]}>
      {mullions.map((x) => (
        <mesh key={x} position={[x, CEIL / 2, 0]} castShadow>
          <boxGeometry args={[0.08, CEIL, 0.14]} />
          <meshStandardMaterial color="#141416" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[0.04, CEIL - 0.04].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[10, 0.08, 0.16]} />
          <meshStandardMaterial color="#141416" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Glass panes; the one at x 0…2.5 is a slider, parked open behind its neighbour (the way to the garden) */}
      {[-3.75, -1.25, 3.75].map((x) => (
        <mesh key={x} position={[x, CEIL / 2, 0]}>
          <planeGeometry args={[2.5, CEIL]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.07} roughness={0.04} metalness={0} envMapIntensity={1.2} depthWrite={false} />
        </mesh>
      ))}
      <group position={[3.55, 0, -0.12]}>
        <mesh position={[0, CEIL / 2 - 0.02, 0]}>
          <planeGeometry args={[2.4, CEIL - 0.12]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.07} roughness={0.04} metalness={0} envMapIntensity={1.2} depthWrite={false} />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, CEIL / 2 - 0.02, 0]}>
            <boxGeometry args={[0.05, CEIL - 0.12, 0.05]} />
            <meshStandardMaterial color="#141416" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function LivingRoom({ low = false }: { low?: boolean }) {
  const floor = useSet('wood_floor', 4, 4.6);
  const plaster = useSet('white_plaster_02', 3, 1.2);
  const slab = useSet('marble_01', 1.6, 1);
  const marble = useSet('marble_01', 1, 1);
  const slat = useMemo(() => new MeshStandardMaterial({ color: '#5b3b26', roughness: 0.55 }), []);
  const plasterMat = useMemo(() => new MeshStandardMaterial({ ...plaster, color: new Color('#f6f2ec'), roughness: 0.95, emissive: new Color('#f6f1ea'), emissiveIntensity: 0.06 }), [plaster]);
  return (
    <group>
      {/* Floor: oak boards with a soft sheen (the sky light gives the reflection; a live mirror
          would draw the whole room a second time) */}
      <mesh position={[0, 0, (Z0 + Z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[X1 - X0, Z1 - Z0]} />
        <meshStandardMaterial {...floor} roughness={low ? 0.7 : 0.55} envMapIntensity={low ? 1 : 1.2} />
      </mesh>
      {/* Ceiling with linear light strips */}
      <mesh position={[0, CEIL, (Z0 + Z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={plasterMat}>
        <planeGeometry args={[X1 - X0, Z1 - Z0]} />
      </mesh>
      {[-1.4, 2.2].map((z) => (
        <mesh key={z} position={[0.4, CEIL - 0.01, z]}>
          <boxGeometry args={[7, 0.02, 0.05]} />
          <meshStandardMaterial color="#000" emissive="#ffe8c8" emissiveIntensity={3} />
        </mesh>
      ))}
      <WindowWall />
      {/* Left: stone feature wall, the fireplace, the hallway door */}
      <mesh position={[X0, CEIL / 2, (Z0 + 2.6) / 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[2.6 - Z0, CEIL]} />
        <meshStandardMaterial {...slab} color="#efeae4" roughness={0.45} />
      </mesh>
      <mesh position={[X0 + 0.5, 0.2, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.4, 3.4]} />
        <meshStandardMaterial {...marble} roughness={0.35} />
      </mesh>
      <Fireplace />
      {/* Hallway door (the hallway itself is built in Shell.tsx) */}
      <mesh position={[X0, (CEIL + 2.6) / 2, 3.3]} rotation={[0, Math.PI / 2, 0]} material={plasterMat}>
        <planeGeometry args={[1.4, CEIL - 2.6]} />
      </mesh>
      <mesh position={[X0, CEIL / 2, 4.75]} rotation={[0, Math.PI / 2, 0]} material={plasterMat}>
        <planeGeometry args={[1.5, CEIL]} />
      </mesh>
      {/* Right: plaster wall with walnut slats */}
      <mesh position={[X1, CEIL / 2, (Z0 + Z1) / 2]} rotation={[0, -Math.PI / 2, 0]} material={plasterMat} receiveShadow>
        <planeGeometry args={[Z1 - Z0, CEIL]} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => (
        <mesh key={i} position={[X1 - 0.04, CEIL / 2, -2.9 + i * 0.13]} material={slat} castShadow>
          <boxGeometry args={[0.05, CEIL - 0.02, 0.07]} />
        </mesh>
      ))}
      {/* Front wall with the entrance */}
      {[
        [-2.85, 4.3],
        [3.25, 3.5],
      ].map(([x, w]) => (
        <mesh key={x} position={[x!, CEIL / 2, Z1]} rotation={[0, Math.PI, 0]} material={plasterMat}>
          <planeGeometry args={[w!, CEIL]} />
        </mesh>
      ))}
      <mesh position={[0.2, (CEIL + 2.7) / 2, Z1]} rotation={[0, Math.PI, 0]} material={plasterMat}>
        <planeGeometry args={[2.3, CEIL - 2.7]} />
      </mesh>
      {/* Outside the entrance: stone paving */}
      <mesh position={[0, -0.01, Z1 + 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial {...marble} color="#cfc8bc" roughness={0.6} />
      </mesh>
      <Rug />
      {/* Furniture */}
      <Model id="sofa_03" position={[2.85, 0, 0]} rotation={-Math.PI / 2} />
      <Model id="modern_coffee_table_01" position={[0.95, 0, 0]} />
      <Model id="ceramic_vase_01" position={[0.95, 0.39, -0.32]} scale={0.8} />
      <Model id="modern_arm_chair_01" position={[-1.0, 0, -0.95]} rotation={Math.PI / 2 - 0.35} />
      <Model id="mid_century_lounge_chair" position={[-1.0, 0, 1.0]} rotation={Math.PI / 2 + 0.35} />
      <Model id="side_table_01" position={[2.95, 0, -1.75]} />
      <Model id="pachira_aquatica_01" pick={0} position={[4.0, 0, -2.85]} />
      <Model id="calathea_orbifolia_01" pick={0} position={[-4.25, 0, -2.95]} />
      <Model id="calathea_orbifolia_01" pick={0} position={[4.3, 0, 3.7]} />
      <Model id="wooden_display_shelves_01" position={[4.78, 0, 2.3]} rotation={Math.PI} />
      <Model id="modern_ceiling_lamp_01" position={[0.95, CEIL - 0.95, 0]} />
    </group>
  );
}

export const LIVING_MODELS = ['sofa_03', 'modern_coffee_table_01', 'ceramic_vase_01', 'modern_arm_chair_01', 'mid_century_lounge_chair', 'side_table_01', 'pachira_aquatica_01', 'calathea_orbifolia_01', 'wooden_display_shelves_01', 'modern_ceiling_lamp_01'];
