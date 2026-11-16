import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor, useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping, Color, DirectionalLight, EquirectangularReflectionMapping, HemisphereLight, MathUtils, Object3D, RectAreaLight, SRGBColorSpace, TextureLoader, Vector3, PCFShadowMap, Box3, Mesh, Raycaster, type Material, type Texture, type CatmullRomCurve3, type Object3D as O3 } from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ENTRY } from '../rooms';
import { CHAPTERS } from '../story/chapters';
import { TOUR } from '../story/tour';
import { spatial } from '../store';
import { House } from './House';
import { LivingRoom } from './LivingRoom';
import { HOTSPOTS, hotspotEls } from './hotspots';
import { walkPath } from './route';
import { held, keyFor } from './walkKeys';
import { STATIONS, type Station, type StationName } from './stations';

/**
 * The house: one continuous 3D space. The camera walks from room to room through the doorways
 * (never through a wall), looks around a little with the pointer, turns a full 360 degrees on
 * request, and starts outside the entrance when the visitor arrives from the intro. The light
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
  useFrame((_, delta) => {
    const L = LIGHT[spatial.get().env];
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 1.6);
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

const _eye = new Vector3();
const _look = new Vector3();

/**
 * Dev aid: `?station=<name>` parks the camera at that story station (no pointer sway). In dev
 * builds `window.__houseStation('gallery')` switches it at runtime (screenshot scripts).
 */
let devPose: Station | null = (() => {
  if (typeof window === 'undefined') return null;
  const s = new URLSearchParams(window.location.search).get('station');
  return s && s in STATIONS ? STATIONS[s as StationName] : null;
})();
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __houseStation: (s: StationName | Station | null) => void }).__houseStation = (s) => {
    devPose = typeof s === 'string' ? (STATIONS[s] ?? null) : s;
  };
}

