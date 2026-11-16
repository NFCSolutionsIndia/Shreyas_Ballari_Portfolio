import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping, Color, DirectionalLight, EquirectangularReflectionMapping, HemisphereLight, MathUtils, Object3D, RectAreaLight, SRGBColorSpace, TextureLoader, Vector3, PCFShadowMap, type Material, type Mesh, type Texture } from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { spatial } from '../store';
import { batchStatic, lighten } from './batch';
import { House } from './House';
import { LivingRoom } from './LivingRoom';
import { HOTSPOTS, hotspotEls } from './hotspots';
import { STATIONS } from './stations';

/**
 * The house: the living room is the fixed background of his spatial home. The camera stays in
 * it, and the scene is drawn only when something in it changes (see RenderPacer). The light
 * follows the time of day (day, golden hour, night). Lighting: daylight from the park through the glass wall
 * (sun with soft shadows, sky light across the window), the outdoor HDR for reflections, and
 * warm interior lights.
 */

const HDR = `${import.meta.env.BASE_URL}assets/house/hdri/greenwich_park_02_1k.hdr`;
const VIEW = `${import.meta.env.BASE_URL}assets/house/hdri/greenwich_park_02_view_4k.jpg`;

RectAreaLightUniformsLib.init();

function Environment() {
  const { scene } = useThree();
  const hdr = useLoader(HDRLoader, HDR);
  const view = useLoader(TextureLoader, VIEW);
  useEffect(() => {
    hdr.mapping = EquirectangularReflectionMapping;
    view.mapping = EquirectangularReflectionMapping;
    view.colorSpace = SRGBColorSpace;
    scene.environment = hdr;
    scene.environmentIntensity = 0.85;
    scene.background = view;
    scene.backgroundIntensity = 1;
    scene.backgroundRotation.set(0, 2.2, 0);
  }, [hdr, view, scene]);
  return null;
}

/** Light for day, golden hour and night (the store's `env`), eased so a change fades in. */
const LIGHT = {
  day: { sun: 3.4, sunColor: '#fff1de', sky: 3.4, skyColor: '#f2f6ff', hemi: 0.55, bg: 1, envI: 0.85, exposure: 1.22 },
  sunset: { sun: 2.6, sunColor: '#ff9a52', sky: 1.6, skyColor: '#ffc59a', hemi: 0.38, bg: 0.62, envI: 0.6, exposure: 1.16 },
  night: { sun: 0.04, sunColor: '#8fa6ff', sky: 0.12, skyColor: '#5d74c8', hemi: 0.1, bg: 0.07, envI: 0.18, exposure: 1.05 },
} as const;
const _c = new Color();

function Lights() {
  const sun = useRef<DirectionalLight>(null);
  const sky = useRef<RectAreaLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const { scene, gl } = useThree();
  useEffect(() => {
    if (sun.current) sun.current.target = target;
  }, [target]);
  const first = useRef(true);
  useFrame((_, delta) => {
    const L = LIGHT[spatial.get().env];
    // The first frame starts on the right light; later changes fade in.
    const k = first.current ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 1.6);
    first.current = false;
    if (sun.current) {
      sun.current.intensity = MathUtils.lerp(sun.current.intensity, L.sun, k);
      sun.current.color.lerp(_c.set(L.sunColor), k);
    }
    if (sky.current) {
      sky.current.intensity = MathUtils.lerp(sky.current.intensity, L.sky, k);
      sky.current.color.lerp(_c.set(L.skyColor), k);
    }
    if (hemi.current) hemi.current.intensity = MathUtils.lerp(hemi.current.intensity, L.hemi, k);
    scene.backgroundIntensity = MathUtils.lerp(scene.backgroundIntensity, L.bg, k);
    scene.environmentIntensity = MathUtils.lerp(scene.environmentIntensity, L.envI, k);
    gl.toneMappingExposure = MathUtils.lerp(gl.toneMappingExposure, L.exposure, k);
  });
  return (
    <>
      <primitive object={target} position={[-2, 0, -3]} />
      <directionalLight
        ref={sun}
        position={[8, 18, -29]}
        intensity={3.4}
        color="#fff1de"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={10}
        shadow-camera-far={70}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      {/* Sky light pouring in through the glass wall */}
      <rectAreaLight ref={sky} position={[0, 1.8, -3.5]} rotation={[0, 0, 0]} width={10} height={3.4} intensity={3.4} color="#f2f6ff" />
      <hemisphereLight ref={hemi} args={['#f3f6ff', '#e6ddd0', 0.55]} />
    </>
  );
}

/**
 * The camera stands in the living room and never moves: the room is the fixed background of his
 * spatial home, and every app opens as a glass window in front of it. (Moving the camera made the
 * browser redraw the whole house sixty times a second, which froze slower computers.)
 */
const LIVING = STATIONS.living;
function CameraRig() {
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    camera.position.set(...LIVING.eye);
    camera.lookAt(...LIVING.look);
    camera.updateMatrixWorld();
  }, [camera]);
  return null;
}

/**
 * Keeps the room's clickable points on their objects. The camera is still, so this only has to
 * run when a frame is drawn (after a resize, or when points appear).
 */
