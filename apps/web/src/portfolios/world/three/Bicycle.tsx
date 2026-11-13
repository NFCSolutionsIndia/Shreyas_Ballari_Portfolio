import { useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3, type Group } from 'three';

/**
 * A city bicycle (local +z is forward, sizes in metres before the rider scale): glossy teal
 * frame, cream fenders, chainring and chain, rear rack, front lamp and a wicker basket with books.
 * Wheels and cranks are exposed so they turn with the ride; pedal geometry matches the rider's IK.
 */
export const WHEEL_R = 0.34;
export const SEAT_H = 0.92;
export const CRANK_LEN = 0.17;

export interface BicycleHandles {
  front: Group | null;
  back: Group | null;
  cranks: Group | null;
}

const FRAME = '#2f8f8a';
const CREAM = '#f3ead7';
const DARK = '#24242a';
const STEEL = '#cfd3d8';

function tube(points: [number, number, number][], r = 0.022, seg = 16) {
  return new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), seg, r, 10, false);
}

function Wheel() {
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      {/* Tyre, rim, hub and spokes */}
      <mesh castShadow>
        <torusGeometry args={[WHEEL_R, 0.034, 12, 48]} />
        <meshStandardMaterial color={DARK} roughness={0.85} />
      </mesh>
      <mesh>
        <torusGeometry args={[WHEEL_R - 0.034, 0.012, 8, 48]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.09, 14]} />
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.25} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} rotation={[0, 0, (i / 16) * Math.PI * 2]} position={[0, 0, i % 2 ? 0.02 : -0.02]}>
          <boxGeometry args={[0.004, (WHEEL_R - 0.04) * 2, 0.004]} />
          <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Fender({ z }: { z: number }) {
  return (
    <mesh position={[0, WHEEL_R, z]} rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[WHEEL_R + 0.05, 0.026, 6, 32, Math.PI * 0.75]} />
      <meshStandardMaterial color={CREAM} roughness={0.35} metalness={0.1} />
    </mesh>
  );
}

export function Bicycle({ parts, color = FRAME }: { parts: BicycleHandles; color?: string }) {
  const bb: [number, number, number] = [0, WHEEL_R + 0.12, -0.02];
  const frame = useMemo(
    () => [
      tube([bb, [0, SEAT_H - 0.08, -0.15]], 0.027), // seat tube
      tube([bb, [0, 0.62, 0.22], [0, 0.82, 0.4]], 0.03), // curved down tube (step-through)
      tube([[0, SEAT_H - 0.16, -0.13], [0, 0.86, 0.38]], 0.022), // top tube
      tube([[0, WHEEL_R, -0.48], bb], 0.015), // chain stay
      tube([[0, WHEEL_R, -0.48], [0, SEAT_H - 0.14, -0.14]], 0.015), // seat stay
      tube([[0, WHEEL_R, 0.5], [0, 0.62, 0.46], [0, 0.98, 0.39]], 0.022), // fork + head tube
      tube([[0, 0.98, 0.39], [0, 1.04, 0.34]], 0.02), // stem
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const bars = useMemo(() => tube([[-0.27, 1.06, 0.24], [-0.16, 1.05, 0.33], [0.16, 1.05, 0.33], [0.27, 1.06, 0.24]], 0.016), []);
  const rack = useMemo(() => tube([[-0.09, 0.66, -0.22], [-0.09, 0.66, -0.66], [0.09, 0.66, -0.66], [0.09, 0.66, -0.22]], 0.01), []);
  return (
    <group>
      {frame.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color={color} roughness={0.22} metalness={0.45} />
        </mesh>
      ))}
      <mesh geometry={bars} castShadow>
        <meshStandardMaterial color={STEEL} roughness={0.25} metalness={0.9} />
      </mesh>
      {/* Brown grips and a sprung leather saddle */}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 1.06, 0.25]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.11, 10]} />
          <meshStandardMaterial color="#7a4b2f" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, SEAT_H, -0.17]} scale={[0.75, 0.32, 1.25]} castShadow>
        <sphereGeometry args={[0.12, 16, 10]} />
        <meshStandardMaterial color="#7a4b2f" roughness={0.5} />
      </mesh>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, SEAT_H - 0.05, -0.24]}>
          <torusGeometry args={[0.02, 0.006, 6, 12]} />
          <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <Fender z={0.5} />
      <Fender z={-0.48} />
      {/* Rear rack */}
      <mesh geometry={rack}>
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Front lamp */}
      <mesh position={[0, 0.88, 0.47]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.035, 0.07, 14]} />
        <meshStandardMaterial color={CREAM} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.88, 0.51]}>
        <circleGeometry args={[0.032, 16]} />
        <meshBasicMaterial color="#fff6d8" toneMapped={false} />
      </mesh>
      {/* Wicker basket with books */}
      <group position={[0, 0.92, 0.6]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.2, 0.26]} />
          <meshStandardMaterial color="#b98a5e" roughness={0.95} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, -0.1 + i * 0.07, 0.131]}>
            <boxGeometry args={[0.34, 0.015, 0.005]} />
            <meshStandardMaterial color="#8a6340" />
          </mesh>
        ))}
        <mesh position={[-0.05, 0.12, 0]} rotation={[0, 0.3, 0.15]}>
          <boxGeometry args={[0.18, 0.05, 0.14]} />
          <meshStandardMaterial color="#c44d3f" roughness={0.7} />
        </mesh>
        <mesh position={[0.06, 0.15, 0.02]} rotation={[0, -0.2, -0.1]}>
          <boxGeometry args={[0.16, 0.04, 0.12]} />
          <meshStandardMaterial color="#2f5d8c" roughness={0.7} />
        </mesh>
      </group>
      {/* Chain loop from the chainring to the rear cog */}
      <mesh position={[0.06, (WHEEL_R + bb[1]) / 2, -0.25]} rotation={[Math.atan2(bb[1] - WHEEL_R, 0.46), 0, 0]}>
        <boxGeometry args={[0.012, 0.012, 0.47]} />
        <meshStandardMaterial color="#55565c" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0.06, WHEEL_R, -0.48]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.045, 0.01, 6, 20]} />
        <meshStandardMaterial color="#55565c" metalness={0.8} roughness={0.4} />
      </mesh>
      <group position={[0, WHEEL_R, 0.5]} ref={(g) => void (parts.front = g)}>
        <Wheel />
      </group>
      <group position={[0, WHEEL_R, -0.48]} ref={(g) => void (parts.back = g)}>
        <Wheel />
      </group>
      <group position={bb} ref={(g) => void (parts.cranks = g)}>
        {/* Chainring */}
        <mesh position={[0.06, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.09, 0.012, 6, 28]} />
          <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
        </mesh>
        {[1, -1].map((s) => (
          <group key={s} rotation={[s > 0 ? 0 : Math.PI, 0, 0]}>
            <mesh position={[s * 0.075, -CRANK_LEN / 2, 0]}>
              <boxGeometry args={[0.018, CRANK_LEN, 0.03]} />
              <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[s * 0.12, -CRANK_LEN, 0]}>
              <boxGeometry args={[0.09, 0.022, 0.06]} />
              <meshStandardMaterial color={DARK} roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
