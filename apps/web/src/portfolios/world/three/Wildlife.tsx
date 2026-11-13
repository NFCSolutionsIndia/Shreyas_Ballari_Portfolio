import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three';

/**
 * Birds that behave like birds. Small flocks follow boids rules (keep apart, line up, stay
 * together) while wandering towards points ahead of the camera, so they are always somewhere in
 * view. Each bird flaps in bursts and then glides, banks into its turns and pitches as it climbs
 * or dives. A pair of hawks circles on thermals higher up, wings held still. The wing beat is done
 * in the vertex shader (one draw call for all birds).
 */

/** A bird silhouette: body and two wings, each wing in two segments (arm and hand). */
function birdGeometry() {
  // x: span (wings), y: up, z: forward.
  const v: number[] = [];
  const span: number[] = []; // 0 at the body, 1 at the wing tip (drives the flap bend)
  const tri = (a: number[], b: number[], c: number[], sa: number, sb: number, sc: number) => {
    v.push(...a, ...b, ...c);
    span.push(sa, sb, sc);
  };
  // Body (a thin diamond) and tail.
  tri([0, 0.05, 0.55], [-0.09, 0, 0.05], [0.09, 0, 0.05], 0, 0, 0);
  tri([-0.09, 0, 0.05], [0, -0.03, -0.45], [0.09, 0, 0.05], 0, 0, 0);
  tri([0, 0, -0.35], [-0.16, 0, -0.65], [0.16, 0, -0.65], 0, 0, 0);
  for (const s of [-1, 1]) {
    // Inner wing (arm).
    tri([s * 0.08, 0, 0.22], [s * 0.55, 0, 0.12], [s * 0.08, 0, -0.12], 0, 0.5, 0);
    tri([s * 0.55, 0, 0.12], [s * 0.55, 0, -0.18], [s * 0.08, 0, -0.12], 0.5, 0.5, 0);
    // Outer wing (hand), swept back to a point.
    tri([s * 0.55, 0, 0.12], [s * 1.05, 0, -0.08], [s * 0.55, 0, -0.18], 0.5, 1, 0.5);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(v, 3));
  g.setAttribute('aSpan', new Float32BufferAttribute(span, 1));
  g.computeVertexNormals();
  return g;
}