const _hp = new Vector3();
const _fwd = new Vector3();
const BY_ID = new Map(HOTSPOTS.map((h) => [h.id, h]));
function HotspotProjector() {
  useFrame(({ camera, size }) => {
    if (!hotspotEls.size) return;
    camera.getWorldDirection(_fwd);
    hotspotEls.forEach((el, id) => {
      const h = BY_ID.get(id);
      if (!h) return;
      _hp.set(...h.pos);
      const ahead = _hp.clone().sub(camera.position).normalize().dot(_fwd);
      _hp.project(camera);
      const show = ahead > 0.15 && Math.abs(_hp.x) < 0.94 && Math.abs(_hp.y) < 0.9;
      el.style.opacity = show ? '1' : '0';
      el.style.pointerEvents = show ? 'auto' : 'none';
      el.style.transform = `translate(${((_hp.x + 1) / 2) * size.width}px, ${((1 - _hp.y) / 2) * size.height}px) translate(-50%, -50%)`;
    });
  });
  return null;
}

function Progress({ onProgress }: { onProgress: (p: number, done: boolean) => void }) {
  const { progress, active } = useProgress();
  useEffect(() => onProgress(progress, !active && progress >= 100), [progress, active, onProgress]);
  return null;
}

/**
 * Prepares every material's shader in the background (the browser's parallel compile) before the
 * house is drawn for the first time. Without this, the first frame compiles them all at once and
 * the page freezes for many seconds on Windows (Chrome and Edge).
 */
function WarmUp({ onWarm, low }: { onWarm: () => void; low: boolean }) {
  const get = useThree((st) => st.get);
  useEffect(() => {
    const { gl, scene, camera } = get();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // The sun and the furniture never move, so the sun's shadow is drawn once (on the next frame)
      // instead of every frame: about half the work per frame where shadows are on.
      gl.shadowMap.autoUpdate = false;
      gl.shadowMap.needsUpdate = true;
      performance.mark('house-warm');
      onWarm();
    };
    // Then the textures go to the graphics card a few per frame, instead of all in the first frame.
    const upload = () => {
      const all = new Set<Texture>();
      scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (!m) return;
        (Array.isArray(m) ? m : [m]).forEach((mat) => {
          Object.values(mat).forEach((v) => {
            if (v && (v as Texture).isTexture) all.add(v as Texture);
          });
        });
      });
      const list = [...all];
      const step = () => {
        if (done) return;
        // As many as fit in about 12 ms, then the next frame.
        const t0 = performance.now();
        while (list.length && performance.now() - t0 < 12) gl.initTexture(list.shift()!);
        if (list.length) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
    };
    // First merge the still furniture into a few objects (far fewer draw requests per frame).
    try {
      performance.mark('house-batch-start');
      batchStatic(scene);
      performance.mark('house-batch-end');
      if (low) lighten(scene);
      performance.mark('house-lighten-end');
    } catch {
      /* if merging fails, the house still works, just with more draw requests */
    }
    gl.compileAsync(scene, camera).then(() => (performance.mark('house-compiled'), upload()), finish);
    // Never wait forever.
    const t = window.setTimeout(finish, 20000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Reports the house ready once its first frame is on screen (that frame draws the shadows). */
function Ready({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    invalidate();
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => onReady())));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Draws the house only when something in it changes. The room is still, so most of the time
 * nothing is drawn at all and the computer is free for the glass windows in front of it. A new
 * frame is asked for when the light changes (day, golden hour, night: a few seconds while it
 * fades), when the room's glowing points appear, and once after the visitor arrives.
 */
function RenderPacer() {
  const get = useThree((st) => st.get);
  useEffect(() => {
    let until = performance.now() + 600;
    let raf = 0;
    const loop = () => {
      raf = 0;
      if (performance.now() > until) return;
      get().invalidate();
      raf = requestAnimationFrame(loop);
    };
    const burst = (ms: number) => {
      until = Math.max(until, performance.now() + ms);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    burst(600);
    let prev = spatial.get();
    const unsub = spatial.subscribe(() => {
      const s = spatial.get();
      if (s.env !== prev.env) burst(4000);
      else if (s.tour !== prev.tour || s.tourIndex !== prev.tourIndex || s.phase !== prev.phase) burst(250);
      prev = s;
    });
    const points = () => burst(250);
    window.addEventListener('sp-points', points);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('sp-points', points);
    };
  }, [get]);
  return null;
}

export function HouseScene({ low, live, onProgress, onReady }: { low: boolean; live: boolean; onProgress: (p: number, done: boolean) => void; onReady: () => void }) {
  /** Nothing is drawn until the shaders are ready (see WarmUp). */
  const [warm, setWarm] = useState(false);
  return (
    <Canvas
      frameloop={warm ? 'demand' : 'never'}
      shadows={!low}
      dpr={low ? 1 : [1, 1.25]}
      camera={{ fov: 50, near: 0.05, far: 200, position: STATIONS.living.eye }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
        gl.outputColorSpace = SRGBColorSpace;
        if (!low) gl.shadowMap.type = PCFShadowMap;
        // ?perf in the address: expose the renderer and scene for performance checks.
        if (new URLSearchParams(window.location.search).has('perf')) Object.assign(window, { __gl: gl, __scene: scene });
      }}
    >
      {live && warm && <RenderPacer />}
      <Progress onProgress={onProgress} />
      <Suspense fallback={null}>
        <Environment />
        <Lights />
        <LivingRoom low={low} />
        <House low={low} />
        <WarmUp low={low} onWarm={() => setWarm(true)} />
        {warm && <Ready onReady={onReady} />}
      </Suspense>
      <CameraRig />
      <HotspotProjector />
    </Canvas>
  );
}
