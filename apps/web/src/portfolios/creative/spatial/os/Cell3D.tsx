import { useMemo, useRef, type CSSProperties, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AdditiveBlending, Color, IcosahedronGeometry, MathUtils, type Group, type Mesh, type MeshPhysicalMaterial, Vector3 } from 'three';

/**
 * Oncure, in 3D: a tumour cell (a lumpy, glossy membrane with its nucleus showing through), a few
 * smooth healthy cells nearby, and AI-guided nanobots that orbit, find the tumour cell and dock
 * on it, while a scanning ring sweeps over it. Drag to turn it. `focus` lights up one part. A
 * concept illustration, not a medical image.
 */

export type CellFocus = 'tumour' | 'healthy' | 'bots' | 'ai' | null;

function lumpy(radius: number, detail: number, amount: number, seed: number) {
  const g = new IcosahedronGeometry(radius, detail);
  const p = g.attributes.position!;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const d =
      Math.sin(n.x * 5.1 + seed) * Math.cos(n.y * 4.3 + seed * 1.7) * 0.5 +
      Math.sin(n.z * 7.7 + seed * 2.3) * 0.3 +
      Math.sin((n.x + n.y) * 11 + seed) * 0.2;
    v.copy(n).multiplyScalar(radius * (1 + d * amount));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function Tumour({ focus }: { focus: CellFocus }) {
  const geo = useMemo(() => lumpy(1, 6, 0.09, 1.3), []);
  const nucleus = useMemo(() => lumpy(0.42, 4, 0.12, 4.1), []);
  const mat = useRef<MeshPhysicalMaterial>(null);
  const ring = useRef<Mesh>(null);
  const g = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (g.current) g.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.012);
    if (mat.current) mat.current.emissiveIntensity = MathUtils.lerp(mat.current.emissiveIntensity, focus === 'tumour' ? 0.55 : 0.12, 1 - Math.exp(-dt * 4));
    if (ring.current) {
      ring.current.position.y = Math.sin(t * 0.9) * 0.95;
      const r = Math.sqrt(Math.max(0.05, 1.12 * 1.12 - ring.current.position.y ** 2));
      ring.current.scale.setScalar(r);
      (ring.current.material as MeshPhysicalMaterial).opacity = focus === 'ai' ? 0.95 : focus ? 0.15 : 0.55;
    }
  });
  return (
    <group ref={g}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial ref={mat} color="#e2557a" emissive={new Color('#ff3d6e')} emissiveIntensity={0.12} roughness={0.32} clearcoat={1} clearcoatRoughness={0.25} sheen={1} sheenColor="#ffc2d4" transparent opacity={0.82} />
      </mesh>
      <mesh geometry={nucleus} position={[0.12, 0.05, 0.1]}>
        <meshPhysicalMaterial color="#7d1f4f" roughness={0.5} emissive="#5a0f36" emissiveIntensity={0.4} />
      </mesh>
      {/* AI scanning ring */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.012, 8, 96]} />
        <meshPhysicalMaterial color="#7df9ff" emissive="#7df9ff" emissiveIntensity={2} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Healthy({ focus }: { focus: CellFocus }) {
  const cells = useMemo(
    () => [
      { p: [-1.75, 0.75, -0.5], r: 0.34 },
      { p: [1.7, -0.8, -0.3], r: 0.3 },
      { p: [-1.45, -1.0, 0.4], r: 0.26 },
      { p: [1.5, 1.0, 0.2], r: 0.22 },
    ],
    [],
  );
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => (c.position.y = (cells[i]!.p[1] as number) + Math.sin(clock.elapsedTime * 0.8 + i) * 0.08));
  });
  return (
    <group ref={g}>
      {cells.map((c, i) => (
        <mesh key={i} position={c.p as [number, number, number]}>
          <sphereGeometry args={[c.r, 48, 32]} />
          <meshPhysicalMaterial color="#5f8cff" emissive="#3e6bff" emissiveIntensity={focus === 'healthy' ? 0.7 : 0.1} roughness={0.2} clearcoat={1} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Nanobots: half orbit, half fly in and dock on the membrane, then leave again. */
function Bots({ focus }: { focus: CellFocus }) {
  const N = 12;
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2, tilt: (i % 4) * 0.5 - 0.7, speed: 0.35 + (i % 3) * 0.12, dock: i % 2 === 0, phase: i * 0.9 })), []);
  const g = useRef<Group>(null);
  const v = useMemo(() => new Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((b, i) => {
      const s = seeds[i]!;
      const a = s.a + t * s.speed;
      // Docking bots breathe in from orbit to the surface and back out.
      const r = s.dock ? 1.06 + (Math.sin(t * 0.5 + s.phase) * 0.5 + 0.5) * 0.9 : 1.75 + Math.sin(t + s.phase) * 0.1;
      v.set(Math.cos(a) * r, Math.sin(a * 0.7 + s.tilt) * r * 0.55, Math.sin(a) * r);
      b.position.copy(v);
      b.lookAt(0, 0, 0);
      const glow = b.children[1] as Mesh | undefined;
      if (glow) (glow.material as MeshPhysicalMaterial).emissiveIntensity = focus === 'bots' ? 4 : 1.6;
    });
  });
  return (
    <group ref={g}>
      {seeds.map((_, i) => (
        <group key={i} scale={0.11}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.35, 0.9, 6, 16]} />
            <meshPhysicalMaterial color="#f4f7fb" metalness={0.6} roughness={0.18} clearcoat={1} />
          </mesh>
          <mesh position={[0, 0, 0.8]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshPhysicalMaterial color="#7df9ff" emissive="#43e8ff" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export interface CellLabel {
  id: Exclude<CellFocus, null>;
  k: string;
  tint: string;
}

/** Where each label sits on the model (it turns with it). */
const ANCHOR: Record<Exclude<CellFocus, null>, [number, number, number]> = {
  tumour: [0.35, 0.35, 0.95],
  healthy: [-1.75, 0.75, -0.5],
  bots: [1.25, -0.2, 1.1],
  ai: [0, 1.18, 0.25],
};

/**
 * Moves the label buttons (plain HTML laid over the canvas) to where their anchors are on screen,
 * every frame, so they turn with the model; labels on the far side fade back.
 */
function Projector({ group, els }: { group: MutableRefObject<Group | null>; els: MutableRefObject<Map<string, HTMLElement>> }) {
  const v = useMemo(() => new Vector3(), []);
  const c = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    c.set(0, 0, 0).applyMatrix4(g.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    els.current.forEach((el, id) => {
      const a = ANCHOR[id as Exclude<CellFocus, null>];
      if (!a) return;
      v.set(...a).applyMatrix4(g.matrixWorld);
      const behind = v.clone().applyMatrix4(camera.matrixWorldInverse).z < c.z - 0.2;
      v.project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
      el.style.opacity = behind ? '0.35' : '1';
    });
  });
  return null;
}

function Spin({ children, group }: { children: ReactNode; group: MutableRefObject<Group | null> }) {
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.12;
  });
  return <group ref={group}>{children}</group>;
}

