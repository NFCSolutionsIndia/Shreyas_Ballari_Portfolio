import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import RIDE_DATA from '../data/cummingRide.json';

/**
 * The journey through "My World": where things are, and where the camera is at every point of
 * the scroll (0–1). Scroll → camera is a pure function, so scrolling back plays it in reverse.
 *
 * Lake (dawn/day/sunset/night by the visitor's clock) → under the bridge → through the interests
 * arch → ABOUT ME → Shreyas and his bike → ride past his schools, the work gate, MY WORK, his
 * skills and the projector screens (Oncure, stock app) → golden statue → awards above the
 * clouds → skydive and parachute → Get in touch city → through the window into his room.
 */

export const GROUND = 3.2;

/** Scroll stops (the menu, voice and the guide jump to these; overlays key off them). */
export const STOPS = {
  home: 0,
  welcome: 0.07,
  aboutMe: 0.15,
  about: 0.21,
  ride: 0.31,
  rideEnd: 0.66,
  statue: 0.69,
  awards: 0.735,
  awardsEnd: 0.8,
  fall: 0.825,
  chute: 0.86,
  land: 0.92,
  contact: 0.94,
  room: 0.978,
  end: 1,
};

/**
 * The road Shreyas rides, from the square to the statue: the real street, south from the square
 * in Cumming along Tribble Gap Road into Veterans Memorial Boulevard (OpenStreetMap, see
 * tools/osm/build_cumming.py), resampled every 12 units.
 */
export const ROAD = new CatmullRomCurve3(
  RIDE_DATA.ride.filter(([, z]) => z! >= -870).map(([x, z]) => new Vector3(x, GROUND, z)),
  false,
  'centripetal',
);
export const STATUE_AT = new Vector3(0, GROUND, -910);
export const SHREYAS_AT = new Vector3(1.7, GROUND, -338.5);
export const LAKE_GUY = new Vector3(-6.2, GROUND - 1.5, 2);
export const BRIDGE_Z = -110;
export const ARCH_Z = -214;
export const PANELS_Z = -1000;
export const PANELS_Y = 172;
export const PANEL_XS = [-84, -56, -28, 0, 28, 56, 84];
export const FINALE_Z = -1500;
export const HOUSE_Z = FINALE_Z - 100;
/** Eye point in the middle of Shreyas's room (the camera turns a full circle here). */
export const ROOM_EYE = new Vector3(0, 9.2, HOUSE_Z - 16);

/** Points along the ride (road t) where things stand. */
export const RIDE = {
  schools: [0.07, 0.15, 0.23],
  gate: 0.31,
  sign: 0.38,
  skills: [0.43, 0.46, 0.49, 0.52, 0.55, 0.58],
  oncure: 0.62,
  stocks: 0.75,
  tutoring: 0.88,
};

const UP = new Vector3(0, 1, 0);

/** Where the rider is along the road (0–1) for a scroll position. */
export function rideT(p: number) {
  return MathUtils.clamp((p - STOPS.ride) / (STOPS.rideEnd - STOPS.ride), 0, 1);
}

/** Rider position (right-hand lane) and direction on the road. */
export function roadFrame(t: number) {
  const u = MathUtils.clamp(t, 0, 1);
  const dir = ROAD.getTangentAt(u).normalize();
  const pos = ROAD.getPointAt(u).add(new Vector3(-dir.z, 0, dir.x).multiplyScalar(2.4));
  return { pos, dir };
}

/** A spot beside the road at t: side +1 is the rider's right, −1 the left. */
export function roadside(t: number, side: number, off: number) {
  const p = ROAD.getPointAt(t);
  const d = ROAD.getTangentAt(t).normalize();
  const right = new Vector3(-d.z, 0, d.x);
  const at = p.clone().addScaledVector(right, side * off);
  // Facing back towards the oncoming rider.
  const ry = Math.atan2(-d.x, -d.z);
  return { at, ry, dir: d, right };
}

/** The giant "MY WORK" sign: in a clearing on the rider's left, facing the oncoming road. */
export function signPlace() {
  const { at, ry } = roadside(RIDE.sign, -1, 27);
  return { at: at.setY(GROUND + 1.2), ry: ry + 0.25 };
}

