import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Bedroom } from './Bedroom';
import { Gallery } from './Gallery';
import { Garden } from './Garden';
import { Lab } from './Lab';
import { MatsProvider } from './kit';
import { preloadModels } from './Model';
import { Music } from './Music';
import { Projector } from './Projector';
import { Shell } from './Shell';
import { ActivityPosters, CommunityRoom, GalleryScores, GoalsSign, LabStory, ThanksScreen } from './Story3D';
import { Study } from './Study';

/**
 * Everything around the living room: the hallway and rooms (see layout.ts for the plan), the
 * projector in the living room, and the garden. Render inside the scene's Suspense.
 */

export const HOUSE_MODELS = ['desk_lamp_arm_01', 'dining_chair_02', 'industrial_microscope', 'metal_stool_01', 'outdoor_table_chair_set_01', 'stone_fire_pit', 'fern_02', 'grass_medium_01'];
preloadModels(HOUSE_MODELS);

/** How close (metres) the camera must be to a room for it to be drawn. Walls hide the rest. */
const NEAR = 12;

/**
 * A room that is only drawn while the camera is near it. The rooms behind the walls cannot be
 * seen anyway, and skipping them cuts the work per frame by more than half.
 */
function Room({ at, children }: { at: [number, number]; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ camera, gl }) => {
    const g = ref.current;
    if (!g) return;
    const on = Math.hypot(camera.position.x - at[0], camera.position.z - at[1]) < NEAR;
    if (g.visible !== on) {
      g.visible = on;
      // Its furniture casts shadows too: redraw the sun's shadow once.
      gl.shadowMap.needsUpdate = true;
    }
  });
  return (
    <group ref={ref} userData={{ room: true }}>
      {children}
    </group>
  );
}

export function House({ low = false }: { low?: boolean }) {
  return (
    <MatsProvider>
      <Shell />
      <Room at={[-10, 2.5]}>
        <Bedroom />
      </Room>
      <Room at={[-10, -2.5]}>
        <Study />
      </Room>
      <Room at={[-10, -7.5]}>
        <Lab />
        <LabStory />
      </Room>
      <Room at={[-10.5, -12.5]}>
        <Gallery low={low} />
        <GalleryScores />
      </Room>
      <Room at={[-1.5, -12]}>
        <CommunityRoom />
      </Room>
      <Room at={[4.5, -12]}>
        <ActivityPosters />
        <Music />
      </Room>
      <GoalsSign />
      <ThanksScreen />
      <Projector />
      <Garden low={low} />
    </MatsProvider>
  );
}
