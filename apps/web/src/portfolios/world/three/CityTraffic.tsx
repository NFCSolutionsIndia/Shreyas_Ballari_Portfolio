import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three';
import { CITY } from './City';
import { GROUND, SHREYAS_AT, STATUE_AT } from './path';
import { NIGHT } from './timeOfDay';

/**
 * Cars on the real streets of downtown Cumming. Each car keeps to its lane (driving on the right),
 * follows the car ahead with the Intelligent Driver Model (smooth acceleration, braking to keep a
 * safe gap), slows for curves and turns, sometimes pauses at a junction like a stop sign, and turns
 * onto a connecting street at the end of each block. Its body pitches under braking, rolls in turns,
 * the front wheels steer and every wheel turns with the distance driven; brake lights come on as it
 * slows and headlights at night. All cars are instanced: one draw call per part.
 */

const RIDE_STREETS = ['Tribble Gap Road', 'Veterans Memorial Boulevard'];
const COLORS = ['#f2efe8', '#1f2329', '#9aa3ad', '#2f4f7a', '#8c2f2f', '#d9dde4', '#3f4a5e', '#c9b79c', '#5d6b52', '#f2c14e'];

interface Lane {
  pts: Vector3[];
  cum: number[];
  len: number;
  vmax: number;
  next: number[];
}

function buildLanes() {
  const lanes: Lane[] = [];
  for (const r of CITY.roads) {
    if (!r.d) continue;
    const pts: Vector3[] = [];
    for (let i = 0; i + 1 < r.p.length; i += 2) pts.push(new Vector3(r.p[i]!, GROUND, r.p[i + 1]!));
    if (pts.length < 2) continue;
    // Keep clear of Shreyas, waiting with his bike on the square, and of the statue.
    if (pts.some((p) => Math.hypot(p.x - SHREYAS_AT.x, p.z - SHREYAS_AT.z) < 7 || Math.hypot(p.x - STATUE_AT.x, p.z - STATUE_AT.z) < 14)) continue;
    const vmax = { primary: 13, secondary: 12, tertiary: 10.5, trunk: 15, motorway: 18 }[r.c] ?? 8;
    const dirs = r.o ? [1] : [1, -1];
    for (const dir of dirs) {
      const src = dir > 0 ? pts : [...pts].reverse();
      // The rider owns the southbound lane of his street: only northbound traffic there.
      if (r.n && RIDE_STREETS.includes(r.n) && src[src.length - 1]!.z < src[0]!.z) continue;
      const off = r.o ? 0 : Math.min(r.w / 4, 3.4);
      const lanePts = src.map((p, i) => {
        const a = src[Math.max(0, i - 1)]!;
        const b = src[Math.min(src.length - 1, i + 1)]!;
        const t = b.clone().sub(a).setY(0).normalize();
        // Right of travel.
        return p.clone().add(new Vector3(-t.z, 0, t.x).multiplyScalar(off));
      });
      const cum = [0];
      for (let i = 1; i < lanePts.length; i++) cum.push(cum[i - 1]! + lanePts[i]!.distanceTo(lanePts[i - 1]!));
      if (cum[cum.length - 1]! < 12) continue;
      lanes.push({ pts: lanePts, cum, len: cum[cum.length - 1]!, vmax, next: [] });
    }
  }
  // Connections: a lane that starts near this lane's end, not straight back the way we came.
  lanes.forEach((L, i) => {
    const end = L.pts[L.pts.length - 1]!;
    const dir = end.clone().sub(L.pts[L.pts.length - 2]!).normalize();
    lanes.forEach((M, j) => {
      if (i === j) return;
      const s = M.pts[0]!;
      if (s.distanceTo(end) > 9) return;
      const md = M.pts[1]!.clone().sub(s).normalize();
      if (md.dot(dir) < -0.6) return;
      L.next.push(j);
    });
  });
  return lanes;
}

