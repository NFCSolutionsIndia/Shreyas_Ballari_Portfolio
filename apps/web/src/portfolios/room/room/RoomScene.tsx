import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  MathUtils,
  PlaneGeometry,
  PMREMGenerator,
  Vector3,
  type BufferGeometry,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type Object3D,
  type PerspectiveCamera,
  type PointLight,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Gift } from '@phosphor-icons/react';
import caveatBold from '@fontsource/caveat/files/caveat-latin-700-normal.woff?url';
import { PLACES, type PlaceId } from '../places';
import { Guide } from './Guide';
import { OncureHologram } from './OncureHologram';
import { Html, RoundedBox, Text } from './drei';
import {
  achievementCard,
  lightPatch,
  marble,
  monitorScreen,
  oakFloor,
  plaster,
  rug,
  seaView,
  walnut,
  wallWash,
  whiteboardNotes,
} from './textures';

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll position as a fractional place index (0 = door, 1 = room overview, …). */
export const walkProgress = () =>
  Math.min(PLACES.length - 1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));

const smooth = (t: number) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------------------------------------
// Camera: walks between places with scroll, looks around with drag / arrow keys.
// ---------------------------------------------------------------------------------------------

function CameraRig({ zoom }: { zoom: boolean }) {
  const { camera, gl } = useThree();
  const look = useRef({ yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 });
  const pos = useRef(new Vector3(...PLACES[0]!.camera));
  const target = useRef(new Vector3(...PLACES[0]!.look));
  const lastIndex = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const l = look.current;
      l.tyaw = MathUtils.clamp(l.tyaw - (e.clientX - drag.x) * 0.004, -1.2, 1.2);
      l.tpitch = MathUtils.clamp(l.tpitch - (e.clientY - drag.y) * 0.003, -0.45, 0.45);
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => (drag = null);
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (e.key === 'ArrowLeft') look.current.tyaw = Math.min(1.2, look.current.tyaw + 0.25);
      if (e.key === 'ArrowRight') look.current.tyaw = Math.max(-1.2, look.current.tyaw - 0.25);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = walkProgress();
    const i = Math.min(PLACES.length - 2, Math.floor(p));
    const f = smooth(p - i);
    const a = PLACES[i]!;
    const b = PLACES[i + 1]!;

    // Arriving somewhere new recentres the gaze.
    const nearest = Math.round(p);
    if (nearest !== lastIndex.current) {
      lastIndex.current = nearest;
      look.current.tyaw = 0;
      look.current.tpitch = 0;
    }

    const goalPos = new Vector3(...a.camera).lerp(new Vector3(...b.camera), f);
    const goalLook = new Vector3(...a.look).lerp(new Vector3(...b.look), f);
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 4);
    pos.current.lerp(goalPos, k);
    target.current.lerp(goalLook, k);

    const l = look.current;
    l.yaw = MathUtils.lerp(l.yaw, l.tyaw, k);
    l.pitch = MathUtils.lerp(l.pitch, l.tpitch, k);

    // Apply the drag offset as a rotation of the view direction around the camera.
    const dir = target.current.clone().sub(pos.current);
    const dist = dir.length();
    const yaw = Math.atan2(dir.x, dir.z) + l.yaw;
    const pitch = Math.asin(MathUtils.clamp(dir.y / dist, -1, 1)) + l.pitch;
    camera.position.copy(pos.current);
    camera.lookAt(
      pos.current.x + Math.sin(yaw) * Math.cos(pitch),
      pos.current.y + Math.sin(pitch),
      pos.current.z + Math.cos(yaw) * Math.cos(pitch),
    );

    const cam = camera as PerspectiveCamera;
    const fov = zoom ? 38 : 58;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = MathUtils.lerp(cam.fov, fov, k);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

// ---------------------------------------------------------------------------------------------
// Lighting: day (lights on) and evening (lights off). `mood.night` eases 0 → 1 between them and
// every lamp in the room reads it.
// ---------------------------------------------------------------------------------------------

const mood = { night: 0 };

/** Soft studio reflections so wood, brass and velvet read as real materials. */
function Reflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  useFrame(() => {
    scene.environmentIntensity = 0.42 - 0.3 * mood.night;
  });
  return null;
}

/** A warm lamp whose brightness follows the day/evening mood. */
function WarmLight({ position, day, night, distance = 5, color = '#ffd2a1' }: {
  position: [number, number, number];
  day: number;
  night: number;
  distance?: number;
  color?: string;
}) {
  const light = useRef<PointLight>(null);
  useFrame(() => {
    if (light.current) light.current.intensity = day + (night - day) * mood.night;
  });
  return <pointLight ref={light} position={position} color={color} intensity={day} distance={distance} decay={1.8} />;
}

