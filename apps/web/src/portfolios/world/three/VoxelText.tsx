import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, Object3D, type InstancedMesh } from 'three';

/**
 * Giant letters built from cubes, like a voxel sign standing in the street. The text is drawn on
 * a small canvas and every lit pixel becomes a cube.
 */
export function VoxelText({
  lines,
  cube = 0.55,
  colors = ['#fff1e6', '#f7c1b4'],
  position,
  rotation = 0,
  glow = 0.12,
  plinth = false,
}: {
  lines: string[];
  cube?: number;
  colors?: [string, string];
  position: [number, number, number];
  rotation?: number;
  /** Self-light so the letters read against any background. */
  glow?: number;
  plinth?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const cells = useMemo(() => {
    const lh = 20;
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    g.font = '900 18px "Arial Black", "Arial", sans-serif';
    const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + 4;
    c.width = w;
    c.height = lh * lines.length + 2;
    g.font = '900 18px "Arial Black", "Arial", sans-serif';
    g.fillStyle = '#fff';
    g.textBaseline = 'top';
    g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, w / 2, i * lh + 1));
    const data = g.getImageData(0, 0, c.width, c.height).data;
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3]! > 120) out.push({ x: x - c.width / 2, y: c.height - y });
      }
    }
    return out;
  }, [lines]);
  const geo = useMemo(() => new BoxGeometry(cube * 0.94, cube * 0.94, cube * 2.2), [cube]);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    const a = new Color(colors[0]);
    const b = new Color(colors[1]);
    const c = new Color();
    cells.forEach((p, i) => {
      o.position.set(p.x * cube, p.y * cube, Math.sin(p.x * 0.7 + p.y) * cube * 0.15);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.copy(a).lerp(b, ((p.x * 13 + p.y * 7) % 10 + 10) % 10 / 10));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cells, cube, colors]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <instancedMesh ref={ref} args={[geo, undefined, cells.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.5} emissive={colors[0]} emissiveIntensity={glow} />
      </instancedMesh>
      {plinth && (
        <mesh position={[0, -0.6, 0]} receiveShadow castShadow>
          <boxGeometry args={[cells.reduce((m, c) => Math.max(m, Math.abs(c.x)), 0) * cube * 2 + 3, 1.2, 4]} />
          <meshStandardMaterial color="#3a3440" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}
