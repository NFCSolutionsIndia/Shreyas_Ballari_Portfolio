import { MathUtils } from 'three';
import type { Pose } from './Avatar';

/**
 * A human walk cycle for the procedural avatar (body-local units: the avatar is about 1.7 tall,
 * +z forward, +x the person's left).
 *
 * Each foot is planted for 62% of the cycle and does not move in the world while it is: in body
 * space it slides back at exactly the walking speed, so there is no foot skating. It then swings
 * through: heel off, knee lifts the foot clear of the ground, the leg reaches forward and the heel
 * strikes. The pelvis is lowest at double support (both feet down) and highest over the standing
 * leg, and sways towards the standing leg. Arms swing opposite to the legs, the elbow bending more
 * on the forward swing; the chest counter-rotates a little.
 *
 * `phase` is 0..1 (left heel strike at 0), `stride` is the length of one full cycle (two steps)
 * and `speed` scales how pronounced the motion is (0 = standing still).
 */
const STANCE = 0.62;

export function strideFor(speed: number) {
  // Taller strides at higher speed, as people do (cadence rises more slowly than speed).
  return MathUtils.clamp(0.5 + speed * 0.5, 0.6, 1.3);
}

function foot(phi: number, half: number) {
  const p = ((phi % 1) + 1) % 1;
  if (p < STANCE) {
    // Planted: moves back from +half to −half at walking speed; the heel lifts at the end.
    const u = p / STANCE;
    const heel = MathUtils.smoothstep(u, 0.78, 1) * 0.035;
    return { z: half - 2 * half * u, y: heel, swing: 0 };
  }
  // Swing: smooth reach forward, lifted most just after toe off (knee flexed).
  const u = (p - STANCE) / (1 - STANCE);
  const z = -half + 2 * half * (u * u * (3 - 2 * u));
  const lift = Math.sin(Math.PI * Math.pow(u, 0.8)) * 0.11;
  return { z, y: lift, swing: Math.sin(Math.PI * u) };
}

export function walkPose(P: Pose, phase: number, stride: number, speed: number) {
  const k = MathUtils.clamp(speed / 1.1, 0, 1.2);
  const half = (stride * STANCE) / 2;
  const L = foot(phase, half);
  const R = foot(phase + 0.5, half);
  const tau = Math.PI * 2;
  // Pelvis: down at heel strikes (phase 0 and 0.5), up over the standing leg; sway to that side.
  const bob = -Math.cos(phase * tau * 2) * 0.022 * k;
  const sway = Math.sin(phase * tau) * 0.022 * k;
  const hipY = 0.915 + bob - 0.012 * k;
  P.hip.set(sway, hipY, 0.01 * k);
  P.neck.set(sway * 0.4, hipY + 0.545, 0.035 + 0.02 * k);
  P.footL.set(0.1 + sway * 0.15, 0.06 + L.y, L.z);
  P.footR.set(-0.1 + sway * 0.15, 0.06 + R.y, R.z);
  // Arms swing with the opposite leg, a little behind the body at rest.
  const armL = -R.z / Math.max(half, 0.01) * 0.2 * k;
  const armR = -L.z / Math.max(half, 0.01) * 0.2 * k;
  P.handL.set(0.25, 0.9 + Math.max(0, armL) * 0.18, armL - 0.02);
  P.handR.set(-0.25, 0.9 + Math.max(0, armR) * 0.18, armR - 0.02);
  // Knees bend forward; elbows bend backwards (forearm forward), more on the forward swing.
  P.kneeDir.set(0, 0, 1);
  P.elbowDir.set(0, -0.15, -1).normalize();
  P.look.yaw = Math.sin(phase * tau) * 0.04 * k;
  P.look.pitch = -0.04;
}

/** Standing still, weight shifting slightly (a breathing idle). */
export function idlePose(P: Pose, t: number) {
  const b = Math.sin(t * 1.6) * 0.004;
  const shift = Math.sin(t * 0.35) * 0.015;
  P.hip.set(shift, 0.925 + b, 0);
  P.neck.set(shift * 0.5, 1.47 + b * 1.4, 0.03);
  P.footL.set(0.11, 0.06, 0.02);
  P.footR.set(-0.11, 0.06, -0.02);
  P.handL.set(0.25, 0.88 + b, 0.0);
  P.handR.set(-0.25, 0.88 + b, 0.0);
  P.kneeDir.set(0, 0, 1);
  P.elbowDir.set(0, -0.15, -1).normalize();
  P.look.yaw = Math.sin(t * 0.21) * 0.25;
  P.look.pitch = 0;
}