function Lights({ on }: { on: boolean }) {
  const sun = useRef<DirectionalLight>(null);
  const sunTarget = useRef<Object3D>(null);
  const hemi = useRef<HemisphereLight>(null);
  const colors = useMemo(() => ({ day: new Color('#fff0d8'), dusk: new Color('#8fa6ff') }), []);

  useEffect(() => {
    if (sun.current && sunTarget.current) sun.current.target = sunTarget.current;
  }, []);

  useFrame((_, rawDt) => {
    const k = reduceMotion ? 1 : 1 - Math.exp(-Math.min(rawDt, 0.05) * 3);
    mood.night = MathUtils.lerp(mood.night, on ? 0 : 1, k);
    if (sun.current) {
      sun.current.intensity = MathUtils.lerp(2.8, 0.35, mood.night);
      sun.current.color.copy(colors.day).lerp(colors.dusk, mood.night);
    }
    if (hemi.current) hemi.current.intensity = MathUtils.lerp(0.5, 0.15, mood.night);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff6ea', '#b08a64', 0.5]} />
      <directionalLight
        ref={sun}
        position={[3.4, 5.5, -13]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={40}
      />
      <object3D ref={sunTarget} position={[0.8, 0, -2]} />
      {/* General ceiling fill */}
      <WarmLight position={[0, 3.3, 0]} day={1.4} night={5} distance={14} />
      {/* Pink light in the corridor, for the neon "Welcome". */}
      <pointLight position={[0, 2.2, 10.6]} color="#ff7fb3" intensity={9} distance={7} decay={1.8} />
      {/* Monitor glow on the desk. */}
      <pointLight position={[-3.6, 1.4, -6.8]} color="#a77bff" intensity={2.5} distance={3} decay={2} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------------------------

const WALL = '#ebe3d7';
const ACCENT = '#2f4238'; // deep green feature wall behind the desk and window
const TRIM = '#f3ede3';
const BRASS = { color: '#c9a25a', metalness: 1, roughness: 0.28 } as const;
const STEEL = { color: '#1d1d1f', metalness: 0.6, roughness: 0.45 } as const;
const W = 7; // half width
const D = 8; // half depth
const H = 3.6;

/** Textures shared by many objects, created once per visit. */
function useMaterials() {
  return useMemo(
    () => ({
      wall: plaster(WALL, 3),
      accent: plaster(ACCENT, 5),
      corridor: plaster('#e9d2d3', 7),
      walnut: walnut(8),
      marble: marble(12),
    }),
    [],
  );
}
type Mats = ReturnType<typeof useMaterials>;

function Box({ args, position, color = WALL, cast = false, rotation, map, roughness = 0.9 }: {
  args: [number, number, number];
  position: [number, number, number];
  color?: string;
  cast?: boolean;
  rotation?: [number, number, number];
  map?: Mats['walnut'];
  roughness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={map ? '#ffffff' : color} map={map} roughness={roughness} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------
// Architecture
// ---------------------------------------------------------------------------------------------

/**
 * Mouldings for one wall, merged into a single mesh: skirting, chair rail, crown and
 * wainscot panel frames. Built along local x and facing local +z.
 */
function mouldings(length: number, { rail = true, panels = true, crown = true } = {}) {
  const parts: BufferGeometry[] = [];
  const bar = (w: number, h: number, d: number, x: number, y: number) => {
    const g = new BoxGeometry(w, h, d);
    g.translate(x, y, d / 2);
    parts.push(g);
  };
  bar(length, 0.16, 0.025, 0, 0.08);
  if (crown) bar(length, 0.12, 0.06, 0, H - 0.06);
  if (rail) bar(length, 0.05, 0.035, 0, 1.0);
  if (panels) {
    const n = Math.max(1, Math.round(length / 1.5));
    const pw = length / n;
    for (let i = 0; i < n; i++) {
      const x0 = -length / 2 + i * pw + 0.14;
      const x1 = -length / 2 + (i + 1) * pw - 0.14;
      const cx = (x0 + x1) / 2;
      bar(x1 - x0, 0.025, 0.015, cx, 0.3);
      bar(x1 - x0, 0.025, 0.015, cx, 0.84);
      bar(0.025, 0.54, 0.015, x0, 0.57);
      bar(0.025, 0.54, 0.015, x1, 0.57);
    }
  }
  return mergeGeometries(parts);
}

function Mouldings({ length, position, rotation, color = TRIM, ...opts }: {
  length: number;
  position: [number, number, number];
  rotation: [number, number, number];
  color?: string;
  rail?: boolean;
  panels?: boolean;
  crown?: boolean;
}) {
  const geo = useMemo(() => mouldings(length, opts), [length, opts.rail, opts.panels, opts.crown]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh geometry={geo} position={position} rotation={rotation} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

/** Linen curtain with soft pleats. */
function Curtain({ position, width, height }: { position: [number, number, number]; width: number; height: number }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(width, height, 64, 1);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / width) * Math.PI * 2 * 5) * 0.045);
    g.computeVertexNormals();
    return g;
  }, [width, height]);
  return (
    <mesh geometry={geo} position={position} castShadow>
      <meshStandardMaterial color="#efe7da" roughness={1} side={DoubleSide} transparent opacity={0.94} />
    </mesh>
  );
}

function Architecture({ doorAngle, mats }: { doorAngle: React.RefObject<number>; mats: Mats }) {
  const floor = useMemo(() => oakFloor(W * 2, D * 2 + 7), []);
  const sea = useMemo(() => seaView(), []);
  const patch = useMemo(() => lightPatch(), []);
  const wash = useMemo(() => wallWash(), []);
  const door = useRef<Group>(null);

  useFrame(() => {
    if (door.current) door.current.rotation.y = doorAngle.current ?? 0;
  });

  const wall = (args: [number, number, number], position: [number, number, number], map = mats.wall) => (
    <mesh position={position} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial map={map} roughness={0.95} />
    </mesh>
  );

  return (
    <group>
      {/* Oak floor (room + corridor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3.5]} receiveShadow>
        <planeGeometry args={[W * 2, D * 2 + 7]} />
        <meshPhysicalMaterial
          map={floor.map}
          bumpMap={floor.bump}
          bumpScale={0.6}
          roughness={0.55}
          clearcoat={0.2}
          clearcoatRoughness={0.4}
        />
      </mesh>

      {/* Ceiling with a lowered edge hiding a warm cove light */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 3.5]}>
        <planeGeometry args={[W * 2, D * 2 + 7]} />
        <meshStandardMaterial color="#f5f1ea" roughness={1} />
      </mesh>
      {(
        [
          [[W * 2, 0.14, 0.6], [0, H - 0.07, -D + 0.3]],
          [[W * 2, 0.14, 0.6], [0, H - 0.07, D - 0.3]],
          [[0.6, 0.14, D * 2], [-W + 0.3, H - 0.07, 0]],
          [[0.6, 0.14, D * 2], [W - 0.3, H - 0.07, 0]],
        ] as const
      ).map(([args, position], i) => (
        <Box key={i} args={[...args]} position={[...position]} color="#f5f1ea" roughness={1} />
      ))}
      {(
        [
          [[W * 2 - 1.2, 0.02, 0.02], [0, H - 0.15, -D + 0.61]],
          [[W * 2 - 1.2, 0.02, 0.02], [0, H - 0.15, D - 0.61]],
          [[0.02, 0.02, D * 2 - 1.2], [-W + 0.61, H - 0.15, 0]],
          [[0.02, 0.02, D * 2 - 1.2], [W - 0.61, H - 0.15, 0]],
        ] as const
      ).map(([args, position], i) => (
        <mesh key={i} position={[...position]}>
          <boxGeometry args={[...args]} />
          <meshBasicMaterial color="#ffd9a6" toneMapped={false} />
        </mesh>
      ))}
      {/* The cove's glow washing down the walls */}
      {(
        [
          [[-W + 0.06, H - 0.75, 0], [0, Math.PI / 2, 0], D * 2],
          [[W - 0.06, H - 0.75, 0], [0, -Math.PI / 2, 0], D * 2],
          [[0, H - 0.75, D - 0.06], [0, Math.PI, 0], W * 2],
        ] as const
      ).map(([position, rotation, len], i) => (
        <mesh key={i} position={[...position]} rotation={[...rotation]}>
          <planeGeometry args={[len, 1.2]} />
          <meshBasicMaterial map={wash} transparent blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {/* Downlights */}
      {[-3, 3].flatMap((x) =>
        [-4.5, 0, 4.5].map((z) => (
          <group key={`${x}${z}`} position={[x, H - 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[0.08, 0.1, 32]} />
              <meshStandardMaterial {...BRASS} side={DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.08, 32]} />
              <meshBasicMaterial color="#fff6e0" toneMapped={false} />
            </mesh>
          </group>
        )),
      )}

      {/* Side walls, plaster with wainscoting */}
      {wall([0.1, H, D * 2], [-W, H / 2, 0])}
      {wall([0.1, H, D * 2], [W, H / 2, 0])}
      <Mouldings length={D * 2} position={[-W + 0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Mouldings length={D * 2} position={[W - 0.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Back wall in deep green, with a tall steel-framed window (x 0.9…3.9, y 0.6…3.0) */}
      {wall([7.9, H, 0.1], [-3.05, H / 2, -D], mats.accent)}
      {wall([3.1, H, 0.1], [5.45, H / 2, -D], mats.accent)}
      {wall([3, 0.6, 0.1], [2.4, 0.3, -D], mats.accent)}
      {wall([3, H - 3, 0.1], [2.4, 3 + (H - 3) / 2, -D], mats.accent)}
      <Mouldings length={W * 2} position={[0, 0, -D + 0.05]} rotation={[0, 0, 0]} color="#2a3a31" rail={false} panels={false} />
      <mesh position={[2.4, 1.9, -D - 0.6]}>
        <planeGeometry args={[4.4, 3.2]} />
        <meshBasicMaterial map={sea} toneMapped={false} />
      </mesh>
      {/* Steel frame and glazing bars */}
      {(
        [
          [[3.1, 0.07, 0.12], [2.4, 3.0, -D]],
          [[3.1, 0.07, 0.12], [2.4, 0.6, -D]],
          [[0.07, 2.47, 0.12], [0.88, 1.8, -D]],
          [[0.07, 2.47, 0.12], [3.92, 1.8, -D]],
          [[0.04, 2.4, 0.06], [1.9, 1.8, -D]],
          [[0.04, 2.4, 0.06], [2.9, 1.8, -D]],
          [[3.0, 0.04, 0.06], [2.4, 2.35, -D]],
        ] as const
      ).map(([args, position], i) => (
        <mesh key={i} position={[...position]} castShadow>
          <boxGeometry args={[...args]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      ))}
      <Box args={[3.3, 0.05, 0.3]} position={[2.4, 0.58, -D + 0.14]} map={mats.marble} roughness={0.3} />
      {/* Curtains on a brass rod */}
      <mesh position={[2.4, 3.25, -D + 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 4.4, 10]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <Curtain position={[0.4, 1.66, -D + 0.22]} width={0.75} height={3.15} />
      <Curtain position={[4.4, 1.66, -D + 0.22]} width={0.75} height={3.15} />
      {/* Sunlight falling through the window onto the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[2.0, 0.012, -4.4]}>
        <planeGeometry args={[3.4, 4.6]} />
        <meshBasicMaterial map={patch} transparent opacity={0.45} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Front wall with the door opening (x −0.6…0.6, height 2.2) */}
      {wall([W - 0.6, H, 0.1], [-(W + 0.6) / 2, H / 2, D])}
      {wall([W - 0.6, H, 0.1], [(W + 0.6) / 2, H / 2, D])}
      {wall([1.2, H - 2.2, 0.1], [0, 2.2 + (H - 2.2) / 2, D])}
      <Mouldings length={W - 0.75} position={[-(W + 0.75) / 2, 0, D - 0.05]} rotation={[0, Math.PI, 0]} crown={false} />
      <Mouldings length={W - 0.75} position={[(W + 0.75) / 2, 0, D - 0.05]} rotation={[0, Math.PI, 0]} crown={false} />
      <Box args={[W * 2, 0.12, 0.06]} position={[0, H - 0.06, D - 0.08]} color={TRIM} roughness={0.75} />
      {/* Door frame */}
      <Box args={[1.5, 0.12, 0.2]} position={[0, 2.26, D]} color={TRIM} />
      <Box args={[0.12, 2.3, 0.2]} position={[-0.68, 1.15, D]} color={TRIM} />
      <Box args={[0.12, 2.3, 0.2]} position={[0.68, 1.15, D]} color={TRIM} />
      {/* Door leaf, hinged on its left edge; opens as you walk in */}
      <group ref={door} position={[-0.6, 0, D + 0.03]}>
        <mesh position={[0.6, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 2.2, 0.05]} />
          <meshStandardMaterial color="#f7f3f1" roughness={0.6} />
        </mesh>
        <mesh position={[1.06, 1.0, 0.05]}>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[1.06, 1.0, -0.05]}>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        {/* Neon sign on the corridor side */}
        <mesh position={[0.6, 1.5, 0.04]}>
          <boxGeometry args={[0.72, 0.26, 0.01]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
        </mesh>
        <Text
          font={caveatBold}
          position={[0.6, 1.5, 0.05]}
          fontSize={0.17}
          color="#ffe1ee"
          outlineWidth={0.012}
          outlineBlur={0.06}
          outlineColor="#ff4f9a"
          anchorX="center"
          anchorY="middle"
        >
          Welcome
        </Text>
      </group>

      {/* Corridor outside the door */}
      {wall([0.1, H, 7], [-1.4, H / 2, D + 3.5], mats.corridor)}
      {wall([0.1, H, 7], [1.4, H / 2, D + 3.5], mats.corridor)}
      {wall([2.8, H, 0.1], [0, H / 2, D + 7], mats.corridor)}
      <Mouldings length={7} position={[-1.35, 0, D + 3.5]} rotation={[0, Math.PI / 2, 0]} color="#f1e1e1" crown={false} />
      <Mouldings length={7} position={[1.35, 0, D + 3.5]} rotation={[0, -Math.PI / 2, 0]} color="#f1e1e1" crown={false} />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// Furniture, one group per place. Clicking a place's objects opens its page.
// ---------------------------------------------------------------------------------------------

function Clickable({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {children}
    </group>
  );
}

/** Upholstered chair with slim brass legs; faces local +z. */
function Chair({ position, rotation = 0, color = '#8a4f2c' }: { position: [number, number, number]; rotation?: number; color?: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[0.56, 0.1, 0.52]} radius={0.04} position={[0, 0.48, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.56, 0.5, 0.08]} radius={0.035} position={[0, 0.8, -0.25]} rotation={[-0.12, 0, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
      {[[-0.23, -0.2], [0.23, -0.2], [-0.23, 0.2], [0.23, 0.2]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.22, z!]} castShadow>
          <cylinderGeometry args={[0.014, 0.011, 0.44, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ mats }: { mats: Mats }) {
  const screen = useMemo(() => monitorScreen(), []);
  return (
    <group position={[-3.6, 0, -7.2]}>
      <RoundedBox args={[1.9, 0.05, 0.8]} radius={0.02} position={[0, 0.76, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={mats.walnut} roughness={0.45} />
      </RoundedBox>
      {/* Steel sled legs */}
      {[-0.85, 0.85].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box args={[0.035, 0.74, 0.035]} position={[0, 0.37, -0.32]} color={STEEL.color} cast />
          <Box args={[0.035, 0.74, 0.035]} position={[0, 0.37, 0.32]} color={STEEL.color} cast />
          <Box args={[0.035, 0.035, 0.68]} position={[0, 0.02, 0]} color={STEEL.color} cast />
        </group>
      ))}
      <Box args={[1.6, 0.1, 0.22]} position={[0, 0.84, -0.26]} map={mats.walnut} roughness={0.45} cast />
      {/* Monitor */}
      <Box args={[0.05, 0.3, 0.05]} position={[0, 1.04, -0.22]} color="#222" />
      <RoundedBox args={[1.05, 0.62, 0.04]} radius={0.015} position={[0, 1.44, -0.22]} castShadow>
        <meshStandardMaterial color="#1a1a1d" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.44, -0.195]}>
        <planeGeometry args={[0.98, 0.56]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* Keyboard, books, mug */}
      <Box args={[0.46, 0.02, 0.14]} position={[0, 0.79, 0.12]} color="#e8e4dc" />
      {['#2f4a5c', '#b2603f', '#e6dccb'].map((c, i) => (
        <Box key={c} args={[0.24, 0.035, 0.32]} position={[-0.62, 0.8 + i * 0.036, 0.05]} rotation={[0, i * 0.12, 0]} color={c} cast />
      ))}
      <mesh position={[0.4, 0.83, 0.15]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.09, 20]} />
        <meshStandardMaterial color="#f2eee6" roughness={0.3} />
      </mesh>
      {/* Brass desk lamp */}
      <group position={[0.72, 0.785, -0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.02, 24]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0.25]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.45, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[-0.1, 0.43, 0.02]} rotation={[0, 0, -0.6]} castShadow>
          <coneGeometry args={[0.09, 0.14, 24, 1, true]} />
          <meshStandardMaterial {...BRASS} side={DoubleSide} />
        </mesh>
        <WarmLight position={[-0.12, 0.38, 0.05]} day={0.4} night={2.4} distance={2.2} />
      </group>
      <Chair position={[0, 0, 0.78]} rotation={Math.PI} />
    </group>
  );
}

function Gallery({ mats }: { mats: Mats }) {
  // Confirmed milestones only (src/content/portfolio.ts, family details of 2026-11-10).
  const frames = useMemo(
    () =>
      [
        { z: -3.0, y: 2.05, w: 1.26, h: 0.9, card: { kind: 'Award', title: 'Young Authors Contest', detail: 'Winner\nIndian Prairie School District 204', year: '2023', accent: '#9c4f33' } },
        { z: -1.55, y: 2.3, w: 0.84, h: 0.6, card: { kind: 'Certificate', title: 'Mini-Medical School', detail: 'Certificate of completion', year: '2021', accent: '#2f4a5c' } },
        { z: -1.55, y: 1.62, w: 0.84, h: 0.6, card: { kind: 'Program', title: 'Project Arrow', detail: 'IPSD, since 2nd grade', year: '', accent: '#3e5a45' } },
        { z: -0.15, y: 2.05, w: 1.12, h: 0.8, card: { kind: 'Award', title: 'College Board NRP', detail: 'National Recognition Program\nrecipient', year: '', accent: '#2f4a5c' } },
        { z: 1.05, y: 2.3, w: 0.7, h: 0.5, card: { kind: 'Scores', title: 'PSAT & MAP', detail: '98th to 99th percentile\nPSAT 8/9: 1280 of 1440', year: '', accent: '#a85d3f' } },
        { z: 1.05, y: 1.7, w: 0.7, h: 0.5, card: { kind: 'Honor', title: 'Principal’s Honors List', detail: 'Fulton Science Academy', year: '2025 · 2026', accent: '#3e5a45' } },
      ].map((f) => ({ ...f, tex: achievementCard(f.card) })),
    [],
  );
  return (
    <group>
      {frames.map((f) => (
        <group key={f.card.title} position={[W - 0.06, f.y, f.z]} rotation={[0, -Math.PI / 2, 0]}>
          <Box args={[f.w + 0.07, f.h + 0.07, 0.035]} position={[0, 0, 0]} color="#1b1a19" roughness={0.45} cast />
          <mesh position={[0, 0, 0.019]}>
            <planeGeometry args={[f.w, f.h]} />
            <meshStandardMaterial map={f.tex} roughness={0.7} />
          </mesh>
          {/* Picture light */}
          <mesh position={[0, f.h / 2 + 0.08, 0.08]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, Math.min(0.55, f.w * 0.6), 16]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        </group>
      ))}
      <WarmLight position={[W - 0.5, 2.9, -1.4]} day={0.6} night={3} distance={4} color="#ffe2b8" />
      {/* Floating walnut shelf with a medal and a trophy */}
      <Box args={[0.26, 0.05, 1.6]} position={[W - 0.18, 1.0, -2.4]} map={mats.walnut} roughness={0.45} cast />
      <mesh position={[W - 0.22, 1.17, -2.85]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.025, 40]} />
        <meshStandardMaterial color="#d8a93c" metalness={1} roughness={0.22} />
      </mesh>
      <group position={[W - 0.22, 1.025, -2.3]}>
        <Box args={[0.14, 0.05, 0.14]} position={[0, 0.025, 0]} color="#1b1a19" roughness={0.4} />
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.04, 0.2, 20]} />
          <meshStandardMaterial color="#d8a93c" metalness={1} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.04, 0.16, 28]} />
          <meshStandardMaterial color="#d8a93c" metalness={1} roughness={0.22} />
        </mesh>
      </group>
    </group>
  );
}

function Bookshelf({ mats }: { mats: Mats }) {
  const books = useMemo(() => {
    const colors = ['#7d3b2e', '#2f4a5c', '#3e5a45', '#c2a370', '#8c8378', '#a85d3f', '#e6dccb', '#1f2a33'];
    const out: { y: number; z: number; h: number; c: string; lean: number }[] = [];
    [0.44, 1.04, 1.64].forEach((y, row) => {
      let z = -1.08 + row * 0.2;
      let i = row * 3;
      while (z < 0.6 - row * 0.15) {
        const w = 0.05 + ((i * 7) % 5) * 0.01;
        out.push({ y, z: z + w / 2, h: 0.28 + ((i * 3) % 4) * 0.035, c: colors[i % colors.length]!, lean: 0 });
        z += w + 0.006;
        i++;
      }
    });
    return out;
  }, []);
  return (
    <group position={[-W + 0.25, 0, -0.4]}>
      {/* Open case: back, sides and top */}
      <Box args={[0.03, 2.3, 2.4]} position={[-0.2, 1.15, 0]} map={mats.walnut} roughness={0.5} cast />
      <Box args={[0.42, 2.3, 0.04]} position={[0.02, 1.15, -1.18]} map={mats.walnut} roughness={0.5} cast />
      <Box args={[0.42, 2.3, 0.04]} position={[0.02, 1.15, 1.18]} map={mats.walnut} roughness={0.5} cast />
      <Box args={[0.42, 0.12, 2.4]} position={[0.02, 0.06, 0]} map={mats.walnut} roughness={0.5} />
      {[0.42, 1.02, 1.62, 2.22].map((y) => (
        <group key={y}>
          <Box args={[0.42, 0.04, 2.32]} position={[0.02, y, 0]} map={mats.walnut} roughness={0.5} />
          {/* LED strip under each shelf */}
          <mesh position={[0.18, y - 0.025, 0]}>
            <boxGeometry args={[0.02, 0.008, 2.2]} />
            <meshBasicMaterial color="#ffdcae" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[0.06, b.y + b.h / 2 + 0.02, b.z]} castShadow>
          <boxGeometry args={[0.24, b.h, 0.06]} />
          <meshStandardMaterial color={b.c} roughness={0.75} />
        </mesh>
      ))}
      {/* Ceramic vase and brass globe */}
      <mesh position={[0.06, 1.2, 0.85]} castShadow>
        <sphereGeometry args={[0.12, 24, 18]} />
        <meshStandardMaterial color="#d9cbb5" roughness={0.6} />
      </mesh>
      <group position={[0.04, 2.24, 0.6]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <sphereGeometry args={[0.16, 32, 24]} />
          <meshStandardMaterial color="#2f4a5c" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.18, 0.008, 8, 48]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.03, 24]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      </group>
      <WarmLight position={[0.4, 1.4, 0]} day={0.3} night={1.6} distance={2.5} />
    </group>
  );
}

function Whiteboard({ mats }: { mats: Mats }) {
  const notes = useMemo(() => whiteboardNotes(), []);
  return (
    <group>
      <group position={[-W + 0.07, 1.75, 4.4]} rotation={[0, Math.PI / 2, 0]}>
        <Box args={[2.3, 1.4, 0.05]} position={[0, 0, 0]} map={mats.walnut} roughness={0.5} cast />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[2.18, 1.28]} />
          <meshStandardMaterial map={notes} roughness={0.3} />
        </mesh>
        <Box args={[1.6, 0.04, 0.12]} position={[0, -0.74, 0.06]} map={mats.walnut} roughness={0.5} />
        {['#2346c8', '#e04f3c'].map((c, i) => (
          <mesh key={c} position={[-0.3 + i * 0.25, -0.7, 0.08]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.18, 10]} />
            <meshStandardMaterial color={c} />
          </mesh>
        ))}
      </group>
      {/* Small round study table for tutoring sessions */}
      <group position={[-5.3, 0, 4.4]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.04, 48]} />
          <meshStandardMaterial map={mats.walnut} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.72, 16]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.02, 32]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <Box args={[0.3, 0.02, 0.22]} position={[0.1, 0.77, 0.05]} rotation={[0, 0.3, 0]} color="#f6f2ea" />
      </group>
      <Chair position={[-5.3, 0, 3.55]} color="#3e5a45" />
      <Chair position={[-5.3, 0, 5.25]} rotation={Math.PI} color="#3e5a45" />
    </group>
  );
}

