import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  VSMShadowMap,
  type Color,
  type ShaderMaterial,
  type DirectionalLight,
  type FogExp2,
  type HemisphereLight,
} from 'three';
import type { Award } from '../awards';
import { WORLD } from '../data/worldData';
import { Finale } from './Finale';
import { City, sidewalkWalkers } from './City';
import { CityTraffic } from './CityTraffic';
import { Lake, Sky, SkyTitle } from './Landmarks';
import { BRIDGE_Z, cameraAt, moodAt, ROAD, signPlace } from './path';
import { StreetProps } from './Props';
import { Birds } from './Wildlife';
import { Diver, LakeGuy, Traffic, Walkers } from './People';
import { Rider } from './Rider';
import { AboutMeLetters, InterestsArch, LakeBridge, Projectors, Schools, SkillSigns, WorkGate } from './Scenes';
import { AwardCards, Clouds } from './SkyDeck';
import { patchHeightFog, Post, type Tier } from './Post';

patchHeightFog();
import { Statue } from './Statue';
import { clonePalette, mixPalette, NIGHT, PALETTES, type Palette, type TimeName } from './timeOfDay';
import { Ground, Houses, lakeHouses, Marina, Ridge, StreetFurniture } from './Town';
import { VoxelText } from './VoxelText';

/**
 * "My World" 3D scene: one continuous world the camera travels through with the scroll. Scroll
 * progress and the pointer arrive through refs so React never re-renders per frame.
 */

export interface ExperienceProps {
  progress: RefObject<number>;
  pointer: RefObject<{ x: number; y: number }>;
  time: RefObject<TimeName>;
  tier: RefObject<Tier>;
  quality: 'high' | 'low';
  reduced: boolean;
  awards: Award[];
  onAward: (id: string) => void;
  onContact: (kind: 'phone' | 'email' | 'message') => void;
  onReady: () => void;
}

function CameraRig({ progress, pointer, reduced }: Pick<ExperienceProps, 'progress' | 'pointer' | 'reduced'>) {
  const { camera } = useThree();
  const start = cameraAt(0);
  const pos = useRef(start.pos.clone());
  const look = useRef(start.look.clone());
  const aim = useRef({ x: 0, y: 0 });
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const p = MathUtils.clamp(progress.current ?? 0, 0, 1);
    const target = cameraAt(p);
    // Long jumps (menu, voice) glide a little faster; normal scrolling is softly damped.
    const far = pos.current.distanceTo(target.pos) > 120;
    const k = reduced ? 1 : 1 - Math.exp(-dt * (far ? 1.8 : 3.4));
    pos.current.lerp(target.pos, k);
    look.current.lerp(target.look, k);
    const s = state.clock.elapsedTime;
    const drift = reduced ? 0 : 1;
    const ptr = pointer.current ?? { x: 0, y: 0 };
    const ka = 1 - Math.exp(-dt * 3);
    aim.current.x += (ptr.x * drift - aim.current.x) * ka;
    aim.current.y += (ptr.y * drift - aim.current.y) * ka;
    camera.position.set(
      pos.current.x + Math.sin(s * 0.21) * 0.2 * drift,
      pos.current.y + Math.sin(s * 0.35) * 0.14 * drift,
      pos.current.z,
    );
    const dist = camera.position.distanceTo(look.current);
    const sway = Math.min(18, dist * 0.12);
    camera.lookAt(look.current.x + aim.current.x * sway, look.current.y - aim.current.y * sway * 0.45, look.current.z);
  });
  return null;
}

