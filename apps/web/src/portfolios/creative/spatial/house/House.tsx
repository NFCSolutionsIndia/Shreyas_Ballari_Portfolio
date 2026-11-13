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

export function House({ low = false }: { low?: boolean }) {
  return (
    <MatsProvider>
      <Shell />
      <Bedroom />
      <Study />
      <Lab />
      <Gallery low={low} />
      <CommunityRoom />
      <LabStory />
      <GalleryScores />
      <ActivityPosters />
      <GoalsSign />
      <ThanksScreen />
      <Music />
      <Projector />
      <Garden low={low} />
    </MatsProvider>
  );
}