function Crystal({ mats }: { mats: Mats }) {
  const core = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (core.current && !reduceMotion) {
      core.current.rotation.y = clock.elapsedTime * 0.6;
      core.current.position.y = 1.36 + Math.sin(clock.elapsedTime * 1.4) * 0.02;
    }
  });
  return (
    <group position={[2.4, 0, -6.4]}>
      {/* Marble plinth with a brass cap */}
      <Box args={[0.5, 0.98, 0.5]} position={[0, 0.49, 0]} map={mats.marble} roughness={0.25} cast />
      <mesh position={[0, 0.995, 0]}>
        <boxGeometry args={[0.54, 0.03, 0.54]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 1.24, 0]} castShadow>
        <sphereGeometry args={[0.22, 40, 30]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.02} transmission={1} thickness={0.4} ior={1.4} transparent />
      </mesh>
      <group ref={core} position={[0, 1.36, 0]}>
        <mesh position={[0, -0.12, 0]}>
          <icosahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#ff8cc6" emissive="#ff5fae" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 1.25, 0]} color="#ff8cc6" intensity={1.2} distance={2} />
    </group>
  );
}

/** Potted plant: glossy leaves on stems in a ceramic pot. */
function Plant({ position, scale = 1, pot = '#e9e2d6' }: { position: [number, number, number]; scale?: number; pot?: string }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        a: i * 2.4,
        tilt: 0.35 + (i % 4) * 0.13,
        h: 0.75 + ((i * 5) % 7) * 0.09,
        c: ['#3f6b3c', '#4f7d4a', '#5f9058', '#365e35'][i % 4]!,
      })),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.19, 0.54, 32]} />
        <meshStandardMaterial color={pot} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.53, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.02, 24]} />
        <meshStandardMaterial color="#4a3526" roughness={1} />
      </mesh>
      {leaves.map((l, i) => {
        const r = 0.12 + l.tilt * 0.35;
        return (
          <group key={i} rotation={[0, l.a, 0]}>
            <mesh position={[0, 0.54 + l.h * 0.45, r * 0.5]} rotation={[l.tilt, 0, 0]}>
              <cylinderGeometry args={[0.006, 0.008, l.h * 0.9, 5]} />
              <meshStandardMaterial color="#4c6b3a" />
            </mesh>
            <mesh
              position={[0, 0.54 + l.h * 0.92, r]}
              rotation={[l.tilt + 0.6, 0, 0]}
              scale={[1, 1.9, 0.18]}
              castShadow
            >
              <sphereGeometry args={[0.11, 14, 10]} />
              <meshStandardMaterial color={l.c} roughness={0.38} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Wardrobe({ mats }: { mats: Mats }) {
  return (
    <group position={[-W + 0.4, 0, -6.6]}>
      <Box args={[0.7, 2.4, 1.3]} position={[0, 1.2, 0]} map={mats.walnut} roughness={0.5} cast />
      {/* Fluted doors */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[0.36, 1.22, -0.6 + i * 0.1]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.2, 10, 1, false, 0, Math.PI]} />
          <meshStandardMaterial map={mats.walnut} roughness={0.5} />
        </mesh>
      ))}
      {[-0.06, 0.06].map((z) => (
        <mesh key={z} position={[0.41, 1.2, z]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 10]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
    </group>
  );
}

function Clock() {
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  useFrame(() => {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    const h = (now.getHours() % 12) + m / 60;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
  });
  return (
    <group position={[-0.8, 2.55, -D + 0.07]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.04, 48]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <circleGeometry args={[0.24, 48]} />
        <meshStandardMaterial color="#f6f1e7" roughness={0.6} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.2, Math.cos((i / 12) * Math.PI * 2) * 0.2, 0.024]} rotation={[0, 0, -(i / 12) * Math.PI * 2]}>
          <planeGeometry args={[0.008, i % 3 ? 0.02 : 0.04]} />
          <meshBasicMaterial color="#1b1a19" />
        </mesh>
      ))}
      <group position={[0, 0, 0.03]}>
        <group ref={hour}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.014, 0.12, 0.004]} />
            <meshBasicMaterial color="#1b1a19" />
          </mesh>
        </group>
        <group ref={minute}>
          <mesh position={[0, 0.09, 0.005]}>
            <boxGeometry args={[0.009, 0.18, 0.004]} />
            <meshBasicMaterial color="#1b1a19" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Lounge corner: velvet sofa, two bouclé chairs, marble coffee table, rug and pendants. */
