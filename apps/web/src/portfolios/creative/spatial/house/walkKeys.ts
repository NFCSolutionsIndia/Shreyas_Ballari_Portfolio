/**
 * Movement keys held down in walk mode. The keyboard and the on-screen pad both write here; the
 * camera reads it every frame. Names: forward, back, left, right (strafe), turnL, turnR, run.
 */
export type WalkKey = 'forward' | 'back' | 'left' | 'right' | 'turnL' | 'turnR' | 'run';

export const held = new Set<WalkKey>();

const MAP: Record<string, WalkKey> = {
  w: 'forward',
  arrowup: 'forward',
  s: 'back',
  arrowdown: 'back',
  a: 'left',
  d: 'right',
  q: 'turnL',
  arrowleft: 'turnL',
  e: 'turnR',
  arrowright: 'turnR',
  shift: 'run',
};

export const keyFor = (key: string): WalkKey | undefined => MAP[key.toLowerCase()];
