/**
 * The keyboard's physical layout: a standard US QWERTY tenkeyless board after the reference
 * (function row with a rotary knob before PrtSc, main block, navigation cluster, arrows).
 */

// --- Layout: a tenkeyless board after the reference (charcoal caps, orange Esc, Enter and
// space bar, a rotary knob before PrtSc). Units are key widths; z grows towards the front.

export interface KeyDef {
  id: string;
  label: string;
  /** Second legend (shifted character) shown above the main one. */
  top?: string;
  /** Legend placement: centred, or left (modifier keys). */
  align?: 'c' | 'l';
  /** Orange accent cap. */
  accent?: boolean;
  w: number;
  /** Depth (front to back), 1 for normal keys. */
  d: number;
  x: number;
  z: number;
}

type Cell = [id: string, label: string, w?: number, top?: string];

const MAIN: Cell[][] = [
  [['`', '`', 1, '~'], ['1', '1', 1, '!'], ['2', '2', 1, '@'], ['3', '3', 1, '#'], ['4', '4', 1, '$'], ['5', '5', 1, '%'], ['6', '6', 1, '^'], ['7', '7', 1, '&'], ['8', '8', 1, '*'], ['9', '9', 1, '('], ['0', '0', 1, ')'], ['-', '-', 1, '_'], ['=', '=', 1, '+'], ['Backspace', '← Backspace', 2]],
  [['Tab', 'Tab ⇥', 1.5], ...'QWERTYUIOP'.split('').map((c) => [c, c] as Cell), ['[', '[', 1, '{'], [']', ']', 1, '}'], ['\\', '\\', 1.5, '|']],
  [['CapsLock', 'Caps Lock', 1.75], ...'ASDFGHJKL'.split('').map((c) => [c, c] as Cell), [';', ';', 1, ':'], ["'", "'", 1, '"'], ['Enter', '↵ Enter', 2.25]],
  [['ShiftLeft', '⇧ Shift', 2.25], ...'ZXCVBNM'.split('').map((c) => [c, c] as Cell), [',', ',', 1, '<'], ['.', '.', 1, '>'], ['/', '/', 1, '?'], ['ShiftRight', '⇧ Shift', 2.75]],
  [['Control', 'Ctrl', 1.25], ['Win', 'Win', 1.25], ['Alt', 'Alt', 1.25], ['Space', '', 6.25], ['AltRight', 'Alt', 1.25], ['Fn', 'Fn', 1.25], ['Menu', '☰', 1.25], ['ControlRight', 'Ctrl', 1.25]],
];

/** Gap between the function row and the number row. */
const FN_GAP = 0.3;
/** The navigation cluster starts here (a quarter key after the main block). */
const NAV_X = 15.3;
export const BOARD_W = NAV_X + 3;
export const BOARD_D = 6 + FN_GAP;
/** Where the rotary knob sits (centre, in key units), between F12 and PrtSc. */
export const KNOB = { x: 14.72, z: 0.5 };

const ACCENTS = new Set(['Escape', 'Enter', 'Space']);

export const KEYS: KeyDef[] = (() => {
  const out: KeyDef[] = [];
  const put = (id: string, label: string, x: number, z: number, w = 1, top?: string) =>
    out.push({ id, label, x, z, w, d: 1, top, align: label.length > 2 && !top ? 'l' : 'c', accent: ACCENTS.has(id) });
  // Function row: Esc, then F1 to F12 in groups of four, the knob, PrtSc ScrLk Pause.
  put('Escape', 'Esc', 0, 0);
  const groups = [1.55, 5.85, 10.15];
  groups.forEach((gx, g) => {
    for (let i = 0; i < 4; i++) put(`F${g * 4 + i + 1}`, `F${g * 4 + i + 1}`, gx + i, 0);
  });
  ['PrtSc', 'ScrLk', 'Pause'].forEach((l, i) => put(l, l, NAV_X + i, 0));
  // Main block.
  MAIN.forEach((row, r) => {
    let x = 0;
    for (const [id, label, w = 1, top] of row) {
      put(id, label, x, r + 1 + FN_GAP, w, top);
      x += w;
    }
  });
  // Navigation cluster and arrows.
  ['Ins', 'Home', 'PgUp'].forEach((l, i) => put(l === 'Ins' ? 'Insert' : l, l, NAV_X + i, 1 + FN_GAP));
  ['Del', 'End', 'PgDn'].forEach((l, i) => put(l === 'Del' ? 'Delete' : l, l, NAV_X + i, 2 + FN_GAP));
  put('ArrowUp', '↑', NAV_X + 1, 4 + FN_GAP);
  [['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→']].forEach(([id, l], i) => put(id!, l!, NAV_X + i, 5 + FN_GAP));
  return out;
})();
