import { useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PlaneGeometry } from 'three';
import { BOARD_D, BOARD_W } from './layout';
import { PALETTE } from './palette';

/**
 * The case: a thick charcoal frame of anodised aluminium with softly rounded corners, a slightly
 * lighter chamfer catching the light along the top edge, and the dark plate the switches sit in.
 */
export function KeyboardCase() {
  const geo = useMemo(
    () => ({
      body: new RoundedBoxGeometry(BOARD_W + 0.8, 1.0, BOARD_D + 0.8, 6, 0.3),
      chamfer: new RoundedBoxGeometry(BOARD_W + 0.82, 0.06, BOARD_D + 0.82, 4, 0.04),
      plate: new PlaneGeometry(BOARD_W + 0.14, BOARD_D + 0.14),
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={geo.body} position={[0, -0.3, 0]}>
        <meshStandardMaterial color={PALETTE.body} metalness={0.6} roughness={0.38} />
      </mesh>
      <mesh geometry={geo.chamfer} position={[0, 0.17, 0]}>
        <meshStandardMaterial color={PALETTE.bodyEdge} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh geometry={geo.plate} position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={PALETTE.plate} metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}
