import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, Group, MeshStandardMaterial } from 'three';
import { activity } from './controller';
import { BOARD_D, BOARD_W, KNOB } from './layout';
import { PALETTE } from './palette';

/**
 * The volume knob: knurled dark brushed aluminium with an engraved indicator line on top and an
 * illuminated blue ring at its base. It turns a notch with each keystroke, eased.
 */
function knurledGeometry() {
  const g = new CylinderGeometry(0.36, 0.38, 0.62, 96, 1);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.3) continue; // caps of the cylinder
    const a = Math.atan2(z, x);
    const k = 1 + (Math.sin(a * 48) > 0 ? 0.025 : 0);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function RotaryKnob() {
  const geo = useMemo(knurledGeometry, []);
  const ring = useMemo(() => new MeshStandardMaterial({ color: PALETTE.blueDeep, emissive: PALETTE.blue, emissiveIntensity: 0.9, roughness: 0.4 }), []);
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += (activity.knob - g.current.rotation.y) * Math.min(1, dt * 6);
    ring.emissiveIntensity = 0.8 + activity.v * 0.8;
  });
  return (
    <group position={[-BOARD_W / 2 + KNOB.x, 0.2, -BOARD_D / 2 + KNOB.z]}>
      <mesh position={[0, 0.05, 0]} material={ring}>
        <cylinderGeometry args={[0.47, 0.47, 0.1, 64]} />
      </mesh>
      <group ref={g}>
        <mesh geometry={geo} position={[0, 0.41, 0]}>
          <meshStandardMaterial color={PALETTE.metal} metalness={0.95} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0.722, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.37, 64]} />
          <meshStandardMaterial color="#6b7382" metalness={1} roughness={0.22} />
        </mesh>
        {/* Engraved indicator */}
        <mesh position={[0, 0.725, -0.2]}>
          <boxGeometry args={[0.045, 0.012, 0.22]} />
          <meshStandardMaterial color={PALETTE.blueLight} emissive={PALETTE.blue} emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