function birdMaterial() {
  const m = new MeshStandardMaterial({ color: '#2f2a33', roughness: 0.9, side: DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSpan;\nattribute vec2 aFlap;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // aFlap.x: wing beat phase, aFlap.y: how hard it flaps (0 = gliding).
        float beat = sin(aFlap.x);
        float lift = beat * aFlap.y;
        float side = sign(transformed.x);
        // Arm rotates about the shoulder, the hand lags behind and bends further.
        float arm = lift * 0.75 + 0.06;
        float hand = sin(aFlap.x - 0.6) * aFlap.y * 0.5;
        float r = abs(transformed.x);
        float y1 = min(r, 0.55) * sin(arm);
        float x1 = min(r, 0.55) * cos(arm);
        float r2 = max(r - 0.55, 0.0);
        transformed.y += y1 + r2 * sin(arm + hand);
        transformed.x = side * (x1 + r2 * cos(arm + hand));
        transformed.y -= aSpan * 0.02;`,
      );
  };
  return m;
}

interface Bird {
  p: Vector3;
  v: Vector3;
  phase: number;
  flapRate: number;
  effort: number;
  burst: number;
  bank: number;
  flock: number;
  hawk: boolean;
  r: number;
}

const FLOCKS = 4;

export function Birds({ perFlock = 9, hawks = 2 }: { perFlock?: number; hawks?: number }) {
  const geo = useMemo(birdGeometry, []);
  const mat = useMemo(birdMaterial, []);
  const mesh = useRef<InstancedMesh>(null);
  const n = FLOCKS * perFlock + hawks;
  const flap = useMemo(() => new InstancedBufferAttribute(new Float32Array(n * 2), 2), [n]);
  geo.setAttribute('aFlap', flap);

  const state = useMemo(() => {
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const birds: Bird[] = [];
    for (let f = 0; f < FLOCKS; f++) {
      const c = new Vector3(-120 + f * 80, 34 + rnd() * 20, -80 - f * 120);
      for (let i = 0; i < perFlock; i++)
        birds.push({
          p: c.clone().add(new Vector3((rnd() - 0.5) * 14, (rnd() - 0.5) * 5, (rnd() - 0.5) * 14)),
          v: new Vector3(rnd() - 0.5, 0, rnd() - 0.5).setLength(9),
          phase: rnd() * 6.28,
          flapRate: 11 + rnd() * 3,
          effort: 1,
          burst: rnd() * 3,
          bank: 0,
          flock: f,
          hawk: false,
          r: 0,
        });
    }
    for (let h = 0; h < hawks; h++)
      birds.push({ p: new Vector3(0, 95 + h * 18, -200), v: new Vector3(1, 0, 0), phase: 0, flapRate: 0, effort: 0, burst: 0, bank: 0, flock: -1, hawk: true, r: 55 + h * 25 });
    const targets = Array.from({ length: FLOCKS }, () => ({ at: new Vector3(), t: 0 }));
    return { birds, targets, rnd };
  }, [perFlock, hawks]);

  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(0, 0, 0, 'YXZ'), s: new Vector3(), sep: new Vector3(), ali: new Vector3(), coh: new Vector3(), d: new Vector3(), acc: new Vector3() }), []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const { birds, targets, rnd } = state;
    const hometown = camera.position.z > -960 && camera.position.y < 90;
    if (mesh.current) mesh.current.visible = hometown;
    if (!hometown) return;
    // Wander targets: points ahead of the camera, re-picked every few seconds.
    const fwd = new Vector3();
    camera.getWorldDirection(fwd);
    targets.forEach((t, f) => {
      t.t -= dt;
      if (t.t <= 0) {
        t.t = 5 + rnd() * 6;
        t.at.copy(camera.position).addScaledVector(fwd.setY(0).normalize(), 90 + rnd() * 120);
        t.at.x += (rnd() - 0.5) * 160 + (f - 1.5) * 40;
        t.at.y = 26 + rnd() * 26;
      }
    });
    const { m, q, e, s, sep, ali, coh, d, acc } = tmp;
    birds.forEach((b, i) => {
      if (b.hawk) {
        // Soaring: slow circles on a thermal that drifts with the camera.
        const a = clock.elapsedTime * (0.12 + i * 0.005) + i;
        const cx = camera.position.x + 30, cz = camera.position.z - 140;
        const np = new Vector3(cx + Math.cos(a) * b.r, b.p.y + Math.sin(a * 0.5) * 0.02, cz + Math.sin(a) * b.r);
        b.v.copy(np).sub(b.p).divideScalar(Math.max(dt, 1e-3));
        if (b.v.length() > 40) b.v.setLength(12);
        b.p.copy(np);
        b.bank = 0.35;
      } else {
        sep.set(0, 0, 0);
        ali.set(0, 0, 0);
        coh.set(0, 0, 0);
        let nAli = 0;
        for (const o of birds) {
          if (o === b || o.flock !== b.flock) continue;
          d.copy(b.p).sub(o.p);
          const dist = d.length();
          if (dist < 3.5) sep.addScaledVector(d, 1 / Math.max(dist * dist, 0.2));
          if (dist < 14) {
            ali.add(o.v);
            coh.add(o.p);
            nAli++;
          }
        }
        acc.set(0, 0, 0);
        acc.addScaledVector(sep, 14);
        if (nAli) {
          acc.addScaledVector(ali.divideScalar(nAli).sub(b.v), 0.9);
          acc.addScaledVector(coh.divideScalar(nAli).sub(b.p), 0.35);
        }
        const t = targets[b.flock]!;
        d.copy(t.at).sub(b.p);
        acc.addScaledVector(d.normalize(), 3.2);
        // Keep above the rooftops.
        if (b.p.y < 22) acc.y += (22 - b.p.y) * 0.8;
        const before = Math.atan2(b.v.x, b.v.z);
        b.v.addScaledVector(acc, dt);
        b.v.y *= 0.98;
        const sp = b.v.length();
        b.v.setLength(Math.min(Math.max(sp, 7), 13));
        b.p.addScaledVector(b.v, dt);
        // Bank into the turn.
        const turn = Math.atan2(Math.sin(Math.atan2(b.v.x, b.v.z) - before), Math.cos(Math.atan2(b.v.x, b.v.z) - before)) / Math.max(dt, 1e-3);
        b.bank += (Math.max(-0.7, Math.min(0.7, -turn * 0.35)) - b.bank) * Math.min(1, dt * 3);
        // Flap in bursts, then glide; flap harder when climbing.
        b.burst -= dt;
        if (b.burst <= 0) b.burst = 1.2 + rnd() * 2.8;
        const flapping = b.burst > 1.0 || b.v.y > 1.2;
        b.effort += ((flapping ? 0.9 + Math.max(0, b.v.y) * 0.08 : 0.05) - b.effort) * Math.min(1, dt * 4);
        b.phase += dt * b.flapRate * (0.4 + b.effort * 0.6);
      }
      const yaw = Math.atan2(b.v.x, b.v.z);
      const pitch = -Math.atan2(b.v.y, Math.hypot(b.v.x, b.v.z)) * 0.8;
      e.set(pitch, yaw, b.bank);
      q.setFromEuler(e);
      const scale = b.hawk ? 2.6 : 1.25;
      m.compose(b.p, q, s.set(scale, scale, scale));
      mesh.current?.setMatrixAt(i, m);
      flap.setXY(i, b.hawk ? Math.sin(clock.elapsedTime * 0.7 + i) * 0.15 + 1.4 : b.phase, b.hawk ? 0.05 : b.effort);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    flap.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geo, mat, n]} frustumCulled={false} castShadow={false} />;
}
