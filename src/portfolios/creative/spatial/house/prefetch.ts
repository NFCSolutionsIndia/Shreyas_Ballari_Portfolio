/**
 * Downloads the house's files in the background while the headset intro plays, without turning
 * them into 3D objects yet (that work would make the intro stutter). When the house is built a
 * moment later, the browser already has every file.
 */

const BASE = `${import.meta.env.BASE_URL}assets/house`;

/** Every model the living room, the building and the garden use (see LivingRoom, Shell, Garden). */
const MODELS = [
  'sofa_03',
  'modern_coffee_table_01',
  'ceramic_vase_01',
  'modern_arm_chair_01',
  'mid_century_lounge_chair',
  'side_table_01',
  'pachira_aquatica_01',
  'calathea_orbifolia_01',
  'wooden_display_shelves_01',
  'modern_ceiling_lamp_01',
  'outdoor_table_chair_set_01',
  'stone_fire_pit',
  'fern_02',
  'grass_medium_01',
];
const TEXTURE_SETS = ['white_plaster_02', 'wood_floor', 'smooth_concrete_floor', 'marble_01', 'stacked_stone_wall', 'leafy_grass'];

let started = false;

const get = (url: string) => fetch(url, { priority: 'low' } as RequestInit).catch(() => undefined);

/** Fetches a model's file, then the geometry and pictures it lists. */
async function model(id: string) {
  const dir = `${BASE}/models/${id}`;
  const res = await get(`${dir}/${id}_1k.gltf`);
  if (!res?.ok) return;
  const json = (await res.json().catch(() => null)) as { buffers?: { uri?: string }[]; images?: { uri?: string }[] } | null;
  const uris = [...(json?.buffers ?? []), ...(json?.images ?? [])].map((x) => x.uri).filter((u): u is string => !!u && !u.startsWith('data:'));
  await Promise.all(uris.map((u) => get(`${dir}/${u}`)));
}

export function prefetchHouse() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void get(`${BASE}/hdri/greenwich_park_02_1k.hdr`);
  void get(`${BASE}/hdri/greenwich_park_02_view_4k.jpg`);
  TEXTURE_SETS.forEach((n) => ['diff', 'nor', 'rough'].forEach((k) => void get(`${BASE}/textures/${n}/${k}.jpg`)));
  // A few models at a time, so the connection is shared fairly.
  const queue = [...MODELS];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) await model(id);
  };
  void Promise.all([worker(), worker(), worker()]);
}