/** Light, haze and sky follow the time of day, then the bright day of the Get in touch city. */
function Atmosphere({ progress, time, palette, quality }: { progress: RefObject<number>; time: RefObject<TimeName>; palette: RefObject<Palette>; quality: 'high' | 'low' }) {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const { scene, gl } = useThree();
  const tmp = useMemo(() => new Vector3(), []);
  const smooth = useMemo(() => clonePalette(PALETTES.sunset), []);
  useFrame(({ camera }, dt) => {
    const p = MathUtils.clamp(progress.current ?? 0, 0, 1);
    const home = PALETTES[time.current ?? 'sunset'];
    const target = mixPalette(palette.current!, home, PALETTES.day, moodAt(p));
    // Ease palette changes (e.g. the time button) instead of snapping.
    mixPalette(smooth, smooth, target, 1 - Math.exp(-Math.min(dt, 0.1) * 2.5));
    Object.assign(palette.current!, clonePalette(smooth));
    const pal = smooth;
    NIGHT.value = pal.night;
    gl.toneMappingExposure = pal.exposure;
    const fog = scene.fog as FogExp2 | null;
    if (fog) {
      fog.color.copy(pal.fog);
      fog.density = pal.fogDensity * MathUtils.lerp(1, 0.6, MathUtils.smoothstep(camera.position.y, 60, 140));
    }
    (scene.background as Color | null)?.copy(pal.horizon);
    const s = sun.current;
    if (s) {
      camera.getWorldDirection(tmp).setY(0).normalize().multiplyScalar(60).add(camera.position).setY(0);
      s.target.position.copy(tmp);
      s.target.updateMatrixWorld();
      s.position.copy(tmp).addScaledVector(pal.sunDir, 260);
      s.color.copy(pal.sun);
      s.intensity = pal.sunIntensity;
    }
    const h = hemi.current;
    if (h) {
      h.color.copy(pal.sky);
      h.groundColor.copy(pal.ground);
      h.intensity = pal.hemi;
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffd6c4', '#7c6a8f', 0.9]} />
      <directionalLight
        ref={sun}
        intensity={2.4}
        color="#ffc79c"
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={10}
        shadow-camera-far={700}
        shadow-bias={-0.0004}
        shadow-radius={7}
        shadow-blurSamples={14}
      />
      <ambientLight intensity={0.22} color="#ffe6da" />
    </>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
    // Once everything inside the Suspense boundary has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** The road the ride follows: a ribbon of asphalt with a pale centre line. */
function ribbon(half: number, y: number) {
  const n = 260;
  const pts = ROAD.getSpacedPoints(n);
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const t = ROAD.getTangentAt(i / n);
    const side = new Vector3(-t.z, 0, t.x).normalize().multiplyScalar(half);
    pos.push(p.x + side.x, p.y + y, p.z + side.z, p.x - side.x, p.y + y, p.z - side.z);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Road() {
  const road = useMemo(() => ribbon(6, 0.04), []);
  const line = useMemo(() => ribbon(0.16, 0.07), []);
  const edgeL = useMemo(() => ribbon(5.7, 0.06), []);
  return (
    <group>
      <mesh geometry={edgeL} receiveShadow>
        <meshStandardMaterial color="#f1dfd3" roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh geometry={road} position={[0, 0.03, 0]} scale={[1, 1, 1]} receiveShadow>
        <meshStandardMaterial color="#8c6f78" roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh geometry={line}>
        <meshStandardMaterial color="#f4d9cc" roughness={0.8} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function World({ quality, progress, time, tier, awards, onAward, onContact }: Pick<ExperienceProps, 'quality' | 'progress' | 'time' | 'tier' | 'awards' | 'onAward' | 'onContact'>) {
  const palette = useRef<Palette>(clonePalette(PALETTES.sunset));
  const skyMat = useRef<ShaderMaterial | null>(null);
  const lake = useMemo(lakeHouses, []);
  const sign = useMemo(signPlace, []);
  const walkers = useMemo(() => sidewalkWalkers(), []);
  return (
    <>
      <Sky palette={palette} matRef={skyMat} />
      <Post tier={tier} envSource={skyMat} progress={progress} />
      <Atmosphere progress={progress} time={time} palette={palette} quality={quality} />
      {/* Lake and downtown */}
      <Ground />
      <Ridge />
      <Lake />
      <Marina />
      <LakeBridge />
      <Traffic z={BRIDGE_Z} y={19.45} len={320} count={5} road={false} />
      <Birds />
      <StreetProps />
      <LakeGuy progress={progress} />
      <Houses list={lake} style="lake" />
      <StreetFurniture />
      <InterestsArch />
      <AboutMeLetters />
      {/* Downtown Cumming from OpenStreetMap */}
      <City />
      <CityTraffic />
      <Walkers paths={walkers} />
      <SkyTitle title={WORLD.name} sub={WORLD.title} position={[-36, 36, -175]} />
      {/* The ride */}
      <Road />
      <Schools />
      <WorkGate />
      <VoxelText lines={['MY WORK']} cube={0.42} colors={['#fff6ec', '#ffe0d2']} glow={0.55} plinth position={[sign.at.x, sign.at.y, sign.at.z]} rotation={sign.ry} />
      <SkillSigns />
      <Projectors />
      <Rider progress={progress} />
      {/* Statue, sky, skydive, Get in touch city, room */}
      <Statue />
      <Clouds />
      <AwardCards items={awards} onOpen={onAward} progress={progress} />
      <Diver progress={progress} />
      <Finale onContact={onContact} />
    </>
  );
}

export default function Experience({ progress, pointer, time, tier, quality, reduced, awards, onAward, onContact, onReady }: ExperienceProps) {
  return (
    <Canvas
      shadows={quality === 'high'}
      dpr={quality === 'high' ? [1, 1.5] : 1}
      camera={{ fov: 42, near: 0.3, far: 2200, position: [-9.5, 5.4, 9] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        // Soft shadows (three 0.187 removed PCFSoft; VSM gives soft, blurred edges).
        if (quality === 'high') gl.shadowMap.type = VSMShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
        gl.outputColorSpace = SRGBColorSpace;
      }}
    >
      <color attach="background" args={['#e9b4a2']} />
      <fogExp2 attach="fog" args={['#eab5a3', 0.0024]} />
      <Suspense fallback={null}>
        <World quality={quality} progress={progress} time={time} tier={tier} awards={awards} onAward={onAward} onContact={onContact} />
        <Ready onReady={onReady} />
      </Suspense>
      <CameraRig progress={progress} pointer={pointer} reduced={reduced} />
    </Canvas>
  );
}
