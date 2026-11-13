import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3, type Group } from 'three';
import { PLACES, type PlaceId } from '../places';
import { STORY } from '../story';
import { createControl, type AvatarControl } from './Avatar';
import { Html } from './drei';
import { HumanAvatar } from './HumanAvatar';

/** Realistic characters built in Blender (see C:\SHREYAS_BALLARI_PORTFOLIO_assets\avatar). */
const MODELS = {
  shreyas: `${import.meta.env.BASE_URL}models/shreyas.glb`,
  student: `${import.meta.env.BASE_URL}models/student.glb`,
};

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SPEED = 1.9; // metres per second: a brisk walk, matched to the walking clip's stride
const DOOR_Z = 8; // the wall between corridor and room

/** The speech bubble above Shreyas: types each line, then offers the stop's actions. */
function Bubble({ place, onTalking, onNext, onOpen }: {
  place: PlaceId;
  onTalking: (talking: boolean, beat: number, phoneme?: string) => void;
  onNext: () => void;
  onOpen: (id: PlaceId) => void;
}) {
  const stop = STORY[place];
  const [beat, setBeat] = useState(0);
  const [shown, setShown] = useState(0);
  const line = stop.beats[beat]?.text ?? '';
  const done = shown >= line.length;
  const last = beat === stop.beats.length - 1;
  const nextPlace = PLACES[PLACES.findIndex((p) => p.id === place) + 1];

  useEffect(() => {
    setBeat(0);
    setShown(0);
  }, [place]);

  useEffect(() => {
    if (reduceMotion) {
      setShown(line.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= line.length ? n : n + 1)), 24);
    return () => window.clearInterval(id);
  }, [line]);

  useEffect(() => onTalking(!done, beat, line[shown - 1]), [done, beat, shown, line, onTalking]);

  // Lines move on by themselves after a pause, until the last one.
  useEffect(() => {
    if (!done || last) return;
    const id = window.setTimeout(() => setBeat((b) => b + 1), 2600);
    return () => window.clearTimeout(id);
  }, [done, last]);

  return (
    <div className="room-bubble" role="status" aria-live="polite">
      <p className="room-bubble-name">
        <span aria-hidden="true" className="room-bubble-dot" />
        Shreyas
      </p>
      <p className="room-bubble-text">
        {line.slice(0, shown)}
        <span aria-hidden="true" className="opacity-0">
          {line.slice(shown)}
        </span>
      </p>
      <div className="room-bubble-actions">
        <span aria-hidden="true" className="room-bubble-steps">
          {stop.beats.map((_, i) => (
            <i key={i} data-on={i === beat || undefined} />
          ))}
        </span>
        {!last ? (
          <button type="button" onClick={() => (done ? setBeat(beat + 1) : setShown(line.length))}>
            {done ? 'Next' : 'Skip'}
          </button>
        ) : (
          <>
            {stop.page && (
              <button type="button" className="is-primary" onClick={() => onOpen(stop.page!)}>
                {stop.pageLabel}
              </button>
            )}
            {nextPlace && (
              <button type="button" onClick={onNext}>
                {place === 'door' ? 'Come in' : `Next: ${nextPlace.name}`} ›
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Shreyas walks with the visitor: he waits at each stop, faces them, gestures and talks.
 * Walking from the corridor into the room goes through the doorway.
 */
export function Guide({ current, onGoTo, onOpen }: {
  current: number;
  onGoTo: (id: PlaceId) => void;
  onOpen: (id: PlaceId) => void;
}) {
  const { camera } = useThree();
  const root = useRef<Group>(null);
  const control = useRef<AvatarControl>(createControl({ gesture: 'wave' }));
  const route = useRef<Vector3[]>([]);
  const pos = useRef(new Vector3(STORY.door.at[0], 0, STORY.door.at[1]));
  const yaw = useRef(Math.PI);
  const beatRef = useRef(0);
  const mountedAt = useRef(performance.now());
  const [arrived, setArrived] = useState(false);
  const place = (PLACES[current] ?? PLACES[0]!).id;
  const stop = STORY[place];

  // New stop: plan the walk (through the doorway if it crosses the front wall).
  useEffect(() => {
    const to = new Vector3(stop.at[0], 0, stop.at[1]);
    beatRef.current = 0;
    // On arrival (or returning mid-tour, which restores the stop just after loading) he's
    // already waiting at the visitor's stop rather than walking over from the door.
    if (performance.now() - mountedAt.current < 3000) {
      pos.current.copy(to);
      route.current = [];
      return;
    }
    const from = pos.current;
    const path: Vector3[] = [];
    if (from.z > DOOR_Z !== to.z > DOOR_Z) {
      path.push(new Vector3(0.05, 0, from.z > DOOR_Z ? DOOR_Z + 0.7 : DOOR_Z - 0.7));
      path.push(new Vector3(0.05, 0, from.z > DOOR_Z ? DOOR_Z - 0.7 : DOOR_Z + 0.7));
    }
    path.push(to);
    route.current = path;
    beatRef.current = 0;
    if (reduceMotion) {
      pos.current.copy(to);
      route.current = [];
    }
  }, [stop]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const c = control.current;
    const g = root.current;
    if (!g) return;
    const next = route.current[0];
    let moving = false;
    if (next) {
      const d = next.clone().sub(pos.current);
      const dist = d.length();
      if (dist < 0.05) route.current.shift();
      else {
        moving = true;
        pos.current.addScaledVector(d.normalize(), Math.min(dist, SPEED * dt));
        const want = Math.atan2(d.x, d.z);
        yaw.current += MathUtils.euclideanModulo(want - yaw.current + Math.PI, Math.PI * 2) - Math.PI;
      }
    }
    if (!moving) {
      // Face the visitor.
      const want = Math.atan2(camera.position.x - pos.current.x, camera.position.z - pos.current.z);
      const diff = MathUtils.euclideanModulo(want - g.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      yaw.current = g.rotation.y + diff;
    }
    const k = 1 - Math.exp(-dt * 8);
    g.position.copy(pos.current);
    // Out of sight while he squeezes past the visitor, so he never fills the screen.
    g.visible = Math.hypot(camera.position.x - pos.current.x, camera.position.z - pos.current.z) > 1;
    g.rotation.y += (yaw.current - g.rotation.y) * k;
    c.walk = MathUtils.lerp(c.walk, moving ? 1 : 0, 1 - Math.exp(-dt * 6));
    const beat = stop.beats[beatRef.current];
    c.gesture = beat?.gesture === 'point' && !stop.point ? 'talk' : (beat?.gesture ?? 'idle');
    c.pointAt = stop.point ? new Vector3(...stop.point) : null;
    c.lookAt = moving ? null : camera.position;
    if (moving === arrived) setArrived(!moving);
  });

  const onTalking = (talking: boolean, beat: number, phoneme?: string) => {
    control.current.talking = talking;
    control.current.phoneme = phoneme;
    beatRef.current = beat;
  };

  return (
    <>
      <group ref={root} position={pos.current.toArray()} rotation={[0, Math.PI, 0]}>
        <Suspense fallback={null}>
          <HumanAvatar url={MODELS.shreyas} control={control} root={root} hairTint={0.35} />
        </Suspense>
        {arrived && (
          <Html position={[0, 2.05, 0]} center zIndexRange={[40, 31]}>
            <Bubble
              place={place}
              onTalking={onTalking}
              onNext={() => onGoTo(PLACES[current + 1]?.id ?? place)}
              onOpen={onOpen}
            />
          </Html>
        )}
      </group>
      <Student listening={place === 'tutoring'} />
    </>
  );
}

/** The classmate at the study table, listening (and nodding) during tutoring. */
function Student({ listening }: { listening: boolean }) {
  const root = useRef<Group>(null);
  const control = useRef<AvatarControl>(
    createControl({ seated: true, lookAt: new Vector3(-6.05, 1.6, 2.95) }),
  );
  useFrame(() => {
    control.current.gesture = listening ? 'listen' : 'idle';
  });
  return (
    <group ref={root} position={[-5.3, 0, 5.25]} rotation={[0, Math.PI, 0]}>
      <Suspense fallback={null}>
        <HumanAvatar url={MODELS.student} control={control} root={root} hairTint={0.5} seatHeight={0.53} />
      </Suspense>
    </group>
  );
}