function Lounge({ mats }: { mats: Mats }) {
  const rugTex = useMemo(() => rug(), []);
  const velvet = { color: '#8f4a33', roughness: 0.8, sheen: 1, sheenColor: '#e5a585', sheenRoughness: 0.45 } as const;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.6, 0.008, 3.4]} receiveShadow>
        <planeGeometry args={[3.6, 3.4]} />
        <meshStandardMaterial map={rugTex} roughness={1} />
      </mesh>
      {/* Sofa against the right wall, facing into the room */}
      <group position={[6.45, 0, 3.4]} rotation={[0, -Math.PI / 2, 0]}>
        <RoundedBox args={[2.4, 0.28, 0.95]} radius={0.06} position={[0, 0.24, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial {...velvet} />
        </RoundedBox>
        {[-0.56, 0.56].map((x) => (
          <group key={x}>
            <RoundedBox args={[1.1, 0.16, 0.72]} radius={0.06} position={[x, 0.45, 0.09]} castShadow>
              <meshPhysicalMaterial {...velvet} />
            </RoundedBox>
            <RoundedBox args={[1.1, 0.5, 0.24]} radius={0.09} position={[x, 0.72, -0.32]} rotation={[-0.12, 0, 0]} castShadow>
              <meshPhysicalMaterial {...velvet} />
            </RoundedBox>
          </group>
        ))}
        {[-1.2, 1.2].map((x) => (
          <RoundedBox key={x} args={[0.2, 0.58, 0.95]} radius={0.08} position={[x, 0.4, 0]} castShadow>
            <meshPhysicalMaterial {...velvet} />
          </RoundedBox>
        ))}
        {[[-0.85, 0.12], [0.8, -0.1]].map(([x, r]) => (
          <RoundedBox key={x} args={[0.42, 0.38, 0.12]} radius={0.05} position={[x!, 0.68, -0.15]} rotation={[-0.3, r!, 0]} castShadow>
            <meshStandardMaterial color="#efe7d8" roughness={1} />
          </RoundedBox>
        ))}
        {[[-1.1, -0.38], [1.1, -0.38], [-1.1, 0.38], [1.1, 0.38]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x!, 0.05, z!]}>
            <cylinderGeometry args={[0.025, 0.02, 0.1, 10]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        ))}
      </group>
      {/* Bouclé lounge chairs facing the sofa */}
      {[2.65, 4.15].map((z) => (
        <group key={z} position={[3.25, 0, z]} rotation={[0, Math.PI / 2 + (z < 3.4 ? 0.25 : -0.25), 0]}>
          <RoundedBox args={[0.82, 0.3, 0.78]} radius={0.14} position={[0, 0.3, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#ece4d6" roughness={1} />
          </RoundedBox>
          <RoundedBox args={[0.82, 0.5, 0.24]} radius={0.11} position={[0, 0.58, -0.3]} castShadow>
            <meshStandardMaterial color="#ece4d6" roughness={1} />
          </RoundedBox>
          {[[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]].map(([x, zz]) => (
            <mesh key={`${x}${zz}`} position={[x!, 0.07, zz!]}>
              <cylinderGeometry args={[0.022, 0.018, 0.14, 10]} />
              <meshStandardMaterial map={mats.walnut} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Marble coffee table */}
      <group position={[4.75, 0, 3.4]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 64]} />
          <meshStandardMaterial map={mats.marble} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.19, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.26, 0.38, 32]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <Box args={[0.3, 0.04, 0.22]} position={[-0.12, 0.445, 0.05]} rotation={[0, 0.4, 0]} color="#2f4a5c" cast />
        <Box args={[0.26, 0.03, 0.2]} position={[-0.12, 0.48, 0.05]} rotation={[0, 0.2, 0]} color="#e6dccb" cast />
        <mesh position={[0.18, 0.5, -0.1]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.16, 20]} />
          <meshStandardMaterial color="#b2603f" roughness={0.4} />
        </mesh>
      </group>
      {/* Two opal globe pendants */}
      {[2.95, 3.85].map((z) => (
        <group key={z} position={[4.75, 0, z]}>
          <mesh position={[0, (H + 2.75) / 2, 0]}>
            <cylinderGeometry args={[0.004, 0.004, H - 2.75, 6]} />
            <meshStandardMaterial color="#1b1a19" />
          </mesh>
          <mesh position={[0, 2.78, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 0.06, 16]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
          <mesh position={[0, 2.62, 0]}>
            <sphereGeometry args={[0.15, 32, 24]} />
            <meshStandardMaterial color="#fff4e2" emissive="#ffe2b6" emissiveIntensity={1.4} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <WarmLight position={[4.75, 2.45, 3.4]} day={1.6} night={5} distance={5.5} />
      {/* Floor lamp at the end of the sofa */}
      <group position={[6.4, 0, 5.0]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.03, 32]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.6, 10]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.3, 32, 1, true]} />
          <meshStandardMaterial color="#f1e8d8" emissive="#ffd9a6" emissiveIntensity={0.5} side={DoubleSide} roughness={1} />
        </mesh>
        <WarmLight position={[0, 1.6, 0]} day={0.5} night={3} distance={3.5} />
      </group>
    </group>
  );
}

function PhoneTable({ mats }: { mats: Mats }) {
  return (
    <group position={[5.6, 0, 6]}>
      <mesh position={[0, 0.66, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.04, 48]} />
        <meshStandardMaterial map={mats.walnut} roughness={0.45} />
      </mesh>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.2, 0.32, Math.cos(a) * 0.2]} rotation={[Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]} castShadow>
          <cylinderGeometry args={[0.018, 0.014, 0.66, 8]} />
          <meshStandardMaterial map={mats.walnut} />
        </mesh>
      ))}
      <RoundedBox args={[0.32, 0.12, 0.24]} radius={0.04} position={[0, 0.74, 0]} castShadow>
        <meshStandardMaterial color="#b5523b" roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[0.36, 0.05, 0.08]} radius={0.02} position={[0, 0.83, 0]} castShadow>
        <meshStandardMaterial color="#b5523b" roughness={0.35} />
      </RoundedBox>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// Hotspot labels
