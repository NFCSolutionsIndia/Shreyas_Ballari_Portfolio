import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { ACESFilmicToneMapping, Group, PMREMGenerator, SRGBColorSpace, SpotLight } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HeadsetModel } from './HeadsetModel';

// The intro keeps to real time: on a slow frame it moves on instead of slowing down (by default
// the animation clock stretches after a slow frame, which made the turn crawl on slow computers).
gsap.ticker.lagSmoothing(0);

/**
 * The opening: a headset floats in a dark studio, turns slowly to show its form, then (once the
 * house has loaded) glides towards the camera until the visor fills the view, and a lens blur
 * dissolves into the home. Nothing here claims the visitor is wearing anything: it is a
 * cinematic illusion. Skip is always available.
 *
 * Smoothness: the turn starts only once the headset is fully prepared, and the house is built
 * only after the turn (while the headset holds still, facing the visitor), so the two never
 * compete. The house's files are already downloading during the turn.
 */

interface Motion {
  rotY: number;
  rotX: number;
  z: number;
  y: number;
  light: number;
  /** How much the headset floats (1 = gently, 0 = held still while the house is built). */
  float: number;
}

function StudioEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Stage({ m }: { m: Motion }) {
  const g = useRef<Group>(null);
  const key = useRef<SpotLight>(null);
  const rimA = useRef<SpotLight>(null);
  const rimB = useRef<SpotLight>(null);
  useFrame(({ clock, scene }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.rotation.set(m.rotX + Math.sin(t * 0.7) * 0.02 * m.float, m.rotY, Math.sin(t * 0.5) * 0.015 * m.float);
      g.current.position.set(0, m.y + Math.sin(t * 0.9) * 0.004 * (1 - m.z * 2) * m.float, m.z);
    }
    if (key.current) key.current.intensity = 2.2 * m.light;
    if (rimA.current) rimA.current.intensity = 6 * m.light;
    if (rimB.current) rimB.current.intensity = 5 * m.light;
    scene.environmentIntensity = 0.55 * m.light;
  });
  return (
    <>
      <spotLight ref={key} position={[0.4, 0.6, 0.9]} angle={0.5} penumbra={1} intensity={0} />
      <spotLight ref={rimA} position={[-0.7, 0.25, -0.5]} angle={0.6} penumbra={1} color="#9b6bff" intensity={0} />
      <spotLight ref={rimB} position={[0.7, -0.1, -0.5]} angle={0.6} penumbra={1} color="#4a7dff" intensity={0} />
      <group ref={g}>
        <HeadsetModel />
      </group>
    </>
  );
}