/** Open ground kept free of trees and farmhouses (schools, gate, sign, screens). */
export function clearings() {
  const out: { at: Vector3; r: number }[] = [];
  RIDE.schools.forEach((t, i) => out.push({ at: roadside(t, i % 2 ? -1 : 1, 28).at, r: 30 }));
  out.push({ at: roadside(RIDE.gate, 1, 0).at, r: 22 });
  out.push({ at: signPlace().at, r: 26 });
  out.push({ at: roadside(RIDE.oncure, 1, 24).at, r: 26 });
  out.push({ at: roadside(RIDE.stocks, -1, 24).at, r: 26 });
  out.push({ at: roadside(RIDE.tutoring, 1, 24).at, r: 26 });
  return out;
}

/** Things the chase camera turns to as the rider passes (road t → world point). */
function attention(t: number) {
  const items: { t: number; w: number; at: Vector3 }[] = [];
  RIDE.schools.forEach((s, i) => items.push({ t: s, w: 0.035, at: roadside(s, i % 2 ? -1 : 1, 26).at.setY(GROUND + 8) }));
  items.push({ t: RIDE.sign + 0.01, w: 0.035, at: signPlace().at.clone().setY(GROUND + 4) });
  items.push({ t: RIDE.oncure, w: 0.045, at: roadside(RIDE.oncure, 1, 24).at.setY(GROUND + 11) });
  items.push({ t: RIDE.stocks, w: 0.045, at: roadside(RIDE.stocks, -1, 24).at.setY(GROUND + 11) });
  items.push({ t: RIDE.tutoring, w: 0.045, at: roadside(RIDE.tutoring, 1, 24).at.setY(GROUND + 11) });
  let best: { k: number; at: Vector3 } | null = null;
  for (const it of items) {
    // Look early, as the thing comes up ahead.
    const k = Math.exp(-(((t - (it.t - 0.02)) / it.w) ** 2));
    if (!best || k > best.k) best = { k, at: it.at };
  }
  return best;
}

/** Chase camera behind the rider, turning towards points of interest. */
export function chase(t: number) {
  const { pos, dir } = roadFrame(t);
  const cam = pos.clone().addScaledVector(dir, -9).addScaledVector(UP, 4.2);
  const look = pos.clone().addScaledVector(dir, 14).addScaledVector(UP, 2.4);
  const a = attention(t);
  if (a) {
    look.lerp(a.at, a.k * 0.75);
    cam.y += a.k * 1.5;
  }
  return { pos: cam, look };
}

/** The skydive: free fall from above the clouds, parachute, glide down into the Get in touch city. */
export function diverAt(p: number) {
  const fall = MathUtils.clamp((p - STOPS.fall) / (STOPS.chute - STOPS.fall), 0, 1);
  const glide = MathUtils.clamp((p - STOPS.chute) / (STOPS.land - STOPS.chute), 0, 1);
  const top = new Vector3(0, 190, PANELS_Z - 10);
  const open = new Vector3(0, 118, PANELS_Z - 40);
  const ground = new Vector3(-6, GROUND, FINALE_Z + 12);
  const pos = new Vector3();
  if (glide <= 0) pos.lerpVectors(top, open, MathUtils.smoothstep(fall, 0, 1));
  else {
    // Glide: forward faster than down at first, flaring just before touchdown.
    const g = MathUtils.smootherstep(glide, 0, 1);
    pos.lerpVectors(open, ground, g);
    pos.y = MathUtils.lerp(open.y, ground.y, 1 - Math.pow(1 - g, 1.6));
    pos.x += Math.sin(glide * Math.PI * 2) * 10 * (1 - g);
  }
  return { pos, fall, glide, canopy: MathUtils.smoothstep(p, STOPS.chute - 0.004, STOPS.chute + 0.01), landed: p >= STOPS.land };
}