// ---------------------------------------------------------------------------------------------

function Hotspots({ current, onGoTo, onOpen, onGift }: {
  current: number;
  onGoTo: (id: PlaceId) => void;
  onOpen: (id: PlaceId) => void;
  onGift: () => void;
}) {
  // Hidden in the corridor (drei's Html ignores group visibility); they appear once you're inside.
  if (current === 0) return null;
  return (
    <group>
      {PLACES.map((p, i) =>
        p.hotspot ? (
          <Html key={p.id} position={p.hotspot.at} center zIndexRange={[30, 10]}>
            <button
              type="button"
              onClick={() => (current === i ? onOpen(p.id) : onGoTo(p.id))}
              className="room-hotspot"
            >
              <p.icon size={13} weight="bold" aria-hidden="true" />
              {current === i ? `Open ${p.hotspot.label.toLowerCase()}` : p.hotspot.label}
            </button>
          </Html>
        ) : null,
      )}
      <Html position={[2.4, 1.75, -6.4]} center zIndexRange={[30, 10]}>
        <button type="button" onClick={onGift} className="room-hotspot">
          <Gift size={13} weight="bold" aria-hidden="true" />A gift is inside
        </button>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

function DoorDriver({ angle }: { angle: React.RefObject<number> }) {
  useFrame(() => {
    // The door swings open over the first stretch of the walk.
    const p = walkProgress();
    (angle as { current: number }).current = -smooth(Math.min(1, Math.max(0, (p - 0.05) / 0.55))) * 1.8;
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

export interface RoomSceneProps {
  lightsOn: boolean;
  zoom: boolean;
  current: number;
  onGoTo: (id: PlaceId) => void;
  onOpen: (id: PlaceId) => void;
  onGift: () => void;
  onReady: () => void;
}

function Room({ lightsOn, zoom, current, onGoTo, onOpen, onGift, onReady }: RoomSceneProps) {
  const doorAngle = useRef(0);
  const mats = useMaterials();
  return (
    <>
      <color attach="background" args={['#d8d3cc']} />
      <Reflections />
      <Lights on={lightsOn} />
      <CameraRig zoom={zoom} />
      <DoorDriver angle={doorAngle} />
      <Architecture doorAngle={doorAngle} mats={mats} />
      <Wardrobe mats={mats} />
      <Clock />
      <Plant position={[5.9, 0, -6.7]} scale={1.15} />
      <Plant position={[6.35, 0, 1.55]} scale={0.95} pot="#b5674a" />
      <Plant position={[-6.35, 0, 7.3]} scale={1.05} pot="#2f4238" />
      <Lounge mats={mats} />
      <Clickable onClick={() => onOpen('research')}>
        <Desk mats={mats} />
      </Clickable>
      <Clickable onClick={() => onOpen('about')}>
        <group position={[2.4, 1.8, -D + 0.05]}>
          <mesh>
            <planeGeometry args={[3, 2.4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </Clickable>
      <Clickable onClick={onGift}>
        <Crystal mats={mats} />
      </Clickable>
      <Clickable onClick={() => onOpen('achievements')}>
        <Gallery mats={mats} />
      </Clickable>
      <Clickable onClick={() => onOpen('journey')}>
        <Bookshelf mats={mats} />
      </Clickable>
      <Clickable onClick={() => onOpen('tutoring')}>
        <Whiteboard mats={mats} />
      </Clickable>
      <Clickable onClick={() => onOpen('contact')}>
        <PhoneTable mats={mats} />
      </Clickable>
      <OncureHologram active={PLACES[current]?.id === 'research'} />
      <Guide current={current} onGoTo={onGoTo} onOpen={onOpen} />
      <Hotspots current={current} onGoTo={onGoTo} onOpen={onOpen} onGift={onGift} />
      <Ready onReady={onReady} />
    </>
  );
}

export default function RoomScene(props: RoomSceneProps) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      camera={{ fov: 58, near: 0.05, far: 60, position: PLACES[0]!.camera }}
      onPointerMissed={() => (document.body.style.cursor = '')}
      aria-hidden="true"
    >
      <Room {...props} />
    </Canvas>
  );
}