export function IntroScene({ ready, progress, onDone, low = false }: { ready: boolean; progress: number; onDone: () => void; low?: boolean }) {
  const m = useMemo<Motion>(() => ({ rotY: 1.25, rotX: 0.16, z: -0.06, y: 0.012, light: 0, float: 1 }), []);
  const [stage, setStage] = useState<'reveal' | 'wait' | 'approach' | 'lens'>('reveal');
  const [title, setTitle] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    window.dispatchEvent(new Event('sp-intro-revealed'));
    setLeaving(true);
    window.setTimeout(onDone, 900);
  };

  // Preview (?headset=front|three|side): hold one pose, fully lit, no animation.
  const preview = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('headset') : null;
  useEffect(() => {
    if (!preview) return;
    const poses: Record<string, [number, number, number]> = { front: [0, 0.05, 0], three: [0.6, 0.12, 0], side: [1.45, 0.05, 0], close: [0, 0, 0.36] };
    const [ry, rx, z] = poses[preview] ?? poses.three!;
    Object.assign(m, { rotY: ry, rotX: rx, light: 1, z, y: 0 });
    setTitle(preview === 'front');
  }, [preview, m]);

  // The headset is prepared (shaders and pictures) before the turn begins.
  const [model, setModel] = useState(false);
  useEffect(() => {
    const go = () => setModel(true);
    window.addEventListener('sp-headset-ready', go);
    // Only if the headset never arrives (a very slow connection) does the intro go on without it.
    const t = window.setTimeout(go, 30000);
    return () => {
      window.removeEventListener('sp-headset-ready', go);
      window.clearTimeout(t);
    };
  }, []);

  // After the turn the house is built; the headset holds still meanwhile, and this view stops
  // redrawing (the picture stays), so the graphics chip is free for the house.
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (stage !== 'wait') return;
    window.dispatchEvent(new Event('sp-intro-revealed'));
    if (ready) {
      setHold(false);
      return;
    }
    const tw = gsap.to(m, { float: 0, duration: 0.6, ease: 'sine.out', onComplete: () => setHold(true) });
    return () => void tw.kill();
  }, [stage, ready, m]);
  useEffect(() => {
    if (ready) setHold(false);
  }, [ready]);

  // Reveal: out of the dark, a slow turn.
  useEffect(() => {
    if (preview || !model) return;
    // Out of the dark at three-quarters, then a slow turn round to face the visitor.
    const tl = gsap.timeline({ onComplete: () => setStage('wait') });
    tl.to(m, { light: 1, duration: 1.6, ease: 'power2.out' }, 0);
    tl.to(m, { rotY: 0.85, duration: 1.4, ease: 'sine.out' }, 0);
    tl.to(m, { rotY: 0, rotX: 0.02, z: 0, y: 0.03, duration: 2.6, ease: 'power3.inOut' }, 1.2);
    tl.call(() => setTitle(true), [], 3.0);
    tl.to({}, { duration: 1.3 }, 3.8);
    return () => void tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, model]);

  // Approach (once the house is ready): face the camera and come close; then the lens.
  // Started once and kept in a ref, so the stage change it causes does not cancel it.
  const approach = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    if (stage !== 'wait' || !ready || preview || approach.current) return;
    const tl = gsap.timeline({
      onComplete: () => {
        setStage('lens');
        finish();
      },
    });
    // Drawn to the visitor's eyes: a slow start, then the visor fills the view.
    tl.to(m, { rotY: 0, rotX: 0, y: 0, duration: 1.0, ease: 'sine.inOut' }, 0);
    // The model's centre is mid-band, so the visor is ~0.1 in front: stop with it just before the eyes.
    tl.to(m, { z: 0.37, duration: 2.8, ease: 'power3.in' }, 0.2);
    approach.current = tl;
    setStage('approach');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, ready, m]);
  useEffect(() => () => void approach.current?.kill(), []);

  return (
    <div className={`sp-intro ${leaving ? 'is-leaving' : ''} is-${stage}`}>
      <Canvas
        dpr={low ? 0.8 : [1, 1.5]}
        frameloop={hold ? 'demand' : 'always'}
        camera={{ fov: 30, position: [0, 0, 0.56], near: 0.005, far: 10 }}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.outputColorSpace = SRGBColorSpace;
          if (new URLSearchParams(window.location.search).has('perf')) Object.assign(window, { __introGl: gl, __introScene: scene });
        }}
      >
        <color attach="background" args={['#050507']} />
        <StudioEnv />
        <Stage m={m} />
      </Canvas>
      <div className="sp-intro-lens" aria-hidden="true" />
      <div className="sp-intro-specks" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%`, animationDelay: `${(i % 7) * 0.35}s`, width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px` }} />
        ))}
      </div>
      <div className={`sp-intro-title ${title ? 'is-in' : ''}`}>
        <h1>Step into Shreyas’s world</h1>
        <p>An immersive journey through his studies, research, projects and ambitions.</p>
      </div>
      {/* No words before the headset appears: only a thin line while it loads. */}
      {!model && <span className="sp-intro-wait" role="status" aria-label="Loading" />}
      {model && !ready && (
        <p className="sp-intro-line" aria-live="polite">
          Preparing Shreyas’s home · {Math.round(progress)}%
        </p>
      )}
      <button type="button" className="sp-intro-skip" onClick={finish}>
        Skip intro
      </button>
    </div>
  );
}
