/**
 * The floor plan of the house (metres; x to the right of the entrance view, z towards the
 * entrance, floor at y = 0). Seen from above, with −z at the top:
 *
 *        x: −13          −7.4  −5          0            5     6.2
 *  z −14  ┌────────────┬──────┬──────────────────────┬─────────┐
 *         │  GALLERY   │      │  KITCHEN · DINING    │  MUSIC  │   pavilion (glass to the south)
 *  z −9   ├────────────┤  H   ├──────── glass ───────┴──door───┘
 *         │  LAB       │  A   │                                      GARDEN
 *  z −4.2 ├────────────┤  L   │ glass      (courtyard lawn, fire pit to the east)
 *         │  STUDY     │  L   ├───── glass wall · slider ─────┐
 *  z 0.4  ├────────────┤      │                               │
 *         │  BEDROOM   │ door═╡        LIVING ROOM            │
 *  z 4.6  └────────────┴──────┤                               │
 *                             └────────── entrance ───────────┘ z 5.5
 */

export const WALL = 0.2;

/** Hallway interior: west wall face, east wall face, ends. */
export const HALL = { x0: -7.2, x1: -5.25, z0: -14, z1: 4.6, ceil: 3.2 } as const;

/** West wing rooms (interior faces). Partition walls are 0.2 thick, centred on the boundaries. */
export const WING = { x0: -12.8, x1: -7.4, ceil: 3.2 } as const;
export const BEDROOM = { x0: WING.x0, x1: WING.x1, z0: 0.5, z1: 4.6 } as const;
export const STUDY = { x0: WING.x0, x1: WING.x1, z0: -4.1, z1: 0.3 } as const;
export const LAB = { x0: WING.x0, x1: WING.x1, z0: -8.9, z1: -4.3 } as const;
export const GALLERY = { x0: WING.x0, x1: WING.x1, z0: -14, z1: -9.1 } as const;

/** The pavilion: kitchen + dining (west) and the music nook (east), glass facing the garden. */
export const PAVILION = { x0: -5.25, x1: 6.2, z0: -14, z1: -9.1, ceil: 3.2 } as const;
export const MUSIC_X = 3.1;

/** Doors in the hallway's west wall (z ranges) and the opening into the kitchen (east wall). */
export const DOORS = {
  bedroom: [3.4, 4.35],
  study: [-2.4, -1.3],
  lab: [-7.2, -6.05],
  gallery: [-12.4, -10.6],
  kitchen: [-12.4, -10.2],
} as const;

/** The sliding door from the music nook to the garden (x range in the pavilion's glass front). */
export const MUSIC_DOOR = [4.0, 5.4] as const;
/** The open slider in the living room's glass wall (x range). */
export const LIVING_DOOR = [0, 2.5] as const;