export function Cell3D({ focus, labels = [], onPick = () => {} }: { focus: CellFocus; labels?: CellLabel[]; onPick?: (id: Exclude<CellFocus, null>) => void }) {
  const group = useRef<Group | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  return (
    <div className="cell3d-wrap">
      <Canvas className="cell3d" dpr={[1, 1.75]} camera={{ position: [0, 0.3, 6.6], fov: 36 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} color="#9fc4ff" />
        <pointLight position={[0, 0, 2.5]} intensity={6} color="#ff8fb0" distance={6} />
        <Spin group={group}>
          <Tumour focus={focus} />
          <Healthy focus={focus} />
          <Bots focus={focus} />
        </Spin>
        <Projector group={group} els={els} />
        <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.6} />
      </Canvas>
      {labels.map((l) => (
        <button
          key={l.id}
          ref={(el) => {
            if (el) els.current.set(l.id, el);
            else els.current.delete(l.id);
          }}
          type="button"
          className={`on-hot ${focus === l.id ? 'is-on' : ''}`}
          style={{ '--tint': l.tint } as CSSProperties}
          aria-label={l.k}
          data-voice={l.k}
          onClick={() => onPick(l.id)}
        >
          <span>{l.k}</span>
        </button>
      ))}
    </div>
  );
}
