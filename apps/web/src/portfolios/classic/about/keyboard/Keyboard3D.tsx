import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, type PerspectiveCamera } from 'three';
import { flight } from '../flight';
import { activity } from './controller';
import { KeyboardCase } from './KeyboardCase';
import { KeyboardKey } from './KeyboardKey';
import { KeyboardLighting } from './KeyboardLighting';
import { BOARD_W, KEYS } from './layout';
import { RotaryKnob } from './RotaryKnob';

/**
 * The 3D keyboard: case, knob, lighting and one independently animated component per key.
 *
 * Entrance: the empty board (switches lit blue, no caps) settles in below the text as the page
 * scrolls (`flight.rise`). When the scroll asks for keys (`flight.want`), the caps rain down out
 * from under the hero row by row (`flight.keys`, eased here over ~2.4 s); when the last one lands
 * a blue light sweeps across the board and the knob turns once. Scrolling back sends them up.
 */

/** Plays the key rain towards `flight.want`, and fires the sweep when it completes. */
function Rain() {
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const before = flight.keys;
    if (flight.want > flight.keys) flight.keys = Math.min(1, flight.keys + dt / 2.4);
    else if (flight.want < flight.keys) flight.keys = Math.max(0, flight.keys - dt / 0.9);
    if (before < 1 && flight.keys >= 1) {
      flight.sweepAt = clock.elapsedTime;
      activity.knob += Math.PI * 2;
    }
    activity.v *= Math.pow(0.2, dt);
  });
  return null;
}

function Rig() {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const u = 1 - flight.rise;
    g.current.position.set(0, -u * 1.4, u * 1.6);
  });
  return (
    <group ref={g}>
      <KeyboardCase />
      <RotaryKnob />
      {KEYS.map((k) => (
        <KeyboardKey key={k.id} def={k} />
      ))}
    </group>
  );
}

/**
 * Frames the keyboard in the free space under the text: the canvas covers the whole pinned screen
 * (so nothing is ever cropped), the camera distance fits the board, a slightly elevated front
 * three-quarter view, and a view offset moves it down into that space.
 */
function Fit() {
  const { camera, size } = useThree();
  useFrame(() => {
    const W = size.width;
    const H = size.height;
    const top = Math.min(flight.top, H * 0.66);
    const avail = Math.max(140, H - flight.bottom - top);
    const target = Math.min(W * 0.95, avail * 3.9);
    const cam = camera as PerspectiveCamera;
    const f = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
    const dist = ((BOARD_W + 1.2) * f) / target;
    const el = 0.66;
    cam.position.set(0, dist * Math.sin(el), 0.4 + dist * Math.cos(el));
    cam.lookAt(0, 0.1, 0.4);
    const shift = top + avail / 2 - H / 2;
    if (!cam.view || Math.abs(cam.view.offsetY + shift) > 0.5 || cam.view.fullWidth !== W || cam.view.fullHeight !== H) cam.setViewOffset(W, H, 0, -shift, W, H);
  });
  return null;
}

export default function Keyboard3D({ active, onReady }: { active: boolean; onReady?: () => void }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ fov: 24, position: [0, 14, 9], near: 1, far: 200 }}
      onCreated={() => {
        // Give the first frame time to draw before anything waits on it.
        window.setTimeout(() => onReady?.(), 250);
      }}
      gl={{ antialias: true, alpha: true }}
    >
      <KeyboardLighting />
      <Fit />
      <Rain />
      <Rig />
    </Canvas>
  );
}
