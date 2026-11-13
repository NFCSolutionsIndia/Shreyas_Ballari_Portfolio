import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, LatheGeometry, MeshStandardMaterial, PMREMGenerator, SRGBColorSpace, Vector2, type Texture } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GROUND, STATUE_AT } from './path';
import { pavingTexture, stoneTexture } from './textures';

/**
 * The golden scholar at the end of the road: a robed figure on a tall fluted column, holding a
 * laurel wreath up to the sky and a book in the other arm. An inscribed plinth carries the motto.
 * Gold and chrome use a reflection map generated in code (no downloads).
 */

/** A small generated environment for metals. */
export function useEnvMap() {
  const gl = useThree((s) => s.gl);
  const env = useMemo<Texture>(() => {
    const pm = new PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return env;
}

function plaqueTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e8d7c5';
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = '#7a5a40';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '600 70px Georgia, serif';
  g.fillText('CURIOSITY HAS NO LIMITS', 512, 110);
  g.font = '400 40px Georgia, serif';
  g.fillText('· every moment has a story ·', 512, 190);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function Statue() {
  const env = useEnvMap();
  const gold = useMemo(() => new MeshStandardMaterial({ color: '#f2b84e', metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.5 }), [env]);
  const stone = useMemo(() => {
    const t = stoneTexture();
    t.repeat.set(2, 6);
    return t;
  }, []);
  const paving = useMemo(() => {
    const t = pavingTexture();
    t.repeat.set(10, 10);
    return t;
  }, []);
  const plaque = useMemo(plaqueTexture, []);
  // Robe: a lathe profile flaring at the hem with soft folds.
  const robe = useMemo(() => {
    const pts: Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const y = (i / 24) * 10;
      const r = 2.9 - (y / 10) * 1.45 + Math.sin(y * 2.2) * 0.07 + (y < 1 ? (1 - y) * 0.25 : 0);
      pts.push(new Vector2(r, y));
    }
    const g = new LatheGeometry(pts, 40);
    // Folds: ripple the radius around the robe.
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);
      const a = Math.atan2(z, x);
      const k = 1 + Math.sin(a * 9) * 0.035 * (1 - y / 10);
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const col = 32;
  const top = 2.1 + col + 2.2;
  return (
    <group position={[STATUE_AT.x, GROUND, STATUE_AT.z]}>
      {/* Round plaza with a ring of benches */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[46, 56]} />
        <meshStandardMaterial map={paving} color="#f2cdbb" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[17, 19, 56]} />
        <meshStandardMaterial color="#7f9a4e" roughness={1} />
      </mesh>
      {/* Steps, plinth with plaque */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.35 + i * 0.7, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[12 - i * 2.4, 12 - i * 2.4, 0.7, 40]} />
          <meshStandardMaterial color="#efc6b3" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[9, 4.6, 9]} />
        <meshStandardMaterial color="#e9d3c2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.4, 4.52]}>
        <planeGeometry args={[8, 2]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
      {/* Fluted column */}
      <mesh position={[0, 2.1 + col / 2 + 2.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 3.0, col - 4, 20]} />
        <meshStandardMaterial map={stone} color="#f6d7c8" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, top - 1.1, 0]} castShadow>
        <cylinderGeometry args={[4.2, 3, 2.2, 24]} />
        <meshStandardMaterial color="#e2ad98" roughness={0.8} />
      </mesh>
      {/* The scholar */}
      <group position={[0, top, 0]} rotation={[0, 0.25, 0]}>
        <mesh geometry={robe} material={gold} castShadow />
        {/* Torso, shoulders, sash */}
        <mesh position={[0, 11.2, 0]} scale={[1.15, 1, 0.8]} material={gold} castShadow>
          <capsuleGeometry args={[1.45, 2.2, 8, 20]} />
        </mesh>
        <mesh position={[0, 11.6, 0.1]} rotation={[0, 0, 0.6]} scale={[1, 1, 0.75]} material={gold}>
          <torusGeometry args={[1.65, 0.2, 8, 30, Math.PI]} />
        </mesh>
        {/* Neck and head, with a laurel crown */}
        <mesh position={[0, 13.8, 0]} material={gold}>
          <cylinderGeometry args={[0.5, 0.6, 0.9, 14]} />
        </mesh>
        <mesh position={[0, 15, 0.05]} scale={[0.92, 1.08, 1]} material={gold} castShadow>
          <sphereGeometry args={[1.2, 32, 24]} />
        </mesh>
        <mesh position={[0, 15.6, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]} material={gold}>
          <torusGeometry args={[1.12, 0.14, 8, 28]} />
        </mesh>
        {/* Raised right arm holding the laurel wreath */}
        <group position={[-1.75, 12.3, 0]} rotation={[0.12, 0, 0.42]}>
          <mesh position={[0, 2.2, 0]} material={gold} castShadow>
            <capsuleGeometry args={[0.46, 3.4, 6, 14]} />
          </mesh>
          <mesh position={[0, 4.4, 0]} material={gold}>
            <capsuleGeometry args={[0.4, 2.4, 6, 14]} />
          </mesh>
          <mesh position={[0, 6.4, 0]} material={gold}>
            <sphereGeometry args={[0.48, 14, 10]} />
          </mesh>
          <group position={[0, 7.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={gold}>
              <torusGeometry args={[1.5, 0.17, 10, 36]} />
            </mesh>
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0]} rotation={[0, 0, a + 0.7]} scale={[0.55, 0.22, 0.1]} material={gold}>
                  <sphereGeometry args={[1, 8, 6]} />
                </mesh>
              );
            })}
          </group>
        </group>
        {/* Left arm cradling a book */}
        <group position={[1.8, 11.5, 0.2]} rotation={[-0.5, 0, -0.25]}>
          <mesh position={[0, -1.4, 0]} material={gold} castShadow>
            <capsuleGeometry args={[0.44, 2.6, 6, 14]} />
          </mesh>
          <mesh position={[-0.6, -2.9, 1.1]} rotation={[1.2, 0, 0.4]} material={gold}>
            <capsuleGeometry args={[0.38, 1.8, 6, 14]} />
          </mesh>
          <mesh position={[-0.6, -2.6, 1.6]} rotation={[0.2, -0.3, 0.1]} material={gold} castShadow>
            <boxGeometry args={[2.2, 2.8, 0.5]} />
          </mesh>
        </group>
      </group>
      {/* Lamps round the plaza */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * 30, 0, Math.cos(a) * 30]}>
            <mesh position={[0, 2.6, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.22, 5.2, 8]} />
              <meshStandardMaterial color="#2d2c33" metalness={0.4} roughness={0.6} />
            </mesh>
            <mesh position={[0, 5.4, 0]}>
              <sphereGeometry args={[0.42, 12, 10]} />
              <meshStandardMaterial color="#ffe3b8" emissive="#ffc27a" emissiveIntensity={1.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
