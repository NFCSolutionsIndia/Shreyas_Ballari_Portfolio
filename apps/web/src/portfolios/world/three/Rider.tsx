import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, MathUtils, Quaternion, Vector3, type Group } from 'three';
import { Avatar, emptyPose, lerpPose, type Pose } from './Avatar';
import { Bicycle, SEAT_H, WHEEL_R, type BicycleHandles } from './Bicycle';
import { ROAD, rideT, roadFrame, SHREYAS_AT, STOPS } from './path';

/**
 * Shreyas and his bicycle. In the square he stands by the bike, waves and talks to the visitor;
 * then he swings on and rides the road. While riding, his feet stay on the pedals and his hands
 * on the bars (two-bone IK in Avatar), the cranks turn with the distance travelled, and the
 * bike leans into the bends.
 */

export const RIDER_SCALE = 1.85;
const CRANK_C = new Vector3(0, WHEEL_R + 0.12, -0.02);
const CRANK_L = 0.17;
const GEAR = 0.5;

function pedal(out: Vector3, angle: number, side: 1 | -1) {
  const a = angle + (side > 0 ? 0 : Math.PI);
  // Same rotation as the crank group: y' = y cos − z sin, z' = y sin + z cos with (y, z) = (−L, 0).
  return out.set(side * 0.13, CRANK_C.y - CRANK_L * Math.cos(a) + 0.045, CRANK_C.z - CRANK_L * Math.sin(a) + 0.02);
}

export function Rider({ progress }: { progress: RefObject<number> }) {
  const person = useRef<Group>(null);
  const bike = useRef<Group>(null);
  const parts = useMemo<BicycleHandles>(() => ({ front: null, back: null, cranks: null }), []);
  const pose = useRef<Pose>(emptyPose());
  const stand = useMemo(emptyPose, []);
  const ride = useMemo(emptyPose, []);
  const roadLen = useMemo(() => ROAD.getLength(), []);
  const tmp = useMemo(
    () => ({ qStand: new Quaternion(), qBike: new Quaternion(), e: new Euler(0, 0, 0, 'YXZ'), v: new Vector3(), lean: 0, wave: 0 }),
    [],
  );

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const time = clock.elapsedTime;
    const p = MathUtils.clamp(progress.current ?? 0, 0, 1);
    const g = person.current;
    const b = bike.current;
    if (!g || !b) return;
    const visible = p < STOPS.rideEnd + 0.06;
    g.visible = b.visible = visible;
    if (!visible) return;

    // --- Bicycle on the road -------------------------------------------------------------------
    const t = rideT(p);
    const { pos, dir } = roadFrame(t);
    const heading = Math.atan2(dir.x, dir.z);
    // Lean into the bend: compare the heading a little further on.
    const ahead = roadFrame(Math.min(1, t + 0.02)).dir;
    let turn = Math.atan2(ahead.x, ahead.z) - heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const riding = p > STOPS.ride && p < STOPS.rideEnd ? 1 : 0;
    tmp.lean = MathUtils.lerp(tmp.lean, MathUtils.clamp(-turn * 2.2, -0.28, 0.28) * riding, 1 - Math.exp(-dt * 4));
    b.position.copy(pos);
    tmp.e.set(0, heading, tmp.lean);
    b.quaternion.setFromEuler(tmp.e);
    const dist = (t * roadLen) / RIDER_SCALE;
    const spin = dist / WHEEL_R;
    if (parts.front) parts.front.rotation.x = spin;
    if (parts.back) parts.back.rotation.x = spin;
    const crank = spin * GEAR;
    if (parts.cranks) parts.cranks.rotation.x = crank;

    // --- Riding pose (bike frame) --------------------------------------------------------------
    const bob = Math.sin(crank * 2) * 0.008;
    ride.hip.set(Math.sin(crank) * 0.012, SEAT_H + 0.07 + bob, -0.17);
    ride.neck.set(0, SEAT_H + 0.52, 0.12);
    pedal(ride.footL, crank, 1);
    pedal(ride.footR, crank, -1);
    ride.handL.set(0.25, 1.08, 0.26);
    ride.handR.set(-0.25, 1.08, 0.26);
    ride.kneeDir.set(0, 0.35, 1).normalize();
    ride.elbowDir.set(0, -0.6, -0.5).normalize();
    ride.look.yaw = 0;
    ride.look.pitch = -0.35;

    // --- Standing pose (his own frame, feet at the origin) -------------------------------------
    const breathe = Math.sin(time * 1.6) * 0.006;
    stand.hip.set(0, 0.93, 0);
    stand.neck.set(0, 1.47 + breathe, 0.01);
    stand.footL.set(0.11, 0.06, 0.02);
    stand.footR.set(-0.11, 0.06, 0.02);
    stand.kneeDir.set(0, 0, 1);
    stand.elbowDir.set(0, -0.2, -1).normalize();
    const greeting = p > 0.2 && p < 0.245;
    const talking = p >= 0.245 && p < 0.292;
    tmp.wave = MathUtils.lerp(tmp.wave, greeting ? 1 : 0, 1 - Math.exp(-dt * 5));
    // Left hand rests on the saddle side; right hand waves, or both gesture while talking.
    stand.handL.set(0.25, 0.88 + breathe, 0.04);
    stand.handR.set(-0.25, 0.88 + breathe, 0.04);
    if (talking) {
      stand.handL.set(0.2, 1.06 + Math.sin(time * 3.1) * 0.04, 0.24);
      stand.handR.set(-0.22, 1.1 + Math.sin(time * 2.6 + 1) * 0.05, 0.26);
    }
    const wv = tmp.v.set(-0.36 + Math.sin(time * 9) * 0.09, 1.72, 0.12);
    stand.handR.lerp(wv, tmp.wave);
    stand.elbowDir.set(0, -0.2 - 0.6 * tmp.wave, -1 + 0.5 * tmp.wave).normalize();
    // Head looks at the camera.
    const toCam = tmp.v.subVectors(camera.position, SHREYAS_AT);
    const face = MathUtils.clamp(Math.atan2(toCam.x, toCam.z), -1.1, 1.1);
    stand.look.yaw = 0;
    stand.look.pitch = MathUtils.clamp(-Math.atan2(toCam.y - 3, Math.hypot(toCam.x, toCam.z)), -0.3, 0.3);

    // --- Getting on --------------------------------------------------------------------------
    const mount = MathUtils.smootherstep(p, 0.292, STOPS.ride - 0.004);
    // Swing the leg over: lift the right foot through the middle of the move.
    lerpPose(pose.current, stand, ride, mount);
    pose.current.footR.y += Math.sin(mount * Math.PI) * 0.55;
    tmp.qStand.setFromEuler(tmp.e.set(0, face, 0));
    tmp.qBike.copy(b.quaternion);
    g.quaternion.slerpQuaternions(tmp.qStand, tmp.qBike, mount);
    g.position.lerpVectors(SHREYAS_AT, b.position, mount);
  });

  return (
    <>
      <group ref={person} scale={RIDER_SCALE}>
        <Avatar pose={pose} helmet />
      </group>
      <group ref={bike} scale={RIDER_SCALE}>
        <Bicycle parts={parts} />
      </group>
    </>
  );
}