const _a = new Vector3();
const _b = new Vector3();
function sample(L: Lane, s: number, out: Vector3) {
  const d = Math.min(Math.max(s, 0), L.len);
  let i = 1;
  while (i < L.cum.length - 1 && L.cum[i]! < d) i++;
  const k = (d - L.cum[i - 1]!) / Math.max(L.cum[i]! - L.cum[i - 1]!, 1e-3);
  return out.copy(L.pts[i - 1]!).lerp(L.pts[i]!, k);
}
/** Heading (yaw) at s, from the rear axle to the front axle. */
function heading(L: Lane, s: number) {
  sample(L, s - 1.6, _a);
  sample(L, s + 1.6, _b);
  return Math.atan2(_b.x - _a.x, _b.z - _a.z);
}
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface Car {
  lane: number;
  s: number;
  v: number;
  v0: number;
  acc: number;
  yaw: number;
  steer: number;
  roll: number;
  pitch: number;
  spin: number;
  wait: number;
  stopAt: number;
  next: number;
  color: Color;
  fade: number;
}

export function CityTraffic({ count = 44 }: { count?: number }) {
  const lanes = useMemo(buildLanes, []);
  const cars = useMemo<Car[]>(() => {
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const long = lanes.map((l, i) => ({ l, i })).filter((x) => x.l.len > 40);
    return Array.from({ length: Math.min(count, long.length * 2) }, (_, n) => {
      const pick = long[Math.floor(rnd() * long.length)]!;
      return {
        lane: pick.i,
        s: rnd() * pick.l.len * 0.8,
        v: 4 + rnd() * 4,
        v0: 0.85 + rnd() * 0.25,
        acc: 0,
        yaw: 0,
        steer: 0,
        roll: 0,
        pitch: 0,
        spin: 0,
        wait: 0,
        stopAt: -1,
        next: -1,
        color: new Color(COLORS[n % COLORS.length]!),
        fade: 1,
      };
    });
  }, [lanes, count]);

  const geo = useMemo(() => {
    const body = new CapsuleGeometry(0.56, 3.7, 6, 14);
    body.rotateX(Math.PI / 2);
    body.scale(1.95, 1, 0.9);
    return {
      body,
      skirt: new BoxGeometry(2.2, 0.18, 4.9),
      cabin: new BoxGeometry(1.9, 0.75, 2.6),
      glass: new BoxGeometry(1.95, 0.55, 2.4),
      wheel: new CylinderGeometry(0.48, 0.48, 0.32, 14).rotateZ(Math.PI / 2),
      light: new CircleGeometry(0.2, 12),
    };
  }, []);
  const mats = useMemo(
    () => ({
      paint: new MeshStandardMaterial({ metalness: 0.35, roughness: 0.28 }),
      trim: new MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.5, roughness: 0.4 }),
      glass: new MeshStandardMaterial({ color: '#2b3350', metalness: 0.5, roughness: 0.12 }),
      tyre: new MeshStandardMaterial({ color: '#1e1e22', roughness: 0.9 }),
      head: new MeshBasicMaterial({ color: '#fff6d8', toneMapped: false }),
      tail: new MeshBasicMaterial({ toneMapped: false }),
    }),
    [],
  );
  const ref = {
    body: useRef<InstancedMesh>(null),
    skirt: useRef<InstancedMesh>(null),
    cabin: useRef<InstancedMesh>(null),
    glass: useRef<InstancedMesh>(null),
    wheel: useRef<InstancedMesh>(null),
    head: useRef<InstancedMesh>(null),
    tail: useRef<InstancedMesh>(null),
  };
  useEffect(() => {
    cars.forEach((c, i) => {
      ref.body.current?.setColorAt(i, c.color);
      ref.cabin.current?.setColorAt(i, c.color);
    });
    if (ref.body.current?.instanceColor) ref.body.current.instanceColor.needsUpdate = true;
    if (ref.cabin.current?.instanceColor) ref.cabin.current.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars]);

  const tmp = useMemo(() => ({ m: new Matrix4(), base: new Matrix4(), local: new Matrix4(), q: new Quaternion(), e: new Euler(0, 0, 0, 'YXZ'), p: new Vector3(), s: new Vector3(1, 1, 1), c: new Color() }), []);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    // Leaders: sort cars per lane by s (also look into the next lane for the car ahead).
    const byLane = new Map<number, Car[]>();
    for (const c of cars) {
      let arr = byLane.get(c.lane);
      if (!arr) byLane.set(c.lane, (arr = []));
      arr.push(c);
    }
    byLane.forEach((arr) => arr.sort((a, b) => a.s - b.s));

    for (const c of cars) {
      const L = lanes[c.lane]!;
      if (c.next < 0) c.next = L.next.length ? L.next[Math.floor(Math.random() * L.next.length)]! : -1;
      // Free-road speed: the street's limit, lower through curves and into a turn.
      let v0 = L.vmax * c.v0;
      const hNow = heading(L, c.s);
      const ahead = Math.min(c.s + 14, L.len);
      let turn = Math.abs(wrapAngle(heading(L, ahead) - hNow));
      const toEnd = L.len - c.s;
      if (c.next >= 0 && toEnd < 22) {
        const N = lanes[c.next]!;
        turn = Math.max(turn, Math.abs(wrapAngle(heading(N, 4) - heading(L, L.len - 0.5))));
      }
      v0 = Math.min(v0, Math.sqrt(2.6 / Math.max(turn / 14, 0.004)));
      // Gap to the leader.
      const arr = byLane.get(c.lane)!;
      const k = arr.indexOf(c);
      let gap = Infinity;
      let dv = 0;
      if (k < arr.length - 1) {
        const lead = arr[k + 1]!;
        gap = lead.s - c.s - 5.2;
        dv = c.v - lead.v;
      } else if (c.next >= 0) {
        const nextCars = byLane.get(c.next);
        if (nextCars?.length) {
          gap = toEnd + nextCars[0]!.s - 5.2;
          dv = c.v - nextCars[0]!.v;
        }
      }
      // Stop sign: some junctions get a full stop before the car turns.
      if (c.stopAt < 0 && toEnd < 30 && L.next.length > 1 && c.wait === 0) c.stopAt = Math.random() < 0.4 ? 1 : 0;
      if (c.stopAt === 1) gap = Math.min(gap, toEnd - 1.5);
      // Intelligent Driver Model.
      const aMax = 1.7;
      const b = 2.4;
      const sStar = 2.2 + c.v * 1.3 + (c.v * dv) / (2 * Math.sqrt(aMax * b));
      let a = aMax * (1 - Math.pow(c.v / Math.max(v0, 0.1), 4) - Math.pow(Math.max(sStar, 0) / Math.max(gap, 0.1), 2));
      a = Math.max(a, -7);
      if (c.wait > 0) {
        c.wait -= dt;
        a = 0;
        c.v = 0;
        if (c.wait <= 0) {
          c.wait = 0;
          c.stopAt = 0;
        }
      } else if (c.stopAt === 1 && toEnd < 2.2 && c.v < 0.6) {
        c.wait = 1.2 + Math.random() * 1.6;
        c.v = 0;
      }
      c.v = Math.max(0, c.v + a * dt);
      c.acc += (a - c.acc) * Math.min(1, dt * 4);
      c.s += c.v * dt;
      c.spin += (c.v * dt) / 0.48;
      // Onto the next street, or back into town somewhere out of sight.
      if (c.s >= L.len) {
        const over = c.s - L.len;
        if (c.next >= 0) {
          c.lane = c.next;
          c.s = over;
        } else {
          let tries = 0;
          let pick = Math.floor(Math.random() * lanes.length);
          while (tries++ < 30 && sample(lanes[pick]!, 0, _a).distanceTo(camera.position) < 140) pick = Math.floor(Math.random() * lanes.length);
          c.lane = pick;
          c.s = 0;
          c.fade = 0;
        }
        c.next = -1;
        c.stopAt = -1;
      }
      c.fade = Math.min(1, c.fade + dt * 1.5);
      // Body: yaw follows the axles, steering eases, pitch with acceleration, roll in turns.
      const Ln = lanes[c.lane]!;
      const yaw = heading(Ln, c.s);
      const dYaw = wrapAngle(yaw - c.yaw);
      c.yaw = c.yaw + dYaw * Math.min(1, dt * 8);
      const steerTarget = Math.max(-0.5, Math.min(0.5, wrapAngle(heading(Ln, c.s + 4) - yaw) * 2.2));
      c.steer += (steerTarget - c.steer) * Math.min(1, dt * 5);
      const yawRate = dYaw / Math.max(dt, 1e-3);
      c.roll += (Math.max(-0.05, Math.min(0.05, -yawRate * c.v * 0.004)) - c.roll) * Math.min(1, dt * 4);
      c.pitch += (Math.max(-0.035, Math.min(0.035, c.acc * 0.01)) - c.pitch) * Math.min(1, dt * 4);
    }

    // Matrices.
    const { m, base, local, q, e, p, s, c: col } = tmp;
    const night = NIGHT.value;
    cars.forEach((c, i) => {
      const L = lanes[c.lane]!;
      sample(L, c.s, p);
      const sc = 0.4 + 0.6 * c.fade;
      e.set(c.pitch, c.yaw, c.roll);
      q.setFromEuler(e);
      base.compose(p, q, s.set(sc, sc, sc));
      const put = (r: RefObject<InstancedMesh | null>, idx: number, x: number, y: number, z: number, rx = 0, ry = 0) => {
        e.set(rx, ry, 0);
        local.compose(_a.set(x, y, z), q.setFromEuler(e), s.set(1, 1, 1));
        m.multiplyMatrices(base, local);
        r.current?.setMatrixAt(idx, m);
      };
      put(ref.body, i, 0, 1.05, 0);
      put(ref.skirt, i, 0, 0.72, 0);
      put(ref.cabin, i, 0, 1.85, -0.3);
      put(ref.glass, i, 0, 1.85, -0.3);
      let w = 0;
      for (const z of [1.6, -1.6])
        for (const x of [-1.05, 1.05]) {
          // Wheels: base pose undoes body pitch/roll a little (suspension), front ones steer.
          put(ref.wheel, i * 4 + w, x, 0.5, z, c.spin, z > 0 ? c.steer : 0);
          w++;
        }
      put(ref.head, i * 2, -0.7, 1.1, 2.41);
      put(ref.head, i * 2 + 1, 0.7, 1.1, 2.41);
      put(ref.tail, i * 2, -0.75, 1.15, -2.42, 0, Math.PI);
      put(ref.tail, i * 2 + 1, 0.75, 1.15, -2.42, 0, Math.PI);
      const brake = c.acc < -0.6 || c.wait > 0 ? 1 : 0;
      col.setRGB(0.55 + brake * 1.6 + night * 0.4, 0.04 + brake * 0.08, 0.05);
      ref.tail.current?.setColorAt(i * 2, col);
      ref.tail.current?.setColorAt(i * 2 + 1, col);
    });
    mats.head.color.setScalar(0.75 + night * 1.6);
    Object.values(ref).forEach((r) => {
      if (!r.current) return;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    });
  });

  const n = cars.length;
  return (
    <group>
      <instancedMesh ref={ref.body} args={[geo.body, mats.paint, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={ref.skirt} args={[geo.skirt, mats.trim, n]} frustumCulled={false} />
      <instancedMesh ref={ref.cabin} args={[geo.cabin, mats.paint, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={ref.glass} args={[geo.glass, mats.glass, n]} frustumCulled={false} />
      <instancedMesh ref={ref.wheel} args={[geo.wheel, mats.tyre, n * 4]} frustumCulled={false} />
      <instancedMesh ref={ref.head} args={[geo.light, mats.head, n * 2]} frustumCulled={false} />
      <instancedMesh ref={ref.tail} args={[geo.light, mats.tail, n * 2]} frustumCulled={false} />
    </group>
  );
}
