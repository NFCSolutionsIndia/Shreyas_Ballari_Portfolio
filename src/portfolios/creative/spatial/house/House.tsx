import { Garden } from './Garden';
import { MatsProvider } from './kit';
import { preloadModels } from './Model';
import { Projector } from './Projector';
import { Shell } from './Shell';
import { GoalsSign } from './Story3D';

/**
 * Everything around the living room that can be seen from it: the building's shell, the
 * projector, and the garden through the glass wall. The camera never leaves the living room, so
 * the other rooms' furniture (bedroom, study, lab, gallery, music room…) is not loaded at all:
 * less to download, less graphics memory and a faster start. Render inside the scene's Suspense.
 */

export const HOUSE_MODELS = ['outdoor_table_chair_set_01', 'stone_fire_pit', 'fern_02', 'grass_medium_01'];
preloadModels(HOUSE_MODELS);

export function House({ low = false }: { low?: boolean }) {
  return (
    <MatsProvider>
      <Shell />
      <GoalsSign />
      <Projector />
      <Garden low={low} />
    </MatsProvider>
  );
}