interface Key {
  p: number;
  pos: Vector3;
  look: Vector3;
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const c0 = chase(0);
const c1 = chase(1);

/** Camera keyframes outside the ride and the dive. */
const KEYS: Key[] = [
  { p: 0, pos: v(-9.5, 5.4, 9), look: v(-2, 9, -160) },
  { p: 0.035, pos: v(-6, 4, -40), look: v(-2, 9, -200) },
  { p: STOPS.welcome, pos: v(-4, 6.5, BRIDGE_Z + 6), look: v(0, 9, -240) },
  { p: 0.11, pos: v(-2, 7, -175), look: v(0, 8, -260) },
  { p: 0.135, pos: v(0, 6, ARCH_Z - 4), look: v(-8, 6, -270) },
  { p: STOPS.aboutMe, pos: v(4, 5, -238), look: v(-14, 7, -268) },
  { p: 0.185, pos: v(-2, 5.4, -300), look: v(0, 5.4, -339) },
  { p: STOPS.about, pos: v(-4.5, 5.2, -323), look: v(-0.5, 5.4, -339) },
  { p: 0.29, pos: v(-3, 5, -325), look: v(0.5, 5.2, -339) },
  { p: STOPS.ride, pos: c0.pos, look: c0.look },
  { p: STOPS.rideEnd, pos: c1.pos, look: c1.look },
  { p: STOPS.statue, pos: v(0, 6, -862), look: v(0, 34, -910) },
  { p: 0.715, pos: v(0, 40, -872), look: v(0, 70, -910) },
  { p: STOPS.awards, pos: v(-66, PANELS_Y - 3, PANELS_Z + 54), look: v(-66, PANELS_Y, PANELS_Z) },
  { p: STOPS.awardsEnd, pos: v(66, PANELS_Y - 3, PANELS_Z + 54), look: v(66, PANELS_Y, PANELS_Z) },
  { p: STOPS.land, pos: v(-8, 6, FINALE_Z + 52), look: v(0, 16, FINALE_Z - 40) },
  { p: STOPS.contact, pos: v(0, 8, FINALE_Z + 40), look: v(0, 16, FINALE_Z - 30) },
  { p: 0.954, pos: v(0, 9, FINALE_Z + 26), look: v(0, 12, FINALE_Z - 40) },
  { p: 0.963, pos: v(0, 17, FINALE_Z - 52), look: v(0, 9, HOUSE_Z) },
  { p: 0.971, pos: v(0, 8.6, HOUSE_Z + 2), look: v(0, 8.6, HOUSE_Z - 40) },
  { p: STOPS.room, pos: ROOM_EYE.clone(), look: ROOM_EYE.clone().add(v(0, -0.4, -10)) },
  { p: STOPS.end, pos: ROOM_EYE.clone(), look: ROOM_EYE.clone().add(v(0, -0.4, -10)) },
];

const out = { pos: new Vector3(), look: new Vector3() };

/** Camera position and target for a scroll position. */
export function cameraAt(p: number) {
  if (p > STOPS.ride && p < STOPS.rideEnd) {
    const c = chase(rideT(p));
    out.pos.copy(c.pos);
    out.look.copy(c.look);
    return out;
  }
  if (p > STOPS.awardsEnd && p < STOPS.land) {
    // Follow the diver: above him in free fall, behind him under the canopy.
    const d = diverAt(p);
    const enter = MathUtils.smoothstep(p, STOPS.awardsEnd, STOPS.fall);
    const above = d.pos.clone().add(v(3, 16, 8));
    const behind = d.pos.clone().add(v(0, 9, 30));
    const camPos = above.lerp(behind, d.canopy);
    const look = d.pos.clone().add(v(0, d.canopy * -6, d.canopy * -40));
    const last = KEYS.find((k) => k.p === STOPS.awardsEnd)!;
    out.pos.lerpVectors(last.pos, camPos, enter);
    out.look.lerpVectors(last.look, look, enter);
    // Hand over smoothly to the landing shot.
    const land = MathUtils.smoothstep(p, STOPS.land - 0.012, STOPS.land);
    const lk = KEYS.find((k) => k.p === STOPS.land)!;
    out.pos.lerp(lk.pos, land);
    out.look.lerp(lk.look, land);
    return out;
  }
  if (p > STOPS.room) {
    // Look all the way round the room: back wall, bookshelf, window wall, projects wall.
    const u = MathUtils.smootherstep(p, STOPS.room, STOPS.end);
    const yaw = u * Math.PI * 2;
    out.pos.copy(ROOM_EYE);
    out.look.copy(ROOM_EYE).add(v(-Math.sin(yaw) * 10, -0.4, -Math.cos(yaw) * 10));
    return out;
  }
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1]!.p) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = MathUtils.smootherstep(p, a.p, b.p);
  out.pos.lerpVectors(a.pos, b.pos, t);
  out.look.lerpVectors(a.look, b.look, t);
  return out;
}

/** 0 = the hometown at the visitor's time of day, 1 = the bright day of the Get in touch city. */
export function moodAt(p: number) {
  return MathUtils.smoothstep(p, STOPS.chute, STOPS.land - 0.02);
}

/** A soft white-out as the diver drops through the cloud deck. */
export function whiteAt(p: number) {
  const up = MathUtils.smoothstep(p, STOPS.chute - 0.012, STOPS.chute);
  const down = 1 - MathUtils.smoothstep(p, STOPS.chute + 0.004, STOPS.chute + 0.02);
  return Math.min(up, down) * 0.85;
}