/** Camera speed when walking between rooms (metres per second), and the longest a walk may take. */
const WALK_SPEED = 1.15;
const MAX_WALK = 12;
const _ahead = new Vector3();
const _dir = new Vector3();

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Point the camera from `eye` at a yaw / pitch offset from the direction eye to look. */
function aim(camera: { lookAt: (v: Vector3) => void }, eye: Vector3, look: Vector3, dyaw: number, dpitch: number) {
  _dir.subVectors(look, eye);
  const yaw = Math.atan2(_dir.x, _dir.z) + dyaw;
  const pitch = Math.atan2(_dir.y, Math.hypot(_dir.x, _dir.z)) + dpitch;
  _look.set(eye.x + Math.sin(yaw) * Math.cos(pitch), eye.y + Math.sin(pitch), eye.z + Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(_look);
}

/**
 * Camera. Opening an app walks to its room along a smooth path through the doorways (looking
 * where it is going, then turning to the room), never through a wall. At rest it sways a little
 * with the pointer. In 360 degree view it stays where it is and turns all the way round as the
 * visitor drags (or slowly by itself when left alone).
 */
function CameraRig() {
  const { camera, pointer, gl } = useThree();
  const cur = useRef({ eye: new Vector3(...ENTRY.eye), look: new Vector3(...ENTRY.look) });
  const walk = useRef<{ curve: CatmullRomCurve3; t: number; dur: number; fromLook: Vector3; to: StationName } | null>(null);
  const at = useRef<StationName>('entry');
  const turn = useRef({ yaw: 0, pitch: 0, vyaw: 0, idle: 0, drag: null as null | { x: number; y: number } });
  // The tour: one smooth path per pair of neighbouring rooms, scrubbed by the scroll.
  const tourPaths = useMemo(
    () =>
      TOUR.slice(1).map((stop, i) => {
        const from = TOUR[i]!.station;
        const start = new Vector3(...STATIONS[from].eye);
        return walkPath(start, from, stop.station).curve;
      }),
    [],
  );
  const tourP = useRef(0);
  const walker = useRef<{ on: boolean; yaw: number; pitch: number; colliders: O3[] | null }>({ on: false, yaw: 0, pitch: 0, colliders: null });
  const { scene } = useThree();
  const ray = useMemo(() => new Raycaster(), []);
  // Dev aid for tests: where the camera is.
  if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __cam: unknown }).__cam = camera;

  // Walk mode keys (ignored while typing).
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (!spatial.get().walk || typing(e.target)) return;
      const k = keyFor(e.key);
      if (!k) return;
      held.add(k);
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = keyFor(e.key);
      if (k) held.delete(k);
    };
    const blur = () => held.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // 360 degree view: drag anywhere that is not a control (mouse, touch or a pinch) to turn.
  useEffect(() => {
    const doc = gl.domElement.ownerDocument;
    const down = (e: PointerEvent) => {
      const st = spatial.get();
      if (!st.look360 && !st.tour && !st.walk) return;
      if (e.target instanceof Element && e.target.closest('button, a, input, [role="toolbar"], nav, .tour-card, .cb, .sp-voiceask')) return;
      turn.current.drag = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      const d = turn.current.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      turn.current.yaw -= dx * 0.0055;
      turn.current.vyaw = -dx * 0.0055;
      turn.current.pitch = MathUtils.clamp(turn.current.pitch - dy * 0.004, -0.6, 0.55);
      turn.current.drag = { x: e.clientX, y: e.clientY };
      turn.current.idle = 0;
    };
    const up = () => (turn.current.drag = null);
    doc.addEventListener('pointerdown', down);
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', up);
    return () => {
      doc.removeEventListener('pointerdown', down);
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', up);
      doc.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (devPose) {
      const st = devPose;
      camera.position.set(...st.eye);
      camera.lookAt(...st.look);
      return;
    }
    const dt = Math.min(delta, 0.05);
    const s = spatial.get();

    if (s.walk) {
      const W = walker.current;
      const T = turn.current;
      if (!W.on) {
        // Start from wherever the camera is, looking the same way.
        W.on = true;
        _dir.subVectors(cur.current.look, cur.current.eye);
        W.yaw = Math.atan2(_dir.x, _dir.z) + T.yaw;
        W.pitch = 0;
        T.yaw = 0;
        T.pitch = 0;
        T.vyaw = 0;
        walk.current = null;
        cur.current.eye.y = 1.62;
        // Walls, glass and big furniture block the way (thin, tall meshes and large pieces).
        if (!W.colliders) {
          const list: O3[] = [];
          const box = new Box3();
          const size = new Vector3();
          scene.updateMatrixWorld();
          scene.traverse((o) => {
            if (!(o instanceof Mesh) || (o as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || !o.visible) return;
            box.setFromObject(o);
            box.getSize(size);
            const tall = size.y > 0.7 && box.min.y < 1.2 && box.max.y > 0.5;
            if (tall && Math.max(size.x, size.z) > 0.35 && Math.max(size.x, size.z) < 30) list.push(o);
          });
          W.colliders = list;
        }
      }
      // Turn with the keys or by dragging (the drag writes into turn.yaw / pitch).
      const turnSpeed = 1.6;
      if (held.has('turnL')) W.yaw += turnSpeed * dt;
      if (held.has('turnR')) W.yaw -= turnSpeed * dt;
      if (Math.abs(T.yaw) > 0) {
        W.yaw += T.yaw;
        T.yaw = 0;
      }
      W.pitch = MathUtils.clamp(T.pitch, -0.6, 0.55);
      const speed = held.has('run') ? 3.6 : 1.8;
      const fx = Math.sin(W.yaw);
      const fz = Math.cos(W.yaw);
      let mx = 0;
      let mz = 0;
      if (held.has('forward')) (mx += fx), (mz += fz);
      if (held.has('back')) (mx -= fx), (mz -= fz);
      if (held.has('right')) (mx -= fz), (mz += fx);
      if (held.has('left')) (mx += fz), (mz -= fx);
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx = (mx / len) * speed * dt;
        mz = (mz / len) * speed * dt;
        const pos = cur.current.eye;
        const blocked = (dx: number, dz: number) => {
          if (!W.colliders?.length) return false;
          _ahead.set(dx, 0, dz).normalize();
          for (const h of [0.5, 1.2]) {
            ray.set(_eye.set(pos.x, h, pos.z), _ahead);
            ray.far = Math.hypot(dx, dz) + 0.35;
            if (ray.intersectObjects(W.colliders, false).length) return true;
          }
          return false;
        };
        // Slide along walls: try both axes, then each one alone.
        if (!blocked(mx, mz)) {
          pos.x += mx;
          pos.z += mz;
        } else if (Math.abs(mx) > 1e-5 && !blocked(mx, 0)) pos.x += mx;
        else if (Math.abs(mz) > 1e-5 && !blocked(0, mz)) pos.z += mz;
        pos.x = MathUtils.clamp(pos.x, -13.3, 17);
        pos.z = MathUtils.clamp(pos.z, -17.5, 11.5);
      }
      cur.current.eye.y = 1.62;
      camera.position.copy(cur.current.eye);
      _look.set(cur.current.eye.x + Math.sin(W.yaw) * Math.cos(W.pitch), cur.current.eye.y + Math.sin(W.pitch), cur.current.eye.z + Math.cos(W.yaw) * Math.cos(W.pitch));
      camera.lookAt(_look);
      cur.current.look.copy(_look).sub(cur.current.eye).multiplyScalar(3).add(cur.current.eye);
      return;
    }
    if (walker.current.on) {
      // Leaving walk mode: walk back to the open app from the nearest station.
      walker.current.on = false;
      held.clear();
      let best: StationName = 'living';
      let bd = Infinity;
      (Object.keys(STATIONS) as StationName[]).forEach((k) => {
        const d = cur.current.eye.distanceTo(_eye.set(...STATIONS[k].eye));
        if (d < bd) (bd = d), (best = k);
      });
      at.current = best;
    }

    if (s.tour) {
      // Ease towards where the scroll wants to be; linger in each room, walk between them.
      tourP.current += (s.tourTarget - tourP.current) * (1 - Math.exp(-dt * 1.5));
      const p = MathUtils.clamp(tourP.current, 0, TOUR.length - 1);
      const i = Math.min(TOUR.length - 2, Math.floor(p));
      const f = p - i;
      const u = MathUtils.smoothstep(f, 0.12, 0.88);
      const curve = tourPaths[i]!;
      curve.getPointAt(u, cur.current.eye);
      curve.getPointAt(Math.min(1, u + 0.05), _ahead);
      _dir.subVectors(_ahead, cur.current.eye).setY(0);
      if (_dir.lengthSq() > 1e-6) _ahead.copy(cur.current.eye).addScaledVector(_dir.normalize(), 2).setY(cur.current.eye.y - 0.1);
      const a = STATIONS[TOUR[i]!.station];
      const b = STATIONS[TOUR[i + 1]!.station];
      _eye.set(...a.look);
      _look.set(...b.look);
      const settle = MathUtils.smoothstep(u, 0.6, 1);
      const leave = 1 - MathUtils.smoothstep(u, 0, 0.35);
      if (u <= 0.0001) cur.current.look.copy(_eye);
      else if (u >= 0.9999) cur.current.look.copy(_look);
      else cur.current.look.copy(_ahead).lerp(_eye, leave * (1 - settle)).lerp(_look, settle);
      const idx = Math.round(p);
      if (idx !== s.tourIndex) spatial.set({ tourIndex: idx });
      at.current = TOUR[idx]!.station;
      walk.current = null;
      camera.position.copy(cur.current.eye);
      // In every room you can drag to look all the way round; walking on turns you forward again.
      const T = turn.current;
      const walking = Math.abs(p - idx) > 0.04 || Math.abs(s.tourTarget - p) > 0.04;
      if (!T.drag) {
        T.vyaw *= Math.exp(-dt * 3);
        T.yaw += T.vyaw;
        if (walking) {
          T.yaw = Math.atan2(Math.sin(T.yaw), Math.cos(T.yaw)) * Math.exp(-dt * 2.5);
          T.pitch *= Math.exp(-dt * 2.5);
        }
      }
      if (Math.abs(T.yaw) > 0.002 || Math.abs(T.pitch) > 0.002) aim(camera, cur.current.eye, cur.current.look, T.yaw, T.pitch);
      else camera.lookAt(cur.current.look.x + pointer.x * 0.15, cur.current.look.y + pointer.y * 0.08, cur.current.look.z);
      return;
    }
    tourP.current = s.tourIndex;
    // During the intro the camera waits outside the entrance; then it walks in.
    const want: StationName = s.phase === 'house' ? ((CHAPTERS[s.chapter]?.station as StationName | undefined) ?? 'living') : 'entry';
    const target = STATIONS[want];

    // Start a walk when the destination changes (mid-walk, start from where the camera is).
    if (want !== at.current && walk.current?.to !== want) {
      const from = walk.current ? walk.current.to : at.current;
      const { curve, length } = walkPath(cur.current.eye, from, want);
      walk.current = { curve, t: 0, dur: MathUtils.clamp(length / WALK_SPEED, 2.6, MAX_WALK), fromLook: cur.current.look.clone(), to: want };
      at.current = from;
    }

    const w = walk.current;
    if (w) {
      w.t = Math.min(1, w.t + dt / w.dur);
      const e = ease(w.t);
      w.curve.getPointAt(e, cur.current.eye);
      // Look along the path while walking, then settle on the room's view.
      w.curve.getPointAt(Math.min(1, e + 0.06), _ahead);
      _dir.subVectors(_ahead, cur.current.eye).setY(0);
      if (_dir.lengthSq() > 1e-6) _ahead.copy(cur.current.eye).addScaledVector(_dir.normalize(), 2).setY(cur.current.eye.y - 0.1);
      else _ahead.copy(cur.current.look);
      _look.set(...target.look);
      const settle = MathUtils.smoothstep(e, 0.55, 1);
      const leave = 1 - MathUtils.smoothstep(e, 0, 0.2);
      cur.current.look.copy(_ahead).lerp(w.fromLook, leave * (1 - settle)).lerp(_look, settle);
      if (w.t >= 1) {
        at.current = w.to;
        walk.current = null;
      }
    } else {
      // At rest: settle exactly on the pose.
      _eye.set(...target.eye);
      _look.set(...target.look);
      const k = 1 - Math.exp(-dt * 2);
      cur.current.eye.lerp(_eye, k);
      cur.current.look.lerp(_look, k);
    }

    camera.position.copy(cur.current.eye);
    const T = turn.current;
    if (s.look360 && !w) {
      T.idle += dt;
      if (!T.drag) {
        T.vyaw *= Math.exp(-dt * 3);
        T.yaw += T.vyaw + (T.idle > 2.5 ? dt * 0.12 : 0);
      }
      aim(camera, cur.current.eye, cur.current.look, T.yaw, T.pitch);
      return;
    }
    // Leaving 360 degree view: turn back round to the room's view.
    if (Math.abs(T.yaw) > 0.002 || Math.abs(T.pitch) > 0.002) {
      T.yaw = Math.atan2(Math.sin(T.yaw), Math.cos(T.yaw)) * Math.exp(-dt * 3);
      T.pitch *= Math.exp(-dt * 3);
      T.vyaw = 0;
      aim(camera, cur.current.eye, cur.current.look, T.yaw, T.pitch);
      return;
    }
    T.yaw = 0;
    T.pitch = 0;
    if (!w) {
      camera.position.x += MathUtils.clamp(pointer.x, -1, 1) * 0.08;
      camera.position.y += MathUtils.clamp(pointer.y, -1, 1) * 0.04;
    }
    camera.lookAt(cur.current.look.x + (w ? 0 : pointer.x * 0.2), cur.current.look.y + (w ? 0 : pointer.y * 0.1), cur.current.look.z);
  });
  return null;
}

/**
 * Keeps the room's clickable points on their objects: projects each point to the screen every
 * frame and moves its button there (hidden when it is behind you or off screen).
 */
const _hp = new Vector3();
const _near = new Vector3();
const _fwd = new Vector3();
const BY_ID = new Map(HOTSPOTS.map((h) => [h.id, h]));
function HotspotProjector() {
  const { camera, size } = useThree();
  useFrame(() => {
    if (!hotspotEls.size) return;
    camera.getWorldDirection(_fwd);
    hotspotEls.forEach((el, id) => {
      const h = BY_ID.get(id);
      if (!h) return;
      _hp.set(...h.pos);
      const ahead = _hp.clone().sub(camera.position).normalize().dot(_fwd);
      _hp.project(camera);
      const near = !spatial.get().walk || camera.position.distanceTo(_near.set(...h.pos)) < 5.5;
      const show = near && ahead > 0.15 && Math.abs(_hp.x) < 0.94 && Math.abs(_hp.y) < 0.9;
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
function WarmUp({ onWarm }: { onWarm: () => void }) {
  const get = useThree((st) => st.get);
  useEffect(() => {
    const { gl, scene, camera } = get();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
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
        list.splice(0, 6).forEach((t) => gl.initTexture(t));
        if (list.length) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
    };
    gl.compileAsync(scene, camera).then(upload, finish);
    // Never wait forever.
    const t = window.setTimeout(finish, 20000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Draws the house only when it is worth it. Full speed while something moves (the tour, walking,
 * the 360° view, and a few seconds after any change, pointer move, scroll or key), and a gentle
 * 12 frames a second when the view is still, which keeps the fire and lights alive. Drawing
 * less also keeps the glass panels (which blur the room behind them) cheap, so the page stays
 * smooth on every browser.
 */
function RenderPacer({ low }: { low: boolean }) {
  const get = useThree((st) => st.get);
  useEffect(() => {
    let burstUntil = performance.now() + 4000;
    let last = 0;
    let raf = 0;
    const boost = (ms: number) => {
      burstUntil = Math.max(burstUntil, performance.now() + ms);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const st = spatial.get();
      const moving = st.tour || st.walk || st.look360 || now < burstUntil;
      if (moving ? true : !low && now - last >= 1000 / 12) {
        last = now;
        get().invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    const unsub = spatial.subscribe(() => boost(2600));
    const input = () => boost(900);
    // The pointer only nudges the view on capable graphics; elsewhere it is not worth a redraw.
    if (!low) window.addEventListener('pointermove', input, { passive: true });
    window.addEventListener('wheel', input, { passive: true });
    window.addEventListener('keydown', input);
    window.addEventListener('resize', input);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('pointermove', input);
      window.removeEventListener('wheel', input);
      window.removeEventListener('keydown', input);
      window.removeEventListener('resize', input);
    };
  }, [get, low]);
  return null;
}

export function HouseScene({ low, live, onProgress, onReady }: { low: boolean; live: boolean; onProgress: (p: number, done: boolean) => void; onReady: () => void }) {
  const [dprMax, setDprMax] = useState(1.25);
  /** Nothing is drawn until the shaders are ready (see WarmUp). */
  const [warm, setWarm] = useState(false);
  return (
    <Canvas
      frameloop={warm ? 'demand' : 'never'}
      shadows={!low}
      dpr={low ? 1 : [1, dprMax]}
      camera={{ fov: 50, near: 0.05, far: 200, position: ENTRY.eye }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
        gl.outputColorSpace = SRGBColorSpace;
        if (!low) gl.shadowMap.type = PCFShadowMap;
        // ?perf in the address: expose the renderer for performance checks.
        if (new URLSearchParams(window.location.search).has('perf')) (window as unknown as { __gl: unknown }).__gl = gl;
      }}
    >
      {/* Drops the resolution on slower computers, and while the camera is moving. */}
      <PerformanceMonitor onDecline={() => setDprMax(1)} onIncline={() => setDprMax(1.25)} flipflops={3} onFallback={() => setDprMax(1)} />
      <AdaptiveDpr pixelated={false} />
      {live && warm && <RenderPacer low={low} />}
      <Progress onProgress={onProgress} />
      <Suspense fallback={null}>
        <Environment />
        <Lights />
        <LivingRoom low={low} />
        <House low={low} />
        <WarmUp onWarm={() => setWarm(true)} />
        {warm && <Ready onReady={onReady} />}
      </Suspense>
      <CameraRig />
      <HotspotProjector />
    </Canvas>
  );
}
